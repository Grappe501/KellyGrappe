/* app/src/cards/types.ts
   Production-grade card platform contracts

   Purpose:
   - Define the universal schema for all cards
   - Support registry-based dashboard composition
   - Support role-based dashboards
   - Support feature toggles
   - Support theming / branding
   - Support AI integration and audit logging
   - Support micro-room / workspace expansion
*/

/* -------------------------------------------------------------------------- */
/*                               PRIMITIVE TYPES                              */
/* -------------------------------------------------------------------------- */

export type ID = string;

export type ISODateString = string;

export type Dictionary<T = unknown> = Record<string, T>;

export type Nullable<T> = T | null;

export type Maybe<T> = T | undefined;

/* -------------------------------------------------------------------------- */
/*                              FEATURE FLAG TYPES                             */
/* -------------------------------------------------------------------------- */

export type FeatureKey =
  | "ai"
  | "messaging"
  | "sms"
  | "email"
  | "social"
  | "social_twitter"
  | "social_facebook"
  | "social_instagram"
  | "social_tiktok"
  | "social_youtube"
  | "social_substack"
  | "fundraising"
  | "goodchange"
  | "contacts"
  | "followups"
  | "events"
  | "field"
  | "voter_matching"
  | "business_card_scan"
  | "contact_import"
  | "organizer_tree"
  | "microrooms"
  | "training"
  | "analytics"
  | "relationships"
  | "volunteers"
  | "admin"
  | "theme_customization";

export type FeatureFlagMap = Partial<Record<FeatureKey, boolean>>;

/* -------------------------------------------------------------------------- */
/*                              WORKSPACE / ORG TYPES                         */
/* -------------------------------------------------------------------------- */

export type WorkspaceType =
  | "campaign"
  | "church"
  | "nonprofit"
  | "student"
  | "issue_campaign"
  | "ballot_committee"
  | "civic_org"
  | "training_org"
  | "admin";

export type OrganizationType =
  | "campaign"
  | "church"
  | "faith_network"
  | "nonprofit"
  | "civic_org"
  | "student_org"
  | "ballot_committee"
  | "coalition"
  | "vendor"
  | "platform_owner";

export type UserRole =
  | "super_admin"
  | "platform_admin"
  | "org_admin"
  | "campaign_manager"
  | "candidate"
  | "field_director"
  | "communications_director"
  | "digital_director"
  | "fundraising_director"
  | "volunteer_coordinator"
  | "county_captain"
  | "precinct_captain"
  | "organizer"
  | "volunteer"
  | "youth_lead"
  | "student_user"
  | "viewer";

export interface WorkspaceTheme {
  id?: ID;
  workspaceId?: ID;
  organizationId?: ID;

  name?: string;
  logoUrl?: string;
  faviconUrl?: string;

  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  successColor?: string;
  warningColor?: string;
  dangerColor?: string;
  infoColor?: string;

  surfaceColor?: string;
  surfaceAltColor?: string;
  borderColor?: string;

  textColor?: string;
  textMutedColor?: string;
  headingColor?: string;

  radius?: "sm" | "md" | "lg" | "xl";
  shadowStyle?: "soft" | "medium" | "strong";

  fontFamilySans?: string;
  fontFamilyDisplay?: string;

  customCssVars?: Record<string, string>;
}

export interface WorkspaceContext {
  workspaceId?: ID;
  organizationId?: ID;
  workspaceType?: WorkspaceType;
  organizationType?: OrganizationType;

  currentUserId?: ID;
  currentUserRole?: UserRole;

  featureFlags?: FeatureFlagMap;
  theme?: WorkspaceTheme;
}

/* -------------------------------------------------------------------------- */
/*                                CARD LAYOUT                                 */
/* -------------------------------------------------------------------------- */

export type CardCategory =
  | "command"
  | "metrics"
  | "operations"
  | "messaging"
  | "social"
  | "fundraising"
  | "field"
  | "events"
  | "contacts"
  | "intake"
  | "analytics"
  | "ai"
  | "admin"
  | "training";

export type CardDisplayMode =
  | "compact"
  | "standard"
  | "expanded"
  | "full";

export type CardWidth =
  | 1
  | 2
  | 3
  | 4
  | 6
  | 12;

export type CardHeight =
  | "auto"
  | "sm"
  | "md"
  | "lg"
  | "xl";

export interface CardGridPlacement {
  x?: number;
  y?: number;
  w: CardWidth;
  h?: CardHeight;
}

export interface CardStyleOverrides {
  variant?: "default" | "elevated" | "ghost" | "accent";
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
}

/* -------------------------------------------------------------------------- */
/*                             CARD AI CONFIG TYPES                            */
/* -------------------------------------------------------------------------- */

export type AIAccessLevel =
  | "disabled"
  | "read_only"
  | "assist"
  | "generate"
  | "admin";

export interface AICardCapabilities {
  enabled?: boolean;
  accessLevel?: AIAccessLevel;

