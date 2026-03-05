/* app/src/shared/utils/contactsDb.ts
   Local campaign contact database (IndexedDB) — Supabase-ready schema.

   Goals:
   - One canonical Contact schema used by every module.
   - Origin tracking for every intake (team signup, live field contact, event request, import, etc).
   - Support partial contacts (field data may be incomplete).
   - Keep module-specific details normalized (volunteer profile / interests / event leads).
   - OFFLINE-FIRST: live followups + media must support write-through + sync status tracking.
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

/* --------------------------------- CONTACTS -------------------------------- */

export type SupportLevel =
  | 'STRONG_SUPPORT'
  | 'LEAN_SUPPORT'
  | 'UNDECIDED'
  | 'LEAN_OPPOSE'
  | 'STRONG_OPPOSE';

export type BestContactMethod =
  | 'TEXT'
  | 'CALL'
  | 'EMAIL'
  | 'FB'
  | 'IG'
  | 'TIKTOK'
  | 'IN_PERSON';

export type ContactCategory =
  | 'VOLUNTEER'
  | 'CORE_VOLUNTEER_LEADER'
  | 'PRECINCT_CAPTAIN'
  | 'COUNTY_LEADER'
  | 'CAMPAIGN_STAFF'
  | 'DONOR'
  | 'MAJOR_DONOR'
  | 'FUNDRAISER'
  | 'COMMUNITY_LEADER'
  | 'FAITH_LEADER'
  | 'BUSINESS_LEADER'
  | 'UNION_LEADER'
  | 'ADVOCATE'
  | 'MEDIA'
  | 'INFLUENCER'
  | 'PARTNER_ORG'
  | 'VENDOR'
  | 'SUPPORTER'
  | 'UNDECIDED_VOTER'
  | 'OPPOSITION'
  | 'OTHER';

export type CampaignTeam =
  | 'CREATIVE_DIGITAL'
  | 'COMMUNICATIONS_PR'
  | 'CONSTITUENT_SERVICES'
  | 'DEMOCRACY_RIGHTS'
  | 'FIELD_EVENTS'
  | 'FINANCE_FUNDRAISING'
  | 'OPERATIONS'
  | 'OUTREACH_ORGANIZING'
  | 'SOCIAL_STORYTELLING';

export type Contact = {
  id: string; // uuid
  createdAt: string; // ISO
  updatedAt: string; // ISO

  // Identity
  fullName?: string;
  email?: string;
  phone?: string; // normalized digits preferred

  // Location / routing
  city?: string;
  county?: string;
  state?: string; // default AR
  zip?: string;

  // Political geography (manual now; can be auto-filled later with civic APIs)
  precinct?: string;
  congressionalDistrict?: string; // e.g. AR-02
  stateHouseDistrict?: string; // e.g. HD-45
  stateSenateDistrict?: string; // e.g. SD-18

  // Campaign intelligence
  category?: ContactCategory;
  supportLevel?: SupportLevel;
  bestContactMethod?: BestContactMethod;

  teamAssignments?: CampaignTeam[]; // multiple
  rolePotential?: string[]; // freeform now, normalize later
  tags?: string[];

  // Relationship + context
  introducedBy?: string;
  organization?: string;
  metWhere?: string;
  eventName?: string;
  metWhereDetails?: string;

  topIssue?: string;
  conversationNotes?: string;

  // Engagement signals
  interestedVolunteer?: boolean;
  interestedDonate?: boolean;
  interestedHostEvent?: boolean;
  interestedYardSign?: boolean;
  interestedCountyLeader?: boolean;
  interestedPrecinctCaptain?: boolean;

  // Scoring (optional)
  influenceScore?: number; // 1-5
  fundraisingPotential?: number; // 1-5
  volunteerPotential?: number; // 1-5

  createdFrom?: OriginType;

  // Social
  facebookConnected?: boolean;
  facebookProfileName?: string;
  facebookHandle?: string;
  facebookUrl?: string;

  instagramHandle?: string;
  twitterHandle?: string;
  linkedinUrl?: string;
  tiktokHandle?: string;
  tiktokUrl?: string;

  // Media pointers (server-side URL once uploaded)
  profilePhotoUrl?: string;
};

