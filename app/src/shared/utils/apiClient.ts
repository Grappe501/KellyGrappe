// app/src/shared/utils/apiClient.ts
import { getVisitorId } from './visitorId';

export type SubmitPayload = {
  moduleId: string;
  data: Record<string, unknown>;
  turnstileToken?: string;
  honeypot?: string;
  /**
   * Optional override; normally we auto-inject visitorId from local storage.
   */
  visitorId?: string;
};

export type SubmitResponse =
  | { ok: true; requestId: string; ipHash?: string }
  | { ok: false; error: string };

async function safeReadJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export async function submitModule(payload: SubmitPayload) {
  const visitorId = payload.visitorId ?? getVisitorId();

  const res = await fetch('/.netlify/functions/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      visitorId,
    }),
  });

  const json = await safeReadJson(res);

  if (!res.ok) {
    // Prefer structured error from server, else fallback
    const msg =
      (typeof json?.error === 'string' && json.error) ||
      `Submission failed (${res.status}).`;
    throw new Error(msg);
  }

  // Normalize shape
  if (json && json.ok === true && typeof json.requestId === 'string') {
    return json as { ok: true; requestId: string; ipHash?: string };
  }

  // If server responds 200 but not in expected shape, treat as failure
  throw new Error('Submission succeeded but returned an unexpected response.');
}