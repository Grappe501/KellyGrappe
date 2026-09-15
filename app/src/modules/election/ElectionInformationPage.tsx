import React, { useMemo, useState } from "react";
import { GENERAL_ELECTION_2026, ARKANSAS_COUNTIES, POLLING_LOCATIONS, OFFICIAL_ELECTION_LINKS } from "./electionData";

const checklist = [
  ["Check your registration", "Use Arkansas VoterView to confirm registration and polling information."],
  ["Find your ballot", "Your ballot is determined by your residence, precinct, districts, offices and ballot measures."],
  ["Choose when to vote", "Review early-voting dates and hours or plan for Election Day."],
  ["Bring what you need", "Review Arkansas identification requirements before you go."],
  ["Need help?", "Review absentee, military/overseas, provisional, fail-safe and accessibility information from the official sources."],
] as const;

export default function ElectionInformationPage() {
  const [county, setCounty] = useState("");
  const [address, setAddress] = useState("");

  const countyLocations = useMemo(() => {
    if (!county) return [];
    return POLLING_LOCATIONS.filter((location) => location.county === county);
  }, [county]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="bg-slate-900 text-white">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-slate-300">Arkansas Voter Center</p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Election information, in one place.</h1>
            <p className="mt-5 text-lg leading-8 text-slate-200">
              Find the information you need to register, understand your ballot, choose when and where to vote, and get help when something goes wrong.
            </p>
            <div className="mt-6 rounded-xl border border-slate-700 bg-slate-800/70 p-4 text-sm leading-6 text-slate-200">
              This is a voter-information service provided by the Kelly Grappe campaign. It is not an official Arkansas government website. Official sources are linked throughout and should control if information changes.
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-2xl font-bold">Find your voting information</h2>
            <p className="mt-2 text-sm text-slate-600">Start with your county. Address-based ballot and polling lookup will use the same election data layer as this page.</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold">County</span>
                <select value={county} onChange={(event) => setCounty(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-3">
                  <option value="">Select a county</option>
                  {ARKANSAS_COUNTIES.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Street address</span>
                <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="123 Main St" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3" />
              </label>
            </div>
            <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
              {county ? `${county}: ${countyLocations.length} published location records currently loaded.` : "Enter your county to inspect published location records."}
              {address && <span className="ml-1">Address lookup is ready for the address-resolution service in the next build phase.</span>}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">2026 General Election</p>
            <p className="mt-2 text-3xl font-bold">November 3, 2026</p>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Early voting</dt><dd className="font-semibold">Oct. 19–Nov. 2</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Election Day</dt><dd className="font-semibold">7:30 AM–7:30 PM</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Location records</dt><dd className="font-semibold">{POLLING_LOCATIONS.length} loaded</dd></div>
            </dl>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-10 sm:px-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {checklist.map(([title, description]) => (
            <article key={title} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h3 className="font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-12 sm:px-8">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><h2 className="text-2xl font-bold">Official sources</h2><p className="mt-1 text-sm text-slate-600">Use these sources to verify election information.</p></div>
            <a className="rounded-lg bg-slate-900 px-4 py-2 text-center text-sm font-semibold text-white" href="https://www.voterview.ar-nova.org/voterview/" target="_blank" rel="noreferrer">Open VoterView</a>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {OFFICIAL_ELECTION_LINKS.map((link) => <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 p-4 text-sm font-semibold hover:bg-slate-50">{link.label}<span className="ml-2 text-slate-400">↗</span></a>)}
          </div>
        </div>
      </section>
    </main>
  );
}
