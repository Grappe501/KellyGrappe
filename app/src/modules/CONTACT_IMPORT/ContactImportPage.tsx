import React, { useMemo, useState } from "react";

import Container from "../../shared/components/Container";
import { Card, CardContent, CardHeader } from "../../shared/components/Card";
import {
  Button,
  ErrorText,
  HelpText,
  Input,
  Label,
  Select,
  Textarea,
} from "../../shared/components/FormControls";

import {
  addLiveFollowUp,
  addOrigin,
  upsertContact,
} from "../../shared/utils/db/contactsDb";

type CsvParseResult = {
  header: string[];
  rows: string[][];
};

type FieldKey =
  | "fullName"
  | "email"
  | "phone"
  | "city"
  | "county"
  | "state"
  | "zip"
  | "precinct"
  | "congressionalDistrict"
  | "stateHouseDistrict"
  | "stateSenateDistrict"
  | "voterFileId";

type FieldMapping = Partial<Record<FieldKey, number | null>>;

type ImportRowNormalized = {
  fullName?: string;
  email?: string;
  phone?: string;
  city?: string;
  county?: string;
  state?: string;
  zip?: string;
  precinct?: string;
  congressionalDistrict?: string;
  stateHouseDistrict?: string;
  stateSenateDistrict?: string;
  voterFileId?: string;
};

type ImportStats = {
  total: number;
  missingName: number;
  missingKey: number;
  duplicatesInFile: number;
  ready: number;
  skipped: number;
};

function safeTrim(v: unknown) {
  return String(v ?? "").trim();
}

function normalizeEmail(v: unknown) {
  const s = safeTrim(v).toLowerCase();
  return s || "";
}

function normalizePhone(v: unknown) {
  const s = safeTrim(v).replace(/\D/g, "");
  return s || "";
}

