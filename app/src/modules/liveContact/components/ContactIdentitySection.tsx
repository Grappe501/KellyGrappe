import React from 'react';
import { Input, Label, HelpText, ErrorText } from '../../../shared/components/FormControls';
import type { LiveContactForm } from '../types/LiveContactForm';

export function ContactIdentitySection(props: {
  form: LiveContactForm;
  update: <K extends keyof LiveContactForm>(k: K, v: LiveContactForm[K]) => void;
  emailValid: boolean;
}) {
  const { form, update, emailValid } = props;

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="entryInitials">Your Initials (3)</Label>
        <Input
          id="entryInitials"
          value={form.entryInitials}
          maxLength={3}
          onChange={(e) => update('entryInitials', e.target.value)}
        />
        <HelpText>Accountability stamp on every field-intake record.</HelpText>
      </div>

      <div>
        <Label htmlFor="fullName">Name</Label>
        <Input
          id="fullName"
          value={form.fullName}
          placeholder="Full name"
          onChange={(e) => update('fullName', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            inputMode="tel"
            value={form.phone}
            placeholder="(501) 555-0123"
            onChange={(e) => update('phone', e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            placeholder="name@email.com"
            onChange={(e) => update('email', e.target.value)}
          />
          {!emailValid && <ErrorText>Invalid email format.</ErrorText>}
        </div>
      </div>
    </div>
  );
}
