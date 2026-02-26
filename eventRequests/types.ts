export type PreferredContactMethod = 'Email' | 'Phone' | 'Text';

export type EventType =
  | 'Candidate Forum / Debate'
  | 'Church Service / Faith Event'
  | 'Community Town Hall'
  | 'School / Sports Event'
  | 'Festival / Fair / Parade'
  | 'Union / Workplace Gathering'
  | 'Civic Club Meeting'
  | 'House Meetup'
  | 'Fundraiser'
  | 'Small Business Visit'
  | 'Other';

export type ExpectedAttendance = '1–10' | '11–25' | '26–50' | '51–100' | '100+';

export type RequestedRole =
  | 'Attend and greet attendees'
  | 'Speak briefly'
  | 'Featured speaker'
  | 'Private meeting'
  | 'Fundraiser ask'
  | 'Not sure';

export type MediaExpected = 'No' | 'Yes' | 'Not sure';

export type EventWizardStepId = 'who' | 'basics' | 'schedule' | 'logistics' | 'review';

export type EventRequestFormState = {
  // Who is inviting
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  preferredContactMethod: PreferredContactMethod;
  organization: string;

  // Event basics
  eventTitle: string;
  eventType: EventType;
  eventTypeOther: string;
  eventDescription: string;
  expectedAttendance: ExpectedAttendance;

  // When & where
  startDateTime: string; // datetime-local string
  endDateTime: string;   // datetime-local string
  isTimeFlexible: boolean;

  venueName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;

  // Logistics
  requestedRole: RequestedRole;
  mediaExpected: MediaExpected;
  hostNotes: string;

  // Consent
  permissionToContact: boolean;

  // Anti-spam
  honeypot: string;
};

export type AssistResponse = {
  extracted?: Partial<EventRequestFormState>;
  confidence?: 'low' | 'medium' | 'high';
  notes?: string[];
  drafts?: {
    confirmationEmail?: string;
    confirmationText?: string;
    internalBrief?: string;
    followUpChecklist?: string;
  };
};

export type CalendarConflictResult = {
  ok: boolean;
  conflict?: boolean;
  message?: string;
  suggestedTimes?: string[];
};

export type StepValidationErrors = Partial<Record<keyof EventRequestFormState, string>>;

export type WizardStep = {
  id: EventWizardStepId;
  title: string;
  kicker: string;
  description: string;
};
