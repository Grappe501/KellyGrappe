export function safeTrim(v: unknown): string {
  return (v ?? '').toString().trim();
}

export function normalizePhone(raw: string): string {
  return safeTrim(raw).replace(/\D/g, '');
}

export function isEmailLike(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function prettyDateTime(dtLocal: string): string {
  if (!dtLocal) return '';
  const d = new Date(dtLocal);
  if (Number.isNaN(d.getTime())) return dtLocal;
  return d.toLocaleString();
}
