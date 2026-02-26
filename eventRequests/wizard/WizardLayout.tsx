import React from 'react';
import Container from '../../shared/components/Container';
import { Card, CardHeader, CardContent } from '../../shared/components/Card';
import { Button, HelpText } from '../../shared/components/FormControls';
import type { EventWizardStepId, WizardStep } from '../types';
import WizardProgress from './WizardProgress';

export default function WizardLayout(props: {
  title: string;
  subtitle: string;
  steps: WizardStep[];
  activeId: EventWizardStepId;
  onStepClick: (id: EventWizardStepId) => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onSaveDraft?: () => void;
  onClearDraft?: () => void;
}) {
  return (
    <Container>
      <div className="space-y-6">
        {/* Hero */}
        <Card className="bg-white text-slate-900">
          <CardHeader
            title={props.title}
            subtitle={props.subtitle}
          />
          <CardContent>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
              <div className="text-sm font-semibold text-slate-900">
                People-powered scheduling — built to move fast.
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700">
                <li>Your request is logged into the campaign’s follow-up queue.</li>
                <li>We confirm details quickly — usually within 24 hours.</li>
                <li>Nothing gets lost. Every request becomes a trackable task.</li>
              </ul>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button type="button" onClick={props.onSaveDraft}>
                  Save Draft
                </Button>
                <Button type="button" variant="secondary" onClick={props.onClearDraft}>
                  Clear Draft
                </Button>
              </div>
              <HelpText className="mt-3">
                Draft saving is manual (on purpose) — so it never interferes with typing.
              </HelpText>
            </div>
          </CardContent>
        </Card>

        {/* Body */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <Card className="bg-white text-slate-900">
              <CardHeader
                title="Step-by-step"
                subtitle="One section at a time. Easy, fast, no overwhelm."
              />
              <CardContent>
                <WizardProgress
                  steps={props.steps}
                  activeId={props.activeId}
                  onStepClick={props.onStepClick}
                />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            {props.children}
            {props.footer ? <div className="mt-6">{props.footer}</div> : null}
          </div>
        </div>
      </div>
    </Container>
  );
}
