// app/src/shared/utils/syncEngine.ts

import {
    listLiveFollowUps,
    updateLiveFollowUp,
    type LiveFollowUp,
  } from './contactsDb';
  
  function nowIso() {
    return new Date().toISOString();
  }
  
  function isPending(row: LiveFollowUp) {
    return row.syncStatus === 'PENDING_SYNC';
  }
  
  export async function syncPendingFollowUps(): Promise<void> {
    try {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  
      const localRows = await listLiveFollowUps();
      const pending = localRows.filter(isPending);
  
      if (!pending.length) return;
  
      for (const row of pending) {
        try {
          await updateLiveFollowUp(row.id, {
            lastSyncAttemptAt: nowIso(),
            lastSyncError: null,
          } as any);
  
          const response = await fetch('/.netlify/functions/followups-create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contact_id: row.contactId,
              status: row.followUpStatus,
              notes: row.followUpNotes ?? row.notes ?? null,
              archived: row.archived ?? false,
              completed_at: row.followUpCompletedAt ?? null,
  
              name: row.name ?? null,
              phone: row.phone ?? null,
              email: row.email ?? null,
              location: row.location ?? null,
              source: row.source ?? 'LIVE_FIELD',
  
              permission_to_contact: row.permissionToContact ?? null,
              entry_initials: row.entryInitials ?? 'UNK',
            }),
          });
  
          const json = await response.json().catch(() => ({} as any));
  
          if (!response.ok || !json?.item?.id) {
            throw new Error(json?.error || `Sync failed (${response.status})`);
          }
  
          await updateLiveFollowUp(row.id, {
            syncStatus: 'SYNCED',
            serverId: json.item.id,
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