export type ContactDirectoryRow = {
  id: string

  fullName?: string
  phone?: string
  email?: string

  city?: string
  county?: string

  category?: string
  supportLevel?: string

  tags?: string[]

  /**
   * Follow-up pipeline status
   */
  followUpStatus?: "CRITICAL" | "NEW" | "IN_PROGRESS" | "COMPLETED" | "ARCHIVED"

  /**
   * Target follow-up date
   */
  followUpTargetAt?: string
}

export async function listContactsDirectoryRows(): Promise<ContactDirectoryRow[]> {
  const db = await openDb()

  const tx = db.transaction(STORE_CONTACTS, "readonly")
  const store = tx.objectStore(STORE_CONTACTS)

  const rows = await reqToPromise(store.getAll())

  await txDone(tx)

  return rows.map((c: Contact) => ({
    id: c.id,
    fullName: c.fullName,
    phone: c.phone,
    email: c.email,
    city: c.city,
    county: c.county,
    tags: c.tags,
  }))
}

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

/* --------------------------------- MEDIA -------------------------------- */

export type ContactMediaType = 'PROFILE_PHOTO' | 'BUSINESS_CARD' | 'CONTEXT_IMAGE';

export type ContactMedia = {
  id: string; // uuid
  contactId: string;
  createdAt: string;

  type: ContactMediaType;

  /**
   * Offline-first:
   * - store dataUrl locally (can be large; but acceptable for field ops)
   * - when uploaded to server later, store fileUrl and optionally clear dataUrl
   */
  dataUrl?: string; // base64 data url
  fileUrl?: string; // server storage URL once uploaded
  thumbnailDataUrl?: string;

  aiExtractedText?: string;
  aiParsedData?: Record<string, unknown>;

  syncStatus?: SyncStatus;
  serverId?: string;
  lastSyncAttemptAt?: string;
  lastSyncError?: string;
  createdOffline?: boolean;
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
  followUpTargetAt?: string; // ISO or datetime-local string
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

  // Social / relationship hooks
  facebookConnected?: boolean;
  facebookProfileName?: string;
  facebookHandle?: string;
  facebookUrl?: string;

  instagramHandle?: string;
  twitterHandle?: string;
  linkedinUrl?: string;
  tiktokHandle?: string;
  tiktokUrl?: string;

  /**
   * identify who captured the record (3-letter initials like SAG).
   * Backwards compatibility: default to "UNK".
   */
  entryInitials?: string;

  // Campaign intelligence snapshot (for ops + AI)
  contactCategory?: ContactCategory;
  supportLevel?: SupportLevel;
  bestContactMethod?: BestContactMethod;

  teamAssignments?: CampaignTeam[];
  rolePotential?: string[];
  tags?: string[];

  metWhere?: string;
  metWhereDetails?: string;
  introducedBy?: string;
  affiliation?: string;
  eventName?: string;

  topIssue?: string;
  conversationNotes?: string;

  // political geography
  precinct?: string;
  congressionalDistrict?: string;
  stateHouseDistrict?: string;
  stateSenateDistrict?: string;

  // Engagement signals
  interestedVolunteer?: boolean;
  interestedDonate?: boolean;
  interestedHostEvent?: boolean;
  interestedYardSign?: boolean;
  interestedCountyLeader?: boolean;
  interestedPrecinctCaptain?: boolean;

  // Snapshot scores
  influenceScore?: number;
  fundraisingPotential?: number;
  volunteerPotential?: number;

  /**
   * Offline-first sync tracking
   */
  syncStatus?: SyncStatus; // default PENDING_SYNC
  serverId?: string; // set when synced to server
  lastSyncAttemptAt?: string;
  lastSyncError?: string;
  createdOffline?: boolean;
};

type DbName = 'kg_sos_ops_db';
const DB_NAME: DbName = 'kg_sos_ops_db';

/**
 * v3 existed already.
 * v4 adds a new object store: contact_media
 */
const DB_VERSION = 5;

