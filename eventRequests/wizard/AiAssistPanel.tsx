import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from '../../shared/components/Card';
import { Button, ErrorText, HelpText, Label, Textarea } from '../../shared/components/FormControls';
import type { AssistResponse, EventRequestFormState } from '../types';
import { safeTrim } from '../utils/formatting';

export default function AiAssistPanel(props: {
  form: EventRequestFormState;
  onApplyExtracted: (extracted?: Partial<EventRequestFormState>) => void;
  aiResult: AssistResponse | null;
  setAiResult: (r: AssistResponse | null) => void;
}) {
  const { form, onApplyExtracted, aiResult, setAiResult } = props;

  const [aiText, setAiText] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function call(mode: 'extract' | 'drafts') {
    setErr(null);
    const text = safeTrim(aiText);
    if (!text) {
      setErr('Paste an invite, email, or event details first.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/.netlify/functions/event-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          text,
          formContext: {
            preferredContactMethod: form.preferredContactMethod,
            requestedRole: form.requestedRole,
            mediaExpected: form.mediaExpected,
            state: form.state || 'AR',
          },
        }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => '');
        throw new Error(msg || `AI assist failed (${res.status}).`);
      }

      const json = (await res.json()) as AssistResponse;
      setAiResult(json);

      if (mode === 'extract') {
        onApplyExtracted(json.extracted);
      }
    } catch (e: any) {
      setErr(e?.message ?? 'AI assist failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="bg-white text-slate-900">
      <CardHeader
        title="Event Assist (AI)"
        subtitle="Paste an invite email, flyer text, or event notes. We’ll help fill the form and draft follow-ups."
      />
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="aiText">Paste event text</Label>
          <Textarea
            id="aiText"
            rows={10}
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            placeholder="Paste the invite email, flyer details, or a text message with the event info…"
          />
          <HelpText>
            Runs through a secure Netlify function (if configured). If you’re developing locally, use <span className="font-semibold">netlify dev</span>.
          </HelpText>
        </div>

        {err ? <ErrorText>{err}</ErrorText> : null}

        <div className="flex flex-col gap-2">
          <Button type="button" disabled={loading} onClick={() => call('extract')}>
            {loading ? 'Working…' : 'AI Fill Form'}
          </Button>
          <Button type="button" variant="secondary" disabled={loading} onClick={() => call('drafts')}>
            {loading ? 'Working…' : 'Generate Confirmation + Brief'}
          </Button>
        </div>

        {aiResult?.notes?.length ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-semibold text-slate-900">
              AI Notes ({aiResult.confidence ?? 'medium'} confidence)
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-700">
              {aiResult.notes.map((n, idx) => (
                <li key={idx}>{n}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
