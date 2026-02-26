import React from 'react';
import type { WizardStep, EventWizardStepId } from '../types';

export default function WizardProgress(props: {
  steps: WizardStep[];
  activeId: EventWizardStepId;
  onStepClick?: (id: EventWizardStepId) => void;
}) {
  const { steps, activeId, onStepClick } = props;

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
        Progress
      </div>

      <ol className="space-y-2">
        {steps.map((s, idx) => {
          const active = s.id === activeId;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onStepClick?.(s.id)}
                className={[
                  'w-full rounded-xl border px-3 py-3 text-left transition',
                  active
                    ? 'border-slate-300 bg-white shadow-sm'
                    : 'border-slate-200 bg-slate-50 hover:bg-white',
                ].join(' ')}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-600">{s.kicker}</div>
                    <div className="text-sm font-semibold text-slate-900">{s.title}</div>
                  </div>
                  <div
                    className={[
                      'grid h-7 w-7 place-items-center rounded-full text-xs font-bold',
                      active ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700',
                    ].join(' ')}
                    aria-hidden="true"
                  >
                    {idx + 1}
                  </div>
                </div>
                <div className="mt-2 text-xs text-slate-600">{s.description}</div>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