const STORE_CONTACTS = 'contacts';
const STORE_ORIGINS = 'contact_origins';
const STORE_VOL_PROFILES = 'volunteer_profiles';
const STORE_VOL_INTERESTS = 'volunteer_interests';
const STORE_EVENT_LEADS = 'event_leads';
const STORE_LIVE_FOLLOWUPS = 'live_followups';
const STORE_CONTACT_MEDIA = 'contact_media';
const STORE_CONTACT_RELATIONSHIPS = "contact_relationships";

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
  if (typeof next === 'string') {
    const v = safeTrim(next);
    return (v ? (v as T) : prev);
  }
  if (Array.isArray(next)) {
    return (next.length ? (next as T) : prev);
  }
  if (typeof next === 'boolean') return next as T;
  if (typeof next === 'number') return (Number.isFinite(next) ? next : prev) as T;
  return (next ?? prev);
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
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB is not available in this environment.');
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
    
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
    
      /* ---------------- RELATIONSHIPS (POWER OF 5) ---------------- */
    
      if (!db.objectStoreNames.contains(STORE_CONTACT_RELATIONSHIPS)) {
        const s = db.createObjectStore(STORE_CONTACT_RELATIONSHIPS, { keyPath: "id" });
        s.createIndex("fromContactId", "fromContactId", { unique: false });
        s.createIndex("toContactId", "toContactId", { unique: false });
        s.createIndex("relationshipType", "relationshipType", { unique: false });
        s.createIndex("createdAt", "createdAt", { unique: false });
      }
    
      /* ---------------- LIVE FOLLOW UPS ---------------- */
    
      if (!db.objectStoreNames.contains(STORE_LIVE_FOLLOWUPS)) {
        const s = db.createObjectStore(STORE_LIVE_FOLLOWUPS, { keyPath: 'id' });
        s.createIndex('contactId', 'contactId', { unique: false });
        s.createIndex('followUpStatus', 'followUpStatus', { unique: false });
        s.createIndex('createdAt', 'createdAt', { unique: false });
        s.createIndex('archived', 'archived', { unique: false });
        s.createIndex('syncStatus', 'syncStatus', { unique: false });
        s.createIndex('serverId', 'serverId', { unique: false });
        s.createIndex('lastSyncAttemptAt', 'lastSyncAttemptAt', { unique: false });
      }
    
      /* ---------------- CONTACT MEDIA ---------------- */
    
      if (!db.objectStoreNames.contains(STORE_CONTACT_MEDIA)) {
        const s = db.createObjectStore(STORE_CONTACT_MEDIA, { keyPath: 'id' });
        s.createIndex('contactId', 'contactId', { unique: false });
        s.createIndex('type', 'type', { unique: false });
        s.createIndex('createdAt', 'createdAt', { unique: false });
        s.createIndex('syncStatus', 'syncStatus', { unique: false });
      }
    };

      // live followups — either create or upgrade indexes
      if (!db.objectStoreNames.contains(STORE_LIVE_FOLLOWUPS)) {
        const s = db.createObjectStore(STORE_LIVE_FOLLOWUPS, { keyPath: 'id' });
        s.createIndex('contactId', 'contactId', { unique: false });
        s.createIndex('followUpStatus', 'followUpStatus', { unique: false });
        s.createIndex('createdAt', 'createdAt', { unique: false });
        s.createIndex('archived', 'archived', { unique: false });
        s.createIndex('syncStatus', 'syncStatus', { unique: false });
        s.createIndex('serverId', 'serverId', { unique: false });
        s.createIndex('lastSyncAttemptAt', 'lastSyncAttemptAt', { unique: false });
      } else {
        const tx = req.transaction;
        if (tx) {
          const s = tx.objectStore(STORE_LIVE_FOLLOWUPS);
          ensureIndex(s, 'contactId', 'contactId', { unique: false });
          ensureIndex(s, 'followUpStatus', 'followUpStatus', { unique: false });
          ensureIndex(s, 'createdAt', 'createdAt', { unique: false });
          ensureIndex(s, 'archived', 'archived', { unique: false });
          ensureIndex(s, 'syncStatus', 'syncStatus', { unique: false });
          ensureIndex(s, 'serverId', 'serverId', { unique: false });
          ensureIndex(s, 'lastSyncAttemptAt', 'lastSyncAttemptAt', { unique: false });
        }
      }

      // contact media — new store in v4
      if (!db.objectStoreNames.contains(STORE_CONTACT_MEDIA)) {
        const s = db.createObjectStore(STORE_CONTACT_MEDIA, { keyPath: 'id' });
        s.createIndex('contactId', 'contactId', { unique: false });
        s.createIndex('type', 'type', { unique: false });
        s.createIndex('createdAt', 'createdAt', { unique: false });
        s.createIndex('syncStatus', 'syncStatus', { unique: false });
      } else {
        const tx = req.transaction;
        if (tx) {
          const s = tx.objectStore(STORE_CONTACT_MEDIA);
          ensureIndex(s, 'contactId', 'contactId', { unique: false });
          ensureIndex(s, 'type', 'type', { unique: false });
          ensureIndex(s, 'createdAt', 'createdAt', { unique: false });
          ensureIndex(s, 'syncStatus', 'syncStatus', { unique: false });
        }
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open IndexedDB'));
    req.onblocked = () => {
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

    if (e) {
      const idx = store.index('email');
      const hits = (await reqToPromise(idx.getAll(e))) as Contact[];
      if (hits?.length) return hits[0] ?? null;
    }

    if (p) {
      const idx = store.index('phone');
      const hits = (await reqToPromise(idx.getAll(p))) as Contact[];
      if (hits?.length) return hits[0] ?? null;
    }

    return null;
  } finally {
    await txDone(tx).catch(() => {});
  }
}

