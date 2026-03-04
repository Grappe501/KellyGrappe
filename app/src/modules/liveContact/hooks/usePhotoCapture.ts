import { useCallback, useState } from 'react';
import { fileToDataUrl } from '../utils/contactFormHelpers';

export type PhotoKind = 'PROFILE' | 'BUSINESS_CARD' | 'CONTEXT';

export function usePhotoCapture() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capture = useCallback(async (file: File | null): Promise<string> => {
    setError(null);
    if (!file) return '';
    try {
      setBusy(true);
      return await fileToDataUrl(file);
    } catch (e: any) {
      setError(e?.message ?? 'Photo capture failed.');
      return '';
    } finally {
      setBusy(false);
    }
  }, []);

  return { capture, busy, error, setError };
}
