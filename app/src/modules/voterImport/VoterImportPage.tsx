import React, { useMemo, useState } from "react";

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

type CsvParseResult = {
  header: string[];
  rows: string[][];
};

type VoterFieldKey =
  | "voterId"
  | "firstName"
  | "lastName"
  | "county"
  | "precinct"
  | "congressionalDistrict"
  | "stateHouseDistrict"
  | "stateSenateDistrict"
  | "votingHistory2018"
  | "votingHistory2020"
  | "votingHistory2022"
  | "turnoutScore"
  | "persuasionScore";

type FieldMapping = Partial<Record<VoterFieldKey, number | null>>;

type PreviewRow = {
  voterId?: string;
  firstName?: string;
  lastName?: string;
  county?: string;
  precinct?: string;
  congressionalDistrict?: string;
  stateHouseDistrict?: string;
  stateSenateDistrict?: string;
  votingHistory2018?: boolean;
  votingHistory2020?: boolean;
  votingHistory2022?: boolean;
  turnoutScore?: number;
  persuasionScore?: number;
};

function safeTrim(v: unknown) {
  return String(v ?? "").trim();
}

function parseCsv(text: string): CsvParseResult {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  function pushCell() {
    row.push(cell);
    cell = "";
  }
  function pushRow() {
    if (row.length === 1 && safeTrim(row[0]) === "") {
      row = [];
      return;
    }
    rows.push(row);
    row = [];
  }

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cell += '"';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && ch === ",") {
      pushCell();
      continue;
    }
    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      pushCell();
      pushRow();
      continue;
    }
    cell += ch;
  }

  pushCell();
  pushRow();

  return {
    header: (rows[0] ?? []).map((value) => safeTrim(value)),
    rows: rows.slice(1).map((row) => row.map((value) => safeTrim(value))),
  };
}

function guessColumnIndex(header: string[], keys: string[]) {
  const lowered = header.map((h) => h.toLowerCase());
  for (const key of keys) {
    const idx = lowered.findIndex((h) => h === key || h.includes(key));
    if (idx >= 0) return idx;
  }
  return null;
}

function buildDefaultMapping(header: string[]): FieldMapping {
  return {
    voterId: guessColumnIndex(header, ["voterid", "voter id"]),
    firstName: guessColumnIndex(header, ["firstname", "first name"]),
    lastName: guessColumnIndex(header, ["lastname", "last name", "surname"]),
    county: guessColumnIndex(header, ["county"]),
    precinct: guessColumnIndex(header, ["precinct"]),
    congressionalDistrict: guessColumnIndex(header, ["congressionaldistrict", "congressional district", "cd"]),
    stateHouseDistrict: guessColumnIndex(header, ["statehousedistrict", "state house district", "house district"]),
    stateSenateDistrict: guessColumnIndex(header, ["statesenatedistrict", "state senate district", "senate district"]),
    votingHistory2018: guessColumnIndex(header, ["votinghistory_2018", "votinghistory2018", "2018"]),
    votingHistory2020: guessColumnIndex(header, ["votinghistory_2020", "votinghistory2020", "2020"]),
    votingHistory2022: guessColumnIndex(header, ["votinghistory_2022", "votinghistory2022", "2022"]),
    turnoutScore: guessColumnIndex(header, ["turnoutscore", "turnout score"]),
    persuasionScore: guessColumnIndex(header, ["persuasionscore", "persuasion score"]),
  };
}

function parseBool(raw: unknown): boolean | undefined {
  const value = safeTrim(raw).toLowerCase();
  if (!value) return undefined;
  if (["y", "yes", "true", "1", "voted"].includes(value)) return true;
  if (["n", "no", "false", "0", "did not vote", "not voted"].includes(value)) return false;
  return undefined;
}

function parseNum(raw: unknown): number | undefined {
  const value = Number(safeTrim(raw));
  return Number.isFinite(value) ? value : undefined;
}

function normalizeScore(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  if (value > 1) return Math.max(0, Math.min(1, value / 100));
  return Math.max(0, Math.min(1, value));
}

function computeTurnoutScore(row: PreviewRow) {
  return (
    (row.votingHistory2022 ? 0.5 : 0) +
    (row.votingHistory2020 ? 0.3 : 0) +
    (row.votingHistory2018 ? 0.2 : 0)
  );
}

