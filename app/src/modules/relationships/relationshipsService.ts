import {
    type ContactRelationship,
    type ContactRelationshipType,
  } from "../../shared/utils/db/contactsDb";
  
  import { openDb } from "../../shared/utils/db/contactsDb";
  
  const STORE_CONTACT_RELATIONSHIPS = "contact_relationships";
  
  function nowIso() {
    return new Date().toISOString();
  }
  
  function uuid() {
    try {
      return crypto.randomUUID();
    } catch {
      return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    }
  }
  
  /**
   * Create a relationship between two contacts.
   */
  export async function linkContacts(params: {
    fromContactId: string;
    toContactId: string;
    relationshipType: ContactRelationshipType;
  }): Promise<ContactRelationship> {
    const db = await openDb();
  
    const relationship: ContactRelationship = {
      id: uuid(),
      fromContactId: params.fromContactId,
      toContactId: params.toContactId,
      relationshipType: params.relationshipType,
      createdAt: nowIso(),
    };
  
    const tx = db.transaction(STORE_CONTACT_RELATIONSHIPS, "readwrite");
  
    try {
      tx.objectStore(STORE_CONTACT_RELATIONSHIPS).add(relationship);
  
      await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve(null);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
  
      return relationship;
    } catch (e: any) {
      throw new Error(e?.message ?? "Failed to create relationship.");
    }
  }
  
  /**
   * List relationships for a contact.
   */
  export async function listContactRelationships(
    contactId: string
  ): Promise<ContactRelationship[]> {
    const db = await openDb();
  
    const tx = db.transaction(STORE_CONTACT_RELATIONSHIPS, "readonly");
    const store = tx.objectStore(STORE_CONTACT_RELATIONSHIPS);
  
    const all = await new Promise<any[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(null);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  
    return (all || []).filter(
      (r: ContactRelationship) =>
        r.fromContactId === contactId || r.toContactId === contactId
    );
  }
