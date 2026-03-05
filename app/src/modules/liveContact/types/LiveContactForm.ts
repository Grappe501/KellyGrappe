import type {
  BestContactMethod,
  CampaignTeam,
  ContactCategory,
  SupportLevel,
} from "../../../shared/utils/contactsDb";

/**
 * Canonical schema for the Live Contact intake form.
 *
 * This schema is optimized for:
 * - fast canvassing entry
 * - offline-first operation
 * - compatibility with Contact + LiveFollowUp DB models
 * - future CRM expansion
 */
export type LiveContactForm = {
  /* -------------------------------------------------------
   ACCOUNTABILITY
   ------------------------------------------------------- */

  /** Initials of the staffer/volunteer entering the contact */
  entryInitials: string;

  /* -------------------------------------------------------
   CORE IDENTITY
   ------------------------------------------------------- */

  fullName: string;
  phone: string;
  email: string;

  /* -------------------------------------------------------
   LOCATION
   ------------------------------------------------------- */

  city: string;
  county: string;
  state: string;
  zip: string;

  precinct: string;
  congressionalDistrict: string;
  stateHouseDistrict: string;
  stateSenateDistrict: string;

  /* -------------------------------------------------------
   CAMPAIGN CLASSIFICATION
   ------------------------------------------------------- */

  /** Voter, volunteer, influencer, donor, etc */
  category: ContactCategory | "";

  /** Strong support → opposed */
  supportLevel: SupportLevel | "";

  /** Preferred outreach method */
  bestContactMethod: BestContactMethod | "";

  /** Campaign team routing */
  teamAssignments: CampaignTeam[];

  /* -------------------------------------------------------
   CONTEXT OF MEETING
   ------------------------------------------------------- */

  metWhere: string;
  metWhereDetails: string;

  eventName: string;
  introducedBy: string;

  /** Organization or group affiliation */
  organization: string;

  /* -------------------------------------------------------
   CONVERSATION
   ------------------------------------------------------- */

  /** Top issue mentioned by contact */
  topIssue: string;

  /** Free-form notes from conversation */
  conversationNotes: string;

  /* -------------------------------------------------------
   SOCIAL MEDIA
   ------------------------------------------------------- */

  facebookConnected: boolean;
  facebookProfileName: string;
  facebookHandle: string;
  facebookUrl: string;

  instagramHandle: string;
  twitterHandle: string;
  linkedinUrl: string;
  tiktokHandle: string;

  /* -------------------------------------------------------
   ENGAGEMENT SIGNALS
   ------------------------------------------------------- */

  interestedVolunteer: boolean;
  interestedDonate: boolean;
  interestedHostEvent: boolean;
  interestedYardSign: boolean;

  interestedCountyLeader: boolean;
  interestedPrecinctCaptain: boolean;

  /* -------------------------------------------------------
   INFLUENCE / POTENTIAL SCORING
   ------------------------------------------------------- */

  /**
   * Local influence in community
   * 1–5 or empty if unknown
   */
  influenceScore: number | "" | undefined;

  /**
   * Likelihood of donating
   * 1–5 or empty
   */
  fundraisingPotential: number | "" | undefined;

  /**
   * Likelihood of volunteering
   * 1–5 or empty
   */
  volunteerPotential: number | "" | undefined;

  /* -------------------------------------------------------
   TAGGING
   ------------------------------------------------------- */

  /** Flexible campaign tagging system */
  tags: string[];

  /* -------------------------------------------------------
   CONSENT + FOLLOW-UP
   ------------------------------------------------------- */

  /** Legal permission to contact */
  permissionToContact: boolean;

  /** Should this contact enter the follow-up pipeline */
  followUpNeeded: boolean;

  /** Follow-up notes for organizer */
  followUpNotes: string;

  /** Follow-up target date (datetime-local input) */
  followUpTargetAt: string;

  /* -------------------------------------------------------
   MEDIA (OFFLINE FIRST)
   ------------------------------------------------------- */

  /** Profile photo taken in field */
  profilePhotoDataUrl: string;

  /** Business card scan */
  businessCardDataUrl: string;

  /** Optional contextual photo */
  contextPhotoDataUrl: string;
};