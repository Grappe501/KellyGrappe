import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Container from '../../shared/components/Container';
import { Card, CardHeader, CardContent } from '../../shared/components/Card';
import {
  Button,
  ErrorText,
  HelpText,
  Input,
  Label,
  Textarea,
} from '../../shared/components/FormControls';

import { addOrigin, upsertContact } from '../../shared/utils/contactsDb';

type ScanStage = 'CAPTURE' | 'ANALYZING' | 'REVIEW' | 'SAVING';

type ExtractedContact = {
  fullName?: string;
  title?: string;
  organization?: string;

  email?: string;
  phone?: string;
  website?: string;

  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  county?: string;
  state?: string;
  zip?: string;

  notes?: string;

  // Social hooks
  facebookHandle?: string;
  facebookProfileName?: string;
};

function safeTrim(v: unknown) {
  return (v ?? '').toString().trim();
}

function normalizePhone(raw: string) {
  const digits = safeTrim(raw).replace(/\D/g, '');
  return digits || '';
}

function isEmailLike(v: string) {
  if (!safeTrim(v)) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => reject(r.error ?? new Error('Failed to read image.'));
    r.readAsDataURL(file);
  });
}

function dataUrlToBase64(dataUrl: string) {
  const idx = dataUrl.indexOf('base64,');
  if (idx === -1) return '';
  return dataUrl.slice(idx + 'base64,'.length);
}

