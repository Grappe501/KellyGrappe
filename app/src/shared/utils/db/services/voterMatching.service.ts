import {
  openDb,
  reqToPromise,
  txDone,
  uuid,
  nowIso,
  safeTrim,
  STORE_VOTER_MATCHES,
} from "../contactsDb.core";

import type { VoterMatchRow, VoterMatchStatus } from "../contactsDb.types";

export type { VoterMatchRow, VoterMatchStatus };

export async function createVoterMatch(params: {
  contactId: string;
  voterFileId?: string;
  claimedByContactId?: string;
  matchConfidence?: number;
  needsRegistration?: boolean;
  status?: VoterMatchStatus;
}): Promise<VoterMatchRow> {
  const db = await openDb();

  const row: VoterMatchRow = {
    id: uuid(),
    contactId: params.contactId,
    createdAt: nowIso(),
    updatedAt: undefined,

    voterFileId: safeTrim(params.voterFileId) || undefined,
    claimedByContactId: safeTrim(params.claimedByContactId) || undefined,
    matchConfidence: typeof params.matchConfidence === "number" ? params.matchConfidence : undefined,
    needsRegistration:
      typeof params.needsRegistration === "boolean" ? params.needsRegistration : undefined,
    status: params.status,
  };

  const tx = db.transaction(STORE_VOTER_MATCHES, "readwrite");
  try {
    tx.objectStore(STORE_VOTER_MATCHES).add(row);
    await txDone(tx);
    return row;
  } catch (e: any) {
    await txDone(tx).catch(() => {});
    throw new Error(e?.message ?? "Failed to create voter match.");
  }
}

export async function listVoterMatchesForContact(contactId: string): Promise<VoterMatchRow[]> {
  const db = await openDb();
  const tx = db.transaction(STORE_VOTER_MATCHES, "readonly");
  const store = tx.objectStore(STORE_VOTER_MATCHES);

  try {
    const idx = store.index("contactId");
    const rows = (await reqToPromise(idx.getAll(contactId))) as VoterMatchRow[];
    await txDone(tx);
    return rows ?? [];
  } catch (e: any) {
    await txDone(tx).catch(() => {});
    throw new Error(e?.message ?? "Failed to list voter matches.");
  }
}
