/**
 * ai.data.mapper.ts
 *
 * Maps extracted civic entities into recommended platform destinations.
 *
 * Flow:
 * raw text
 *   -> ai.entity.extractor.ts
 *   -> ai.data.mapper.ts
 *   -> ingestion_mapping_suggestions
 *   -> human review
 *   -> production table writes
 */

import type {
    CivicEntity,
    CivicEntityType,
    EntityExtractionResult
  } from "./ai.entity.extractor"
  
  /* -------------------------------------------------------------------------- */
  /*                                   TYPES                                    */
  /* -------------------------------------------------------------------------- */
  
  export type MappingDestination =
    | "contacts"
    | "organizations"
    | "candidates"
    | "committees"
    | "donations"
    | "events"
    | "documents"
    | "doctrine_documents"
    | "training_assets"
    | "external_intelligence_records"
    | "media_assets"
    | "unknown"
  
  export type MappingAction =
    | "create"
    | "update"
    | "merge"
    | "review"
    | "ignore"
  
  export interface ExistingRecordMatch {
    id: string
    table: MappingDestination
    confidence: number
    matchedOn: string[]
  }
  
  export interface MappingSuggestion {
    entityType: CivicEntityType
    destination: MappingDestination
    action: MappingAction
    confidence: number
    requiresReview: boolean
    reviewReason?: string
    matchedRecordId?: string | null
    writePayload: Record<string, unknown>
    sourceEntity: CivicEntity
  }
  
  export interface MappingContext {
    existingRecords?: ExistingRecordMatch[]
    sourceClassification?: string
    sourceType?: string
    organizationId?: string
    workspaceId?: string
  }
  
  export interface MappingResult {
    suggestions: MappingSuggestion[]
    summary: {
      totalEntities: number
      createCount: number
      updateCount: number
      mergeCount: number
      reviewCount: number
      ignoredCount: number
    }
  }
  
  /* -------------------------------------------------------------------------- */
  /*                              NORMALIZE HELPERS                             */
  /* -------------------------------------------------------------------------- */
  
  function safeTrim(value: unknown): string {
    return String(value ?? "").trim()
  }
  
  function normalizePhone(value: unknown): string {
    return safeTrim(value).replace(/\D/g, "")
  }
  
  function normalizeEmail(value: unknown): string {
    return safeTrim(value).toLowerCase()
  }
  
  function normalizeName(value: unknown): string {
    return safeTrim(value).replace(/\s+/g, " ")
  }
  
  function normalizeAmount(value: unknown): number | null {
    if (value == null || value === "") return null
  
    const numeric =
      typeof value === "number"
        ? value
        : Number(String(value).replace(/[^0-9.-]/g, ""))
  
    return Number.isFinite(numeric) ? numeric : null
  }
  
  function clampConfidence(value: unknown, fallback = 0.7): number {
    const n = typeof value === "number" ? value : fallback
    if (n < 0) return 0
    if (n > 1) return 1
    return n
  }
  
  /* -------------------------------------------------------------------------- */
  /*                           DESTINATION RESOLUTION                           */
  /* -------------------------------------------------------------------------- */
  
  function resolveDestination(
    entity: CivicEntity,
    context?: MappingContext
  ): MappingDestination {
    const classification = safeTrim(context?.sourceClassification).toLowerCase()
  
    switch (entity.type) {
      case "person":
      case "email":
      case "phone":
        return "contacts"
  
      case "organization":
        if (
          classification.includes("doctrine") ||
          classification.includes("philosophy")
        ) {
          return "doctrine_documents"
        }
        return "organizations"
  
      case "candidate":
        return "candidates"
  
      case "committee":
        return "committees"
  
      case "donor":
        return "donations"
  
      case "event":
        return "events"
  
      case "document":
        if (
          classification.includes("doctrine") ||
          classification.includes("philosophy") ||
          classification.includes("platform values")
        ) {
          return "doctrine_documents"
        }
        if (classification.includes("training")) {
          return "training_assets"
        }
        if (classification.includes("external") || classification.includes("fec")) {
          return "external_intelligence_records"
        }
        return "documents"
  
      case "issue":
      case "policy":
      case "location":
        if (classification.includes("training")) return "training_assets"
        return "documents"
  
      default:
        return "unknown"
    }
  }
  
  /* -------------------------------------------------------------------------- */
  /*                               MATCHING LOGIC                               */
  /* -------------------------------------------------------------------------- */
  
  function findBestExistingMatch(
    entity: CivicEntity,
    destination: MappingDestination,
    existingRecords: ExistingRecordMatch[] = []
  ): ExistingRecordMatch | null {
    const entityName = normalizeName(entity.name)
    const entityValue =
      entity.type === "email"
        ? normalizeEmail(entity.value)
        : entity.type === "phone"
          ? normalizePhone(entity.value)
          : safeTrim(entity.value)
  
    let best: ExistingRecordMatch | null = null
  
    for (const record of existingRecords) {
      if (record.table !== destination) continue
  
      let score = 0
  
      for (const field of record.matchedOn) {
        const normalizedField = safeTrim(field).toLowerCase()
  
        if (entityName && normalizedField === entityName.toLowerCase()) {
          score += 0.6
        }
  
        if (entityValue && normalizedField === entityValue.toLowerCase()) {
          score += 0.8
        }
  
        if (
          entity.organization &&
          normalizedField === safeTrim(entity.organization).toLowerCase()
        ) {
          score += 0.3
        }
      }
  
      score = Math.min(1, score)
  
      if (!best || score > best.confidence) {
        best = {
          ...record,
          confidence: Math.max(record.confidence, score)
        }
      }
    }
  
    return best
  }
  
  /* -------------------------------------------------------------------------- */
  /*                              PAYLOAD BUILDERS                              */
  /* -------------------------------------------------------------------------- */
  
  function buildContactPayload(
    entity: CivicEntity,
    context?: MappingContext
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      full_name: normalizeName(entity.name || entity.value),
      role: safeTrim(entity.role) || null,
      organization_name: safeTrim(entity.organization) || null,
      organization_id: context?.organizationId || null,
      workspace_id: context?.workspaceId || null,
      source_confidence: clampConfidence(entity.confidence)
    }
  
    if (entity.type === "email") {
      payload.email = normalizeEmail(entity.value)
    }
  
    if (entity.type === "phone") {
      payload.phone = normalizePhone(entity.value)
    }
  
    if (entity.type === "person") {
      const maybeEmail = normalizeEmail(entity.value)
      if (maybeEmail.includes("@")) payload.email = maybeEmail
  
      const maybePhone = normalizePhone(entity.value)
      if (maybePhone.length >= 10) payload.phone = maybePhone
    }
  
    return payload
  }
  
  function buildOrganizationPayload(
    entity: CivicEntity,
    context?: MappingContext
  ): Record<string, unknown> {
    return {
      name: normalizeName(entity.name || entity.value),
      description: safeTrim(entity.role) || null,
      organization_id: context?.organizationId || null,
      workspace_id: context?.workspaceId || null,
      source_confidence: clampConfidence(entity.confidence)
    }
  }
  
  function buildCandidatePayload(
    entity: CivicEntity,
    context?: MappingContext
  ): Record<string, unknown> {
    return {
      name: normalizeName(entity.name || entity.value),
      office_sought: safeTrim(entity.role) || null,
      committee_name: safeTrim(entity.organization) || null,
      location: safeTrim(entity.location) || null,
      election_date: safeTrim(entity.date) || null,
      organization_id: context?.organizationId || null,
      workspace_id: context?.workspaceId || null,
      source_confidence: clampConfidence(entity.confidence)
    }
  }
  
  function buildCommitteePayload(
    entity: CivicEntity,
    context?: MappingContext
  ): Record<string, unknown> {
    return {
      name: normalizeName(entity.name || entity.value),
      associated_organization: safeTrim(entity.organization) || null,
      description: safeTrim(entity.role) || null,
      organization_id: context?.organizationId || null,
      workspace_id: context?.workspaceId || null,
      source_confidence: clampConfidence(entity.confidence)
    }
  }
  
  function buildDonationPayload(
    entity: CivicEntity,
    context?: MappingContext
  ): Record<string, unknown> {
    return {
      donor_name: normalizeName(entity.name || entity.value),
      amount: normalizeAmount(entity.amount),
      committee_name: safeTrim(entity.organization) || null,
      contribution_date: safeTrim(entity.date) || null,
      location: safeTrim(entity.location) || null,
      organization_id: context?.organizationId || null,
      workspace_id: context?.workspaceId || null,
      source_confidence: clampConfidence(entity.confidence)
    }
  }
  
  function buildEventPayload(
    entity: CivicEntity,
    context?: MappingContext
  ): Record<string, unknown> {
    return {
      title: normalizeName(entity.name || entity.value),
      event_date: safeTrim(entity.date) || null,
      location: safeTrim(entity.location) || null,
      description: safeTrim(entity.role) || null,
      organization_id: context?.organizationId || null,
      workspace_id: context?.workspaceId || null,
      source_confidence: clampConfidence(entity.confidence)
    }
  }
  
  function buildDocumentPayload(
    entity: CivicEntity,
    destination: MappingDestination,
    context?: MappingContext
  ): Record<string, unknown> {
    return {
      title: normalizeName(entity.name || entity.value),
      summary: safeTrim(entity.role) || null,
      category: destination,
      related_organization: safeTrim(entity.organization) || null,
      related_date: safeTrim(entity.date) || null,
      related_location: safeTrim(entity.location) || null,
      organization_id: context?.organizationId || null,
      workspace_id: context?.workspaceId || null,
      source_confidence: clampConfidence(entity.confidence)
    }
  }
  
  function buildPayload(
    entity: CivicEntity,
    destination: MappingDestination,
    context?: MappingContext
  ): Record<string, unknown> {
    switch (destination) {
      case "contacts":
        return buildContactPayload(entity, context)
      case "organizations":
        return buildOrganizationPayload(entity, context)
      case "candidates":
        return buildCandidatePayload(entity, context)
      case "committees":
        return buildCommitteePayload(entity, context)
      case "donations":
        return buildDonationPayload(entity, context)
      case "events":
        return buildEventPayload(entity, context)
      case "documents":
      case "doctrine_documents":
      case "training_assets":
      case "external_intelligence_records":
        return buildDocumentPayload(entity, destination, context)
      default:
        return {
          raw_name: normalizeName(entity.name || entity.value),
          raw_value: safeTrim(entity.value) || null,
          raw_role: safeTrim(entity.role) || null,
          organization_id: context?.organizationId || null,
          workspace_id: context?.workspaceId || null
        }
    }
  }
  
  /* -------------------------------------------------------------------------- */
  /*                           ACTION / REVIEW DECISION                         */
  /* -------------------------------------------------------------------------- */
  
  function determineAction(
    entity: CivicEntity,
    destination: MappingDestination,
    existingMatch: ExistingRecordMatch | null
  ): {
    action: MappingAction
    requiresReview: boolean
    reviewReason?: string
    confidence: number
  } {
    const baseConfidence = clampConfidence(entity.confidence)
  
    if (destination === "unknown") {
      return {
        action: "review",
        requiresReview: true,
        reviewReason: "Unknown destination",
        confidence: Math.min(baseConfidence, 0.5)
      }
    }
  
    if (!entity.name && !entity.value) {
      return {
        action: "ignore",
        requiresReview: false,
        reviewReason: "Missing usable entity content",
        confidence: 0.2
      }
    }
  
    if (baseConfidence < 0.45) {
      return {
        action: "review",
        requiresReview: true,
        reviewReason: "Low extraction confidence",
        confidence: baseConfidence
      }
    }
  
    if (existingMatch && existingMatch.confidence >= 0.9) {
      return {
        action: "update",
        requiresReview: baseConfidence < 0.75,
        reviewReason:
          baseConfidence < 0.75 ? "Matched existing record but source confidence is moderate" : undefined,
        confidence: Math.max(baseConfidence, existingMatch.confidence)
      }
    }
  
    if (existingMatch && existingMatch.confidence >= 0.65) {
      return {
        action: "merge",
        requiresReview: true,
        reviewReason: "Possible existing record match requires confirmation",
        confidence: Math.max(baseConfidence, existingMatch.confidence)
      }
    }
  
    if (
      entity.type === "donor" ||
      entity.type === "candidate" ||
      entity.type === "committee"
    ) {
      return {
        action: "create",
        requiresReview: true,
        reviewReason: "Sensitive civic/finance entity should be reviewed before write",
        confidence: baseConfidence
      }
    }
  
    return {
      action: "create",
      requiresReview: baseConfidence < 0.7,
      reviewReason:
        baseConfidence < 0.7 ? "Create suggested with moderate confidence" : undefined,
      confidence: baseConfidence
    }
  }
  
  /* -------------------------------------------------------------------------- */
  /*                              SINGLE ENTITY MAP                             */
  /* -------------------------------------------------------------------------- */
  
  export function mapEntityToSuggestion(
    entity: CivicEntity,
    context?: MappingContext
  ): MappingSuggestion {
    const destination = resolveDestination(entity, context)
    const existingMatch = findBestExistingMatch(
      entity,
      destination,
      context?.existingRecords || []
    )
    const decision = determineAction(entity, destination, existingMatch)
    const writePayload = buildPayload(entity, destination, context)
  
    return {
      entityType: entity.type,
      destination,
      action: decision.action,
      confidence: decision.confidence,
      requiresReview: decision.requiresReview,
      reviewReason: decision.reviewReason,
      matchedRecordId: existingMatch?.id ?? null,
      writePayload,
      sourceEntity: entity
    }
  }
  
  /* -------------------------------------------------------------------------- */
  /*                              BULK MAP RESULT                               */
  /* -------------------------------------------------------------------------- */
  
  export function mapExtractedEntities(
    extraction: EntityExtractionResult,
    context?: MappingContext
  ): MappingResult {
    const suggestions = extraction.entities.map((entity) =>
      mapEntityToSuggestion(entity, context)
    )
  
    const summary = {
      totalEntities: suggestions.length,
      createCount: suggestions.filter((s) => s.action === "create").length,
      updateCount: suggestions.filter((s) => s.action === "update").length,
      mergeCount: suggestions.filter((s) => s.action === "merge").length,
      reviewCount: suggestions.filter((s) => s.action === "review").length,
      ignoredCount: suggestions.filter((s) => s.action === "ignore").length
    }
  
    return {
      suggestions,
      summary
    }
  }
  
  /* -------------------------------------------------------------------------- */
  /*                         DB-SAFE SUGGESTION FORMATTER                       */
  /* -------------------------------------------------------------------------- */
  
  export interface IngestionMappingSuggestionInsert {
    suggested_destination: MappingDestination
    suggested_action: MappingAction
    confidence: number
    suggested_record_id: string | null
    suggestion_payload: Record<string, unknown>
    requires_review: boolean
    review_reason: string | null
  }
  
  export function toIngestionMappingInsert(
    suggestion: MappingSuggestion
  ): IngestionMappingSuggestionInsert {
    return {
      suggested_destination: suggestion.destination,
      suggested_action: suggestion.action,
      confidence: suggestion.confidence,
      suggested_record_id: suggestion.matchedRecordId ?? null,
      suggestion_payload: suggestion.writePayload,
      requires_review: suggestion.requiresReview,
      review_reason: suggestion.reviewReason ?? null
    }
  }
  