/* app/src/shared/utils/contactsDb.ts
   Local campaign contact database (IndexedDB) — Supabase-ready schema.

   Goals:
   - One canonical Contact schema used by every module.
   - Origin tracking for every intake (team signup, live field contact, event request, import, etc).
   - Support partial contacts (field data may be incomplete).
   - Keep module-specific details normalized (volunteer profile / interests / event leads).
   - OFFLINE-FIRST: live followups must support write-through + sync status tracking.
*/

export type OriginType =
  | 'TEAM_SIGNUP'
  | 'LIVE_FIELD'
  | 'EVENT_REQUEST'
  | 'BUSINESS_CARD_SCAN'
  | 'IMPORT_CSV'
  | 'MANUAL_ADMIN'
  | 'UNKNOWN';

export type FollowUpStatus = 'NEW' | 'IN_PROGRESS' | 'COMPLETED';

/**
 * SyncStatus is the local-to-server lifecycle marker.
 * - PENDING_SYNC: must be attempted / retried
 * - SYNCED: confirmed on server (serverId set)
 * - ERROR: last attempt failed (kept locally; retry later)
 */
export type SyncStatus = 'PENDING_SYNC' | 'SYNCED' | 'ERROR';

export type Contact = {
  id: string; // uuid
  createdAt: string; // ISO
  updatedAt: string; // ISO

  fullName?: string;
  email?: string;
  phone?: string; // normalized digits preferred

  city?: string;
  county?: string;
  state?: string; // default AR

  // Social / relationship hooks (optional)
  facebookConnected?: boolean;
  facebookProfileName?: string;
  facebookHandle?: string;

  // quick tagging for local-only workflows (optional)
  tags?: string[];
};

export type ContactOrigin = {
  id: string; // uuid
  contactId: string;
  originType: OriginType;
  originRef?: string; // module requestId, import filename, etc
  capturedAt: string; // ISO
  notes?: string;
  rawPayload: Record<string, unknown>;
};

export type VolunteerProfile = {
  contactId: string;

  hoursPerWeek?: string;
  hoursPerWeekOther?: string;

  justStayInTouch?: boolean;
  otherContribution?: string;

  eventInviteDetails?: string;

  contactDate?: string; // ISO date or datetime
  notes?: string;

  teamAssignment?: string;
  partyHost?: boolean;

  permissionToContact?: boolean;
};

export type VolunteerInterest = {
  id: string; // uuid
  contactId: string;
  teamKey: string; // e.g. CREATIVE_DIGITAL
  roleLabel: string; // exact checkbox label
  createdAt: string; // ISO
};

export type EventLead = {
  id: string; // uuid
  contactId: string;
  eventLeadText: string;
  parsedCounty?: string;
  status: 'NEW' | 'TRIAGED' | 'SCHEDULED' | 'DECLINED';
  createdAt: string; // ISO
};

/**
 * LiveFollowUp is the LOCAL canonical unit of field intake.
 * It must never disappear.
 *
 * Sync fields support:
 * - write local immediately
 * - attempt server create
 * - mark SYNCED + serverId if successful
 * - otherwise keep PENDING_SYNC or ERROR and retry later
 */
export type LiveFollowUp = {
  id: string; // uuid
  contactId: string;
  createdAt: string;

  followUpStatus: FollowUpStatus;
  followUpNotes?: string;
  followUpCompletedAt?: string | null;

  archived?: boolean;

  // extra context for list display
  name?: string;
  phone?: string;
  email?: string;
  location?: string;
  notes?: string;

  source?: string;
  automationEligible?: boolean;
  permissionToContact?: boolean;

  // Social / relationship hooks (optional)
  facebookConnected?: boolean;
  facebookProfileName?: string;
  facebookHandle?: string;

  /**
   * NEW: identify who captured the record (3-letter initials like SAG).
   * For backwards compatibility until UI is updated, this may be absent;
   * it will be defaulted to "UNK" at write time.
   */
  entryInitials?: string;

  /**
   * NEW: offline-first sync tracking
   */
  syncStatus?: SyncStatus; // default PENDING_SYNC
  serverId?: string; // set when synced to server
  lastSyncAttemptAt?: string;
  lastSyncError?: string;
  createdOffline?: boolean;
};

type DbName = 'kg_sos_ops_db';
const DB_NAME: DbName = 'kg_sos_ops_db';
const DB_VERSION = 3; // bumped: add live_followups sync indexes

