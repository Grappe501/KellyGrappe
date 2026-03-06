import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Container from "../../shared/components/Container";
import { Card, CardHeader, CardContent } from "../../shared/components/Card";
import {
  Button,
  HelpText,
  Input,
  Label,
  Select,
  Textarea,
} from "../../shared/components/FormControls";

import {
  listContactsDirectoryRows,
  type ContactDirectoryRow as DbContactDirectoryRow,
} from "../../shared/utils/db/contactsDb";

type ContactDirectoryRow = DbContactDirectoryRow & {
  followUpStatus?: string;
  followUpTargetAt?: string;
  teamAssignments?: string[];
  rolePotential?: string[];
  bestContactMethod?: string;
  conversationNotes?: string;
  organization?: string;
};

type AiResult = {
  summary?: string;
  suggestedTags?: string[];
  suggestedLocations?: string[];
  recommendedIds?: string[];
  nextStep?: string;
};

function followUpPriority(status?: string): number {
  switch (status) {
    case "CRITICAL":
      return 1;
    case "NEW":
      return 2;
    case "IN_PROGRESS":
      return 3;
    case "COMPLETED":
      return 4;
    case "ARCHIVED":
      return 5;
    default:
      return 6;
  }
}

function rowStyle(status?: string): string {
  switch (status) {
    case "CRITICAL":
      return "bg-red-50";
    case "NEW":
      return "bg-yellow-50";
    case "IN_PROGRESS":
      return "bg-blue-50";
    case "COMPLETED":
      return "bg-green-50";
    case "ARCHIVED":
      return "bg-slate-100 text-slate-400";
    default:
      return "";
  }
}

function safeTrim(v: unknown) {
  return String(v ?? "").trim();
}

function matchesLoose(text: string, q: string) {
  if (!q) return true;
  return text.toLowerCase().includes(q.toLowerCase());
}