/**
 * Upsert contact by:
 * - existing match on email or phone (best-effort)
 * - otherwise creates new
 *
 * Merge strategy:
 * - do not overwrite existing values with blank/undefined
 * - arrays: prefer non-empty next; otherwise keep previous
 */
export async function upsertContact(
  input: Partial<Contact> & { fullName?: string; email?: string; phone?: string }
): Promise<Contact> {
  const db = await openDb();

  const email = safeTrim(input.email).toLowerCase() || undefined;

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
        teamAssignments: [],
        rolePotential: [],
      };

  const next: Contact = {
    ...base,
    updatedAt: nowIso(),

    // Identity
    fullName: pickNonEmpty(safeTrim(input.fullName) || undefined, base.fullName),
    email: pickNonEmpty(email, base.email),
    phone: pickNonEmpty(phone, base.phone),

    // Location
    city: pickNonEmpty(safeTrim(input.city) || undefined, base.city),
    county: pickNonEmpty(safeTrim(input.county) || undefined, base.county),
    state: pickNonEmpty(safeTrim(input.state) || undefined, base.state || 'AR'),
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

    teamAssignments: pickNonEmpty((input.teamAssignments ?? []) as any, base.teamAssignments),
    rolePotential: pickNonEmpty(uniqStrings(input.rolePotential ?? []) as any, base.rolePotential),
    tags: pickNonEmpty(uniqStrings(input.tags ?? []) as any, base.tags),

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

    interestedVolunteer: pickNonEmpty(input.interestedVolunteer, base.interestedVolunteer),
    interestedDonate: pickNonEmpty(input.interestedDonate, base.interestedDonate),
    interestedHostEvent: pickNonEmpty(input.interestedHostEvent, base.interestedHostEvent),
    interestedYardSign: pickNonEmpty(input.interestedYardSign, base.interestedYardSign),
    interestedCountyLeader: pickNonEmpty(input.interestedCountyLeader, base.interestedCountyLeader),
    interestedPrecinctCaptain: pickNonEmpty(
      input.interestedPrecinctCaptain,
      base.interestedPrecinctCaptain
    ),

    influenceScore: pickNonEmpty(input.influenceScore, base.influenceScore),
    fundraisingPotential: pickNonEmpty(input.fundraisingPotential, base.fundraisingPotential),
    volunteerPotential: pickNonEmpty(input.volunteerPotential, base.volunteerPotential),

    createdFrom: pickNonEmpty(input.createdFrom, base.createdFrom),

    // Social
    facebookConnected:
      typeof input.facebookConnected === 'boolean' ? input.facebookConnected : base.facebookConnected,
    facebookProfileName: pickNonEmpty(
      safeTrim(input.facebookProfileName) || undefined,
      base.facebookProfileName
    ),
    facebookHandle: pickNonEmpty(
      safeTrim(input.facebookHandle) || undefined,
      base.facebookHandle
    ),
    facebookUrl: pickNonEmpty(safeTrim(input.facebookUrl) || undefined, base.facebookUrl),

    instagramHandle: pickNonEmpty(
      safeTrim(input.instagramHandle) || undefined,
      base.instagramHandle
    ),
    twitterHandle: pickNonEmpty(safeTrim(input.twitterHandle) || undefined, base.twitterHandle),
    linkedinUrl: pickNonEmpty(safeTrim(input.linkedinUrl) || undefined, base.linkedinUrl),
    tiktokHandle: pickNonEmpty(safeTrim(input.tiktokHandle) || undefined, base.tiktokHandle),
    tiktokUrl: pickNonEmpty(safeTrim(input.tiktokUrl) || undefined, (base as any).tiktokUrl),

    profilePhotoUrl: pickNonEmpty(
      safeTrim(input.profilePhotoUrl) || undefined,
      base.profilePhotoUrl
    ),
  };

  const tx = db.transaction(STORE_CONTACTS, 'readwrite');
  try {
    tx.objectStore(STORE_CONTACTS).put(next);
    await txDone(tx);
    return next;
  } catch (e: any) {
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

export async function upsertVolunteerProfile(profile: VolunteerProfile): Promise<VolunteerProfile> {
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

/* --------------------------------- MEDIA -------------------------------- */

function applyMediaDefaults(input: Partial<ContactMedia>): Partial<ContactMedia> {
  const syncStatus: SyncStatus = (input.syncStatus as SyncStatus) ?? 'PENDING_SYNC';
  const createdOffline =
    typeof input.createdOffline === 'boolean' ? input.createdOffline : isOfflineBestEffort();

  return {
    ...input,
    syncStatus,
    createdOffline,
  };
}

export async function addContactMedia(
  input: Omit<ContactMedia, 'id' | 'createdAt'> & { createdAt?: string }
): Promise<ContactMedia> {
  const db = await openDb();

  const base: ContactMedia = {
    id: uuid(),
    createdAt: input.createdAt ?? nowIso(),
    ...input,
  };

  const row: ContactMedia = {
    ...base,
    ...(applyMediaDefaults(base) as ContactMedia),
  };

  const tx = db.transaction(STORE_CONTACT_MEDIA, 'readwrite');
  try {
    tx.objectStore(STORE_CONTACT_MEDIA).add(row);
    await txDone(tx);
    return row;
  } catch (e: any) {
    throw new Error(e?.message ?? 'Failed to add contact media.');
  }
}

export async function listContactMediaByContact(contactId: string): Promise<ContactMedia[]> {
  const db = await openDb();
  const tx = db.transaction(STORE_CONTACT_MEDIA, 'readonly');
  const store = tx.objectStore(STORE_CONTACT_MEDIA);

  try {
    let rows: ContactMedia[] = [];
    if (store.indexNames.contains('contactId')) {
      const idx = store.index('contactId');
      rows = (await reqToPromise(idx.getAll(contactId))) as ContactMedia[];
    } else {
      const all = (await reqToPromise(store.getAll())) as ContactMedia[];
      rows = (all || []).filter((r) => r.contactId === contactId);
    }

    await txDone(tx);

    return (rows || []).sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
  } catch (e: any) {
    await txDone(tx).catch(() => {});
    throw new Error(e?.message ?? 'Failed to list contact media.');
  }
}
export async function updateContactMedia(
  id: string,
  patch: Partial<ContactMedia>
): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_CONTACT_MEDIA, "readwrite");
  const store = tx.objectStore(STORE_CONTACT_MEDIA);

  try {
    const existing = (await reqToPromise(
      store.get(id)
    )) as ContactMedia | undefined;

    if (!existing) {
      await txDone(tx);
      return;
    }

    // Merge existing + patch
    const merged: ContactMedia = {
      ...existing,
      ...patch,
    };

    // Normalize defaults (syncStatus / createdOffline safety)
    const normalized = applyMediaDefaults(merged) as ContactMedia;

    store.put({
      ...merged,
      ...normalized,
    });

    await txDone(tx);
  } catch (e: any) {
    throw new Error(e?.message ?? "Failed to update contact media.");
  }
}

