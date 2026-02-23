export type SubmitPayload = {
  moduleId: string;
  data: Record<string, unknown>;
  turnstileToken?: string;
  honeypot?: string;
};

export async function submitModule(payload: SubmitPayload) {
  const res = await fetch('/.netlify/functions/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.error ?? 'Submission failed.');
  }

  return json as { ok: true; requestId: string };
}