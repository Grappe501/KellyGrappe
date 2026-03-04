import React from 'react';
import { Input, Label, HelpText } from '../../../shared/components/FormControls';
import type { LiveContactForm } from '../types/LiveContactForm';

export function SocialProfilesSection(props: {
  form: LiveContactForm;
  update: <K extends keyof LiveContactForm>(k: K, v: LiveContactForm[K]) => void;
}) {
  const { form, update } = props;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 p-4">
        <div className="flex items-start gap-3">
          <input
            id="facebookConnected"
            type="checkbox"
            checked={form.facebookConnected}
            onChange={(e) => update('facebookConnected', e.target.checked)}
            className="mt-1"
          />
          <div>
            <Label htmlFor="facebookConnected">Connected on Facebook</Label>
            <HelpText className="mt-1">Helps relationship mapping + messaging.</HelpText>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="facebookProfileName">Facebook profile name</Label>
            <Input id="facebookProfileName" value={form.facebookProfileName} onChange={(e) => update('facebookProfileName', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="facebookHandle">Facebook handle</Label>
            <Input id="facebookHandle" value={form.facebookHandle} onChange={(e) => update('facebookHandle', e.target.value)} placeholder="@handle" />
          </div>
        </div>

        <div className="mt-4">
          <Label htmlFor="facebookUrl">Facebook link</Label>
          <Input id="facebookUrl" value={form.facebookUrl} onChange={(e) => update('facebookUrl', e.target.value)} placeholder="https://facebook.com/..." />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="instagramHandle">Instagram</Label>
          <Input id="instagramHandle" value={form.instagramHandle} onChange={(e) => update('instagramHandle', e.target.value)} placeholder="@handle" />
        </div>
        <div>
          <Label htmlFor="tiktokHandle">TikTok</Label>
          <Input id="tiktokHandle" value={form.tiktokHandle} onChange={(e) => update('tiktokHandle', e.target.value)} placeholder="@handle" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="twitterHandle">X / Twitter</Label>
          <Input id="twitterHandle" value={form.twitterHandle} onChange={(e) => update('twitterHandle', e.target.value)} placeholder="@handle" />
        </div>
        <div>
          <Label htmlFor="linkedinUrl">LinkedIn</Label>
          <Input id="linkedinUrl" value={form.linkedinUrl} onChange={(e) => update('linkedinUrl', e.target.value)} placeholder="https://linkedin.com/in/..." />
        </div>
      </div>
    </div>
  );
}