  allowSummary?: boolean;
  allowSuggestions?: boolean;
  allowDashboardGeneration?: boolean;
  allowWorkflowGeneration?: boolean;
  allowTaskGeneration?: boolean;
  allowPromptHistory?: boolean;

  maxPromptsPerDay?: number;
  maxPromptsPerHour?: number;

  modelPreference?: string;
  promptNamespace?: string;
}

export interface AIInteractionMetadata {
  interactionId?: ID;
  createdAt?: ISODateString;

  userId?: ID;
  workspaceId?: ID;
  organizationId?: ID;

  dashboardId?: ID;
  dashboardKey?: string;

  cardId?: ID;
  cardKey?: string;

  sessionId?: string;
  ipAddress?: string;
  browser?: string;
  deviceType?: string;

  model?: string;
  tokensUsed?: number;
  latencyMs?: number;

  success?: boolean;
  error?: string | null;
}

/* -------------------------------------------------------------------------- */
/*                            CARD DATA CONTRACTS                              */
/* -------------------------------------------------------------------------- */

export type DataRequirementMode =
  | "required"
  | "optional"
  | "lazy";

export interface CardDataDependency {
  key: string;
  mode?: DataRequirementMode;
  description?: string;
}

export interface CardActionDefinition {
  id: string;
  label: string;
  icon?: string;

  variant?: "primary" | "secondary" | "danger" | "ghost";
  visible?: boolean;
  enabled?: boolean;

  featureKey?: FeatureKey;
  minRole?: UserRole;

  analyticsEventName?: string;
}

export interface CardEmptyState {
  title?: string;
  message?: string;
  ctaLabel?: string;
  ctaActionId?: string;
}

export interface CardLoadingState {
  skeleton?: "lines" | "metric" | "table" | "list" | "custom";
  minHeight?: string;
}

export interface CardErrorState {
  title?: string;
  message?: string;
  retryActionId?: string;
}

/* -------------------------------------------------------------------------- */
/*                            CORE CARD DEFINITION                             */
/* -------------------------------------------------------------------------- */

export interface BaseCardProps<TData = unknown, TFilters = unknown> {
  cardId: ID;
  cardKey: string;

  title: string;
  subtitle?: string;

  category: CardCategory;

  workspace?: WorkspaceContext;

  data?: TData;
  filters?: TFilters;

  displayMode?: CardDisplayMode;

  loading?: boolean;
  error?: string | null;

  className?: string;
}

export interface CardDefinition<TData = unknown, TFilters = unknown> {
  key: string;
  title: string;
  subtitle?: string;

  category: CardCategory;
  version: number;

  description?: string;
  icon?: string;

  defaultWidth: CardWidth;
  defaultHeight?: CardHeight;

  defaultDisplayMode?: CardDisplayMode;

  featureKey?: FeatureKey;
  requiredFeatures?: FeatureKey[];
  allowedWorkspaceTypes?: WorkspaceType[];
  allowedOrganizationTypes?: OrganizationType[];
  allowedRoles?: UserRole[];

  tags?: string[];

  ai?: AICardCapabilities;

  dataDependencies?: CardDataDependency[];
  actions?: CardActionDefinition[];

  emptyState?: CardEmptyState;
  loadingState?: CardLoadingState;
  errorState?: CardErrorState;

  style?: CardStyleOverrides;

  analyticsNamespace?: string;
  trainingModuleKey?: string;

  component: React.ComponentType<BaseCardProps<TData, TFilters>>;
}

/* -------------------------------------------------------------------------- */
/*                           DASHBOARD TEMPLATE TYPES                          */
/* -------------------------------------------------------------------------- */

export type DashboardCategory =
  | "war_room"
  | "field"
  | "messaging"
  | "fundraising"
  | "social"
  | "events"
  | "admin"
  | "volunteer"
  | "candidate"
  | "org_management"
  | "training"
  | "custom";

export interface DashboardCardInstance {
  id: ID;
  cardKey: string;

  titleOverride?: string;
  subtitleOverride?: string;

  visible?: boolean;
  enabled?: boolean;

  placement?: CardGridPlacement;
  displayMode?: CardDisplayMode;

  featureOverrides?: FeatureFlagMap;
  styleOverrides?: CardStyleOverrides;

  filters?: Dictionary;
  config?: Dictionary;
}

export interface DashboardTemplate {
  key: string;
  title: string;
  description?: string;

  category: DashboardCategory;

  version: number;

  workspaceTypes?: WorkspaceType[];
  organizationTypes?: OrganizationType[];
  roles?: UserRole[];

  featureRequirements?: FeatureKey[];

  cards: DashboardCardInstance[];

  defaultFilters?: Dictionary;
  defaultLayoutMode?: "grid" | "stack" | "split";

  trainingModuleKey?: string;
  aiEnabled?: boolean;
}

