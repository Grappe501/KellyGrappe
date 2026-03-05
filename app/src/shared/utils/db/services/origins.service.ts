import {
  openDb,
  reqToPromise,
  txDone,
  uuid,
  nowIso,
  STORE_ORIGINS,
} from "../contactsDb.core";

import type { ContactOrigin, OriginType } from "../contactsDb.types";

export type { ContactOrigin, OriginType };

export async function addOrigin(params: {
  contactId: string;
  originType: OriginType;
  rawPayload?: unknown;
  capturedAt?: string;
}): Promise<ContactOrigin> {
  const db = await openDb();

  const origin: ContactOrigin = {
    id: uuid(),
    contactId: params.contactId,
    originType: params.originType,
    capturedAt: params.capturedAt ?? nowIso(),
    createdAt: nowIso(),
    updatedAt: undefined,
    rawPayload: params.rawPayload,
  };

  const tx = db.transaction(STORE_ORIGINS, "readwrite");
  try {
    tx.objectStore(STORE_ORIGINS).add(origin);
    await txDone(tx);
    return origin;
  } catch (e: any) {
    await txDone(tx).catch(() => {});
    throw new Error(e?.message ?? "Failed to create origin record.");
  }
}

export async function listOriginsForContact(contactId: string): Promise<ContactOrigin[]> {
  const db = await openDb();
  const tx = db.transaction(STORE_ORIGINS, "readonly");
  const store = tx.objectStore(STORE_ORIGINS);

  try {
    const idx = store.index("contactId");
    const rows = (await reqToPromise(idx.getAll(contactId))) as ContactOrigin[];
    await txDone(tx);
    return rows ?? [];
  } catch (e: any) {
    await txDone(tx).catch(() => {});
    throw new Error(e?.message ?? "Failed to list origins.");
  }
}
