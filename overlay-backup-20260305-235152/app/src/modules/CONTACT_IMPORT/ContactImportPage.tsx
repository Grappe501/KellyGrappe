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

import { addOrigin, upsertContact } from "../../shared/utils/db/contactsDb";

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
  | "zip";

type FieldMapping = Partial<Record<FieldKey, number | null>>;

type ImportRowNormalized = {
  fullName?: string;
  email?: string;
  phone?: string;
  city?: string;
  county?: string;
  state?: string;
  zip?: string;
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

// CSV parser that handles quoted values (commas/newlines inside quotes).
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
    // ignore pure-empty trailing row
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
      // escaped quote
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
      // handle CRLF
      if (ch === "\r" && text[i + 1] === "\n") i++;
      pushCell();
      pushRow();
      continue;
    }

    cell += ch;
  }

  // flush last cell/row
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
    fullName: guessColumnIndex(header, ["full name", "fullname", "name", "voter name", "contact", "first", "last"]) ?? null,
    email: guessColumnIndex(header, ["email", "e-mail", "mail"]) ?? null,
    phone: guessColumnIndex(header, ["phone", "cell", "mobile", "sms", "text"]) ?? null,
    city: guessColumnIndex(header, ["city", "town"]) ?? null,
    county: guessColumnIndex(header, ["county"]) ?? null,
    state: guessColumnIndex(header, ["state", "st"]) ?? null,
    zip: guessColumnIndex(header, ["zip", "zipcode", "postal"]) ?? null,
  };
}

function mapRow(row: string[], mapping: FieldMapping): ImportRowNormalized {
  function v(key: FieldKey) {
    const idx = mapping[key];
    if (idx === null || idx === undefined) return "";
    return safeTrim(row[idx] ?? "");
  }

  const fullName = v("fullName");
  const email = normalizeEmail(v("email"));
  const phone = normalizePhone(v("phone"));

  return {
    fullName: fullName || undefined,
    email: email || undefined,
    phone: phone || undefined,
    city: v("city") || undefined,
    county: v("county") || undefined,
    state: v("state") || undefined,
    zip: v("zip") || undefined,
  };
}

function splitTags(raw: string) {
  const parts = raw
    .split(/[,\n]/g)
    .map((s) => safeTrim(s))
    .filter(Boolean);

  // de-dupe case-insensitive
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

type ImportStats = {
  total: number;
  missingName: number;
  missingKey: number;
  duplicatesInFile: number;
  ready: number;
};

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

    if (hasName && key) ready++;
  }

  return {
    total: rows.length,
    missingName,
    missingKey,
    duplicatesInFile,
    ready,
  };
}

