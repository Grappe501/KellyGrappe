export type DataBoundaryMode = "tenant_row_isolation" | "shared_reference" | "shared_intelligence";

export type SharedLearningPolicy =
  | "isolated_org_records_shared_scores"
  | "isolated_org_records_no_shared_scores";

export interface OrganizationDataBoundary {
  tenantKey: "organization_id";
  crmMode: "isolated_per_organization";
  volunteerMode: "isolated_per_organization";
  notesMode: "isolated_per_organization";
  donorMode: "isolated_per_organization";
  voterReferenceMode: "shared_reference";
  voterIntelligenceMode: "shared_intelligence";
  sharedLearningPolicy: SharedLearningPolicy;
}

export interface OrganizationDefinition {
  key: string;
  title: string;
  orgType: "campaign" | "nonprofit" | "advocacy" | "media" | "movement";
  defaultRoles: string[];
  defaultDashboards: string[];
  enabledMicrorooms: string[];
  dataBoundary: OrganizationDataBoundary;
}
