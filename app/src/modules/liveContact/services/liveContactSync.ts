import {
  listLiveFollowUpsPendingSync,
  markLiveFollowUpSynced,
  markLiveFollowUpSyncError,
  type LiveFollowUp,
} from '../../../shared/utils/db/contactsDb';
import { buildServerFollowUpPayload } from './followupPayloadBuilder';

export async function syncPendingLiveFollowUps(): Promise<{ attempted: number; synced: number; errors: number }> {
  if (!navigator.onLine) return { attempted: 0, synced: 0, errors: 0 };

  const pending = await listLiveFollowUpsPendingSync();

  let attempted = 0;
  let synced = 0;
  let errors = 0;

  for (const row of pending) {
    attempted += 1;
    try {
      const res = await fetch('/.netlify/functions/followups-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildServerFollowUpPayload(row)),
      });

      const json = await res.json().catch(() => ({} as any));
      if (!res.ok || !json?.item?.id) {
        throw new Error(json?.error || 'Sync failed');
      }

      await markLiveFollowUpSynced({ id: row.id, serverId: json.item.id });
      synced += 1;
    } catch (err: any) {
      await markLiveFollowUpSyncError({ id: row.id, error: err?.message ?? 'Sync error' });
      errors += 1;
    }
  }

  return { attempted, synced, errors };
}