const STORE_CONTACTS = 'contacts';
const STORE_ORIGINS = 'contact_origins';
const STORE_VOL_PROFILES = 'volunteer_profiles';
const STORE_VOL_INTERESTS = 'volunteer_interests';
const STORE_EVENT_LEADS = 'event_leads';
const STORE_LIVE_FOLLOWUPS = 'live_followups';

/* --------------------------------- UTILS -------------------------------- */

function nowIso() {
  return new Date().toISOString();
}

function safeTrim(v: unknown): string {
  return (v ?? '').toString().trim();
}

function normalizePhone(raw: string): string {
  // Keep only digits. (We store normalized digits preferred)
  return safeTrim(raw).replace(/\D/g, '');
}

function normalizeInitials(raw: unknown): string | undefined {
  const v = safeTrim(raw).toUpperCase();
  if (!v) return undefined;

  // keep only letters/numbers, then enforce max 3
  const cleaned = v.replace(/[^A-Z0-9]/g, '').slice(0, 3);
  if (!cleaned) return undefined;
  return cleaned;
}

/**
 * Best-effort offline detection.
 * Used to tag records created when the browser *thinks* it's offline.
 */
function isOfflineBestEffort(): boolean {
  try {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine === false;
  } catch {
    return true;
  }
}

function uuid() {
  try {
    return crypto.randomUUID();
  } catch {
    return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
  });
}

function ensureIndex(
  store: IDBObjectStore,
  indexName: string,
  keyPath: string | string[],
  options?: IDBIndexParameters
) {
  // IDB will throw if index already exists
  try {
    if (!store.indexNames.contains(indexName)) {
      store.createIndex(indexName, keyPath, options ?? { unique: false });
    }
  } catch {
    // Ignore — safest in production upgrades across browsers
  }
}

let dbPromise: Promise<IDBDatabase> | null = null;

async function openDb(): Promise<IDBDatabase> {
  // Protect against SSR or environments without IndexedDB
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB is not available in this environment.');
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;

      // NOTE: adding new optional fields does NOT require rebuilding object stores.
      // Bump DB_VERSION if you add indexes or change keyPaths.

      if (!db.objectStoreNames.contains(STORE_CONTACTS)) {
        const s = db.createObjectStore(STORE_CONTACTS, { keyPath: 'id' });
        s.createIndex('email', 'email', { unique: false });
        s.createIndex('phone', 'phone', { unique: false });
        s.createIndex('fullName', 'fullName', { unique: false });
        s.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_ORIGINS)) {
        const s = db.createObjectStore(STORE_ORIGINS, { keyPath: 'id' });
        s.createIndex('contactId', 'contactId', { unique: false });
        s.createIndex('originType', 'originType', { unique: false });
        s.createIndex('capturedAt', 'capturedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_VOL_PROFILES)) {
        db.createObjectStore(STORE_VOL_PROFILES, { keyPath: 'contactId' });
      }

      if (!db.objectStoreNames.contains(STORE_VOL_INTERESTS)) {
        const s = db.createObjectStore(STORE_VOL_INTERESTS, { keyPath: 'id' });
        s.createIndex('contactId', 'contactId', { unique: false });
        s.createIndex('teamKey', 'teamKey', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_EVENT_LEADS)) {
        const s = db.createObjectStore(STORE_EVENT_LEADS, { keyPath: 'id' });
        s.createIndex('contactId', 'contactId', { unique: false });
        s.createIndex('status', 'status', { unique: false });
      }

      // live followups — either create or upgrade indexes
      if (!db.objectStoreNames.contains(STORE_LIVE_FOLLOWUPS)) {
        const s = db.createObjectStore(STORE_LIVE_FOLLOWUPS, { keyPath: 'id' });
        s.createIndex('contactId', 'contactId', { unique: false });
        s.createIndex('followUpStatus', 'followUpStatus', { unique: false });
        s.createIndex('createdAt', 'createdAt', { unique: false });
        s.createIndex('archived', 'archived', { unique: false });

        // NEW indexes for offline-first sync reliability
        s.createIndex('syncStatus', 'syncStatus', { unique: false });
        s.createIndex('serverId', 'serverId', { unique: false });
        s.createIndex('lastSyncAttemptAt', 'lastSyncAttemptAt', { unique: false });
      } else {
        // Upgrade path: ensure indexes exist without recreating store
        const tx = req.transaction;
        if (tx) {
          const s = tx.objectStore(STORE_LIVE_FOLLOWUPS);

          ensureIndex(s, 'contactId', 'contactId', { unique: false });
          ensureIndex(s, 'followUpStatus', 'followUpStatus', { unique: false });
          ensureIndex(s, 'createdAt', 'createdAt', { unique: false });
          ensureIndex(s, 'archived', 'archived', { unique: false });

          // NEW indexes
          ensureIndex(s, 'syncStatus', 'syncStatus', { unique: false });
          ensureIndex(s, 'serverId', 'serverId', { unique: false });
          ensureIndex(s, 'lastSyncAttemptAt', 'lastSyncAttemptAt', { unique: false });
        }
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open IndexedDB'));
    req.onblocked = () => {
      // Another tab may be holding the DB open during upgrade
      // eslint-disable-next-line no-console
      console.warn(
        '[contactsDb] IndexedDB open blocked. Close other tabs using the app and retry.'
      );
    };
  });

  return dbPromise;
}

