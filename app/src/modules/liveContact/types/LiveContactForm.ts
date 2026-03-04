import type {
  BestContactMethod,
  CampaignTeam,
  ContactCategory,
  SupportLevel,
} from '../../../shared/utils/contactsDb';

export type LiveContactForm = {
  // accountability
  entryInitials: string;

  // identity
  fullName: string;
  phone: string;
  email: string;

  // location
  city: string;
  county: string;
  state: string;
  zip: string;

  precinct: string;
  congressionalDistrict: string;
  stateHouseDistrict: string;
  stateSenateDistrict: string;

  // campaign classification
  category: ContactCategory | '';
  supportLevel: SupportLevel | '';
  bestContactMethod: BestContactMethod | '';
  teamAssignments: CampaignTeam[];

  // context
  metWhere: string;
  metWhereDetails: string;
  eventName: string;
  introducedBy: string;
  organization: string;

  topIssue: string;
  conversationNotes: string;

  // social
  facebookConnected: boolean;
  facebookProfileName: string;
  facebookHandle: string;
  facebookUrl: string;

  instagramHandle: string;
  twitterHandle: string;
  linkedinUrl: string;
  tiktokHandle: string;

  // engagement signals
  interestedVolunteer: boolean;
  interestedDonate: boolean;
  interestedHostEvent: boolean;
  interestedYardSign: boolean;
  interestedCountyLeader: boolean;
  interestedPrecinctCaptain: boolean;

  // scoring (optional)
  influenceScore: number | '';
  fundraisingPotential: number | '';
  volunteerPotential: number | '';

  // tags
  tags: string[];

  // consent + follow-up
  permissionToContact: boolean;
  followUpNeeded: boolean;
  followUpNotes: string;
  followUpTargetAt: string; // datetime-local

  // media (offline data urls)
  profilePhotoDataUrl: string;
  businessCardDataUrl: string;
  contextPhotoDataUrl: string;
};
