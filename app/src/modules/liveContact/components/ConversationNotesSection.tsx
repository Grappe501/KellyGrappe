import React from 'react';
import { Label, Textarea, Input, HelpText } from '@components/FormControls';
import type { LiveContactForm } from '../types/LiveContactForm';

export function ConversationNotesSection(props: {
  form: LiveContactForm;
  update: <K extends keyof LiveContactForm>(k: K, v: LiveContactForm[K]) => void;
}) {
  const { form, update } = props;

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="topIssue">Top issue / motivation (optional)</Label>
        <Input id="topIssue" value={form.topIssue} placeholder="What do they care about most?" onChange={(e) => update('topIssue', e.target.value)} />
      </div>

      <div>
        <Label htmlFor="conversationNotes">Conversation notes</Label>
        <Textarea
          id="conversationNotes"
          value={form.conversationNotes}
          placeholder="Key details, tone, commitments, follow-up promises, red flags, personal hooks they volunteered…"
          onChange={(e) => update('conversationNotes', e.target.value)}
        />
        <HelpText>This feeds the follow-up AI and improves persuasion + targeting.</HelpText>
      </div>
    </div>
  );
}