function defaultDisplayName(input: {
  fullName?: string;
  email?: string;
  phone?: string;
  voterFileId?: string;
}) {
  const explicit = safeTrim(input.fullName);
  if (explicit) return explicit;

  const email = normalizeEmail(input.email);
  if (email) {
    const local = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();
    if (local) {
      return local
        .split(/\s+/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    }
    return `Unknown Contact (${email})`;
  }

  const phone = normalizePhone(input.phone);
  if (phone) return `Unknown Contact (${phone.slice(-4)})`;

  const voterFileId = safeTrim(input.voterFileId);
  if (voterFileId) return `Unknown Contact (${voterFileId})`;

  return "Unknown Contact";
}

function hasReachableKey(row: ImportRowNormalized) {
  return !!(safeTrim(row.email) || safeTrim(row.phone));
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

  const header = (rows[0] ?? []).map((h) => safeTrim(h));
  const dataRows = rows.slice(1).map((r) => r.map((c) => safeTrim(c)));
  return { header, rows: dataRows };
}

function guessColumnIndex(header: string[], keys: string[]) {
  const lowered = header.map((h) => h.toLowerCase());
  for (const k of keys) {
    const idx = lowered.findIndex((h) => h === k || h.includes(k));
    if (idx >= 0) return idx;
  }
  return null;
}

function buildDefaultMapping(header: string[]): FieldMapping {
  return {
    fullName: guessColumnIndex(header, ["full name", "fullname", "name", "contact"]) ?? null,
    email: guessColumnIndex(header, ["email", "e-mail", "mail"]) ?? null,
    phone: guessColumnIndex(header, ["phone", "cell", "mobile", "sms", "text"]) ?? null,
    city: guessColumnIndex(header, ["city", "town"]) ?? null,
    county: guessColumnIndex(header, ["county"]) ?? null,
    state: guessColumnIndex(header, ["state", "st"]) ?? null,
    zip: guessColumnIndex(header, ["zip", "zipcode", "postal"]) ?? null,
    precinct: guessColumnIndex(header, ["precinct"]) ?? null,
    congressionalDistrict:
      guessColumnIndex(header, ["congressionaldistrict", "congressional district", "cd"]) ?? null,
    stateHouseDistrict:
      guessColumnIndex(header, ["statehousedistrict", "state house district", "house district"]) ?? null,
    stateSenateDistrict:
      guessColumnIndex(header, ["statesenatedistrict", "state senate district", "senate district"]) ?? null,
    voterFileId: guessColumnIndex(header, ["voterid", "voter id", "voterfileid", "file voter id"]) ?? null,
  };
}

function mapRow(row: string[], mapping: FieldMapping): ImportRowNormalized {
  function v(key: FieldKey) {
    const idx = mapping[key];
    if (idx === null || idx === undefined) return "";
    return safeTrim(row[idx] ?? "");
  }

  return {
    fullName: v("fullName") || undefined,
    email: normalizeEmail(v("email")) || undefined,
    phone: normalizePhone(v("phone")) || undefined,
    city: v("city") || undefined,
    county: v("county") || undefined,
    state: v("state") || undefined,
    zip: v("zip") || undefined,
    precinct: v("precinct") || undefined,
    congressionalDistrict: v("congressionalDistrict") || undefined,
    stateHouseDistrict: v("stateHouseDistrict") || undefined,
    stateSenateDistrict: v("stateSenateDistrict") || undefined,
    voterFileId: v("voterFileId") || undefined,
  };
}

function splitTags(raw: string) {
  const parts = raw
    .split(/[\n,]/g)
    .map((s) => safeTrim(s))
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const k = p.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}

function computeStats(rows: ImportRowNormalized[]): ImportStats {
  let missingName = 0;
  let missingKey = 0;
  let ready = 0;

  const seenKey = new Set<string>();
  let duplicatesInFile = 0;

  for (const r of rows) {
    const hasName = !!safeTrim(r.fullName);
    const email = safeTrim(r.email).toLowerCase();
    const phone = safeTrim(r.phone);
    const key = email ? `e:${email}` : phone ? `p:${phone}` : "";

    if (!hasName) missingName++;
    if (!key) missingKey++;
    if (key) {
      if (seenKey.has(key)) duplicatesInFile++;
      else seenKey.add(key);
    }

    if (key) ready++;
  }

  return {
    total: rows.length,
    missingName,
    missingKey,
    duplicatesInFile,
    ready,
    skipped: rows.length - ready,
  };
}

async function postBulkUpsert(payload: unknown) {
  const res = await fetch("/.netlify/functions/contacts-bulk-upsert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (json as any)?.error || `Import API failed (${res.status}).`;
    throw new Error(msg);
  }

  return json as { upserted?: number; missingKey?: number };
}

export default function ContactImportPage() {
  const [fileName, setFileName] = useState<string>("");
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [mapping, setMapping] = useState<FieldMapping>({});

  const [defaultState, setDefaultState] = useState("AR");
  const [tagsRaw, setTagsRaw] = useState<string>("CONTACT_IMPORT");
  const [permissionToContact, setPermissionToContact] = useState<
    "unknown" | "yes" | "no"
  >("unknown");
  const [autoCreateFollowUps, setAutoCreateFollowUps] = useState(true);
  const [followUpInitials, setFollowUpInitials] = useState("SYS");
  const [followUpNotes, setFollowUpNotes] = useState(
    "Imported contact. Reach out, confirm name, and verify preferred contact method."
  );

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<
    | null
    | {
        localUpserted: number;
        localOriginWrites: number;
        localFollowUpsCreated: number;
        serverUpserted?: number;
        serverMissingKey?: number;
        serverError?: string;
      }
  >(null);

  async function handleFile(file: File) {
    setError(null);
    setResult(null);
    setProgress(null);

    const ext = file.name.toLowerCase().split(".").pop();
    if (ext !== "csv") {
      setError("For now, please export as CSV and upload that file.");
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseCsv(text);

      if (!parsed.header.length || !parsed.rows.length) {
        setError("No contacts detected in file.");
        return;
      }

      setFileName(file.name);
      setParseResult(parsed);
      setMapping(buildDefaultMapping(parsed.header));
    } catch (err: any) {
      setError(err?.message ?? "Unable to parse file.");
    }
  }

  const normalizedRows = useMemo(() => {
    if (!parseResult) return [];
    return parseResult.rows.map((row) => {
      const mapped = mapRow(row, mapping);
      return {
        ...mapped,
        state: safeTrim(mapped.state) || defaultState,
      };
    });
  }, [defaultState, mapping, parseResult]);

  const stats = useMemo(() => computeStats(normalizedRows), [normalizedRows]);
  const previewRows = useMemo(() => normalizedRows.slice(0, 25), [normalizedRows]);

  async function importContacts() {
    setBusy(true);
    setError(null);
    setResult(null);

    const tags = splitTags(tagsRaw);
    const importable = normalizedRows.filter((row) => hasReachableKey(row));

    let localUpserted = 0;
    let localOriginWrites = 0;
    let localFollowUpsCreated = 0;

    try {
      for (let i = 0; i < importable.length; i++) {
        const row = importable[i]!;
        setProgress({ done: i + 1, total: importable.length });

        const contact = await upsertContact({
          fullName: defaultDisplayName(row),
          email: row.email,
          phone: row.phone,
          city: row.city,
          county: row.county,
          state: row.state || defaultState,
          zip: row.zip,
          precinct: row.precinct,
          congressionalDistrict: row.congressionalDistrict,
          stateHouseDistrict: row.stateHouseDistrict,
          stateSenateDistrict: row.stateSenateDistrict,
          voterFileId: row.voterFileId,
          tags,
          createdFrom: "IMPORT",
        });
        localUpserted++;

        await addOrigin({
          contactId: contact.id,
          originType: "CONTACT_IMPORT",
          capturedAt: new Date().toISOString(),
          rawPayload: row,
        });
        localOriginWrites++;

        if (autoCreateFollowUps) {
          await addLiveFollowUp({
            contactId: contact.id,
            followUpStatus: "NEW",
            archived: false,
            followUpNotes: followUpNotes,
            notes: followUpNotes,
            name: contact.fullName,
            phone: contact.phone,
            email: contact.email,
            location: [contact.city, contact.county, contact.state].filter(Boolean).join(", "),
            source: "CONTACT_IMPORT",
            entryInitials: followUpInitials,
            permissionToContact: permissionToContact === "yes",
          });
          localFollowUpsCreated++;
        }
      }

      let serverUpserted: number | undefined;
      let serverMissingKey: number | undefined;
      let serverError: string | undefined;

      try {
        const server = await postBulkUpsert({
          batch: {
            sourceType: "CONTACT_IMPORT",
            fileName,
            tags,
            defaultState,
          },
          contacts: importable.map((row) => ({
            full_name: defaultDisplayName(row),
            email: row.email,
            phone: row.phone,
            city: row.city,
            county: row.county,
            state: row.state || defaultState,
            zip: row.zip,
            precinct: row.precinct,
            congressional_district: row.congressionalDistrict,
            state_house_district: row.stateHouseDistrict,
            state_senate_district: row.stateSenateDistrict,
            voter_file_id: row.voterFileId,
            permission_to_contact:
              permissionToContact === "yes"
                ? true
                : permissionToContact === "no"
                ? false
                : undefined,
            tags,
          })),
        });
        serverUpserted = server.upserted;
        serverMissingKey = server.missingKey;
      } catch (serverErr: any) {
        serverError = serverErr?.message ?? "Server sync skipped.";
      }

      setResult({
        localUpserted,
        localOriginWrites,
        localFollowUpsCreated,
        serverUpserted,
        serverMissingKey,
        serverError,
      });
    } catch (err: any) {
      setError(err?.message ?? "Import failed.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <Container>
      <div className="space-y-6">
        <Card>
          <CardHeader
            title="Contact Import Center"
            subtitle="Pull signups into the CRM now, even when the name field is unreadable or missing."
          />
          <CardContent className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
              <div className="space-y-3">
                <Label>Upload CSV</Label>
                <Input type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                <HelpText>
                  Rule in this build: a row can import with an email or a phone number. Missing names
                  get a placeholder so your team can enrich the profile later.
                </HelpText>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">Import readiness</p>
                <p className="mt-2 leading-relaxed">
                  Best for campaign signups, volunteer sheets, event lead lists, petitions, and files
                  with voter IDs or district metadata.
                </p>
              </div>
            </div>

            {parseResult ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {([
                  ["Rows detected", stats.total],
                  ["Ready to import", stats.ready],
                  ["Missing name", stats.missingName],
                  ["Missing email/phone", stats.missingKey],
                ] as const).map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
                  </div>
                ))}
              </div>
            ) : null}

            {parseResult ? (
              <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <h2 className="text-lg font-semibold text-slate-900">Column mapping</h2>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      {(
                        [
                          ["fullName", "Full name"],
                          ["email", "Email"],
                          ["phone", "Phone"],
                          ["city", "City"],
                          ["county", "County"],
                          ["state", "State"],
                          ["zip", "ZIP"],
                          ["precinct", "Precinct"],
                          ["congressionalDistrict", "Congressional district"],
                          ["stateHouseDistrict", "State House district"],
                          ["stateSenateDistrict", "State Senate district"],
                          ["voterFileId", "Voter file ID"],
                        ] as Array<[FieldKey, string]>
                      ).map(([key, label]) => (
                        <div key={key}>
                          <Label>{label}</Label>
                          <Select
                            value={mapping[key] === null || mapping[key] === undefined ? "" : String(mapping[key])}
                            onChange={(e) =>
                              setMapping((prev) => ({
                                ...prev,
                                [key]: e.target.value === "" ? null : Number(e.target.value),
                              }))
                            }
                          >
                            <option value="">Not mapped</option>
                            {parseResult.header.map((h, idx) => (
                              <option key={`${key}-${idx}`} value={idx}>
                                {h}
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
                            <th className="p-2 text-left">Name</th>
                            <th className="p-2 text-left">Email</th>
                            <th className="p-2 text-left">Phone</th>
                            <th className="p-2 text-left">Location</th>
                            <th className="p-2 text-left">Districts</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewRows.map((row, idx) => (
                            <tr key={idx} className="border-t border-slate-200">
                              <td className="p-2">{defaultDisplayName(row)}</td>
                              <td className="p-2">{row.email || "—"}</td>
                              <td className="p-2">{row.phone || "—"}</td>
                              <td className="p-2">{[row.city, row.county, row.state].filter(Boolean).join(", ") || "—"}</td>
                              <td className="p-2 text-xs text-slate-600">
                                {[row.precinct && `P ${row.precinct}`, row.congressionalDistrict && `CD ${row.congressionalDistrict}`, row.stateHouseDistrict && `HD ${row.stateHouseDistrict}`, row.stateSenateDistrict && `SD ${row.stateSenateDistrict}`]
                                  .filter(Boolean)
                                  .join(" • ") || "—"}
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
                    <h2 className="text-lg font-semibold text-slate-900">Import settings</h2>
                    <div className="mt-4 space-y-4">
                      <div>
                        <Label>Default state</Label>
                        <Input value={defaultState} onChange={(e) => setDefaultState(e.target.value.toUpperCase())} />
                      </div>
                      <div>
                        <Label>Tags / hashtags</Label>
                        <Textarea value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} />
                      </div>
                      <div>
                        <Label>Permission to contact</Label>
                        <Select value={permissionToContact} onChange={(e) => setPermissionToContact(e.target.value as any)}>
                          <option value="unknown">Unknown / ask later</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </Select>
                      </div>
                      <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
                        <input
                          className="mt-1"
                          type="checkbox"
                          checked={autoCreateFollowUps}
                          onChange={(e) => setAutoCreateFollowUps(e.target.checked)}
                        />
                        <span>
                          Create NEW follow-up tasks automatically so imported contacts can flow into
                          the assignment board right away.
                        </span>
                      </label>
                      <div>
                        <Label>Follow-up initials</Label>
                        <Input value={followUpInitials} onChange={(e) => setFollowUpInitials(e.target.value.toUpperCase())} />
                      </div>
                      <div>
                        <Label>Default follow-up notes</Label>
                        <Textarea value={followUpNotes} onChange={(e) => setFollowUpNotes(e.target.value)} />
                      </div>
                      <Button disabled={busy || !stats.ready} onClick={importContacts}>
                        {busy ? "Importing…" : `Import ${stats.ready} contacts`}
                      </Button>
                      {progress ? (
                        <HelpText>
                          Processing {progress.done} of {progress.total}…
                        </HelpText>
                      ) : null}
                    </div>
                  </div>

                  {result ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
                      <p className="font-semibold">Import complete</p>
                      <ul className="mt-2 space-y-1">
                        <li>Local contacts saved: {result.localUpserted}</li>
                        <li>Origin records written: {result.localOriginWrites}</li>
                        <li>Follow-ups created: {result.localFollowUpsCreated}</li>
                        <li>Server upserts: {result.serverUpserted ?? 0}</li>
                        {result.serverError ? <li>Server sync note: {result.serverError}</li> : null}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {error ? <ErrorText>{error}</ErrorText> : null}
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