/* ------------------------------- CONTACTS ------------------------------- */

async function findContactByEmailOrPhone(
  db: IDBDatabase,
  email?: string,
  phone?: string
): Promise<Contact | null> {
  const tx = db.transaction(STORE_CONTACTS, 'readonly');
  const store = tx.objectStore(STORE_CONTACTS);

  try {
    const e = safeTrim(email).toLowerCase();
    const p = safeTrim(phone);

    // Try email first
    if (e) {
      const idx = store.index('email');
      const hits = (await reqToPromise(idx.getAll(e))) as Contact[];
      if (hits?.length) return hits[0] ?? null;
    }

    // Then phone
    if (p) {
      const idx = store.index('phone');
      const hits = (await reqToPromise(idx.getAll(p))) as Contact[];
      if (hits?.length) return hits[0] ?? null;
    }

    return null;
  } finally {
    // Always allow the transaction to finish cleanly
    await txDone(tx).catch(() => {});
  }
}

/**
 * Upsert contact by:
 * - existing match on email or phone (best-effort)
 * - otherwise creates new
 *
 * Returns the saved Contact.
 */
export async function upsertContact(
  input: Partial<Contact> & { fullName?: string; email?: string; phone?: string }
): Promise<Contact> {
  const db = await openDb();

  const email = safeTrim(input.email).toLowerCase() || undefined;

  // IMPORTANT: avoid passing string|undefined to normalizePhone (TypeScript strict build)
  const phoneRaw = safeTrim(input.phone);
  const phone = phoneRaw ? normalizePhone(phoneRaw) : undefined;

  const existing = await findContactByEmailOrPhone(db, email, phone);

  const base: Contact = existing
    ? { ...existing }
    : {
        id: uuid(),
        createdAt: nowIso(),
        updatedAt: nowIso(),
        state: 'AR',
        tags: [],
      };

  const next: Contact = {
    ...base,
    updatedAt: nowIso(),

    fullName: safeTrim(input.fullName) || base.fullName,
    email: email ?? base.email,
    phone: phone ?? base.phone,

    city: safeTrim(input.city) || base.city,
    county: safeTrim(input.county) || base.county,
    state: safeTrim(input.state) || base.state || 'AR',

    facebookConnected:
      typeof input.facebookConnected === 'boolean'
        ? input.facebookConnected
        : base.facebookConnected,
    facebookProfileName: safeTrim(input.facebookProfileName) || base.facebookProfileName,
    facebookHandle: safeTrim(input.facebookHandle) || base.facebookHandle,

    tags: Array.isArray(input.tags) ? input.tags : base.tags,
  };

  const tx = db.transaction(STORE_CONTACTS, 'readwrite');
  try {
    tx.objectStore(STORE_CONTACTS).put(next);
    await txDone(tx);
    return next;
  } catch (e: any) {
    // Make failures readable in the UI
    throw new Error(e?.message ?? 'Failed to save contact.');
  }
}

/* ------------------------------- ORIGINS -------------------------------- */

export async function addOrigin(params: {
  contactId: string;
  originType: OriginType;
  originRef?: string;
  notes?: string;
  rawPayload: Record<string, unknown>;
  capturedAt?: string;
}): Promise<ContactOrigin> {
  const db = await openDb();

  const origin: ContactOrigin = {
    id: uuid(),
    contactId: params.contactId,
    originType: params.originType,
    originRef: params.originRef,
    capturedAt: params.capturedAt ?? nowIso(),
    notes: params.notes,
    rawPayload: params.rawPayload ?? {},
  };

  const tx = db.transaction(STORE_ORIGINS, 'readwrite');
  try {
    tx.objectStore(STORE_ORIGINS).add(origin);
    await txDone(tx);
    return origin;
  } catch (e: any) {
    throw new Error(e?.message ?? 'Failed to add origin log.');
  }
}

/* -------------------------- VOLUNTEER PROFILES -------------------------- */