function mapRow(row: string[], mapping: FieldMapping): PreviewRow {
  function value(key: VoterFieldKey) {
    const idx = mapping[key];
    if (idx === null || idx === undefined) return "";
    return row[idx] ?? "";
  }

  const parsed: PreviewRow = {
    voterId: safeTrim(value("voterId")) || undefined,
    firstName: safeTrim(value("firstName")) || undefined,
    lastName: safeTrim(value("lastName")) || undefined,
    county: safeTrim(value("county")) || undefined,
    precinct: safeTrim(value("precinct")) || undefined,
    congressionalDistrict: safeTrim(value("congressionalDistrict")) || undefined,
    stateHouseDistrict: safeTrim(value("stateHouseDistrict")) || undefined,
    stateSenateDistrict: safeTrim(value("stateSenateDistrict")) || undefined,
    votingHistory2018: parseBool(value("votingHistory2018")),
    votingHistory2020: parseBool(value("votingHistory2020")),
    votingHistory2022: parseBool(value("votingHistory2022")),
    turnoutScore: normalizeScore(parseNum(value("turnoutScore"))),
    persuasionScore: normalizeScore(parseNum(value("persuasionScore"))),
  };

  if (parsed.turnoutScore === undefined) {
    parsed.turnoutScore = computeTurnoutScore(parsed);
  }

  if (parsed.persuasionScore === undefined && parsed.turnoutScore !== undefined) {
    parsed.persuasionScore = Number((1 - parsed.turnoutScore).toFixed(2));
  }

  return parsed;
}

function pct(value?: number) {
  return typeof value === "number" ? `${Math.round(value * 100)}%` : "—";
}

