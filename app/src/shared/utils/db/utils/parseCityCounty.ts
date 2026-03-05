import { safeTrim } from "../contactsDb.core";

export function parseCityCounty(raw: string): { city?: string; county?: string } {
  const v = safeTrim(raw);
  if (!v) return {};

  const parts = v
    .split(/,|\/|—|-|•/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 1) return { city: parts[0] };
  if (parts.length >= 2) return { city: parts[0], county: parts[1] };
  return { city: v };
}