export async function markContactMediaSynced(params: {
  id: string;
  serverId: string;
  fileUrl?: string;
}): Promise<void> {
  await updateContactMedia(params.id, {
    syncStatus: "SYNCED",
    serverId: safeTrim(params.serverId) || undefined,
    fileUrl: safeTrim(params.fileUrl) || undefined,
    lastSyncAttemptAt: nowIso(),
    lastSyncError: undefined,
  });
}

export async function markContactMediaSyncError(params: {
  id: string;
  error: string;
}): Promise<void> {
  await updateContactMedia(params.id, {
    syncStatus: "ERROR",
    lastSyncAttemptAt: nowIso(),
    lastSyncError: safeTrim(params.error) || "Unknown sync error",
  });
}

/* ---------------------------- LIVE FOLLOW-UPS --------------------------- */

function applyLiveFollowUpDefaults(
  input: Partial<LiveFollowUp>
): Partial<LiveFollowUp> {
  const entryInitials = normalizeInitials(input.entryInitials) ?? "UNK";

  const syncStatus: SyncStatus =
    (input.syncStatus as SyncStatus) ?? "PENDING_SYNC";

  const createdOffline =
    typeof input.createdOffline === "boolean"
      ? input.createdOffline
      : isOfflineBestEffort();

  return {
    ...input,
    entryInitials,
    syncStatus,
    createdOffline,
  };
}

