import type { EventType, WizardStep } from '../types';

export const EVENT_TYPES: EventType[] = [
  'Candidate Forum / Debate',
  'Church Service / Faith Event',
  'Community Town Hall',
  'School / Sports Event',
  'Festival / Fair / Parade',
  'Union / Workplace Gathering',
  'Civic Club Meeting',
  'House Meetup',
  'Fundraiser',
  'Small Business Visit',
  'Other',
];

export const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'who',
    title: "Who’s inviting?",
    kicker: 'Step 1 of 5',
    description: 'So we can confirm details fast.',
  },
  {
    id: 'basics',
    title: 'Event basics',
    kicker: 'Step 2 of 5',
    description: 'What it is, who it’s for, and what you need.',
  },
  {
    id: 'schedule',
    title: 'When & where',
    kicker: 'Step 3 of 5',
    description: 'Lock down the time and location.',
  },
  {
    id: 'logistics',
    title: 'Logistics',
    kicker: 'Step 4 of 5',
    description: 'Media, role, and anything we should know.',
  },
  {
    id: 'review',
    title: 'Review & submit',
    kicker: 'Step 5 of 5',
    description: 'One last look — then it goes straight to the campaign inbox.',
  },
];

export const DRAFT_KEY = 'KG_SOS_EVENT_REQUEST_WIZARD_DRAFT_v1';
