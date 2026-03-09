import ActionQueueCard from "@/cards/command/ActionQueueCard";
import CommandSearchCard from "@/cards/command/CommandSearchCard";
import CommandSummaryCard from "@/cards/command/CommandSummaryCard";
import ContactsCard from "@/cards/metrics/ContactsCard";
import FollowUpBreakdownCard from "@/cards/metrics/FollowUpBreakdownCard";
import FollowUpsCard from "@/cards/metrics/FollowUpsCard";
import MessagingCenterCard from "@/cards/messaging/MessagingCenterCard";
import PowerOf5Card from "@/cards/metrics/PowerOf5Card";
import VoteGoalCard from "@/cards/metrics/VoteGoalCard";

export const cardRegistry = {
  "action-queue": {
    key: "action-queue",
    title: "Action Queue",
    category: "command",
    component: ActionQueueCard,
    aiEnabled: false,
    featureFlags: [],
    serviceDependencies: ["followups"],
  },
  "command-search": {
    key: "command-search",
    title: "Command Search",
    category: "command",
    component: CommandSearchCard,
    aiEnabled: true,
    featureFlags: [],
    serviceDependencies: ["contacts"],
  },
  "command-summary": {
    key: "command-summary",
    title: "Command Summary",
    category: "command",
    component: CommandSummaryCard,
    aiEnabled: true,
    featureFlags: [],
    serviceDependencies: ["contacts", "followups"],
  },
  "contacts": {
    key: "contacts",
    title: "Contacts",
    category: "metrics",
    component: ContactsCard,
    aiEnabled: false,
    featureFlags: [],
    serviceDependencies: [],
  },
  "follow-up-breakdown": {
    key: "follow-up-breakdown",
    title: "Follow Up Breakdown",
    category: "metrics",
    component: FollowUpBreakdownCard,
    aiEnabled: false,
    featureFlags: [],
    serviceDependencies: [],
  },
  "follow-ups": {
    key: "follow-ups",
    title: "Follow Ups",
    category: "metrics",
    component: FollowUpsCard,
    aiEnabled: false,
    featureFlags: [],
    serviceDependencies: [],
  },
  "messaging-center": {
    key: "messaging-center",
    title: "Messaging Center",
    category: "messaging",
    component: MessagingCenterCard,
    aiEnabled: true,
    featureFlags: [],
    serviceDependencies: ["contacts"],
  },
  "power-of5": {
    key: "power-of5",
    title: "Power Of5",
    category: "metrics",
    component: PowerOf5Card,
    aiEnabled: false,
    featureFlags: [],
    serviceDependencies: [],
  },
  "vote-goal": {
    key: "vote-goal",
    title: "Vote Goal",
    category: "metrics",
    component: VoteGoalCard,
    aiEnabled: false,
    featureFlags: [],
    serviceDependencies: [],
  },
} as const;

export default cardRegistry;
