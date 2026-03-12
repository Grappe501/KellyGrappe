/**
 * upload.service.ts
 *
 * Handles file ingestion uploads for Civic OS.
 *
 * Responsibilities:
 * 1. Create ingestion job
 * 2. Upload file to Supabase storage
 * 3. Create ingestion file record
 * 4. Return job + storage metadata
 *
 * Future extensions:
 * - trigger ingestion worker
 * - support multi-file jobs
 * - attach ingestion metadata
 */

import { supabase } from "@shared/lib/supabase"

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export interface UploadForIngestionParams {
  file: File
  organizationId: string
  sourceType: string
  sourceName?: string
  workspaceId?: string
  metadata?: Record<string, unknown>
}

export interface UploadForIngestionResult {
  jobId: string
  storagePath: string
  fileName: string
}

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function sanitizeFileName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w.\-]/g, "")
}

function detectMime(file: File): string {
  if (file.type && file.type.length > 0) return file.type
  return "application/octet-stream"
}

function buildStoragePath(
  sourceType: string,
  jobId: string,
  fileName: string
) {
  return `${sourceType}/${jobId}/${fileName}`
}

function validateParams(params: UploadForIngestionParams) {
  if (!params.file) {
    throw new Error("No file provided for ingestion")
  }

  if (!params.organizationId) {
    throw new Error("organizationId is required")
  }

  if (!params.sourceType) {
    throw new Error("sourceType is required")
  }
}

/* -------------------------------------------------------------------------- */
/* MAIN UPLOAD FUNCTION                                                       */
/* -------------------------------------------------------------------------- */

export async function uploadFileForIngestion(
  params: UploadForIngestionParams
): Promise<UploadForIngestionResult> {

  validateParams(params)

  const {
    file,
    organizationId,
    sourceType,
    sourceName,
    workspaceId,
    metadata
  } = params

  const now = new Date().toISOString()

  const safeFileName = sanitizeFileName(file.name)
  const mimeType = detectMime(file)

  let jobId: string | null = null
  let storagePath: string | null = null

  try {

    /* ---------------------------------------------------------------------- */
    /* CREATE INGESTION JOB                                                   */
    /* ---------------------------------------------------------------------- */

    const { data: job, error: jobError } = await supabase
      .from("ingestion_jobs")
      .insert({
        organization_id: organizationId,
        workspace_id: workspaceId ?? null,
        source_type: sourceType,
        source_name: sourceName ?? file.name,
        metadata: metadata ?? null,
        processing_status: "pending",
        created_at: now
      })
      .select("id")
      .single()

    if (jobError || !job?.id) {
      throw new Error(jobError?.message || "Failed to create ingestion job")
    }

    jobId = job.id

    /* ---------------------------------------------------------------------- */
    /* BUILD STORAGE PATH                                                     */
    /* ---------------------------------------------------------------------- */

    storagePath = buildStoragePath(sourceType, jobId, safeFileName)

    /* ---------------------------------------------------------------------- */
    /* UPLOAD FILE TO STORAGE                                                 */
    /* ---------------------------------------------------------------------- */

    const { error: uploadError } = await supabase.storage
      .from("uploads")
      .upload(storagePath, file, {
        upsert: false,
        contentType: mimeType
      })

    if (uploadError) {
      throw new Error(uploadError.message || "File upload failed")
    }

    /* ---------------------------------------------------------------------- */
    /* CREATE INGESTION FILE RECORD                                           */
    /* ---------------------------------------------------------------------- */

    const { error: fileInsertError } = await supabase
      .from("ingestion_files")
      .insert({
        ingestion_job_id: jobId,
        file_name: file.name,
        file_type: sourceType,
        file_size: file.size,
        storage_path: storagePath,
        mime_type: mimeType,
        created_at: now
      })

    if (fileInsertError) {
      throw new Error(
        fileInsertError.message || "Failed to create ingestion file record"
      )
    }

    /* ---------------------------------------------------------------------- */
    /* RETURN SUCCESS                                                         */
    /* ---------------------------------------------------------------------- */

    return {
      jobId,
      storagePath,
      fileName: safeFileName
    }

  } catch (error) {

    console.error("Ingestion upload failed:", error)

    /* ---------------------------------------------------------------------- */
    /* MARK JOB FAILED IF CREATED                                             */
    /* ---------------------------------------------------------------------- */

    if (jobId) {
      try {
        await supabase
          .from("ingestion_jobs")
          .update({
            processing_status: "failed",
            completed_at: new Date().toISOString()
          })
          .eq("id", jobId)
      } catch (rollbackError) {
        console.error("Failed to mark ingestion job failed:", rollbackError)
      }
    }

    throw error
  }

}
