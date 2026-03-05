import {
  openDb,
  reqToPromise,
  txDone,
  uuid,
  nowIso,
  safeTrim,
  isOfflineBestEffort,
  STORE_CONTACT_MEDIA,
} from "../contactsDb.core";

import type { ContactMedia, SyncStatus } from "../contactsDb.types";

export type { ContactMedia, SyncStatus };

export async function addContactMedia(params: {
  contactId: string;
  type: ContactMedia["type"];
  dataUrl?: string;
  fileName?: string;
  fileUrl?: string;
  mimeType?: string;
  sizeBytes?: number;
  syncStatus?: SyncStatus;
  createdOffline?: boolean;
}): Promise<ContactMedia> {
  const db = await openDb();

  const row: ContactMedia = {
    id: uuid(),
    contactId: params.contactId,
    type: params.type,

    dataUrl: safeTrim(params.dataUrl) || undefined,
    fileName: safeTrim(params.fileName) || undefined,
    fileUrl: safeTrim(params.fileUrl) || undefined,
    mimeType: safeTrim(params.mimeType) || undefined,
    sizeBytes: typeof params.sizeBytes === "number" ? params.sizeBytes : undefined,

    createdAt: nowIso(),
    updatedAt: undefined,

    createdOffline:
      typeof params.createdOffline === "boolean" ? params.createdOffline : isOfflineBestEffort(),
    syncStatus: params.syncStatus ?? "PENDING_SYNC",
  };

  const tx = db.transaction(STORE_CONTACT_MEDIA, "readwrite");
  try {
    tx.objectStore(STORE_CONTACT_MEDIA).add(row);
    await txDone(tx);
    return row;
  } catch (e: any) {
    await txDone(tx).catch(() => {});
    throw new Error(e?.message ?? "Failed to add contact media.");
  }
}

export async function listContactMedia(contactId: string): Promise<ContactMedia[]> {
  const db = await openDb();
  const tx = db.transaction(STORE_CONTACT_MEDIA, "readonly");
  const store = tx.objectStore(STORE_CONTACT_MEDIA);

  try {
    const idx = store.index("contactId");
    const rows = (await reqToPromise(idx.getAll(contactId))) as ContactMedia[];
    await txDone(tx);
    return rows ?? [];
  } catch (e: any) {
    await txDone(tx).catch(() => {});
    throw new Error(e?.message ?? "Failed to list contact media.");
  }
}
