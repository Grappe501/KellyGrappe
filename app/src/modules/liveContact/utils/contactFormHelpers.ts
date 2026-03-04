export function safeTrim(v: unknown): string {
  return (v ?? '').toString().trim();
}

export function normalizePhone(raw: string): string {
  return safeTrim(raw).replace(/\D/g, '');
}

export function isEmailLike(v: string) {
  if (!safeTrim(v)) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function clampInitials(v: string) {
  return v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
}

export function uniqTags(tags: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tags) {
    const v = safeTrim(t);
    if (!v) continue;
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
}

export function splitCsvTags(v: string): string[] {
  return uniqTags(
    (v || '')
      .split(',')
      .map((x) => safeTrim(x))
      .filter(Boolean)
  );
}

export async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error ?? new Error('File read failed.'));
    reader.readAsDataURL(file);
  });
}