export function syncStatusLabel(s?: SyncStatus): 'Synced' | 'Pending Sync' | 'Sync Error' {
  const v = (s ?? 'PENDING_SYNC') as SyncStatus;
  if (v === 'SYNCED') return 'Synced';
  if (v === 'ERROR') return 'Sync Error';
  return 'Pending Sync';
}

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

export async function updateLiveFollowUp(id: string, patch: Partial<LiveFollowUp>): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_LIVE_FOLLOWUPS, 'readwrite');
  const store = tx.objectStore(STORE_LIVE_FOLLOWUPS);

  try {
    const existing = (await reqToPromise(store.get(id))) as LiveFollowUp | undefined;

    if (!existing) {
      await txDone(tx);
      return;
    }

    const next = { ...existing, ...patch } as LiveFollowUp;

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

    return (all || []).sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
  } catch (e: any) {
    await txDone(tx).catch(() => {});
    throw new Error(e?.message ?? 'Failed to list live follow-ups.');
  }
}

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
      const all = (await reqToPromise(store.getAll())) as LiveFollowUp[];
      rows = (all || []).filter((r) => r.syncStatus !== 'SYNCED');
    }

    await txDone(tx);

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

export async function markLiveFollowUpSynced(params: { id: string; serverId: string }): Promise<void> {
  await updateLiveFollowUp(params.id, {
    syncStatus: 'SYNCED',
    serverId: safeTrim(params.serverId) || undefined,
    lastSyncAttemptAt: nowIso(),
    lastSyncError: undefined,
  });
}

export async function markLiveFollowUpSyncError(params: { id: string; error: string }): Promise<void> {
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

  const parts = v
    .split(/,|\/|—|-|•/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 1) return { city: parts[0] };
  if (parts.length >= 2) return { city: parts[0], county: parts[1] };
  return { city: v };
}

/* ---------------- RELATIONSHIPS (POWER OF 5) ---------------- */

export type ContactRelationshipType =
  | "KNOWS"
  | "INTRODUCED"
  | "RECRUITED"
  | "INFLUENCES"
  | "ENDORSED";

