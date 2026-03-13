/**
 * training.service.ts
 *
 * Training Service Engine
 *
 * Handles:
 * - enrolling users in learning paths
 * - recording training progress
 * - issuing certifications
 * - training analytics
 * - logging training events
 */

import { supabase } from "@shared/lib/supabase"

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type TrainingSummary = {
  activeLearners: number
  overdueAssignments: number
  completionsThisWeek: number
  certificationsIssued: number
  followUpsDue: number
  readinessScore: number
}

/* -------------------------------------------------------------------------- */
/* ENROLL USER IN PATH                                                        */
/* -------------------------------------------------------------------------- */

export async function enrollUserInPath(
  userId: string,
  pathId: string
) {
  const { error } = await supabase
    .from("training_enrollments")
    .insert({
      user_id: userId,
      path_id: pathId,
      status: "enrolled",
      started_at: new Date()
    })

  if (error) {
    throw error
  }
}

/* -------------------------------------------------------------------------- */
/* RECORD MODULE PROGRESS                                                     */
/* -------------------------------------------------------------------------- */

export async function recordModuleProgress(
  userId: string,
  moduleId: string,
  progressPercent: number
) {
  const completed =
    progressPercent >= 100 ? new Date() : null

  const { error } = await supabase
    .from("training_progress")
    .upsert({
      user_id: userId,
      module_id: moduleId,
      progress_percent: progressPercent,
      status:
        progressPercent >= 100
          ? "completed"
          : "in_progress",
      last_activity_at: new Date(),
      completed_at: completed
    })

  if (error) {
    throw error
  }
}

/* -------------------------------------------------------------------------- */
/* ISSUE CERTIFICATION                                                        */
/* -------------------------------------------------------------------------- */

export async function issueCertification(
  userId: string,
  pathId: string
) {
  const certificateNumber =
    `CERT-${Date.now()}`

  const { error } = await supabase
    .from("training_certifications")
    .insert({
      user_id: userId,
      path_id: pathId,
      certificate_number: certificateNumber,
      issued_at: new Date()
    })

  if (error) {
    throw error
  }
}

/* -------------------------------------------------------------------------- */
/* TRAINING EVENTS (Learning Record Store)                                    */
/* -------------------------------------------------------------------------- */

export async function logTrainingEvent(
  userId: string,
  moduleId: string,
  eventType: string,
  eventData: Record<string, unknown> = {}
) {
  const { error } = await supabase
    .from("training_events")
    .insert({
      user_id: userId,
      module_id: moduleId,
      event_type: eventType,
      event_data: eventData
    })

  if (error) {
    throw error
  }
}

/* -------------------------------------------------------------------------- */
/* TRAINING DASHBOARD SUMMARY                                                 */
/* -------------------------------------------------------------------------- */

export async function getTrainingSummary(): Promise<TrainingSummary> {

  const { count: activeLearners } =
    await supabase
      .from("training_enrollments")
      .select("*", { count: "exact", head: true })
      .eq("status", "enrolled")

  const { count: completionsThisWeek } =
    await supabase
      .from("training_progress")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed")

  const { count: certificationsIssued } =
    await supabase
      .from("training_certifications")
      .select("*", { count: "exact", head: true })

  return {
    activeLearners: activeLearners ?? 0,
    overdueAssignments: 0,
    completionsThisWeek: completionsThisWeek ?? 0,
    certificationsIssued: certificationsIssued ?? 0,
    followUpsDue: 0,
    readinessScore: 75
  }
}
