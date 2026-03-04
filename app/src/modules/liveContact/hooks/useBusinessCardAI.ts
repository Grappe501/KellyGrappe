import { useCallback, useRef, useState } from 'react';
import { fileToDataUrl } from '../utils/contactFormHelpers';

export type ExtractedContact = {
  fullName?: string;
  title?: string;
  organization?: string;
  email?: string;
  phone?: string;
  website?: string;

  city?: string;
  county?: string;
  state?: string;
  zip?: string;

  facebookHandle?: string;
  facebookProfileName?: string;
};

type ScanFunctionResponse = {
  ok: boolean;
  data?: ExtractedContact;
  error?: string;
};

export function useBusinessCardAI() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const analyzeFrontOnly = useCallback(async (file: File): Promise<{ dataUrl: string; extracted?: ExtractedContact }> => {
    setError(null);
    setBusy(true);

    try {
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      const frontImage = await fileToDataUrl(file);

      const res = await fetch('/.netlify/functions/scan-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frontImage }),
        signal: abortRef.current.signal,
      });

      const json: ScanFunctionResponse = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json?.error || 'Business card scan failed.');
      }

      return { dataUrl: frontImage, extracted: json.data ?? {} };
    } finally {
      setBusy(false);
    }
  }, []);

  return { analyzeFrontOnly, busy, error, setError };
}
