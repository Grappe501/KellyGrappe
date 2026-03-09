/*
Card Registry

Defines all available cards and exposes a registry
API used by the dashboard renderer.

Supports lazy loading so cards are only loaded
when required by a dashboard.
*/

export type CardDefinition = {
    key: string
    title: string
    subtitle?: string
    category: string
    componentLoader: () => Promise<any>
    aiEnabled: boolean
    featureFlags: string[]
    serviceDependencies: string[]
  }
  
  /*
  Lazy loaders
  */
  
  const ActionQueueLoader = () => import("@/cards/command/ActionQueueCard")
  const CommandSearchLoader = () => import("@/cards/command/CommandSearchCard")
  const CommandSummaryLoader = () => import("@/cards/command/CommandSummaryCard")
  
  const ContactsLoader = () => import("@/cards/metrics/ContactsCard")
  const FollowUpBreakdownLoader = () => import("@/cards/metrics/FollowUpBreakdownCard")
  const FollowUpsLoader = () => import("@/cards/metrics/FollowUpsCard")
  
  const MessagingCenterLoader = () => import("@/cards/messaging/MessagingCenterCard")
  
  const PowerOf5Loader = () => import("@/cards/metrics/PowerOf5Card")
  const VoteGoalLoader = () => import("@/cards/metrics/VoteGoalCard")
  
  /*
  Card Registry Configuration
  */
  
  export const cardRegistry = {
    "action-queue": {
      key: "action-queue",
      title: "Action Queue",
      category: "command",
      componentLoader: ActionQueueLoader,
      aiEnabled: false,
      featureFlags: [],
      serviceDependencies: ["followups"]
    },
  
    "command-search": {
      key: "command-search",
      title: "Command Search",
      category: "command",
      componentLoader: CommandSearchLoader,
      aiEnabled: true,
      featureFlags: [],
      serviceDependencies: ["contacts"]
    },
  
    "command-summary": {
      key: "command-summary",
      title: "Command Summary",
      category: "command",
      componentLoader: CommandSummaryLoader,
      aiEnabled: true,
      featureFlags: [],
      serviceDependencies: ["contacts", "followups"]
    },
  
    "contacts": {
      key: "contacts",
      title: "Contacts",
      category: "metrics",
      componentLoader: ContactsLoader,
      aiEnabled: false,
      featureFlags: [],
      serviceDependencies: []
    },
  
    "follow-up-breakdown": {
      key: "follow-up-breakdown",
      title: "Follow Up Breakdown",
      category: "metrics",
      componentLoader: FollowUpBreakdownLoader,
      aiEnabled: false,
      featureFlags: [],
      serviceDependencies: []
    },
  
    "follow-ups": {
      key: "follow-ups",
      title: "Follow Ups",
      category: "metrics",
      componentLoader: FollowUpsLoader,
      aiEnabled: false,
      featureFlags: [],
      serviceDependencies: []
    },
  
    "messaging-center": {
      key: "messaging-center",
      title: "Messaging Center",
      category: "messaging",
      componentLoader: MessagingCenterLoader,
      aiEnabled: true,
      featureFlags: [],
      serviceDependencies: ["contacts"]
    },
  
    "power-of5": {
      key: "power-of5",
      title: "Power Of 5",
      category: "metrics",
      componentLoader: PowerOf5Loader,
      aiEnabled: false,
      featureFlags: [],
      serviceDependencies: []
    },
  
    "vote-goal": {
      key: "vote-goal",
      title: "Vote Goal",
      category: "metrics",
      componentLoader: VoteGoalLoader,
      aiEnabled: false,
      featureFlags: [],
      serviceDependencies: []
    }
  } as const
  
  /*
  Registry API used by platform renderers
  */
  
  export class CardRegistry {
  
    static get(key: string): CardDefinition | undefined {
      return (cardRegistry as any)[key]
    }
  
    static getAll(): CardDefinition[] {
      return Object.values(cardRegistry)
    }
  
    static has(key: string): boolean {
      return key in cardRegistry
    }
  
  }