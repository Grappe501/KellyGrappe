import type { EventRequestFormState, StepValidationErrors, EventWizardStepId } from '../types';
import { isEmailLike, safeTrim } from './formatting';

export function validateStep(stepId: EventWizardStepId, form: EventRequestFormState): StepValidationErrors {
  const e: StepValidationErrors = {};
  const showOtherType = form.eventType === 'Other';

  if (stepId === 'who') {
    if (!safeTrim(form.contactName)) e.contactName = 'Full name is required.';
    if (!safeTrim(form.contactEmail)) e.contactEmail = 'Email is required.';
    else if (!isEmailLike(form.contactEmail)) e.contactEmail = 'Please enter a valid email.';
    return e;
  }

  if (stepId === 'basics') {
    if (!safeTrim(form.eventTitle)) e.eventTitle = 'Event title is required.';
    if (showOtherType && !safeTrim(form.eventTypeOther)) e.eventTypeOther = 'Please describe the event type.';
    return e;
  }

  if (stepId === 'schedule') {
    if (!safeTrim(form.startDateTime)) e.startDateTime = 'Start date & time is required.';
    if (!safeTrim(form.addressLine1)) e.addressLine1 = 'Street address is required.';
    if (!safeTrim(form.city)) e.city = 'City is required.';
    if (!safeTrim(form.state)) e.state = 'State is required.';
    if (!safeTrim(form.zip)) e.zip = 'ZIP is required.';
    return e;
  }

  if (stepId === 'logistics') {
    // no required fields here; intentionally flexible
    return e;
  }

  if (stepId === 'review') {
    if (!form.permissionToContact) e.permissionToContact = 'Consent is required to submit.';
    // Also validate earlier critical fields as a final gate
    const who = validateStep('who', form);
    const basics = validateStep('basics', form);
    const schedule = validateStep('schedule', form);
    return { ...who, ...basics, ...schedule, ...e };
  }

  return e;
}

export function hasErrors(errors: StepValidationErrors): boolean {
  return Object.values(errors).some(Boolean);
}
