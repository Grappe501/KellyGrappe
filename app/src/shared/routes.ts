/*
  app/src/shared/routes.ts

  Central route registry.
  Import this anywhere you need stable route paths.
*/

export const ROUTES = {
  ROOT: "/",

  /* Intake */
  EVENT_REQUEST: "/event-request",
  CONTACT_IMPORT: "/contact-import",
  TEAM_SIGNUP: "/team-signup",
  LIVE_CONTACT: "/live-contact",

  /* Operations */
  LIVE_CONTACTS: "/live-contacts",

  /* CRM */
  CONTACTS: "/contacts",
  CONTACT_PROFILE: "/contacts/:id",

  /* Utilities */
  BUSINESS_CARD_SCAN: "/business-card-scan",

  /* System */
  THANK_YOU: "/thank-you",

  /* Campaign Intelligence */
  DASHBOARD: "/dashboard",
  ORGANIZER_TREE: "/organizer-tree",
} as const;

export type AppRouteKey = keyof typeof ROUTES;
