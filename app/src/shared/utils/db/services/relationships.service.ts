import { openDb, reqToPromise, txDone, uuid, nowIso, STORE_CONTACT_RELATIONSHIPS } from "../contactsDb.core";
import type { ContactRelationship, ContactRelationshipType } from "../contactsDb.types";

export type { ContactRelationship, ContactRelationshipType };

export async function linkContacts(params: {
  fromContactId: string;
  toContactId: string;
  relationshipType: ContactRelationshipType;
}): Promise<ContactRelationship> {
  const db = await openDb();

  const relationship: ContactRelationship = {
    id: uuid(),
    createdAt: nowIso(),
    updatedAt: undefined,
    fromContactId: params.fromContactId,
    toContactId: params.toContactId,
    relationshipType: params.relationshipType,
  };

  const tx = db.transaction(STORE_CONTACT_RELATIONSHIPS, "readwrite");
  try {
    tx.objectStore(STORE_CONTACT_RELATIONSHIPS).add(relationship);
    await txDone(tx);
    return relationship;
  } catch (e: any) {
    await txDone(tx).catch(() => {});
    throw new Error(e?.message ?? "Failed to create relationship.");
  }
}

export async function listContactRelationships(contactId: string): Promise<ContactRelationship[]> {
  const db = await openDb();
  const tx = db.transaction(STORE_CONTACT_RELATIONSHIPS, "readonly");
  const store = tx.objectStore(STORE_CONTACT_RELATIONSHIPS);

  try {
    const all = (await reqToPromise(store.getAll())) as ContactRelationship[];
    await txDone(tx);

    return (all ?? []).filter(
      (r) => r.fromContactId === contactId || r.toContactId === contactId
    );
  } catch (e: any) {
    await txDone(tx).catch(() => {});
    throw new Error(e?.message ?? "Failed to list relationships.");
  }
}
