import React from "react";
import {
  Input,
  Label,
  HelpText,
  ErrorText,
} from "@components/FormControls";

import type { LiveContactForm } from "../types/LiveContactForm";

export function ContactIdentitySection(props: {
  form: LiveContactForm;
  update: <K extends keyof LiveContactForm>(
    k: K,
    v: LiveContactForm[K]
  ) => void;
  emailValid: boolean;
}) {
  const { form, update, emailValid } = props;

  function onInitialsChange(v: string) {
    const clean = v.toUpperCase().slice(0, 3);
    update("entryInitials", clean);
  }

  return (
    <div className="space-y-5">

      {/* INITIALS */}
      <div>
        <Label htmlFor="entryInitials">Your Initials (3)</Label>

        <Input
          id="entryInitials"
          value={form.entryInitials}
          maxLength={3}
          autoCapitalize="characters"
          placeholder="ABC"
          onChange={(e) => onInitialsChange(e.target.value)}
        />

        <HelpText>
          Accountability stamp on every field-intake record.
        </HelpText>
      </div>


      {/* NAME */}
      <div>
        <Label htmlFor="fullName">Name</Label>

        <Input
          id="fullName"
          value={form.fullName}
          placeholder="Full name"
          autoComplete="name"
          onChange={(e) => update("fullName", e.target.value)}
        />
      </div>


      {/* PHONE + EMAIL */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

        {/* PHONE */}
        <div>
          <Label htmlFor="phone">Phone</Label>

          <Input
            id="phone"
            inputMode="tel"
            autoComplete="tel"
            value={form.phone}
            placeholder="(501) 555-0123"
            onChange={(e) => update("phone", e.target.value)}
          />

          <HelpText>
            Best number to reach them.
          </HelpText>
        </div>


        {/* EMAIL */}
        <div>
          <Label htmlFor="email">Email</Label>

          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={form.email}
            placeholder="name@email.com"
            onChange={(e) => update("email", e.target.value)}
          />

          {!emailValid && (
            <ErrorText>Invalid email format.</ErrorText>
          )}
        </div>

      </div>


      {/* PERMISSION TO CONTACT */}
      <div className="pt-2 border-t border-slate-200">

        <div className="flex items-center gap-3">

          <input
            id="permissionToContact"
            type="checkbox"
            checked={form.permissionToContact}
            onChange={(e) =>
              update("permissionToContact", e.target.checked)
            }
            className="h-4 w-4 rounded border-slate-300"
          />

          <Label htmlFor="permissionToContact">
            Permission to Contact
          </Label>

        </div>

        <HelpText>
          Required before saving. Confirms the person agreed to be contacted.
        </HelpText>

      </div>

    </div>
  );
}
