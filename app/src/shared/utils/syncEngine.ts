// app/src/shared/utils/syncEngine.ts

import { supabase } from './supabaseClient';
import {
  listLiveFollowUps,
  updateLiveFollowUp,
  type LiveFollowUp,
} from './contactsDb';

function nowIso() {
  return new Date().toISOString();
}

function isPending(row: LiveFollowUp) {
  return (row as any).syncStatus === 'PENDING_SYNC';
}

export async function syncPendingFollowUps(): Promise<void> {
  try {
    const localRows = await listLiveFollowUps();

    const pending = localRows.filter(isPending);

    if (!pending.length) return;

    for (const row of pending) {
      try {
        const insertPayload = {
          source: 'LIVE_FIELD',
          module_id: row.id,
          status: row.followUpStatus,
          title: row.name ?? null,
          notes: row.followUpNotes ?? null,

          contact_name: row.name ?? null,
          contact_email: row.email ?? null,
          contact_phone: row.phone ?? null,

          payload: row, // full snapshot for audit

          archived: false,
          completed_at: row.followUpCompletedAt ?? null,
        };

        const { data, error } = await supabase
          .from('followups')
          .insert(insertPayload)
          .select()
          .single();

        if (error) throw error;

        await updateLiveFollowUp(row.id, {
          syncStatus: 'SYNCED',
          serverId: data?.id ?? null,
          lastSyncAttemptAt: nowIso(),
          lastSyncError: null,
        } as any);
      } catch (err: any) {
        await updateLiveFollowUp(row.id, {
          syncStatus: 'ERROR',
          lastSyncAttemptAt: nowIso(),
          lastSyncError: err?.message ?? 'Sync failed',
        } as any);
      }
    }
  } catch (err) {
    console.error('Global sync failed:', err);
  }
}