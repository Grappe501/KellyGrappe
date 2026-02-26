import { useMemo, useState } from 'react';
import type { EventWizardStepId, StepValidationErrors, EventRequestFormState } from '../types';
import { WIZARD_STEPS } from '../utils/constants';
import { validateStep, hasErrors } from '../utils/validation';

export function useWizard(form: EventRequestFormState) {
  const [stepId, setStepId] = useState<EventWizardStepId>('who');
  const [touched, setTouched] = useState<Record<EventWizardStepId, boolean>>({
    who: false,
    basics: false,
    schedule: false,
    logistics: false,
    review: false,
  });

  const stepIndex = useMemo(() => WIZARD_STEPS.findIndex((s) => s.id === stepId), [stepId]);
  const current = useMemo(() => WIZARD_STEPS[stepIndex] ?? WIZARD_STEPS[0], [stepIndex]);
  const errors: StepValidationErrors = useMemo(() => {
    if (!touched[stepId]) return {};
    return validateStep(stepId, form);
  }, [form, stepId, touched]);

  function markTouched(id: EventWizardStepId) {
    setTouched((p) => ({ ...p, [id]: true }));
  }

  function goTo(id: EventWizardStepId) {
    setStepId(id);
  }

  function next(): { ok: boolean; errors?: StepValidationErrors } {
    markTouched(stepId);
    const e = validateStep(stepId, form);
    if (hasErrors(e)) return { ok: false, errors: e };

    const nextStep = WIZARD_STEPS[stepIndex + 1];
    if (nextStep) setStepId(nextStep.id);
    return { ok: true };
  }

  function back() {
    const prev = WIZARD_STEPS[stepIndex - 1];
    if (prev) setStepId(prev.id);
  }

  return {
    stepId,
    stepIndex,
    currentStep: current,
    steps: WIZARD_STEPS,
    errors,
    touched,
    goTo,
    next,
    back,
    markTouched,
  };
}
