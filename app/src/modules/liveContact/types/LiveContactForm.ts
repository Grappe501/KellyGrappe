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

  /** Legal permission to contact */
  permissionToContact: boolean;

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

  /**
   * CSV list of potential campaign roles
   * Example:
   * "Volunteer,Donor,Precinct Captain"
   */
  rolePotentialCsv: string;

  /** Flexible campaign tagging system */
  tags: string[];

  /* -------------------------------------------------------
   CONTEXT OF MEETING
   ------------------------------------------------------- */

  metWhere: string;
  metWhereDetails: string;

  eventName: string;
  introducedBy: string;

  /** Organization or group affiliation */
  organization: string;

  /** Political or civic affiliation (future analytics use) */
  affiliation: string;

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
   FOLLOW-UP PIPELINE
   ------------------------------------------------------- */

  /** Should this contact enter the follow-up pipeline */
  followUpNeeded: boolean;

  /**
   * Type of follow-up needed
   * CALL / TEXT / EMAIL / MEETING etc
   */
  followUpType: string;

  /**
   * Follow-up urgency
   * LOW / NORMAL / HIGH
   */
  followUpPriority: string;

  /**
   * Primary follow-up date field
   */
  followUpDate: string;

  /**
   * Compatibility field used by:
   * - FollowUpSection
   * - followupPayloadBuilder
   * - directory modules
   *
   * Both fields are kept to prevent schema breakage.
   */
  followUpTargetAt: string;

  /** Organizer notes for follow-up */
  followUpNotes: string;

  /**
   * Whether automated messaging / workflow
   * can be triggered by sync engine
   */
  automationEligible: boolean;

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