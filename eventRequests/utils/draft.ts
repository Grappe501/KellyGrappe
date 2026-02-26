import type { EventRequestFormState } from '../types';
import { DRAFT_KEY } from './constants';

export function loadDraft(): EventRequestFormState | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.data) return null;
    return parsed.data as EventRequestFormState;
  } catch {
    return null;
  }
}

export function saveDraft(data: EventRequestFormState): void {
  try {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ updatedAt: new Date().toISOString(), data })
    );
  } catch {
    // ignore
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}
