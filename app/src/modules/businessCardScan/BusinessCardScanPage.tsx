// PRODUCTION BUSINESS CARD SCANNER
// Campaign Operations Intake Engine
// Hardened for field deployment

import React, {
    useCallback,
    useMemo,
    useRef,
    useState,
  } from 'react';
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
  
  import { processIntake } from '../../shared/utils/intakePipeline';
  
  /* ================================
     TYPES
  ================================ */
  
  type ScanStage =
    | 'CAPTURE'
    | 'ANALYZING'
    | 'REVIEW'
    | 'SAVING';
  
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
    facebookHandle?: string;
    facebookProfileName?: string;
  };
  
  type ScanFunctionResponse = {
    ok: boolean;
    data?: ExtractedContact;
    error?: string;
  };
  
  /* ================================
     UTILS
  ================================ */
  
  function safeTrim(v: unknown): string {
    return (v ?? '').toString().trim();
  }
  
  function normalizePhone(v?: string): string | undefined {
    if (!v) return undefined;
    const digits = v.replace(/\D/g, '');
    return digits || undefined;
  }
  
  function isValidEmail(v?: string): boolean {
    if (!v) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }
  
  function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve(String(reader.result || ''));
      reader.onerror = () =>
        reject(reader.error ?? new Error('File read failed.'));
      reader.readAsDataURL(file);
    });
  }
  
  /* ================================
     COMPONENT
  ================================ */
  
  export default function BusinessCardScanPage() {
    const nav = useNavigate();
  
    const [stage, setStage] =
      useState<ScanStage>('CAPTURE');
    const [error, setError] =
      useState<string | null>(null);
  
    const [frontFile, setFrontFile] =
      useState<File | null>(null);
    const [backFile, setBackFile] =
      useState<File | null>(null);
  
    const [frontPreview, setFrontPreview] =
      useState<string>('');
    const [backPreview, setBackPreview] =
      useState<string>('');
  
    const [extracted, setExtracted] =
      useState<ExtractedContact>({});
  
    const [rawOutput, setRawOutput] =
      useState<string>('');
  
    const [originNote, setOriginNote] =
      useState(
        'Imported via Business Card Scanner.'
      );
  
    const isBusy =
      stage === 'ANALYZING' ||
      stage === 'SAVING';
  
    const analyzeAbortRef =
      useRef<AbortController | null>(null);
  
    const canAnalyze =
      !!frontFile && !isBusy;
  
    const emailOk =
      isValidEmail(extracted.email);
  
    /* ================================
       IMAGE HANDLING
    ================================= */
  
    const handleFront = useCallback(
      async (file: File | null) => {
        setError(null);
        setFrontFile(file);
        setFrontPreview('');
        if (!file) return;
        const url = await fileToDataUrl(file);
        setFrontPreview(url);
      },
      []
    );
  
    const handleBack = useCallback(
      async (file: File | null) => {
        setError(null);
        setBackFile(file);
        setBackPreview('');
        if (!file) return;
        const url = await fileToDataUrl(file);
        setBackPreview(url);
      },
      []
    );
  
    /* ================================
       ANALYZE
    ================================= */
  
    const analyze = useCallback(async () => {
      if (!frontFile) {
        setError('Front image required.');
        return;
      }
  
      try {
        setStage('ANALYZING');
        setError(null);
  
        analyzeAbortRef.current?.abort();
        analyzeAbortRef.current =
          new AbortController();
  
        const front =
          frontPreview ||
          (await fileToDataUrl(frontFile));
  
        const back =
          backFile
            ? backPreview ||
              (await fileToDataUrl(backFile))
            : undefined;
  
        const res = await fetch(
          '/.netlify/functions/scan-card',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              frontImage: front,
              backImage: back,
            }),
            signal:
              analyzeAbortRef.current.signal,
          }
        );
  
        const json: ScanFunctionResponse =
          await res.json();
  
        if (!res.ok || !json.ok) {
          throw new Error(
            json.error ||
              'Scan function failed.'
          );
        }
  
        const data = json.data ?? {};
  
        setExtracted({
          ...data,
          phone: normalizePhone(
            data.phone
          ),
        });
  
        setRawOutput(
          JSON.stringify(data, null, 2)
        );
  
        setStage('REVIEW');
      } catch (err: any) {
        if (err.name === 'AbortError')
          return;
        setError(
          err.message ||
            'Scan failed.'
        );
        setStage('CAPTURE');
      }
    }, [
      frontFile,
      backFile,
      frontPreview,
      backPreview,
    ]);
  
    /* ================================
       SAVE
    ================================= */
  
    const save = useCallback(async () => {
      if (isBusy) return;
  
      const hasCore =
        safeTrim(extracted.fullName) ||
        safeTrim(extracted.email) ||
        safeTrim(extracted.phone);
  
      if (!hasCore) {
        setError(
          'Must have name, email, or phone.'
        );
        return;
      }
  
      if (!emailOk) {
        setError(
          'Invalid email format.'
        );
        return;
      }
  
      try {
        setStage('SAVING');
  
        await processIntake({
          originType: 'BUSINESS_CARD_SCAN',
          originNotes:
            safeTrim(originNote) || undefined,
          rawPayload: {
            source: 'BUSINESS_CARD_SCAN',
            extracted,
          },
          contact: {
            fullName:
              safeTrim(extracted.fullName) || undefined,
            email:
              safeTrim(extracted.email) || undefined,
            phone:
              normalizePhone(extracted.phone),
            city:
              safeTrim(extracted.city) || undefined,
            county:
              safeTrim(extracted.county) || undefined,
            state:
              safeTrim(extracted.state) || 'AR',
            facebookHandle:
              safeTrim(extracted.facebookHandle) || undefined,
            facebookProfileName:
              safeTrim(extracted.facebookProfileName) || undefined,
            facebookConnected:
              !!safeTrim(extracted.facebookHandle) ||
              !!safeTrim(extracted.facebookProfileName),
          },
          followUp: {
            followUpNeeded: true,
            followUpNotes:
              safeTrim(originNote) || undefined,
            sourceLabel: 'Business Card Scan',
            location: [
              safeTrim(extracted.city),
              safeTrim(extracted.county)
                ? `${safeTrim(extracted.county)} County`
                : '',
              safeTrim(extracted.state) || 'AR',
            ]
              .filter(Boolean)
              .join(' • '),
            notes:
              safeTrim(extracted.notes) ||
              'Business card captured and parsed by AI. Review and follow up.',
            permissionToContact: true,
            facebookConnected:
              !!safeTrim(extracted.facebookHandle) ||
              !!safeTrim(extracted.facebookProfileName),
            facebookProfileName:
              safeTrim(extracted.facebookProfileName),
            facebookHandle:
              safeTrim(extracted.facebookHandle),
          },
        });
  
        nav('/live-contacts');
      } catch (err: any) {
        setError(
          err.message ||
            'Save failed.'
        );
        setStage('REVIEW');
      }
    }, [
      extracted,
      originNote,
      emailOk,
      isBusy,
      nav,
    ]);
  
    /* ================================
       RENDER
    ================================= */
  
    return (
      <Container>
        <div className="space-y-6">
          <div className="rounded-3xl bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white shadow-xl">
            <div className="text-xs font-bold tracking-wide">
              CAMPAIGN FIELD SYSTEM
            </div>
            <div className="text-2xl font-extrabold">
              Business Card Intake
            </div>
            <div className="text-sm opacity-90">
              Capture → AI → Review →
              Save
            </div>
          </div>
  
          <Card>
            <CardHeader
              title={stage}
              subtitle="Production Field Intake"
            />
            <CardContent className="space-y-6">
              {error && (
                <ErrorText>
                  {error}
                </ErrorText>
              )}
  
              {stage === 'CAPTURE' ||
              stage === 'ANALYZING' ? (
                <>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="front">
                        Front Image
                      </Label>
                      <Input
                        id="front"
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) =>
                          handleFront(
                            e.target
                              .files?.[0] ||
                              null
                          )
                        }
                      />
                      {frontPreview && (
                        <img
                          src={frontPreview}
                          className="mt-3 rounded-xl border"
                        />
                      )}
                    </div>
  
                    <div>
                      <Label htmlFor="back">
                        Back Image
                      </Label>
                      <Input
                        id="back"
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) =>
                          handleBack(
                            e.target
                              .files?.[0] ||
                              null
                          )
                        }
                      />
                      {backPreview && (
                        <img
                          src={backPreview}
                          className="mt-3 rounded-xl border"
                        />
                      )}
                    </div>
                  </div>
  
                  <div className="flex justify-between">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        nav('/live-contact')
                      }
                    >
                      Back
                    </Button>
  
                    <Button
                      onClick={analyze}
                      disabled={!canAnalyze}
                    >
                      {stage ===
                      'ANALYZING'
                        ? 'Analyzing…'
                        : 'Analyze'}
                    </Button>
                  </div>
                </>
              ) : null}
  
              {stage === 'REVIEW' ||
              stage === 'SAVING' ? (
                <>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">
                        Name
                      </Label>
                      <Input
                        id="name"
                        value={
                          extracted.fullName ||
                          ''
                        }
                        onChange={(e) =>
                          setExtracted(
                            (p) => ({
                              ...p,
                              fullName:
                                e.target
                                  .value,
                            })
                          )
                        }
                      />
                    </div>
  
                    <div>
                      <Label htmlFor="email">
                        Email
                      </Label>
                      <Input
                        id="email"
                        value={
                          extracted.email ||
                          ''
                        }
                        onChange={(e) =>
                          setExtracted(
                            (p) => ({
                              ...p,
                              email:
                                e.target
                                  .value,
                            })
                          )
                        }
                      />
                      {!emailOk && (
                        <ErrorText>
                          Invalid email
                        </ErrorText>
                      )}
                    </div>
                  </div>
  
                  {rawOutput && (
                    <details className="bg-slate-50 p-3 rounded-lg">
                      <summary className="cursor-pointer font-semibold">
                        Raw Model Output
                      </summary>
                      <pre className="text-xs whitespace-pre-wrap">
                        {rawOutput}
                      </pre>
                    </details>
                  )}
  
                  <div className="flex justify-between">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        setStage(
                          'CAPTURE'
                        )
                      }
                    >
                      Back
                    </Button>
  
                    <Button
                      onClick={save}
                      disabled={isBusy}
                    >
                      {stage ===
                      'SAVING'
                        ? 'Saving…'
                        : 'Save'}
                    </Button>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </Container>
    );
  }