export default function VoterImportPage() {
  const [fileName, setFileName] = useState("");
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [mapping, setMapping] = useState<FieldMapping>({});
  const [notes, setNotes] = useState(
    "Planned statewide import. Include ballot initiative history and precinct-level demographic enrichment after the raw voter load."
  );
  const [status, setStatus] = useState<string | null>(null);

  async function handleFile(file: File) {
    const text = await file.text();
    const parsed = parseCsv(text);
    setFileName(file.name);
    setParseResult(parsed);
    setMapping(buildDefaultMapping(parsed.header));
    setStatus(null);
  }

  const rows = useMemo(() => {
    if (!parseResult) return [];
    return parseResult.rows.slice(0, 400).map((row) => mapRow(row, mapping));
  }, [mapping, parseResult]);

  const previewRows = useMemo(() => rows.slice(0, 20), [rows]);

  const heatRows = useMemo(() => {
    const grouped = new Map<string, PreviewRow[]>();
    for (const row of rows) {
      const key = safeTrim(row.precinct) || "Unknown precinct";
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(row);
    }
    return [...grouped.entries()]
      .map(([precinct, values]) => ({
        precinct,
        count: values.length,
        turnout: values.reduce((sum, value) => sum + (value.turnoutScore ?? 0), 0) / values.length,
        persuasion:
          values.reduce((sum, value) => sum + (value.persuasionScore ?? 0), 0) / values.length,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [rows]);

  function savePlan() {
    const payload = {
      fileName,
      notes,
      mapping,
      generatedAt: new Date().toISOString(),
    };
    localStorage.setItem("kg-voter-import-plan", JSON.stringify(payload));
    setStatus("Import plan staged locally. This overlay prepares the architecture for the large statewide load.");
  }

  return (
    <Container>
      <div className="space-y-6">
        <Card>
          <CardHeader
            title="Voter File Lab"
            subtitle="Stage the statewide voter file, verify scoring columns, and preview precinct heat before the heavy import pipeline goes live."
          />
          <CardContent className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <Label>Upload statewide voter CSV sample</Label>
                <Input type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                <HelpText>
                  Start with a slice or exported sample first. The full statewide file should run through a
                  background import path in the next phase.
                </HelpText>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">Priority columns already modeled</p>
                <p className="mt-2 leading-relaxed">
                  Precinct, CongressionalDistrict, StateHouseDistrict, StateSenateDistrict,
                  VotingHistory_2018, VotingHistory_2020, VotingHistory_2022, TurnoutScore, and
                  PersuasionScore.
                </p>
              </div>
            </div>

            {parseResult ? (
              <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <h2 className="text-lg font-semibold text-slate-900">Column mapping</h2>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      {(
                        [
                          ["voterId", "Voter ID"],
                          ["firstName", "First name"],
                          ["lastName", "Last name"],
                          ["county", "County"],
                          ["precinct", "Precinct"],
                          ["congressionalDistrict", "Congressional district"],
                          ["stateHouseDistrict", "State House district"],
                          ["stateSenateDistrict", "State Senate district"],
                          ["votingHistory2018", "Voting history 2018"],
                          ["votingHistory2020", "Voting history 2020"],
                          ["votingHistory2022", "Voting history 2022"],
                          ["turnoutScore", "Turnout score"],
                          ["persuasionScore", "Persuasion score"],
                        ] as Array<[VoterFieldKey, string]>
                      ).map(([field, label]) => (
                        <div key={field}>
                          <Label>{label}</Label>
                          <Select
                            value={mapping[field] === null || mapping[field] === undefined ? "" : String(mapping[field])}
                            onChange={(e) =>
                              setMapping((prev) => ({
                                ...prev,
                                [field]: e.target.value === "" ? null : Number(e.target.value),
                              }))
                            }
                          >
                            <option value="">Not mapped</option>
                            {parseResult.header.map((header, idx) => (
                              <option key={`${field}-${idx}`} value={idx}>
                                {header}
                              </option>
                            ))}
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <h2 className="text-lg font-semibold text-slate-900">Preview</h2>
                    <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-slate-700">
                          <tr>
                            <th className="p-2 text-left">Voter</th>
                            <th className="p-2 text-left">Precinct</th>
                            <th className="p-2 text-left">Districts</th>
                            <th className="p-2 text-left">Voting history</th>
                            <th className="p-2 text-left">Scores</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewRows.map((row, idx) => (
                            <tr key={idx} className="border-t border-slate-200">
                              <td className="p-2">
                                <div className="font-medium text-slate-900">{[row.firstName, row.lastName].filter(Boolean).join(" ") || row.voterId || "Unknown voter"}</div>
                                <div className="text-xs text-slate-500">{row.voterId || "No ID mapped"}</div>
                              </td>
                              <td className="p-2">{row.precinct || "—"}</td>
                              <td className="p-2 text-xs text-slate-600">
                                {[row.congressionalDistrict && `CD ${row.congressionalDistrict}`, row.stateHouseDistrict && `HD ${row.stateHouseDistrict}`, row.stateSenateDistrict && `SD ${row.stateSenateDistrict}`].filter(Boolean).join(" • ") || "—"}
                              </td>
                              <td className="p-2 text-xs text-slate-600">
                                2018 {row.votingHistory2018 ? "Y" : "N"} • 2020 {row.votingHistory2020 ? "Y" : "N"} • 2022 {row.votingHistory2022 ? "Y" : "N"}
                              </td>
                              <td className="p-2 text-xs text-slate-600">
                                Turnout {pct(row.turnoutScore)} • Persuasion {pct(row.persuasionScore)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <h2 className="text-lg font-semibold text-slate-900">Precinct heat preview</h2>
                    <HelpText>
                      Early averages from the loaded sample. This becomes the foundation for heat maps,
                      voter target universes, and organizer placement once the full file is imported.
                    </HelpText>
                    <div className="mt-4 space-y-3">
                      {heatRows.map((row) => (
                        <div key={row.precinct} className="rounded-xl border border-slate-200 p-3">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-slate-900">{row.precinct}</span>
                            <span className="text-xs text-slate-500">{row.count} sample voters</span>
                          </div>
                          <div className="mt-2 text-sm text-slate-700">
                            Turnout {pct(row.turnout)} • Persuasion {pct(row.persuasion)}
                          </div>
                        </div>
                      ))}
                      {!heatRows.length ? <div className="text-sm text-slate-500">Upload a sample to preview heat rows.</div> : null}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <h2 className="text-lg font-semibold text-slate-900">Import plan notes</h2>
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
                    <div className="mt-4 flex gap-3">
                      <Button onClick={savePlan}>Save import plan</Button>
                    </div>
                    {status ? <p className="mt-3 text-sm text-emerald-700">{status}</p> : null}
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