export async function upsertVolunteerProfile(
  profile: VolunteerProfile
): Promise<VolunteerProfile> {
  const db = await openDb();

  const tx = db.transaction(STORE_VOL_PROFILES, 'readwrite');
  try {
    tx.objectStore(STORE_VOL_PROFILES).put(profile);
    await txDone(tx);
    return profile;
  } catch (e: any) {
    throw new Error(e?.message ?? 'Failed to save volunteer profile.');
  }
}

export async function replaceVolunteerInterests(params: {
  contactId: string;
  interests: Array<{ teamKey: string; roleLabel: string }>;
}): Promise<void> {
  const db = await openDb();

  const tx = db.transaction(STORE_VOL_INTERESTS, 'readwrite');
  const store = tx.objectStore(STORE_VOL_INTERESTS);
  const index = store.index('contactId');

  try {
    // delete all existing for contact
    const existing = (await reqToPromise(index.getAll(params.contactId))) as VolunteerInterest[];

    for (const row of existing || []) {
      store.delete(row.id);
    }

    const createdAt = nowIso();
    for (const it of params.interests) {
      const teamKey = safeTrim(it.teamKey);
      const roleLabel = safeTrim(it.roleLabel);
      if (!teamKey || !roleLabel) continue;

      const row: VolunteerInterest = {
        id: uuid(),
        contactId: params.contactId,
        teamKey,
        roleLabel,
        createdAt,
      };
      store.add(row);
    }

    await txDone(tx);
  } catch (e: any) {
    throw new Error(e?.message ?? 'Failed to replace volunteer interests.');
  }
}

/* ------------------------------- EVENT LEADS ---------------------------- */

export async function addEventLead(params: {
  contactId: string;
  eventLeadText: string;
  parsedCounty?: string;
}): Promise<EventLead> {
  const db = await openDb();

  const lead: EventLead = {
    id: uuid(),
    contactId: params.contactId,
    eventLeadText: safeTrim(params.eventLeadText),
    parsedCounty: safeTrim(params.parsedCounty) || undefined,
    status: 'NEW',
    createdAt: nowIso(),
  };

  const tx = db.transaction(STORE_EVENT_LEADS, 'readwrite');
  try {
    tx.objectStore(STORE_EVENT_LEADS).add(lead);
    await txDone(tx);
    return lead;
  } catch (e: any) {
    throw new Error(e?.message ?? 'Failed to add event lead.');
  }
}

/* ---------------------------- LIVE FOLLOW-UPS --------------------------- */

function applyLiveFollowUpDefaults(
  input: Partial<LiveFollowUp>
): Partial<LiveFollowUp> {
  const entryInitials = normalizeInitials(input.entryInitials) ?? 'UNK';

  const syncStatus: SyncStatus = (input.syncStatus as SyncStatus) ?? 'PENDING_SYNC';

  const createdOffline =
    typeof input.createdOffline === 'boolean'
      ? input.createdOffline
      : isOfflineBestEffort();

  return {
    ...input,
    entryInitials,
    syncStatus,
    createdOffline,
  };
}

/**
 * UI helper: stable badge label for local rows.
 * Use this in the board if you want consistent wording.
 */
export function syncStatusLabel(s?: SyncStatus): 'Synced' | 'Pending Sync' | 'Sync Error' {
  const v = (s ?? 'PENDING_SYNC') as SyncStatus;
  if (v === 'SYNCED') return 'Synced';
  if (v === 'ERROR') return 'Sync Error';
  return 'Pending Sync';
}

/**
 * UI helper: stable severity level for local rows.
 */
export function syncStatusLevel(s?: SyncStatus): 'OK' | 'PENDING' | 'ERROR' {
  const v = (s ?? 'PENDING_SYNC') as SyncStatus;
  if (v === 'SYNCED') return 'OK';
  if (v === 'ERROR') return 'ERROR';
  return 'PENDING';
}

export async function addLiveFollowUp(
  input: Omit<LiveFollowUp, 'id' | 'createdAt'> & { createdAt?: string }
): Promise<LiveFollowUp> {
  const db = await openDb();

  const base: LiveFollowUp = {
    id: uuid(),
    createdAt: input.createdAt ?? nowIso(),
    ...input,
  };

  const row: LiveFollowUp = {
    ...base,
    ...(applyLiveFollowUpDefaults(base) as LiveFollowUp),
  };

  const tx = db.transaction(STORE_LIVE_FOLLOWUPS, 'readwrite');
  try {
    tx.objectStore(STORE_LIVE_FOLLOWUPS).add(row);
    await txDone(tx);
    return row;
  } catch (e: any) {
    throw new Error(e?.message ?? 'Failed to add live follow-up.');
  }
}

