/**
 * messaging.dashboard.ts
 *
 * Communication Circle Messaging Dashboard Definition
 *
 * This file registers the Messaging Command Center dashboard with the
 * platform dashboard registry.
 *
 * Responsibilities
 * ----------------
 * • Define dashboard metadata
 * • Declare card composition
 * • Enable AI dashboard generation
 * • Enable runtime discovery
 * • Connect dashboard to Communication Circle
 *
 * This file contains NO UI code.
 * It is pure platform configuration.
 */

import type { PlatformDashboardDefinition } from "@platform/types/platform.types"

/* -------------------------------------------------------------------------- */
/* DASHBOARD DEFINITION                                                       */
/* -------------------------------------------------------------------------- */

export const MessagingDashboard: PlatformDashboardDefinition = {
  key: "MessagingDashboard",

  title: "Messaging Command Center",

  description:
    "Operational command center for campaign messaging, outreach, and communication systems.",

  circle: "communication",

  icon: "message-square",

  category: "operations",

  order: 1,

  /* ---------------------------------------------------------------------- */
  /* PRIMARY CARDS                                                          */
  /* ---------------------------------------------------------------------- */

  cards: [

    "MessagingCommandCenterCard",

    "AudienceSegmentBuilderCard",

    "ChannelStatusCard",

    "MessageQueueCard",

    "EngagementPerformanceCard",

    "TemplateLibraryCard"

  ],

  /* ---------------------------------------------------------------------- */
  /* OPTIONAL EXTENSION CARDS                                               */
  /* These may appear dynamically depending on enabled modules              */
  /* ---------------------------------------------------------------------- */

  optionalCards: [

    "EmailCampaignCard",

    "SMSCampaignCard",

    "PhoneBankBuilderCard",

    "DirectMailAudienceCard",

    "SocialPublishingCard",

    "DiscordCommandCenterCard",

    "SubstackPublishingCard",

    "WebsiteConversionCard"

  ],

  /* ---------------------------------------------------------------------- */
  /* DATA SOURCES                                                           */
  /* Used by dashboard generators and AI systems                            */
  /* ---------------------------------------------------------------------- */

  dataSources: [

    "contacts",

    "audiences",

    "message_campaigns",

    "message_deliveries",

    "social_posts",

    "discord_members",

    "substack_posts",

    "website_events"

  ],

  /* ---------------------------------------------------------------------- */
  /* SERVICES                                                               */
  /* Declares platform services used by dashboard cards                     */
  /* ---------------------------------------------------------------------- */

  services: [

    "messaging",

    "audience",

    "engagement",

    "template",

    "social",

    "discord",

    "substack",

    "website"

  ],

  /* ---------------------------------------------------------------------- */
  /* AI CAPABILITIES                                                        */
  /* ---------------------------------------------------------------------- */

  aiCapabilities: [

    "ai.message.writer",

    "ai.audience.builder",

    "ai.segment.optimizer",

    "ai.response.summarizer",

    "ai.engagement.scorer",

    "ai.next-best-action",

    "ai.social.handle.linker",

    "ai.discord.bot.builder",

    "ai.substack.repurposer"

  ],

  /* ---------------------------------------------------------------------- */
  /* ROUTE                                                                  */
  /* ---------------------------------------------------------------------- */

  route: "/dashboard/messaging",

  /* ---------------------------------------------------------------------- */
  /* ACCESS CONTROL                                                         */
  /* ---------------------------------------------------------------------- */

  permissions: [

    "campaign_admin",

    "communications_director",

    "organizer",

    "volunteer"

  ],

  /* ---------------------------------------------------------------------- */
  /* FEATURE FLAGS                                                          */
  /* ---------------------------------------------------------------------- */

  featureFlags: [

    "messaging",

    "audience_builder",

    "social_integration",

    "discord_integration",

    "substack_integration",

    "website_tracking"

  ]

}

/* -------------------------------------------------------------------------- */
/* DEFAULT EXPORT                                                             */
/* -------------------------------------------------------------------------- */

export default MessagingDashboard
