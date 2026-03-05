/*
  contactsDb.core.ts
  ------------------------------------------------------------------
  Core IndexedDB engine for campaign CRM.

  This file ONLY handles:
  - DB schema + object stores
  - connection lifecycle
  - low-level helpers

  Business logic belongs in services and is exported via contactsDb.ts (facade).
*/

export type SyncStatus = "PENDING_SYNC" | "SYNCED" | "ERROR";

export const DB_NAME = "kg_sos_ops_db";

/*
Version history
1 initial contacts
2 origins
3 volunteer profiles/interests
4 event leads
5 followups
6 media
7 relationships
8 voter matching
*/
export const DB_VERSION = 8;

/* ---------------- STORES ---------------- */

export const STORE_CONTACTS = "contacts";
export const STORE_ORIGINS = "contact_origins";
export const STORE_VOL_PROFILES = "volunteer_profiles";
export const STORE_VOL_INTERESTS = "volunteer_interests";
export const STORE_EVENT_LEADS = "event_leads";
export const STORE_LIVE_FOLLOWUPS = "live_followups";
export const STORE_CONTACT_MEDIA = "contact_media";
export const STORE_CONTACT_RELATIONSHIPS = "contact_relationships";
export const STORE_VOTER_MATCHES = "voter_matches";

/* ---------------- HELPERS ---------------- */

export function nowIso(): string {
  return new Date().toISOString();
}

export function safeTrim(v: unknown): string {
  return (v ?? "").toString().trim();
}

export function uuid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
}

export function isOfflineBestEffort(): boolean {
  try {
    if (typeof navigator === "undefined") return true;
    return navigator.onLine === false;
  } catch {
    return true;
  }
}

/* ---------------- PROMISE HELPERS ---------------- */

export function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed"));
  });
}

export function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
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
    // safest in production upgrades across browsers
  }
}

/* ---------------- CONNECTION ---------------- */

let dbPromise: Promise<IDBDatabase> | null = null;

export async function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is not available in this environment.");
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;

      // CONTACTS
      if (!db.objectStoreNames.contains(STORE_CONTACTS)) {
        const s = db.createObjectStore(STORE_CONTACTS, { keyPath: "id" });
        s.createIndex("email", "email", { unique: false });
        s.createIndex("phone", "phone", { unique: false });
        s.createIndex("fullName", "fullName", { unique: false });
        s.createIndex("updatedAt", "updatedAt", { unique: false });
      }

      // ORIGINS
      if (!db.objectStoreNames.contains(STORE_ORIGINS)) {
        const s = db.createObjectStore(STORE_ORIGINS, { keyPath: "id" });
        s.createIndex("contactId", "contactId", { unique: false });
        s.createIndex("originType", "originType", { unique: false });
        s.createIndex("capturedAt", "capturedAt", { unique: false });
      }

      // VOL PROFILES
      if (!db.objectStoreNames.contains(STORE_VOL_PROFILES)) {
        db.createObjectStore(STORE_VOL_PROFILES, { keyPath: "contactId" });
      }

      // VOL INTERESTS
      if (!db.objectStoreNames.contains(STORE_VOL_INTERESTS)) {
        const s = db.createObjectStore(STORE_VOL_INTERESTS, { keyPath: "id" });
        s.createIndex("contactId", "contactId", { unique: false });
        s.createIndex("teamKey", "teamKey", { unique: false });
      }

      // EVENT LEADS
      if (!db.objectStoreNames.contains(STORE_EVENT_LEADS)) {
        const s = db.createObjectStore(STORE_EVENT_LEADS, { keyPath: "id" });
        s.createIndex("contactId", "contactId", { unique: false });
        s.createIndex("status", "status", { unique: false });
      }

      // RELATIONSHIPS
      if (!db.objectStoreNames.contains(STORE_CONTACT_RELATIONSHIPS)) {
        const s = db.createObjectStore(STORE_CONTACT_RELATIONSHIPS, { keyPath: "id" });
        s.createIndex("fromContactId", "fromContactId", { unique: false });
        s.createIndex("toContactId", "toContactId", { unique: false });
        s.createIndex("relationshipType", "relationshipType", { unique: false });
        s.createIndex("createdAt", "createdAt", { unique: false });
      }

      // LIVE FOLLOWUPS
      if (!db.objectStoreNames.contains(STORE_LIVE_FOLLOWUPS)) {
        const s = db.createObjectStore(STORE_LIVE_FOLLOWUPS, { keyPath: "id" });
        s.createIndex("contactId", "contactId", { unique: false });
        s.createIndex("followUpStatus", "followUpStatus", { unique: false });
        s.createIndex("createdAt", "createdAt", { unique: false });
        s.createIndex("archived", "archived", { unique: false });
        s.createIndex("syncStatus", "syncStatus", { unique: false });
        s.createIndex("serverId", "serverId", { unique: false });
        s.createIndex("lastSyncAttemptAt", "lastSyncAttemptAt", { unique: false });
      } else {
        const tx = req.transaction;
        if (tx) {
          const s = tx.objectStore(STORE_LIVE_FOLLOWUPS);
          ensureIndex(s, "contactId", "contactId", { unique: false });
          ensureIndex(s, "followUpStatus", "followUpStatus", { unique: false });
          ensureIndex(s, "createdAt", "createdAt", { unique: false });
          ensureIndex(s, "archived", "archived", { unique: false });
          ensureIndex(s, "syncStatus", "syncStatus", { unique: false });
          ensureIndex(s, "serverId", "serverId", { unique: false });
          ensureIndex(s, "lastSyncAttemptAt", "lastSyncAttemptAt", { unique: false });
        }
      }

      // MEDIA
      if (!db.objectStoreNames.contains(STORE_CONTACT_MEDIA)) {
        const s = db.createObjectStore(STORE_CONTACT_MEDIA, { keyPath: "id" });
        s.createIndex("contactId", "contactId", { unique: false });
        s.createIndex("type", "type", { unique: false });
        s.createIndex("createdAt", "createdAt", { unique: false });
        s.createIndex("syncStatus", "syncStatus", { unique: false });
      } else {
        const tx = req.transaction;
        if (tx) {
          const s = tx.objectStore(STORE_CONTACT_MEDIA);
          ensureIndex(s, "contactId", "contactId", { unique: false });
          ensureIndex(s, "type", "type", { unique: false });
          ensureIndex(s, "createdAt", "createdAt", { unique: false });
          ensureIndex(s, "syncStatus", "syncStatus", { unique: false });
        }
      }

      // VOTER MATCHES
      if (!db.objectStoreNames.contains(STORE_VOTER_MATCHES)) {
        const s = db.createObjectStore(STORE_VOTER_MATCHES, { keyPath: "id" });
        s.createIndex("contactId", "contactId", { unique: false });
        s.createIndex("claimedByContactId", "claimedByContactId", { unique: false });
        s.createIndex("voterFileId", "voterFileId", { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Failed to open IndexedDB"));
    req.onblocked = () => {
      // eslint-disable-next-line no-console
      console.warn("[contactsDb] IndexedDB open blocked. Close other tabs using the app and retry.");
    };
  });

  return dbPromise;
}