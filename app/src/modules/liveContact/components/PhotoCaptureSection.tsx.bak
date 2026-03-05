import React from 'react';
import { Button, ErrorText, HelpText, Input, Label } from '../../../shared/components/FormControls';
import type { LiveContactForm } from '../types/LiveContactForm';
import { useBusinessCardAI } from '../hooks/useBusinessCardAI';
import { usePhotoCapture } from '../hooks/usePhotoCapture';

export function PhotoCaptureSection(props: {
  form: LiveContactForm;
  update: <K extends keyof LiveContactForm>(k: K, v: LiveContactForm[K]) => void;
  onBusinessCardExtracted: (data: any) => void;
}) {
  const { form, update, onBusinessCardExtracted } = props;

  const photo = usePhotoCapture();
  const card = useBusinessCardAI();

  return (
    <div className="space-y-4">
      {(photo.error || card.error) && <ErrorText>{photo.error || card.error}</ErrorText>}

      <div className="rounded-2xl border border-slate-200 p-4">
        <div className="text-sm font-semibold text-slate-900">Contact Photo</div>
        <HelpText className="mt-1">If you have permission, grab a quick photo for recognition later.</HelpText>

        <div className="mt-3">
          <Input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={async (e) => {
              const file = e.target.files?.[0] || null;
              const dataUrl = await photo.capture(file);
              update('profilePhotoDataUrl', dataUrl);
            }}
          />
        </div>

        {form.profilePhotoDataUrl ? (
          <img src={form.profilePhotoDataUrl} className="mt-3 rounded-xl border" />
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-200 p-4">
        <div className="text-sm font-semibold text-slate-900">Business Card (auto-fill)</div>
        <HelpText className="mt-1">Snap the card. AI extracts contact details and fills the form.</HelpText>

        <div className="mt-3">
          <Input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;

              try {
                const res = await card.analyzeFrontOnly(file);
                update('businessCardDataUrl', res.dataUrl);
                onBusinessCardExtracted(res.extracted || {});
              } catch (err: any) {
                // hook handles error
              }
            }}
          />
        </div>

        {card.busy ? <div className="mt-2 text-sm font-medium text-indigo-600">Analyzing…</div> : null}

        {form.businessCardDataUrl ? (
          <img src={form.businessCardDataUrl} className="mt-3 rounded-xl border" />
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-200 p-4">
        <div className="text-sm font-semibold text-slate-900">Context Photo</div>
        <HelpText className="mt-1">Flyer, sign-in sheet, notes, etc. (Stored locally for now.)</HelpText>

        <div className="mt-3">
          <Input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={async (e) => {
              const file = e.target.files?.[0] || null;
              const dataUrl = await photo.capture(file);
              update('contextPhotoDataUrl', dataUrl);
            }}
          />
        </div>

        {form.contextPhotoDataUrl ? (
          <img src={form.contextPhotoDataUrl} className="mt-3 rounded-xl border" />
        ) : null}
      </div>
    </div>
  );
}