export type ContactRelationship = {
  id: string
  fromContactId: string
  toContactId: string
  relationshipType: ContactRelationshipType
  createdAt: string
}

const STORE_CONTACT_RELATIONSHIPS = "contact_relationships"

/**
 * Link two contacts together.
 * Used for relational organizing / Power of 5.
 */
export async function linkContacts(params: {
  fromContactId: string
  toContactId: string
  relationshipType: ContactRelationshipType
}): Promise<ContactRelationship> {

  const db = await openDb()

  const relationship: ContactRelationship = {
    id: uuid(),
    fromContactId: params.fromContactId,
    toContactId: params.toContactId,
    relationshipType: params.relationshipType,
    createdAt: nowIso(),
  }

  const tx = db.transaction(STORE_CONTACT_RELATIONSHIPS, "readwrite")

  try {
    tx.objectStore(STORE_CONTACT_RELATIONSHIPS).add(relationship)
    await txDone(tx)
    return relationship
  } catch (e: any) {
    throw new Error(e?.message ?? "Failed to create relationship.")
  }
}

/**
 * List relationships for a contact
 */
export async function listContactRelationships(contactId: string) {

  const db = await openDb()

  const tx = db.transaction(STORE_CONTACT_RELATIONSHIPS, "readonly")
  const store = tx.objectStore(STORE_CONTACT_RELATIONSHIPS)

  const all = await reqToPromise(store.getAll())

  await txDone(tx)

  return (all || []).filter(
    (r: ContactRelationship) =>
      r.fromContactId === contactId || r.toContactId === contactId
  )
}

/* ---------------- BULK IMPORT ENGINE ---------------- */

/**
 * Normalize spreadsheet / CSV rows before ingestion
 */
export function normalizeImportRow(row: Record<string, any>): Partial<Contact> {

  const out: Partial<Contact> = {}

  const keys = Object.keys(row)

  for (const key of keys) {

    const k = key.toLowerCase()

    const value = row[key]

    if (!value) continue

    if (k.includes("name")) out.fullName = safeTrim(value)

    if (k.includes("phone") || k.includes("mobile") || k.includes("cell")) {
      out.phone = normalizePhone(value)
    }

    if (k.includes("email")) out.email = safeTrim(value)

    if (k.includes("city")) out.city = safeTrim(value)

    if (k.includes("county")) out.county = safeTrim(value)

    if (k.includes("zip")) out.zip = safeTrim(value)

    if (k.includes("note")) out.conversationNotes = safeTrim(value)
  }

  return out
}

/**
 * Bulk import contacts
 * Used by CSV / spreadsheet ingestion
 */
export async function bulkUpsertContacts(
  rows: Record<string, any>[],
  originType: OriginType = "IMPORT_CSV"
) {

  const created: Contact[] = []

  for (const row of rows) {

    const normalized = normalizeImportRow(row)

    if (!normalized.fullName && !normalized.email && !normalized.phone) {
      continue
    }

    const contact = await upsertContact({
      ...normalized,
      createdFrom: originType,
    })

    await addOrigin({
      contactId: contact.id,
      originType,
      rawPayload: row,
    })

    created.push(contact)
  }

  return created
}

// ---------------- CONTACT HELPERS ----------------

export async function getContactById(id: string): Promise<Contact | null> {
  const db = await openDb()

  const tx = db.transaction(STORE_CONTACTS, "readonly")
  const store = tx.objectStore(STORE_CONTACTS)

  const result = await reqToPromise(store.get(id))

  await txDone(tx)

  return result ?? null
}

export async function updateContact(
  id: string,
  patch: Partial<Contact>
): Promise<Contact | null> {
  const db = await openDb()

  const tx = db.transaction(STORE_CONTACTS, "readwrite")
  const store = tx.objectStore(STORE_CONTACTS)

  const existing = await reqToPromise(store.get(id))

  if (!existing) {
    await txDone(tx)
    return null
  }

  const next = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  }

  store.put(next)

  await txDone(tx)

  return next
}