export default function ContactsDirectoryPage() {
  const navigate = useNavigate();

  const [contacts, setContacts] = useState<ContactDirectoryRow[]>([]);
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  const [aiPrompt, setAiPrompt] = useState(
    "Find volunteers in Pulaski County with radio, organizer, or community skills."
  );
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);

  useEffect(() => {
    loadContacts();
  }, []);

  async function loadContacts() {
    try {
      const rows = await listContactsDirectoryRows();
      setContacts((rows ?? []) as ContactDirectoryRow[]);
    } catch (err) {
      console.error("Failed to load contacts directory", err);
    } finally {
      setLoading(false);
    }
  }

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    contacts.forEach((c) => (c.tags ?? []).forEach((tag) => tags.add(tag)));
    return [...tags].sort((a, b) => a.localeCompare(b));
  }, [contacts]);

  const allLocations = useMemo(() => {
    const values = new Set<string>();
    contacts.forEach((c) => {
      [c.city, c.county].filter(Boolean).forEach((part) => values.add(String(part)));
    });
    return [...values].sort((a, b) => a.localeCompare(b));
  }, [contacts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const locationQ = locationFilter.trim().toLowerCase();
    const tagQ = tagFilter.trim().toLowerCase();

    let rows = contacts;

    if (q) {
      rows = rows.filter((c) => {
        const haystack = [
          c.fullName,
          c.phone,
          c.email,
          c.city,
          c.county,
          c.state,
          ...(c.tags ?? []),
          ...(c.teamAssignments ?? []),
          ...(c.rolePotential ?? []),
          c.organization,
          c.conversationNotes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      });
    }

    if (locationQ) {
      rows = rows.filter((c) => {
        const location = [c.city, c.county, c.state].filter(Boolean).join(" ").toLowerCase();
        return location.includes(locationQ);
      });
    }

    if (tagQ) {
      rows = rows.filter((c) => (c.tags ?? []).some((tag) => tag.toLowerCase().includes(tagQ)));
    }

    if (categoryFilter !== "ALL") {
      rows = rows.filter((c) => (c.category ?? "OTHER") === categoryFilter);
    }

    rows = [...rows].sort((a, b) => {
      const priority = followUpPriority(a.followUpStatus) - followUpPriority(b.followUpStatus);
      if (priority !== 0) return priority;
      const an = (a.fullName ?? "").toLowerCase();
      const bn = (b.fullName ?? "").toLowerCase();
      return an.localeCompare(bn);
    });

    if (aiResult?.recommendedIds?.length) {
      const rank = new Map(aiResult.recommendedIds.map((id, index) => [id, index]));
      rows = [...rows].sort((a, b) => {
        const aiA = rank.has(a.id) ? rank.get(a.id)! : Number.MAX_SAFE_INTEGER;
        const aiB = rank.has(b.id) ? rank.get(b.id)! : Number.MAX_SAFE_INTEGER;
        if (aiA !== aiB) return aiA - aiB;
        return 0;
      });
    }

    return rows;
  }, [aiResult, categoryFilter, contacts, locationFilter, search, tagFilter]);

  const stats = useMemo(() => {
    const withPhone = contacts.filter((c) => !!safeTrim(c.phone)).length;
    const withEmail = contacts.filter((c) => !!safeTrim(c.email)).length;
    const volunteers = contacts.filter((c) => (c.tags ?? []).some((tag) => /volunteer/i.test(tag))).length;
    const needsFollowUp = contacts.filter(
      (c) => c.followUpStatus === "NEW" || c.followUpStatus === "IN_PROGRESS"
    ).length;

    return { total: contacts.length, withPhone, withEmail, volunteers, needsFollowUp };
  }, [contacts]);

  async function runAiAssist() {
    setAiBusy(true);
    setAiError(null);
    setAiResult(null);

    try {
      const payload = {
        objective: aiPrompt,
        contacts: contacts.slice(0, 200).map((c) => ({
          id: c.id,
          fullName: c.fullName,
          email: c.email,
          phone: c.phone,
          city: c.city,
          county: c.county,
          state: c.state,
          tags: c.tags ?? [],
          category: c.category,
          teamAssignments: c.teamAssignments ?? [],
          rolePotential: c.rolePotential ?? [],
          supportLevel: c.supportLevel,
          bestContactMethod: c.bestContactMethod,
          conversationNotes: c.conversationNotes,
          organization: c.organization,
        })),
      };

      const res = await fetch("/.netlify/functions/contact-ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((json as any)?.error || `AI assist failed (${res.status}).`);
      }

      setAiResult(json as AiResult);
    } catch (err: any) {
      setAiError(err?.message ?? "AI assist failed.");
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <Container>
      <div className="space-y-6">
        <Card>
          <CardHeader
            title="Contacts Command Center"
            subtitle="Search, enrich, assign, and prioritize people across the campaign CRM."
          />
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                ["Total Contacts", stats.total],
                ["Reachable by Phone", stats.withPhone],
                ["Reachable by Email", stats.withEmail],
                ["Needs Follow-Up", stats.needsFollowUp],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_0.9fr]">
              <div className="space-y-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="xl:col-span-2">
                    <Label htmlFor="search">Search Contacts</Label>
                    <Input
                      id="search"
                      placeholder="Name, hashtag, phone, email, skill, organization…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="locationFilter">Location</Label>
                    <Input
                      id="locationFilter"
                      list="contact-location-options"
                      placeholder="County or city"
                      value={locationFilter}
                      onChange={(e) => setLocationFilter(e.target.value)}
                    />
                    <datalist id="contact-location-options">
                      {allLocations.map((value) => (
                        <option key={value} value={value} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <Label htmlFor="categoryFilter">Category</Label>
                    <Select
                      id="categoryFilter"
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                      <option value="ALL">All</option>
                      <option value="VOTER">Voter</option>
                      <option value="VOLUNTEER">Volunteer</option>
                      <option value="DONOR">Donor</option>
                      <option value="LEADER">Leader</option>
                      <option value="PRESS">Press</option>
                      <option value="STAFF">Staff</option>
                      <option value="OTHER">Other</option>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="tagFilter">Hashtag / Tag</Label>
                  <Input
                    id="tagFilter"
                    list="contact-tag-options"
                    placeholder="Ex: volunteer, radio, pulaski, field-team"
                    value={tagFilter}
                    onChange={(e) => setTagFilter(e.target.value)}
                  />
                  <datalist id="contact-tag-options">
                    {allTags.map((value) => (
                      <option key={value} value={value} />
                    ))}
                  </datalist>
                </div>

                <div className="flex flex-wrap gap-2">
                  {allTags.slice(0, 12).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className={[
                        "rounded-full border px-3 py-1 text-xs font-semibold transition",
                        matchesLoose(tag, tagFilter)
                          ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
                      ].join(" ")}
                      onClick={() => setTagFilter(tag)}
                    >
                      #{tag}
                    </button>
                  ))}
                  <Button variant="ghost" size="sm" onClick={() => {
                    setSearch("");
                    setLocationFilter("");
                    setTagFilter("");
                    setCategoryFilter("ALL");
                    setAiResult(null);
                    setAiError(null);
                  }}>
                    Reset filters
                  </Button>
                </div>
              </div>

              <div className="space-y-4 rounded-2xl bg-slate-900 p-4 text-white ring-1 ring-slate-800">
                <div>
                  <div className="text-sm font-semibold">AI Mission Finder</div>
                  <HelpText className="mt-1 text-slate-300">
                    Ask the model to surface the best contacts by hashtag, geography, skills,
                    support level, or organizing fit.
                  </HelpText>
                </div>

                <div>
                  <Label htmlFor="aiPrompt" className="text-slate-200">
                    Mission prompt
                  </Label>
                  <Textarea
                    id="aiPrompt"
                    className="mt-2 min-h-[120px] border-slate-700 bg-slate-950 text-white placeholder:text-slate-500"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <Button onClick={runAiAssist} disabled={aiBusy || !contacts.length}>
                    {aiBusy ? "Thinking…" : "Run AI assist"}
                  </Button>
                  <div className="text-xs text-slate-300">Analyzes up to 200 loaded contacts.</div>
                </div>

                {aiError ? <div className="text-sm text-rose-300">{aiError}</div> : null}

                {aiResult ? (
                  <div className="space-y-3 rounded-2xl bg-slate-950 p-4 ring-1 ring-slate-800">
                    {aiResult.summary ? (
                      <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">Summary</div>
                        <p className="mt-1 text-sm leading-relaxed text-slate-100">{aiResult.summary}</p>
                      </div>
                    ) : null}

                    {aiResult.suggestedTags?.length ? (
                      <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">Suggested tags</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {aiResult.suggestedTags.map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-100"
                              onClick={() => setTagFilter(tag)}
                            >
                              #{tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {aiResult.suggestedLocations?.length ? (
                      <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">Suggested locations</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {aiResult.suggestedLocations.map((location) => (
                            <button
                              key={location}
                              type="button"
                              className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-100"
                              onClick={() => setLocationFilter(location)}
                            >
                              {location}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {aiResult.nextStep ? (
                      <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">Recommended next step</div>
                        <p className="mt-1 text-sm text-slate-100">{aiResult.nextStep}</p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Directory"
            subtitle="Open a profile to add notes, tags, assignments, and follow-up actions."
          />
          <CardContent>
            {loading ? (
              <div className="text-sm text-slate-500">Loading contacts…</div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-3 text-left">Name</th>
                      <th className="p-3 text-left">Reach</th>
                      <th className="p-3 text-left">Location</th>
                      <th className="p-3 text-left">Tags / Skills</th>
                      <th className="p-3 text-left">Follow-Up</th>
                      <th className="p-3 text-left">Next Target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c) => {
                      const location = [c.city, c.county, c.state].filter(Boolean).join(", ");
                      const tags = [...(c.tags ?? []), ...(c.rolePotential ?? [])]
                        .filter(Boolean)
                        .slice(0, 4)
                        .join(", ");
                      const followStatus = c.followUpStatus ?? "NONE";
                      const followTarget = c.followUpTargetAt
                        ? new Date(c.followUpTargetAt).toLocaleDateString()
                        : "";
                      const aiBoost = aiResult?.recommendedIds?.includes(c.id);

                      return (
                        <tr
                          key={c.id}
                          className={[
                            "cursor-pointer border-t hover:bg-slate-50",
                            rowStyle(c.followUpStatus),
                            aiBoost ? "ring-2 ring-inset ring-indigo-300" : "",
                          ].join(" ")}
                          onClick={() => navigate(`/contacts/${c.id}`)}
                        >
                          <td className="p-3 font-medium text-slate-900">
                            <div className="flex items-center gap-2">
                              <span>{c.fullName ?? "Unnamed Contact"}</span>
                              {aiBoost ? (
                                <span className="rounded-full bg-indigo-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-indigo-700">
                                  AI match
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="p-3">
                            <div>{c.phone || "—"}</div>
                            <div className="text-xs text-slate-500">{c.email || "No email"}</div>
                          </td>
                          <td className="p-3">{location || "—"}</td>
                          <td className="p-3">{tags || "—"}</td>
                          <td className="p-3">{followStatus}</td>
                          <td className="p-3">{followTarget || "—"}</td>
                        </tr>
                      );
                    })}

                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-500">
                          No contacts found.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
