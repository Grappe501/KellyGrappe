import ActionQueueCard from "./command/ActionQueueCard";
import CommandSearchCard from "./command/CommandSearchCard";
import CommandSummaryCard from "./command/CommandSummaryCard";

import MessagingCenterCard from "./messaging/MessagingCenterCard";

import ContactsCard from "./metrics/ContactsCard";
import FollowUpBreakdownCard from "./metrics/FollowUpBreakdownCard";
import FollowUpsCard from "./metrics/FollowUpsCard";
import PowerOf5Card from "./metrics/PowerOf5Card";
import VoteGoalCard from "./metrics/VoteGoalCard";

import VoterIntelligenceCard from "./VoterIntelligenceCard";
import WinTargetStrategyCard from "./WinTargetStrategyCard";

export const cardRegistry = {
  "action-queue": ActionQueueCard,

  "command-search": CommandSearchCard,
  "command-summary": CommandSummaryCard,

  "messaging-center": MessagingCenterCard,

  "contacts": ContactsCard,
  "follow-up-breakdown": FollowUpBreakdownCard,
  "follow-ups": FollowUpsCard,

  "power-of5": PowerOf5Card,
  "vote-goal": VoteGoalCard,

  "voter-intelligence": VoterIntelligenceCard,
  "strategy-target": WinTargetStrategyCard
};

export default cardRegistry;