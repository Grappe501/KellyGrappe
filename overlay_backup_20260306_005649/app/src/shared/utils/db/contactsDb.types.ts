/*
  contactsDb.types.ts
  Shared types for the campaign CRM IndexedDB layer.

  IMPORTANT
  ---------
  Keep this file TYPE-ONLY (enums/types/constants).
  Do not import services from here.

  This exists to prevent circular imports:
  - contactsDb.ts re-exports services
  - services need these types
*/

export type SyncStatus = "PENDING_SYNC" | "SYNCED" | "ERROR";

export type BaseRow = {
  id: string;
  createdAt: string;
  updatedAt?: string;
  followUpStatus?: string;
  followUpTargetAt?: string;
};

/* -------------------------------------------------------------------------- */
/* CONTACT ENUMS                                                              */
/* -------------------------------------------------------------------------- */

export type SupportLevel =
  | "STRONG_SUPPORT"
  | "LEAN_SUPPORT"
  | "UNSURE"
  | "LEAN_OPPOSE"
  | "STRONG_OPPOSE";

export type BestContactMethod = "PHONE" | "TEXT" | "EMAIL" | "IN_PERSON";

export type ContactCategory =
  | "VOTER"
  | "VOLUNTEER"
  | "DONOR"
  | "LEADER"
  | "PRESS"
  | "STAFF"
  | "OTHER";

export type CampaignTeam = string;

/* -------------------------------------------------------------------------- */
/* CONTACT                                                                    */
/* -------------------------------------------------------------------------- */

export type Contact = BaseRow & {
  fullName: string;

  phone?: string;
  email?: string;

  city?: string;
  county?: string;
  state?: string;
  zip?: string;

  location?: string;

  interestedVolunteer?: boolean;
  volunteerInterests?: string[];

  precinct?: string;
  congressionalDistrict?: string;
  stateHouseDistrict?: string;
  stateSenateDistrict?: string;

  category?: ContactCategory;
  supportLevel?: SupportLevel;
  bestContactMethod?: BestContactMethod;

  // intake lineage
  createdFrom?: "LIVE_FIELD" | "IMPORT" | "EVENT" | "BUSINESS_CARD" | "OTHER";

  // Organizing metadata
  teamAssignments?: CampaignTeam[];
  rolePotential?: string[];
  tags?: string[];

  introducedBy?: string;
  organization?: string;
  metWhere?: string;
  eventName?: string;
  metWhereDetails?: string;
  topIssue?: string;
  conversationNotes?: string;
};

export type ContactDirectoryRow = Pick<
  Contact,
  | "id"
  | "fullName"
  | "phone"
  | "email"
  | "city"
  | "county"
  | "state"
  | "zip"
  | "tags"
  | "category"
  | "supportLevel"
> & {
  updatedAt?: string;
};

/* -------------------------------------------------------------------------- */
/* ORIGINS                                                                    */
/* -------------------------------------------------------------------------- */

export type OriginType =
  | "LIVE_FIELD"
  | "CONTACT_IMPORT"
  | "EVENT_REQUEST"
  | "BUSINESS_CARD_SCAN"
  | "OTHER";

export type ContactOrigin = BaseRow & {
  contactId: string;
  originType: OriginType;
  capturedAt: string;
  rawPayload?: unknown;
};

/* -------------------------------------------------------------------------- */
/* FOLLOWUPS                                                                  */
/* -------------------------------------------------------------------------- */

export type FollowUpStatus = "NEW" | "IN_PROGRESS" | "COMPLETED";

export type LiveFollowUp = BaseRow & {
  contactId: string;

  followUpStatus: FollowUpStatus;
  archived?: boolean;

  // sync
  syncStatus?: SyncStatus;
  serverId?: string;
  createdOffline?: boolean;
  lastSyncAttemptAt?: string;
  lastSyncError?: string | null;

  // notes
  followUpNotes?: string;
  notes?: string;
  followUpCompletedAt?: string;

  // convenience snapshot fields
  name?: string;
  phone?: string;
  email?: string;
  location?: string;
  source?: string;
  permissionToContact?: boolean;
  entryInitials?: string;
};

/* -------------------------------------------------------------------------- */
/* MEDIA                                                                      */
/* -------------------------------------------------------------------------- */

export type ContactMedia = BaseRow & {
  contactId: string;
  type: "PROFILE_PHOTO" | "BUSINESS_CARD" | "CONTEXT_PHOTO" | string;

  dataUrl?: string;
  fileName?: string;
  fileUrl?: string;
  mimeType?: string;
  sizeBytes?: number;

  serverId?: string;
  createdOffline?: boolean;
  syncStatus?: SyncStatus;
  lastSyncAttemptAt?: string;
  lastSyncError?: string | null;
};

/* -------------------------------------------------------------------------- */
/* RELATIONSHIPS                                                              */
/* -------------------------------------------------------------------------- */

export type ContactRelationshipType = string;

export type ContactRelationship = BaseRow & {
  fromContactId: string;
  toContactId: string;
  relationshipType: ContactRelationshipType;
};

/* -------------------------------------------------------------------------- */
/* VOTER MATCHING                                                             */
/* -------------------------------------------------------------------------- */

export type VoterMatchStatus =
  | "MATCHED"
  | "CLAIMED"
  | "NEEDS_REGISTRATION"
  | "UNMATCHED";

export type VoterMatchRow = BaseRow & {
  contactId: string;

  voterFileId?: string;
  claimedByContactId?: string;

  matchConfidence?: number;

  needsRegistration?: boolean;
  status?: VoterMatchStatus;
};