/* -------------------------------------------------------------------------- */
/*                             MICRO-ROOM TYPES                                */
/* -------------------------------------------------------------------------- */

export type MicroRoomType =
  | "event_room"
  | "field_room"
  | "fundraising_room"
  | "social_room"
  | "signature_room"
  | "volunteer_room"
  | "county_room"
  | "precinct_room"
  | "candidate_room"
  | "custom";

export interface MicroRoomDefinition {
  key: string;
  title: string;
  description?: string;

  type: MicroRoomType;

  allowedRoles?: UserRole[];
  featureRequirements?: FeatureKey[];

  dashboardTemplateKey?: string;
  defaultCards?: string[];

  aiEnabled?: boolean;
  trainingModuleKey?: string;
}

/* -------------------------------------------------------------------------- */
/*                            ROLE DASHBOARD TYPES                             */
/* -------------------------------------------------------------------------- */

export interface RoleDashboardDefinition {
  role: UserRole;

  defaultDashboardTemplateKey: string;
  fallbackDashboardTemplateKey?: string;

  allowedMicroRoomTypes?: MicroRoomType[];
  defaultFeatures?: FeatureFlagMap;

  aiAccessLevel?: AIAccessLevel;
  maxAIPromptsPerDay?: number;
}

/* -------------------------------------------------------------------------- */
/*                           CARD REGISTRY TYPES                               */
/* -------------------------------------------------------------------------- */

export type CardRegistryMap = Record<string, CardDefinition<any, any>>;

export interface DashboardRegistryMap {
  [key: string]: DashboardTemplate;
}

export interface MicroRoomRegistryMap {
  [key: string]: MicroRoomDefinition;
}

export interface RoleDashboardRegistryMap {
  [key: string]: RoleDashboardDefinition;
}

/* -------------------------------------------------------------------------- */
/*                           THEME + BRAND SUPPORT                             */
/* -------------------------------------------------------------------------- */

export interface BrandDefinition {
  key: string;
  name: string;

  organizationType?: OrganizationType;
  workspaceType?: WorkspaceType;

  theme: WorkspaceTheme;

  logos?: {
    primary?: string;
    mark?: string;
    dark?: string;
    light?: string;
  };

  cardStyleDefaults?: Partial<CardStyleOverrides>;
}

/* -------------------------------------------------------------------------- */
/*                              ANALYTICS TYPES                                */
/* -------------------------------------------------------------------------- */

export interface CardAnalyticsEvent {
  eventName: string;
  cardKey: string;
  cardId?: ID;

  dashboardKey?: string;
  dashboardId?: ID;

  workspaceId?: ID;
  organizationId?: ID;
  userId?: ID;

  metadata?: Dictionary;
  createdAt?: ISODateString;
}

/* -------------------------------------------------------------------------- */
/*                            AI LOG / AUDIT TYPES                             */
/* -------------------------------------------------------------------------- */

export interface AIInteractionLogRecord extends AIInteractionMetadata {
  prompt: string;
  response?: string;

  dashboardTitle?: string;
  cardTitle?: string;

  featureFlags?: FeatureFlagMap;
  promptNamespace?: string;

  requestPayload?: Dictionary;
  responsePayload?: Dictionary;
}

/* -------------------------------------------------------------------------- */
/*                       DASHBOARD RUNTIME RENDER TYPES                        */
/* -------------------------------------------------------------------------- */

export interface DashboardRuntimeContext {
  dashboardId?: ID;
  dashboardKey: string;
  dashboardTitle?: string;

  workspace: WorkspaceContext;

  sessionId?: string;

  filters?: Dictionary;
  query?: Dictionary;
}

export interface CardRenderContext<TData = unknown, TFilters = unknown> {
  runtime: DashboardRuntimeContext;

  definition: CardDefinition<TData, TFilters>;
  instance: DashboardCardInstance;

  data?: TData;
  filters?: TFilters;

  loading?: boolean;
  error?: string | null;
}

/* -------------------------------------------------------------------------- */
/*                               HELPER TYPES                                  */
/* -------------------------------------------------------------------------- */

export interface PaginatedResult<T> {
  items: T[];
  total?: number;
  page?: number;
  pageSize?: number;
}

export interface SearchOption {
  label: string;
  value: string;
  description?: string;
}

export interface ThemeCssVariableMap {
  [cssVar: string]: string;
}

/* -------------------------------------------------------------------------- */
/*                           FUTURE-SAFE NOTES                                 */
/* -------------------------------------------------------------------------- */
/*
  This file is intentionally broader than immediate needs.

  It is designed to support:
  - reusable cards across all workspaces
  - dashboard templates
  - drag/drop dashboard assembly
  - AI-generated dashboards
  - role-based access
  - workspace theming / branding
  - micro-room workspace expansion
  - interaction auditing and AI logging
  - future billing / usage restrictions

  Production rule:
  Every new card, dashboard, and micro-room should conform to this contract.
*/