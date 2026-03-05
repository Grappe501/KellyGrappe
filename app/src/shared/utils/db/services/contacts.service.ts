import {
  openDb,
  reqToPromise,
  txDone,
  nowIso,
  safeTrim,
  uuid,
  STORE_CONTACTS,
} from "../contactsDb.core";

import type { Contact, ContactDirectoryRow } from "../contactsDb.types";

/* --------------------------------- UTILS -------------------------------- */

function normalizePhone(raw: string): string {
  return safeTrim(raw).replace(/\D/g, "");
}

function uniqStrings(list: unknown): string[] | undefined {
  if (!Array.isArray(list)) return undefined;

  const seen = new Set<string>();
  const out: string[] = [];

  for (const v of list) {
    const s = safeTrim(v);
    if (!s) continue;

    const k = s.toLowerCase();
    if (seen.has(k)) continue;

    seen.add(k);
    out.push(s);
  }

  return out.length ? out : undefined;
}

function pickNonEmpty<T>(next: T | undefined, prev: T | undefined): T | undefined {
  if (typeof next === "string") {
    const v = safeTrim(next);
    return (v ? (v as T) : prev);
  }

  if (Array.isArray(next)) return (next.length ? (next as T) : prev);

  if (typeof next === "boolean") return next as T;

  if (typeof next === "number") return (Number.isFinite(next) ? next : prev) as T;

  return (next ?? prev);
}

/**
 * For required string fields (like Contact.fullName),
 * guarantee we never return undefined.
 */
function pickNonEmptyRequiredString(next: unknown, prev: string): string {
  const v = safeTrim(next);
  if (v) return v;
  return safeTrim(prev) || "";
}

async function findContactByEmailOrPhone(
  db: IDBDatabase,
  email?: string,
  phone?: string
): Promise<Contact | null> {
  const tx = db.transaction(STORE_CONTACTS, "readonly");
  const store = tx.objectStore(STORE_CONTACTS);

  try {
    const e = safeTrim(email).toLowerCase();
    const p = safeTrim(phone);

    if (e && store.indexNames.contains("email")) {
      const idx = store.index("email");
      const hits = (await reqToPromise(idx.getAll(e))) as Contact[];
      if (hits?.length) return hits[0] ?? null;
    }

    if (p && store.indexNames.contains("phone")) {
      const idx = store.index("phone");
      const hits = (await reqToPromise(idx.getAll(p))) as Contact[];
      if (hits?.length) return hits[0] ?? null;
    }

    return null;
  } finally {
    await txDone(tx).catch(() => {});
  }
}

/* --------------------------------- API ---------------------------------- */

export async function upsertContact(
  input: Partial<Contact> & { fullName?: string; email?: string; phone?: string }
): Promise<Contact> {
  const db = await openDb();

  const email = safeTrim(input.email).toLowerCase() || undefined;

  const phoneRaw = safeTrim(input.phone);
  const phone = phoneRaw ? normalizePhone(phoneRaw) : undefined;

  const existing = await findContactByEmailOrPhone(db, email, phone);

  // ✅ IMPORTANT: ensure required Contact fields exist even for brand-new records
  const base: Contact = existing
    ? { ...existing }
    : {
        id: uuid(),
        createdAt: nowIso(),
        updatedAt: nowIso(),

        // required field in Contact type
        fullName: "",

        // defaults
        state: "AR",
        tags: [],
        teamAssignments: [],
        rolePotential: [],
      };

  const next: Contact = {
    ...base,
    updatedAt: nowIso(),

    // ✅ fullName MUST be a string
    fullName: pickNonEmptyRequiredString(input.fullName, base.fullName),

    email: pickNonEmpty(email, base.email),
    phone: pickNonEmpty(phone, base.phone),

    city: pickNonEmpty(safeTrim(input.city) || undefined, base.city),
    county: pickNonEmpty(safeTrim(input.county) || undefined, base.county),

    // ✅ guarantee state is never blank
    state: pickNonEmpty(safeTrim(input.state) || undefined, base.state) || "AR",

    zip: pickNonEmpty(safeTrim(input.zip) || undefined, base.zip),

    precinct: pickNonEmpty(safeTrim(input.precinct) || undefined, base.precinct),

    congressionalDistrict: pickNonEmpty(
      safeTrim(input.congressionalDistrict) || undefined,
      base.congressionalDistrict
    ),

    stateHouseDistrict: pickNonEmpty(
      safeTrim(input.stateHouseDistrict) || undefined,
      base.stateHouseDistrict
    ),

    stateSenateDistrict: pickNonEmpty(
      safeTrim(input.stateSenateDistrict) || undefined,
      base.stateSenateDistrict
    ),

    category: pickNonEmpty(input.category, base.category),
    supportLevel: pickNonEmpty(input.supportLevel, base.supportLevel),
    bestContactMethod: pickNonEmpty(input.bestContactMethod, base.bestContactMethod),

    teamAssignments: pickNonEmpty(
      uniqStrings(input.teamAssignments as unknown) as any,
      base.teamAssignments
    ) as any,

    rolePotential: pickNonEmpty(
      uniqStrings(input.rolePotential ?? []) as any,
      base.rolePotential
    ) as any,

    tags: pickNonEmpty(
      uniqStrings(input.tags ?? []) as any,
      base.tags
    ) as any,

    introducedBy: pickNonEmpty(safeTrim(input.introducedBy) || undefined, base.introducedBy),
    organization: pickNonEmpty(safeTrim(input.organization) || undefined, base.organization),
    metWhere: pickNonEmpty(safeTrim(input.metWhere) || undefined, base.metWhere),
    eventName: pickNonEmpty(safeTrim(input.eventName) || undefined, base.eventName),

    metWhereDetails: pickNonEmpty(
      safeTrim(input.metWhereDetails) || undefined,
      base.metWhereDetails
    ),

    topIssue: pickNonEmpty(safeTrim(input.topIssue) || undefined, base.topIssue),

    conversationNotes: pickNonEmpty(
      safeTrim(input.conversationNotes) || undefined,
      base.conversationNotes
    ),
  };

  const tx = db.transaction(STORE_CONTACTS, "readwrite");
  try {
    tx.objectStore(STORE_CONTACTS).put(next);
    await txDone(tx);
    return next;
  } catch (e: any) {
    throw new Error(e?.message ?? "Failed to save contact.");
  }
}

