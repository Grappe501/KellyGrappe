/*
  contactsDb.ts
  Public API (barrel) for the campaign CRM IndexedDB layer.

  Contract
  --------
  UI and modules should import from this file:
    import { upsertContact, addLiveFollowUp, ... } from "../utils/db/contactsDb";

  Internals
  ---------
  - Core IndexedDB schema + helpers live in contactsDb.core.ts
  - Type-only definitions live in contactsDb.types.ts
  - Business operations live in ./services/*.service.ts

  This file intentionally re-exports a stable surface area.
*/

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type {
  SyncStatus,
  BaseRow,
  SupportLevel,
  BestContactMethod,
  ContactCategory,
  CampaignTeam,
  Contact,
  ContactDirectoryRow,
  OriginType,
  ContactOrigin,
  FollowUpStatus,
  LiveFollowUp,
  ContactMedia,
  ContactRelationship,
  ContactRelationshipType,
  VoterMatchRow,
  VoterMatchStatus,
} from "./contactsDb.types";

/* -------------------------------------------------------------------------- */
/* CORE EXPORTS (schema, stores, helpers)                                     */
/* -------------------------------------------------------------------------- */

export {
  DB_NAME,
  DB_VERSION,
  STORE_CONTACTS,
  STORE_ORIGINS,
  STORE_VOL_PROFILES,
  STORE_VOL_INTERESTS,
  STORE_EVENT_LEADS,
  STORE_LIVE_FOLLOWUPS,
  STORE_CONTACT_MEDIA,
  STORE_CONTACT_RELATIONSHIPS,
  STORE_VOTER_MATCHES,
  nowIso,
  safeTrim,
  uuid,
  isOfflineBestEffort,
  reqToPromise,
  txDone,
  openDb,
} from "./contactsDb.core";

/* -------------------------------------------------------------------------- */
/* DOMAIN OPERATIONS (services)                                               */
/* -------------------------------------------------------------------------- */

export {
  // contacts
  upsertContact,
  getContactById,
  updateContact,
  listContactsDirectoryRows,
  listContacts,
} from "./services/contacts.service";

export {
  // origins
  addOrigin,
  listOriginsForContact,
} from "./services/origins.service";

export {
  // followups
  addLiveFollowUp,
  updateLiveFollowUp,
  listLiveFollowUps,
  listLiveFollowUpsPendingSync,
  markLiveFollowUpSynced,
  markLiveFollowUpSyncError,
} from "./services/followups.service";

export {
  // media
  addContactMedia,
  listContactMedia,
} from "./services/media.service";

export {
  // relationships
  linkContacts,
  listContactRelationships,
} from "./services/relationships.service";

export {
  // voter matching
  createVoterMatch,
  listVoterMatchesForContact,
} from "./services/voterMatching.service";

export { parseCityCounty } from "./utils/parseCityCounty";

