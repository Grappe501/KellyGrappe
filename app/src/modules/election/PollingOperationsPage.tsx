import React, { useMemo, useState } from "react";
import { ARKANSAS_COUNTIES, POLLING_LOCATIONS } from "./electionData";

type LeadStatus = "No Lead" | "Lead Pending" | "Lead Assigned" | "Confirmed" | "Needs Attention";

export default function PollingOperationsPage() {
  const [county, setCounty] = useState("");
  const [status, setStatus] = useState<LeadStatus | "All">("All");

  const rows = useMemo(() => {
    const locations = county ? POLLING_LOCATIONS.filter((item) => item.county === county) : POLLING_LOCATIONS;
    return locations.map((location) => ({ ...location, leadStatus: "No Lead" as LeadStatus }));
  }, [county]);

  const visibleRows = status === "All" ? rows : rows.filter((row) => row.leadStatus === status);
  const assigned = rows.filter((row) => row.leadStatus === "Confirmed" || row.leadStatus === "Lead Assigned").length;

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">Private campaign operations</p>
            <h1 className="mt-2 text-3xl font-bold">Polling Operations</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">Campaign lead assignments live here. They are intentionally separated from the public voter-information layer.</p>
          </div>
          <div className="rounded-xl bg-white px-5 py-4 shadow-sm ring-1 ring-slate-200"><div className="text-xs uppercase tracking-wide text-slate-500">Assigned / confirmed</div><div className="mt-1 text-2xl font-bold">{assigned}</div></div>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <label className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200"><span className="text-sm font-semibold">County</span><select value={county} onChange={(event) => setCounty(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3"><option value="">All counties</option>{ARKANSAS_COUNTIES.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
          <label className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200"><span className="text-sm font-semibold">Location status</span><select value={status} onChange={(event) => setStatus(event.target.value as LeadStatus | "All")} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3"><option>All</option><option>No Lead</option><option>Lead Pending</option><option>Lead Assigned</option><option>Confirmed</option><option>Needs Attention</option></select></label>
        </section>

        <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">County</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Address</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Lead</th><th className="px-4 py-3">Status</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{visibleRows.map((row) => <tr key={row.id}><td className="px-4 py-4 font-semibold">{row.county}</td><td className="px-4 py-4">{row.name}</td><td className="px-4 py-4 text-slate-600">{row.address}, {row.city} {row.zip ?? ""}</td><td className="px-4 py-4">{row.type.replaceAll("_", " ")}</td><td className="px-4 py-4 text-slate-500">Not assigned</td><td className="px-4 py-4"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{row.leadStatus}</span></td></tr>)}</tbody>
            </table>
          </div>
          {visibleRows.length === 0 && <div className="p-10 text-center text-sm text-slate-500">No official location records have been loaded for this selection yet.</div>}
        </section>
      </div>
    </main>
  );
}