async function postBulkUpsert(payload: any) {
  const res = await fetch("/.netlify/functions/contacts-bulk-upsert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error || `Import API failed (${res.status}).`;
    throw new Error(msg);
  }

  return json;
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

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null
  );
  const [result, setResult] = useState<
    | null
    | {
        localUpserted: number;
        localOriginWrites: number;
        serverUpserted?: number;
        serverMissingKey?: number;
      }
  >(null);

  async function handleFile(file: File) {
    setError(null);
    setResult(null);
    setProgress(null);

    const ext = file.name.toLowerCase().split(".").pop();
    if (ext !== "csv") {
      setError(
        "For now, please export as CSV and upload that file. (XLSX support is next.)"
      );
      return;
    }

    const text = await file.text();
    const parsed = parseCsv(text);
    if (!parsed.header.length || !parsed.rows.length) {
      setError("No rows detected. Please confirm the file has a header row and data.");
      return;
    }

    setParseResult(parsed);
    setMapping(buildDefaultMapping(parsed.header));
    setFileName(file.name);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    handleFile(file).catch((err: any) => {
      setError(err?.message ?? "Unable to read file.");
    });
  }

  const normalizedRows = useMemo(() => {
    if (!parseResult) return [] as ImportRowNormalized[];
    return parseResult.rows.map((r) => mapRow(r, mapping));
  }, [parseResult, mapping]);

  const stats = useMemo(() => computeStats(normalizedRows), [normalizedRows]);

  const previewRows = useMemo(() => normalizedRows.slice(0, 25), [normalizedRows]);

  function setMap(key: FieldKey, idxStr: string) {
    const idx = idxStr === "" ? null : Number(idxStr);
    setMapping((prev) => ({ ...prev, [key]: Number.isFinite(idx) ? idx : null }));
  }

  async function importNow() {
    if (!parseResult) return;

    setBusy(true);
    setError(null);
    setResult(null);
    setProgress({ done: 0, total: normalizedRows.length });

    const tags = splitTags(tagsRaw);
    const permVal =
      permissionToContact === "yes"
        ? true
        : permissionToContact === "no"
        ? false
        : null;

    let localUpserted = 0;
    let localOriginWrites = 0;

    // For server sync
    const serverPayloadContacts: any[] = [];

    try {
      // 1) Local import (IndexedDB) — always
      for (let i = 0; i < normalizedRows.length; i++) {
        const r = normalizedRows[i];

        const fullName = safeTrim(r.fullName);
        const email = safeTrim(r.email);
        const phone = safeTrim(r.phone);

        // Skip truly unusable rows
        if (!fullName || (!email && !phone)) {
          setProgress({ done: i + 1, total: normalizedRows.length });
          continue;
        }

        const saved = await upsertContact({
          fullName,
          email: email || undefined,
          phone: phone || undefined,
          city: r.city,
          county: r.county,
          state: safeTrim(r.state) || safeTrim(defaultState) || "AR",
          zip: r.zip,
          tags,
        });

        localUpserted++;

        // Origin record for auditability.
        await addOrigin({
          contactId: saved.id,
          originType: "CONTACT_IMPORT",
          rawPayload: { ...r, fileName },
        });
        localOriginWrites++;

        // Prepare server payload
        serverPayloadContacts.push({
          fullName,
          email: email || undefined,
          phone: phone || undefined,
          city: r.city,
          county: r.county,
          state: safeTrim(r.state) || safeTrim(defaultState) || "AR",
          zip: r.zip,
          tags,
          permissionToContact: permVal,
        });

        setProgress({ done: i + 1, total: normalizedRows.length });
      }

      // 2) Server import (Supabase) — best effort, only if online
      let serverUpserted: number | undefined;
      let serverMissingKey: number | undefined;
      const online = typeof navigator !== "undefined" ? navigator.onLine !== false : true;

      if (online && serverPayloadContacts.length) {
        // chunk to avoid function payload limits
        const CHUNK = 250;
        let serverTotalUpserted = 0;
        let serverTotalMissingKey = 0;

        for (let i = 0; i < serverPayloadContacts.length; i += CHUNK) {
          const chunk = serverPayloadContacts.slice(i, i + CHUNK);
          const json = await postBulkUpsert({
            batch: {
              sourceType: "CONTACT_IMPORT",
              fileName,
              tag: tagsRaw,
            },
            contacts: chunk,
          });

          serverTotalUpserted += Number(json?.upserted ?? 0);
          serverTotalMissingKey += Number(json?.missingKey ?? 0);
        }

        serverUpserted = serverTotalUpserted;
        serverMissingKey = serverTotalMissingKey;
      }

      setResult({
        localUpserted,
        localOriginWrites,
        serverUpserted,
        serverMissingKey,
      });
    } catch (err: any) {
      setError(err?.message ?? "Import failed.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  const header = parseResult?.header ?? [];

  return (
    <Container>
      <Card>
        <CardHeader
          title="Contact Import Center"
          subtitle="Upload a CSV, map columns, validate, and import into the campaign CRM."
        />

        <CardContent className="space-y-8">
          <section className="space-y-3">
            <Label>Upload CSV</Label>
            <Input type="file" accept=".csv" onChange={onFileChange} />
            <HelpText>
              Tip: If you have Excel/Google Sheets, export as CSV and upload the CSV.
            </HelpText>
          </section>

          {parseResult ? (
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{fileName}</div>
                  <HelpText>
                    {stats.total} rows detected • {stats.ready} ready • {stats.missingKey} missing
                    email/phone • {stats.missingName} missing name
                    {stats.duplicatesInFile ? ` • ${stats.duplicatesInFile} duplicates in file` : ""}
                  </HelpText>
                </div>

                <Button
                  onClick={importNow}
                  disabled={busy || stats.ready === 0}
                >
                  {busy ? "Importing…" : "Import Contacts"}
                </Button>
              </div>

              {progress ? (
                <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <div className="text-xs text-slate-600">
                    Import progress: {progress.done} / {progress.total}
                  </div>
                  <div className="mt-2 h-2 w-full rounded bg-slate-200 overflow-hidden">
                    <div
                      className="h-2 bg-indigo-600"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((progress.done / Math.max(1, progress.total)) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ) : null}

              {error ? <ErrorText>{error}</ErrorText> : null}

              {result ? (
                <div className="rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
                  <div className="text-sm font-semibold text-emerald-900">Import complete</div>
                  <div className="mt-1 text-xs text-emerald-900/80">
                    Saved locally: {result.localUpserted} contacts • Origin records: {result.localOriginWrites}
                    {typeof result.serverUpserted === "number" ? (
                      <> • Server upserted: {result.serverUpserted}</>
                    ) : (
                      <> • Server sync: skipped (offline or not configured)</>
                    )}
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-slate-900">1) Map columns</div>
                  <HelpText>
                    Pick which CSV column feeds each contact field. (We auto-guessed — adjust if needed.)
                  </HelpText>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label>Full Name</Label>
                      <Select
                        value={mapping.fullName ?? ""}
                        onChange={(e) => setMap("fullName", e.target.value)}
                      >
                        <option value="">— Not mapped —</option>
                        {header.map((h, i) => (
                          <option key={i} value={i}>
                            {h || `Column ${i + 1}`}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <Label>Email</Label>
                      <Select
                        value={mapping.email ?? ""}
                        onChange={(e) => setMap("email", e.target.value)}
                      >
                        <option value="">— Not mapped —</option>
                        {header.map((h, i) => (
                          <option key={i} value={i}>
                            {h || `Column ${i + 1}`}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <Label>Phone</Label>
                      <Select
                        value={mapping.phone ?? ""}
                        onChange={(e) => setMap("phone", e.target.value)}
                      >
                        <option value="">— Not mapped —</option>
                        {header.map((h, i) => (
                          <option key={i} value={i}>
                            {h || `Column ${i + 1}`}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <Label>City</Label>
                      <Select
                        value={mapping.city ?? ""}
                        onChange={(e) => setMap("city", e.target.value)}
                      >
                        <option value="">— Not mapped —</option>
                        {header.map((h, i) => (
                          <option key={i} value={i}>
                            {h || `Column ${i + 1}`}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <Label>County</Label>
                      <Select
                        value={mapping.county ?? ""}
                        onChange={(e) => setMap("county", e.target.value)}
                      >
                        <option value="">— Not mapped —</option>
                        {header.map((h, i) => (
                          <option key={i} value={i}>
                            {h || `Column ${i + 1}`}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <Label>State</Label>
                      <Select
                        value={mapping.state ?? ""}
                        onChange={(e) => setMap("state", e.target.value)}
                      >
                        <option value="">— Not mapped —</option>
                        {header.map((h, i) => (
                          <option key={i} value={i}>
                            {h || `Column ${i + 1}`}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <Label>ZIP</Label>
                      <Select
                        value={mapping.zip ?? ""}
                        onChange={(e) => setMap("zip", e.target.value)}
                      >
                        <option value="">— Not mapped —</option>
                        {header.map((h, i) => (
                          <option key={i} value={i}>
                            {h || `Column ${i + 1}`}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-semibold text-slate-900">2) Import settings</div>

                  <div>
                    <Label>Default State (if missing)</Label>
                    <Input value={defaultState} onChange={(e) => setDefaultState(e.target.value)} />
                  </div>

                  <div>
                    <Label>Tags (comma or newline separated)</Label>
                    <Textarea value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} />
                    <HelpText>
                      These tags get added to every imported contact. Example: “Petition Signers, Feb 2026”.
                    </HelpText>
                  </div>

                  <div>
                    <Label>Permission to contact</Label>
                    <Select
                      value={permissionToContact}
                      onChange={(e) => setPermissionToContact(e.target.value as any)}
                    >
                      <option value="unknown">Unknown</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </Select>
                    <HelpText>
                      We store this on the server payload so your texting/email tools can respect consent.
                    </HelpText>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-semibold text-slate-900">3) Preview (first 25 rows)</div>
                <div className="border rounded-xl overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="p-2 text-left">Name</th>
                        <th className="p-2 text-left">Email</th>
                        <th className="p-2 text-left">Phone</th>
                        <th className="p-2 text-left">City</th>
                        <th className="p-2 text-left">County</th>
                        <th className="p-2 text-left">State</th>
                        <th className="p-2 text-left">ZIP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((r, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2">{r.fullName}</td>
                          <td className="p-2">{r.email}</td>
                          <td className="p-2">{r.phone}</td>
                          <td className="p-2">{r.city}</td>
                          <td className="p-2">{r.county}</td>
                          <td className="p-2">{r.state || defaultState}</td>
                          <td className="p-2">{r.zip}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ) : (
            <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="text-sm font-semibold text-slate-900">Ready when you are</div>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                Upload a CSV and we’ll walk you through mapping, validating, and importing into the campaign CRM.
              </p>
              {error ? <ErrorText>{error}</ErrorText> : null}
            </div>
          )}

          <section className="space-y-3">
            <div className="text-sm font-semibold text-slate-900">Next up</div>
            <HelpText>
              Coming next: XLSX import, Google Contacts import, device contacts picker, and bulk SMS/email tools.
            </HelpText>
          </section>
        </CardContent>
      </Card>
    </Container>
  );
}
