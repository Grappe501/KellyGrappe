import React, { useEffect, useMemo, useState } from "react";
import { ARKANSAS_COUNTIES, COUNTY_DATA_STATUS, GENERAL_ELECTION_2026, OFFICIAL_ELECTION_LINKS, POLLING_LOCATIONS } from "./electionData";
import { electionDatabaseConfigured } from "./supabaseClient";
import { loadCountySources, loadVerifiedPollingLocations, type ElectionCountySource } from "./electionService";

const checklist = [
  ["Registration", "Confirm your registration and current address."],
  ["Your ballot", "Find the offices, candidates and issues tied to your residence."],
  ["When to vote", "Compare early voting with Election Day."],
  ["Voting ID", "Review Arkansas identification requirements before you go."],
  ["If something goes wrong", "Learn about provisional, fail-safe, absentee and accessibility options."],
] as const;

export default function ElectionInformationPage() {
  const [county, setCounty] = useState("");
  const [address, setAddress] = useState("");
  const [locations, setLocations] = useState(POLLING_LOCATIONS);
  const [countySources, setCountySources] = useState<ElectionCountySource[]>([]);
  const [loading, setLoading] = useState(electionDatabaseConfigured);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!electionDatabaseConfigured) return;
    let active = true;
    Promise.all([
      loadVerifiedPollingLocations(GENERAL_ELECTION_2026.id),
      loadCountySources(GENERAL_ELECTION_2026.id),
    ])
      .then(([loadedLocations, loadedSources]) => {
        if (!active) return;
        setLocations(loadedLocations);
        setCountySources(loadedSources);
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "The election database could not be reached.");
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const countyLocations = useMemo(() => locations.filter((location) => location.county === county), [locations, county]);
  const publishedCounties = countySources.length
    ? countySources.filter((source) => source.sourceStatus !== "pending").length
    : ARKANSAS_COUNTIES.filter((name) => COUNTY_DATA_STATUS[name] === "published").length;
  const selectedSource = countySources.find((source) => source.county === county);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="bg-slate-900 text-white">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-slate-300">Arkansas Voter Center</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl">Election information, in one place.</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-200">A practical voter-information service for finding registration information, ballots, voting dates, locations, deadlines and help.</p>
          <div className="mt-6 max-w-4xl rounded-xl border border-slate-700 bg-slate-800/70 p-4 text-sm leading-6 text-slate-200">This is a voter-information service provided by the Kelly Grappe campaign. It is not an official Arkansas government website. Official sources are linked throughout and control if information changes.</div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-2xl font-bold">Find your voting information</h2>
            <p className="mt-2 text-sm text-slate-600">Choose a county to see verified location records. Address-to-precinct resolution is deliberately tied to the official voter data layer rather than guessed from an address.</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label><span className="text-sm font-semibold">County</span><select value={county} onChange={(e) => setCounty(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-3"><option value="">Select a county</option>{ARKANSAS_COUNTIES.map((name) => <option key={name}>{name}</option>)}</select></label>
              <label><span className="text-sm font-semibold">Street address</span><input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3" /></label>
            </div>
            <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
              {loading ? "Loading verified election records…" : county ? <><strong>{county}</strong>: <strong>{countyLocations.length}</strong> verified location records loaded.{selectedSource && <div className="mt-2">County source status: <strong>{selectedSource.sourceStatus}</strong>{selectedSource.lastVerifiedAt ? ` · last verified ${selectedSource.lastVerifiedAt}` : ""}.</div>}</> : "Choose a county to see verified records."}
              {address && <div className="mt-3">For an immediate address-specific official lookup, use <a className="font-semibold text-slate-900 underline" href={GENERAL_ELECTION_2026.voterviewUrl} target="_blank" rel="noreferrer">Arkansas VoterView ↗</a>. This service will not invent a precinct or polling place when the authoritative record is unavailable.</div>}
              {error && <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">Live election data is temporarily unavailable. Official VoterView remains available above. {error}</div>}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">2026 General Election</p>
            <p className="mt-2 text-3xl font-bold">November 3, 2026</p>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Early voting</dt><dd className="font-semibold">Oct. 19–Nov. 2</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Election Day</dt><dd className="font-semibold">7:30 AM–7:30 PM</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Verified locations</dt><dd className="font-semibold">{locations.length}</dd></div>
            </dl>
            <a href={GENERAL_ELECTION_2026.voterviewUrl} target="_blank" rel="noreferrer" className="mt-6 block rounded-lg bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white">Open official VoterView ↗</a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-8 sm:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-5 ring-1 ring-slate-200"><div className="text-3xl font-bold">75</div><div className="mt-1 text-sm text-slate-600">Arkansas counties in the statewide registry</div></div>
          <div className="rounded-xl bg-white p-5 ring-1 ring-slate-200"><div className="text-3xl font-bold">{publishedCounties}</div><div className="mt-1 text-sm text-slate-600">counties with published/verified source records</div></div>
          <div className="rounded-xl bg-white p-5 ring-1 ring-slate-200"><div className="text-3xl font-bold">{locations.length}</div><div className="mt-1 text-sm text-slate-600">verified location records</div></div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-10 sm:px-8"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">{checklist.map(([title, description]) => <article key={title} className="rounded-xl bg-white p-5 ring-1 ring-slate-200"><h3 className="font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></article>)}</div></section>

      <section className="mx-auto max-w-6xl px-5 pb-12 sm:px-8">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-2xl font-bold">Official sources</h2>
          <p className="mt-1 text-sm text-slate-600">Verify any election information against the source that publishes it.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">{OFFICIAL_ELECTION_LINKS.map((link) => <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 p-4 text-sm font-semibold hover:bg-slate-50">{link.label}<span className="ml-2 text-slate-400">↗</span></a>)}</div>
        </div>
      </section>
    </main>
  );
}
