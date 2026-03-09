import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Container from "@components/Container";
import { Card, CardHeader, CardContent } from "@components/Card";
import {
  Button,
  HelpText,
  Input,
  Label,
  Select,
  Textarea,
} from "@components/FormControls";

import { listContacts, type Contact } from "@db/contactsDb";

type AiResult = {
  summary?: string;
  suggestedTags?: string[];
  suggestedLocations?: string[];
  recommendedIds?: string[];
  nextStep?: string;
};

function safeTrim(v: unknown) {
  return String(v ?? "").trim();
}

function scoreBadge(value?: number, inverse = false) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  const pct = Math.round(value * 100);
  if (!inverse) {
    if (pct >= 75) return `${pct} • high`;
    if (pct >= 50) return `${pct} • medium`;
    return `${pct} • low`;
  }
  if (pct >= 60) return `${pct} • persuadable`;
  if (pct >= 35) return `${pct} • mixed`;
  return `${pct} • firm`;
}

function avg(list: Array<number | undefined>) {
  const nums = list.filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  if (!nums.length) return undefined;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export default function ContactsDirectoryPage() {
  const navigate = useNavigate();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [countyFilter, setCountyFilter] = useState("ALL");
  const [districtFilter, setDistrictFilter] = useState("ALL");
  const [tagFilter, setTagFilter] = useState("");
  const [aiPrompt, setAiPrompt] = useState(
    "Find likely volunteer leaders in Pulaski County with strong turnout and organizing potential."
  );
  const [aiBusy, setAiBusy] = useState(false);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setContacts(await listContacts());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const counties = useMemo(() => {
    return [...new Set(contacts.map((c) => safeTrim(c.county)).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [contacts]);

  const districts = useMemo(() => {
    const values = contacts
      .map((c) => safeTrim(c.congressionalDistrict))
      .filter(Boolean)
      .map((value) => `CD ${value}`);
    return [...new Set(values)].sort((a, b) => a.localeCompare(b));
  }, [contacts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = contacts.filter((c) => {
      if (countyFilter !== "ALL" && (c.county || "") !== countyFilter) return false;
      if (districtFilter !== "ALL" && `CD ${c.congressionalDistrict || ""}` !== districtFilter) {
        return false;
      }
      if (tagFilter.trim()) {
        const tagNeedle = tagFilter.trim().toLowerCase();
        const inTags = (c.tags ?? []).some((tag) => tag.toLowerCase().includes(tagNeedle));
        const inRoles = (c.rolePotential ?? []).some((tag) => tag.toLowerCase().includes(tagNeedle));
        if (!inTags && !inRoles) return false;
      }
      if (!q) return true;

      const haystack = [
        c.fullName,
        c.email,
        c.phone,
        c.city,
        c.county,
        c.precinct,
        c.organization,
        ...(c.tags ?? []),
        ...(c.rolePotential ?? []),
        ...(c.teamAssignments ?? []),
        ...(c.ballotInitiatives ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });

    if (aiResult?.recommendedIds?.length) {
      const rank = new Map(aiResult.recommendedIds.map((id, i) => [id, i]));
      rows = [...rows].sort((a, b) => {
        const ra = rank.has(a.id) ? rank.get(a.id)! : Number.MAX_SAFE_INTEGER;
        const rb = rank.has(b.id) ? rank.get(b.id)! : Number.MAX_SAFE_INTEGER;
        if (ra !== rb) return ra - rb;
        return (b.organizerScore || 0) - (a.organizerScore || 0);
      });
    } else {
      rows = [...rows].sort((a, b) => {
        const oa = a.organizerScore ?? a.turnoutScore ?? 0;
        const ob = b.organizerScore ?? b.turnoutScore ?? 0;
        return ob - oa;
      });
    }

    return rows;
  }, [aiResult, contacts, countyFilter, districtFilter, search, tagFilter]);

  const stats = useMemo(() => {
    const turnoutAvg = avg(contacts.map((c) => c.turnoutScore));
    const persuasionAvg = avg(contacts.map((c) => c.persuasionScore));
    const leaders = contacts.filter((c) => (c.governmentLeaderRoles?.length ?? 0) > 0).length;
    const initiativeLinked = contacts.filter((c) => (c.ballotInitiativeCount ?? 0) > 0).length;
    return { turnoutAvg, persuasionAvg, leaders, initiativeLinked };
  }, [contacts]);

  async function runAiAssist() {
    setAiBusy(true);
    setAiError(null);

    try {
      const res = await fetch("/.netlify/functions/contact-ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objective: aiPrompt, contacts: contacts.slice(0, 250) }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as any)?.error || `AI assist failed (${res.status})`);
      setAiResult(json as AiResult);
    } catch (err: any) {
      setAiError(err?.message ?? "AI assist failed.");
    } finally {
      setAiBusy(false);
    }
  }

  const heatRows = useMemo(() => {
    const grouped = new Map<string, Contact[]>();
    for (const contact of contacts) {
      const key = safeTrim(contact.precinct) || "Unassigned precinct";
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(contact);
    }
    return [...grouped.entries()]
      .map(([precinct, rows]) => ({
        precinct,
        count: rows.length,
        turnout: avg(rows.map((r) => r.turnoutScore)),
        persuasion: avg(rows.map((r) => r.persuasionScore)),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [contacts]);

  return (
    <Container>
      <div className="space-y-6">
        <Card>
          <CardHeader
            title="Contact Intelligence"
            subtitle="Search, score, and deploy contacts by precinct, district, skill, and follow-up need."
          />
          <CardContent className="space-y-6">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Contacts</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">{contacts.length}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Avg turnout</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {typeof stats.turnoutAvg === "number" ? `${Math.round(stats.turnoutAvg * 100)}%` : "—"}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Avg persuasion</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {typeof stats.persuasionAvg === "number" ? `${Math.round(stats.persuasionAvg * 100)}%` : "—"}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Leader-linked contacts</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">{stats.leaders}</div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="xl:col-span-2">
                    <Label htmlFor="search">Search</Label>
                    <Input
                      id="search"
                      placeholder="Name, hashtag, precinct, role, initiative, organization…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>County</Label>
                    <Select value={countyFilter} onChange={(e) => setCountyFilter(e.target.value)}>
                      <option value="ALL">All counties</option>
                      {counties.map((county) => (
                        <option key={county} value={county}>
                          {county}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label>Congressional district</Label>
                    <Select value={districtFilter} onChange={(e) => setDistrictFilter(e.target.value)}>
                      <option value="ALL">All districts</option>
                      {districts.map((district) => (
                        <option key={district} value={district}>
                          {district}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="md:col-span-2 xl:col-span-4">
                    <Label>Hashtag / skill filter</Label>
                    <Input
                      placeholder="#radio, organizer, pastor, teacher, petition"
                      value={tagFilter}
                      onChange={(e) => setTagFilter(e.target.value)}
                    />
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-slate-700">
                      <tr>
                        <th className="p-3 text-left">Contact</th>
                        <th className="p-3 text-left">Location</th>
                        <th className="p-3 text-left">Scores</th>
                        <th className="p-3 text-left">Signals</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-slate-500">
                            Loading contacts…
                          </td>
                        </tr>
                      ) : filtered.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-slate-500">
                            No contacts match this filter.
                          </td>
                        </tr>
                      ) : (
                        filtered.map((contact) => (
                          <tr
                            key={contact.id}
                            className="cursor-pointer border-t border-slate-200 hover:bg-slate-50"
                            onClick={() => navigate(`/contacts/${contact.id}`)}
                          >
                            <td className="p-3 align-top">
                              <div className="font-medium text-slate-900">{contact.fullName || "Unknown Contact"}</div>
                              <div className="mt-1 text-xs text-slate-500">
                                {[contact.email, contact.phone].filter(Boolean).join(" • ") || "No direct contact info"}
                              </div>
                            </td>
                            <td className="p-3 align-top text-slate-700">
                              {[contact.city, contact.county].filter(Boolean).join(", ") || "—"}
                              <div className="mt-1 text-xs text-slate-500">
                                {[contact.precinct && `P ${contact.precinct}`, contact.congressionalDistrict && `CD ${contact.congressionalDistrict}`, contact.stateHouseDistrict && `HD ${contact.stateHouseDistrict}`, contact.stateSenateDistrict && `SD ${contact.stateSenateDistrict}`]
                                  .filter(Boolean)
                                  .join(" • ") || "district data pending"}
                              </div>
                            </td>
                            <td className="p-3 align-top text-slate-700">
                              <div>Turnout: {scoreBadge(contact.turnoutScore)}</div>
                              <div className="mt-1">Persuasion: {scoreBadge(contact.persuasionScore, true)}</div>
                              <div className="mt-1 text-xs text-slate-500">
                                Initiative links: {contact.ballotInitiativeCount ?? 0}
                              </div>
                            </td>
                            <td className="p-3 align-top text-slate-700">
                              <div className="flex flex-wrap gap-2">
                                {(contact.tags ?? []).slice(0, 4).map((tag) => (
                                  <span key={tag} className="rounded-full bg-indigo-50 px-2 py-1 text-xs text-indigo-700">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                              <div className="mt-2 text-xs text-slate-500">
                                {(contact.rolePotential ?? []).slice(0, 3).join(" • ") || "No skills tagged yet"}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <h2 className="text-lg font-semibold text-slate-900">AI Mission Finder</h2>
                  <HelpText>
                    Use plain language to find leaders, volunteers, or persuadable targets by precinct,
                    hashtag, location, skills, or initiative history.
                  </HelpText>
                  <div className="mt-4 space-y-3">
                    <Textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} />
                    <Button onClick={runAiAssist} disabled={aiBusy || !contacts.length}>
                      {aiBusy ? "Thinking…" : "Run AI sort"}
                    </Button>
                    {aiError ? <div className="text-sm text-rose-700">{aiError}</div> : null}
                    {aiResult ? (
                      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-950">
                        <div className="font-semibold">AI summary</div>
                        <p className="mt-2 leading-relaxed">{aiResult.summary || "No summary returned."}</p>
                        {aiResult.suggestedTags?.length ? (
                          <p className="mt-3">
                            <strong>Suggested tags:</strong> {aiResult.suggestedTags.join(", ")}
                          </p>
                        ) : null}
                        {aiResult.nextStep ? (
                          <p className="mt-3">
                            <strong>Next step:</strong> {aiResult.nextStep}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <h2 className="text-lg font-semibold text-slate-900">Precinct heat preview</h2>
                  <HelpText>
                    Early local heat map using the contact records already in your system. Statewide voter
                    upload will deepen this significantly.
                  </HelpText>
                  <div className="mt-4 space-y-3">
                    {heatRows.map((row) => (
                      <div key={row.precinct} className="rounded-xl border border-slate-200 p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-900">{row.precinct}</span>
                          <span className="text-xs text-slate-500">{row.count} contacts</span>
                        </div>
                        <div className="mt-2 text-sm text-slate-700">
                          Turnout: {scoreBadge(row.turnout)} • Persuasion: {scoreBadge(row.persuasion, true)}
                        </div>
                      </div>
                    ))}
                    {!heatRows.length ? (
                      <div className="text-sm text-slate-500">Precinct data will appear once contacts carry precinct values.</div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