export async function getContactById(id: string): Promise<Contact | null> {
  const db = await openDb();
  const tx = db.transaction(STORE_CONTACTS, "readonly");
  const store = tx.objectStore(STORE_CONTACTS);

  try {
    const row = (await reqToPromise(store.get(id))) as Contact | undefined;
    await txDone(tx);
    return row ?? null;
  } catch (e: any) {
    await txDone(tx).catch(() => {});
    throw new Error(e?.message ?? "Failed to load contact.");
  }
}

export async function updateContact(id: string, patch: Partial<Contact>): Promise<Contact | null> {
  const db = await openDb();
  const tx = db.transaction(STORE_CONTACTS, "readwrite");
  const store = tx.objectStore(STORE_CONTACTS);

  try {
    const existing = (await reqToPromise(store.get(id))) as Contact | undefined;

    if (!existing) {
      await txDone(tx);
      return null;
    }

    // ✅ protect required string field
    const patchedFullName =
      patch.fullName !== undefined
        ? pickNonEmptyRequiredString(patch.fullName, existing.fullName)
        : existing.fullName;

    const next: Contact = {
      ...existing,
      ...patch,
      fullName: patchedFullName,
      updatedAt: nowIso(),
    };

    store.put(next);
    await txDone(tx);
    return next;
  } catch (e: any) {
    await txDone(tx).catch(() => {});
    throw new Error(e?.message ?? "Failed to update contact.");
  }
}

export async function listContactsDirectoryRows(): Promise<ContactDirectoryRow[]> {
  const db = await openDb();
  const tx = db.transaction(STORE_CONTACTS, "readonly");
  const store = tx.objectStore(STORE_CONTACTS);

  try {
    const rows = (await reqToPromise(store.getAll())) as Contact[];
    await txDone(tx);

    return (rows ?? []).map((c) => ({
      id: c.id,
      fullName: c.fullName,
      phone: c.phone,
      email: c.email,
      city: c.city,
      county: c.county,
      tags: c.tags,
      category: c.category,
      supportLevel: c.supportLevel,
    }));
  } catch (e: any) {
    await txDone(tx).catch(() => {});
    throw new Error(e?.message ?? "Failed to list contacts.");
  }
}

// Full contact list (non-projected). Keep this for modules that want all fields.
export async function listContacts(): Promise<Contact[]> {
  const db = await openDb();
  const tx = db.transaction(STORE_CONTACTS, "readonly");
  const store = tx.objectStore(STORE_CONTACTS);

  try {
    const rows = (await reqToPromise(store.getAll())) as Contact[];
    await txDone(tx);
    return rows ?? [];
  } catch (e: any) {
    await txDone(tx).catch(() => {});
    throw new Error(e?.message ?? "Failed to list contacts.");
  }
}

/* ----------------- RE-EXPORTS FOR OTHER MODULES -----------------
   Some modules import low-level DB helpers from contacts.service.ts.
   Re-export them here to keep the build stable.
------------------------------------------------------------------ */

export {
  openDb,
  reqToPromise,
  txDone,
  nowIso,
  safeTrim,
  uuid,
  STORE_CONTACTS,
};

export type { Contact } from "../contactsDb.types";