export async function updateLiveFollowUp(
  id: string,
  patch: Partial<LiveFollowUp>
): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_LIVE_FOLLOWUPS, 'readwrite');
  const store = tx.objectStore(STORE_LIVE_FOLLOWUPS);

  try {
    const existing = (await reqToPromise(store.get(id))) as LiveFollowUp | undefined;

    if (!existing) {
      await txDone(tx);
      return;
    }

    const next = {
      ...existing,
      ...patch,
    } as LiveFollowUp;

    // ensure defaults never disappear
    const normalized = applyLiveFollowUpDefaults(next) as LiveFollowUp;

    store.put({ ...next, ...normalized });
    await txDone(tx);
  } catch (e: any) {
    throw new Error(e?.message ?? 'Failed to update live follow-up.');
  }
}

export async function listLiveFollowUps(): Promise<LiveFollowUp[]> {
  const db = await openDb();
  const tx = db.transaction(STORE_LIVE_FOLLOWUPS, 'readonly');
  const store = tx.objectStore(STORE_LIVE_FOLLOWUPS);

  try {
    const all = (await reqToPromise(store.getAll())) as LiveFollowUp[];
    await txDone(tx);

    // newest first
    return (all || []).sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
  } catch (e: any) {
    // Ensure we don't leak an unfinished tx if something throws
    await txDone(tx).catch(() => {});
    throw new Error(e?.message ?? 'Failed to list live follow-ups.');
  }
}

/**
 * NEW: list only items that need a server write or retry.
 *
 * IMPORTANT:
 * - Includes both PENDING_SYNC and ERROR
 * - Excludes SYNCED
 * - Sorted oldest-first to preserve fairness
 */
export async function listLiveFollowUpsPendingSync(): Promise<LiveFollowUp[]> {
  const db = await openDb();
  const tx = db.transaction(STORE_LIVE_FOLLOWUPS, 'readonly');
  const store = tx.objectStore(STORE_LIVE_FOLLOWUPS);

  try {
    let rows: LiveFollowUp[] = [];

    if (store.indexNames.contains('syncStatus')) {
      const idx = store.index('syncStatus');

      const pending = (await reqToPromise(idx.getAll('PENDING_SYNC' as any))) as LiveFollowUp[];
      const errors = (await reqToPromise(idx.getAll('ERROR' as any))) as LiveFollowUp[];

      rows = [...(pending || []), ...(errors || [])];
    } else {
      // fallback: full scan (should not happen after v3 upgrade)
      const all = (await reqToPromise(store.getAll())) as LiveFollowUp[];
      rows = (all || []).filter((r) => r.syncStatus !== 'SYNCED');
    }

    await txDone(tx);

    // prioritize oldest pending first for queue fairness
    return (rows || []).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  } catch (e: any) {
    await txDone(tx).catch(() => {});
    throw new Error(e?.message ?? 'Failed to list pending sync follow-ups.');
  }
}

export async function markLiveFollowUpPendingSync(params: {
  id: string;
  lastSyncAttemptAt?: string;
  lastSyncError?: string;
}): Promise<void> {
  await updateLiveFollowUp(params.id, {
    syncStatus: 'PENDING_SYNC',
    lastSyncAttemptAt: params.lastSyncAttemptAt ?? nowIso(),
    lastSyncError: params.lastSyncError,
  });
}

export async function markLiveFollowUpSynced(params: {
  id: string;
  serverId: string;
}): Promise<void> {
  await updateLiveFollowUp(params.id, {
    syncStatus: 'SYNCED',
    serverId: safeTrim(params.serverId) || undefined,
    lastSyncAttemptAt: nowIso(),
    lastSyncError: undefined,
  });
}

export async function markLiveFollowUpSyncError(params: {
  id: string;
  error: string;
}): Promise<void> {
  await updateLiveFollowUp(params.id, {
    syncStatus: 'ERROR',
    lastSyncAttemptAt: nowIso(),
    lastSyncError: safeTrim(params.error) || 'Unknown sync error',
  });
}

/* --------------------------- UTILS FOR MODULES -------------------------- */

export function parseCityCounty(raw: string): { city?: string; county?: string } {
  const v = safeTrim(raw);
  if (!v) return {};

  // heuristic: "City, County" or "City / County"
  const parts = v
    .split(/,|\/|—|-|•/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 1) return { city: parts[0] };
  if (parts.length >= 2) return { city: parts[0], county: parts[1] };
  return { city: v };
}