export default function BusinessCardScanPage() {
  const nav = useNavigate();

  const [stage, setStage] = useState<ScanStage>('CAPTURE');
  const [error, setError] = useState<string | null>(null);

  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);

  const [frontPreview, setFrontPreview] = useState<string>('');
  const [backPreview, setBackPreview] = useState<string>('');

  const [extracted, setExtracted] = useState<ExtractedContact>({});
  const [rawModelOutput, setRawModelOutput] = useState<string>('');

  const [saveNote, setSaveNote] = useState<string>(
    'Imported from business card scan. Please verify details before outreach.'
  );

  const readyToAnalyze = useMemo(() => !!frontFile, [frontFile]);

  const emailOk = useMemo(() => isEmailLike(extracted.email || ''), [extracted.email]);

  async function onPickFront(file: File | null) {
    setError(null);
    setFrontFile(file);
    setFrontPreview('');
    if (!file) return;
    try {
      const url = await fileToDataUrl(file);
      setFrontPreview(url);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load front image.');
    }
  }

  async function onPickBack(file: File | null) {
    setError(null);
    setBackFile(file);
    setBackPreview('');
    if (!file) return;
    try {
      const url = await fileToDataUrl(file);
      setBackPreview(url);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load back image.');
    }
  }

  function updateExtracted<K extends keyof ExtractedContact>(key: K, value: ExtractedContact[K]) {
    setExtracted((p) => ({ ...p, [key]: value }));
  }

  async function analyze() {
    setError(null);

    if (!frontFile) {
      setError('Please capture the FRONT of the card to analyze.');
      return;
    }

    try {
      setStage('ANALYZING');

      const frontUrl = frontPreview || (await fileToDataUrl(frontFile));
      const backUrl =
      backFile ? backPreview || (await fileToDataUrl(backFile)) : undefined;

      const res = await fetch('/.netlify/functions/scan-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json?.error ?? 'Scan failed.');
      }
      
      const next = (json?.data ?? {}) as ExtractedContact;
      
      setExtracted({
        ...next,
        phone: next.phone ? normalizePhone(next.phone) : next.phone,
      });
      
      setRawModelOutput(JSON.stringify(next, null, 2));
      setStage('REVIEW');
    } catch (e: any) {
      setError(e?.message ?? 'Scan failed.');
      setStage('CAPTURE');
    }
  }

  async function saveToDatabase() {
    setError(null);

    // At least something meaningful
    const hasName = !!safeTrim(extracted.fullName);
    const hasEmail = !!safeTrim(extracted.email);
    const hasPhone = !!safeTrim(extracted.phone);

    if (!hasName && !hasEmail && !hasPhone) {
      setError('The scan did not extract a usable name/email/phone. Please edit the fields before saving.');
      return;
    }

    if (!emailOk) {
      setError('Please correct the email format before saving.');
      return;
    }

    try {
      setStage('SAVING');

      // 1) Upsert canonical contact
      const contact = await upsertContact({
        fullName: safeTrim(extracted.fullName) || undefined,
        email: safeTrim(extracted.email) || undefined,
        phone: safeTrim(extracted.phone) || undefined,
        city: safeTrim(extracted.city) || undefined,
        county: safeTrim(extracted.county) || undefined,
        state: safeTrim(extracted.state) || 'AR',
        facebookHandle: safeTrim(extracted.facebookHandle) || undefined,
        facebookProfileName: safeTrim(extracted.facebookProfileName) || undefined,
        // If we captured any FB fields, treat as connected
        facebookConnected:
          !!safeTrim(extracted.facebookHandle) || !!safeTrim(extracted.facebookProfileName),
      });

      // 2) Origin log (keep payload small; do NOT store base64 images)
      await addOrigin({
        contactId: contact.id,
        originType: 'MANUAL_ADMIN', // next pass: add BUSINESS_CARD_SCAN to OriginType
        notes: safeTrim(saveNote) || undefined,
        rawPayload: {
          source: 'BUSINESS_CARD_SCAN',
          extracted,
          organization: extracted.organization,
          title: extracted.title,
          website: extracted.website,
          addressLine1: extracted.addressLine1,
          addressLine2: extracted.addressLine2,
          zip: extracted.zip,
        },
      });

      // Clear and bounce to follow-ups list (or later: to a Contact Profile page)
      setFrontFile(null);
      setBackFile(null);
      setFrontPreview('');
      setBackPreview('');
      setExtracted({});
      setRawModelOutput('');
      setSaveNote('Imported from business card scan. Please verify details before outreach.');

      // For now, send staff to the follow-up board
      nav('/live-contacts');
    } catch (e: any) {
      setError(e?.message ?? 'Save failed.');
      setStage('REVIEW');
    }
  }

  return (
    <Container>
      <Card>
        <CardHeader
          title="Business Card Scanner"
          subtitle="Capture front/back. AI extracts contact details. You confirm. Then it saves into the campaign contact engine."
        />
        <CardContent className="space-y-6">
          {error ? <ErrorText>{error}</ErrorText> : null}

          {stage === 'CAPTURE' || stage === 'ANALYZING' ? (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="text-sm font-semibold text-slate-900">Step 1 — Capture the card</div>
                <HelpText>
                  Use your phone camera. Front is required. Back is optional (often has notes, alternate phone, etc).
                </HelpText>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Front (required)</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => onPickFront(e.target.files?.[0] ?? null)}
                    />
                    {frontPreview ? (
                      <img
                        src={frontPreview}
                        alt="Front preview"
                        className="w-full rounded-xl border border-slate-200 bg-white"
                      />
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                        No front image selected yet.
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Back (optional)</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => onPickBack(e.target.files?.[0] ?? null)}
                    />
                    {backPreview ? (
                      <img
                        src={backPreview}
                        alt="Back preview"
                        className="w-full rounded-xl border border-slate-200 bg-white"
                      />
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                        Back image optional.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                <Button type="button" variant="secondary" onClick={() => nav('/')}>
                  Back
                </Button>

                <Button
                  type="button"
                  onClick={analyze}
                  disabled={!readyToAnalyze || stage === 'ANALYZING'}
                >
                  {stage === 'ANALYZING' ? 'Analyzing…' : 'Analyze Card'}
                </Button>
              </div>

              <div className="text-xs text-slate-500">
                Security note: the OpenAI key will live in a Netlify function, not the browser.
              </div>
            </div>
          ) : null}

          {stage === 'REVIEW' || stage === 'SAVING' ? (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
                <div className="text-sm font-semibold text-slate-900">
                  Step 2 — Review & confirm
                </div>
                <HelpText>
                  AI extraction is a starting point. Please confirm before saving.
                </HelpText>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Full name</Label>
                  <Input
                    value={extracted.fullName ?? ''}
                    onChange={(e) => updateExtracted('fullName', e.target.value)}
                    placeholder="Jane Doe"
                  />
                </div>

                <div>
                  <Label>Organization</Label>
                  <Input
                    value={extracted.organization ?? ''}
                    onChange={(e) => updateExtracted('organization', e.target.value)}
                    placeholder="Company / Org"
                  />
                </div>

                <div>
                  <Label>Title</Label>
                  <Input
                    value={extracted.title ?? ''}
                    onChange={(e) => updateExtracted('title', e.target.value)}
                    placeholder="Role / Title"
                  />
                </div>

                <div>
                  <Label>Website</Label>
                  <Input
                    value={extracted.website ?? ''}
                    onChange={(e) => updateExtracted('website', e.target.value)}
                    placeholder="example.com"
                  />
                </div>

                <div>
                  <Label>Phone</Label>
                  <Input
                    value={extracted.phone ?? ''}
                    onChange={(e) => updateExtracted('phone', normalizePhone(e.target.value))}
                    placeholder="5015551234"
                  />
                </div>

                <div>
                  <Label>Email</Label>
                  <Input
                    value={extracted.email ?? ''}
                    onChange={(e) => updateExtracted('email', e.target.value)}
                    placeholder="name@email.com"
                  />
                  {!emailOk ? <ErrorText>Invalid email format.</ErrorText> : null}
                </div>

                <div>
                  <Label>City</Label>
                  <Input
                    value={extracted.city ?? ''}
                    onChange={(e) => updateExtracted('city', e.target.value)}
                    placeholder="Little Rock"
                  />
                </div>

                <div>
                  <Label>County</Label>
                  <Input
                    value={extracted.county ?? ''}
                    onChange={(e) => updateExtracted('county', e.target.value)}
                    placeholder="Pulaski"
                  />
                </div>

                <div>
                  <Label>State</Label>
                  <Input
                    value={extracted.state ?? 'AR'}
                    onChange={(e) => updateExtracted('state', e.target.value)}
                    placeholder="AR"
                  />
                </div>

                <div>
                  <Label>ZIP</Label>
                  <Input
                    value={extracted.zip ?? ''}
                    onChange={(e) => updateExtracted('zip', e.target.value)}
                    placeholder="72201"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label>Address lines</Label>
                  <Input
                    value={extracted.addressLine1 ?? ''}
                    onChange={(e) => updateExtracted('addressLine1', e.target.value)}
                    placeholder="123 Main St"
                  />
                  <div className="h-2" />
                  <Input
                    value={extracted.addressLine2 ?? ''}
                    onChange={(e) => updateExtracted('addressLine2', e.target.value)}
                    placeholder="Suite 200 (optional)"
                  />
                </div>

                <div>
                  <Label>Facebook handle</Label>
                  <Input
                    value={extracted.facebookHandle ?? ''}
                    onChange={(e) => updateExtracted('facebookHandle', e.target.value)}
                    placeholder="facebook.com/username"
                  />
                </div>

                <div>
                  <Label>Facebook profile name</Label>
                  <Input
                    value={extracted.facebookProfileName ?? ''}
                    onChange={(e) => updateExtracted('facebookProfileName', e.target.value)}
                    placeholder="Display name"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label>Notes</Label>
                  <Textarea
                    rows={4}
                    value={extracted.notes ?? ''}
                    onChange={(e) => updateExtracted('notes', e.target.value)}
                    placeholder="Any extra context from the card…"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label>Save note (origin log)</Label>
                  <Textarea
                    rows={3}
                    value={saveNote}
                    onChange={(e) => setSaveNote(e.target.value)}
                  />
                  <HelpText>
                    This note is stored with the origin log so staff know how this record entered the system.
                  </HelpText>
                </div>

                {rawModelOutput ? (
                  <div className="md:col-span-2">
                    <details className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                        View raw model output (debug)
                      </summary>
                      <pre className="mt-2 text-xs text-slate-700 whitespace-pre-wrap">
                        {rawModelOutput}
                      </pre>
                    </details>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setStage('CAPTURE');
                  }}
                  disabled={stage === 'SAVING'}
                >
                  Scan Another
                </Button>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => nav('/live-contacts')}
                    disabled={stage === 'SAVING'}
                  >
                    Cancel
                  </Button>

                  <Button type="button" onClick={saveToDatabase} disabled={stage === 'SAVING'}>
                    {stage === 'SAVING' ? 'Saving…' : 'Save to Contacts'}
                  </Button>
                </div>
              </div>

              <div className="text-xs text-slate-500">
                Next: we’ll add a dedicated “Contact Profile” page so staff can view/edit everything about a person in one place.
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </Container>
  );
}