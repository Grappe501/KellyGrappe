/* 
  contacts.service.ts
  Contact CRUD service layer.

  This file handles:
  - creating contacts
  - updating contacts
  - deduping contacts
  - retrieving contacts
*/

import {
    openDb,
    STORE_CONTACTS,
    reqToPromise,
    txDone
  } from "../../shared/utils/db/services/contacts.service"
  
  /* ---------------- TYPES ---------------- */
  
  export type Contact = {
    id: string
    createdAt: string
    updatedAt: string
  
    fullName?: string
    email?: string
    phone?: string
  
    city?: string
    county?: string
    state?: string
    zip?: string
  
    tags?: string[]
  
    facebookHandle?: string
    instagramHandle?: string
    twitterHandle?: string
  }
  
  /* ---------------- HELPERS ---------------- */
  
  function nowIso() {
    return new Date().toISOString()
  }
  
  function safeTrim(v: unknown): string {
    return (v ?? "").toString().trim()
  }
  
  function normalizePhone(raw: string) {
    return safeTrim(raw).replace(/\D/g, "")
  }
  
  function uuid() {
    try {
      return crypto.randomUUID()
    } catch {
      return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`
    }
  }
  
  /* ---------------- FIND EXISTING ---------------- */
  
  async function findContactByEmailOrPhone(
    db: IDBDatabase,
    email?: string,
    phone?: string
  ): Promise<Contact | null> {
  
    const tx = db.transaction(STORE_CONTACTS, "readonly")
    const store = tx.objectStore(STORE_CONTACTS)
  
    try {
  
      if (email) {
        const idx = store.index("email")
        const results = await reqToPromise(idx.getAll(email))
        if (results?.length) return results[0]
      }
  
      if (phone) {
        const idx = store.index("phone")
        const results = await reqToPromise(idx.getAll(phone))
        if (results?.length) return results[0]
      }
  
      return null
  
    } finally {
      await txDone(tx).catch(() => {})
    }
  }
  
  /* ---------------- UPSERT CONTACT ---------------- */
  
  export async function upsertContact(
    input: Partial<Contact>
  ): Promise<Contact> {
  
    const db = await openDb()
  
    const email = safeTrim(input.email).toLowerCase() || undefined
    const phoneRaw = safeTrim(input.phone)
    const phone = phoneRaw ? normalizePhone(phoneRaw) : undefined
  
    const existing = await findContactByEmailOrPhone(db, email, phone)
  
    const base: Contact = existing ?? {
      id: uuid(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      state: "AR",
      tags: []
    }
  
    const next: Contact = {
      ...base,
  
      updatedAt: nowIso(),
  
      fullName: input.fullName ?? base.fullName,
      email: email ?? base.email,
      phone: phone ?? base.phone,
  
      city: input.city ?? base.city,
      county: input.county ?? base.county,
      state: input.state ?? base.state,
      zip: input.zip ?? base.zip,
  
      tags: input.tags ?? base.tags,
  
      facebookHandle: input.facebookHandle ?? base.facebookHandle,
      instagramHandle: input.instagramHandle ?? base.instagramHandle,
      twitterHandle: input.twitterHandle ?? base.twitterHandle
    }
  
    const tx = db.transaction(STORE_CONTACTS, "readwrite")
  
    try {
  
      tx.objectStore(STORE_CONTACTS).put(next)
  
      await txDone(tx)
  
      return next
  
    } catch (e: any) {
  
      throw new Error(e?.message ?? "Failed to save contact")
  
    }
  
  }
  
  /* ---------------- GET CONTACT ---------------- */
  
  export async function getContactById(
    id: string
  ): Promise<Contact | null> {
  
    const db = await openDb()
  
    const tx = db.transaction(STORE_CONTACTS, "readonly")
    const store = tx.objectStore(STORE_CONTACTS)
  
    const result = await reqToPromise(store.get(id))
  
    await txDone(tx)
  
    return result ?? null
  }
  
  /* ---------------- UPDATE CONTACT ---------------- */
  
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
  
    const next: Contact = {
      ...existing,
      ...patch,
      updatedAt: nowIso()
    }
  
    store.put(next)
  
    await txDone(tx)
  
    return next
  }
  
  /* ---------------- LIST CONTACTS ---------------- */
  
  export async function listContacts(): Promise<Contact[]> {
  
    const db = await openDb()
  
    const tx = db.transaction(STORE_CONTACTS, "readonly")
    const store = tx.objectStore(STORE_CONTACTS)
  
    const rows = await reqToPromise(store.getAll())
  
    await txDone(tx)
  
    return rows ?? []
  }
