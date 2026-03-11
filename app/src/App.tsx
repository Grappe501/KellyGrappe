import {
  openDb,
  reqToPromise,
  txDone,
  uuid,
  nowIso,
  STORE_CONTACT_RELATIONSHIPS
} from "@db/contactsDb.core";

import type {
  ContactRelationship,
  ContactRelationshipType
} from "@db/contactsDb";

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
    relationshipType: params.relationshipType
  };

  const tx = db.transaction(STORE_CONTACT_RELATIONSHIPS, "readwrite");
  const store = tx.objectStore(STORE_CONTACT_RELATIONSHIPS);

  try {

    await reqToPromise(store.add(relationship));

    await txDone(tx);

    return relationship;

  } catch (e: unknown) {

    await txDone(tx).catch(() => {});

    const message =
      e instanceof Error
        ? e.message
        : "Failed to create relationship.";

    throw new Error(message);
  }
}

export async function listContactRelationships(
  contactId: string
): Promise<ContactRelationship[]> {

  const db = await openDb();

  const tx = db.transaction(STORE_CONTACT_RELATIONSHIPS, "readonly");
  const store = tx.objectStore(STORE_CONTACT_RELATIONSHIPS);

  try {

    const all = await reqToPromise(store.getAll()) as ContactRelationship[];

    await txDone(tx);

    return (all ?? []).filter(
      (r) =>
        r.fromContactId === contactId ||
        r.toContactId === contactId
    );

  } catch (e: unknown) {

    await txDone(tx).catch(() => {});

    const message =
      e instanceof Error
        ? e.message
        : "Failed to list relationships.";

    throw new Error(message);
  }
}