/**
 * ai.ingestion.processor.ts
 *
 * Production ingestion processor.
 *
 * Responsibilities:
 * 1. Retrieve uploaded files for an ingestion job
 * 2. Download file from Supabase storage
 * 3. Extract text content
 * 4. Run AI entity extraction
 * 5. Store entities
 * 6. Update job status
 */

import { createClient } from "@supabase/supabase-js"
import { extractTextFromFile } from "./ai.text.extractor"
import { extractEntities } from "./ai.entity.extractor"

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

interface IngestionFile {
  id: string
  ingestion_job_id: string
  storage_path: string
  file_name?: string
}

/* -------------------------------------------------------------------------- */
/* MAIN PROCESSOR                                                             */
/* -------------------------------------------------------------------------- */

export async function processIngestionJob(jobId: string): Promise<void> {

  console.log(`Starting ingestion job: ${jobId}`)

  try {

    /* ---------------------------------------------------------------------- */
    /* Mark job as processing                                                 */
    /* ---------------------------------------------------------------------- */

    await supabase
      .from("ingestion_jobs")
      .update({
        processing_status: "processing"
      })
      .eq("id", jobId)

    /* ---------------------------------------------------------------------- */
    /* Load ingestion job files                                               */
    /* ---------------------------------------------------------------------- */

    const { data: files, error: filesError } = await supabase
      .from("ingestion_files")
      .select("*")
      .eq("ingestion_job_id", jobId)

    if (filesError) {
      console.error("Failed to fetch ingestion files:", filesError)
      await markJobFailed(jobId, "file_lookup_failed")
      return
    }

    if (!files || files.length === 0) {
      console.warn(`No files found for ingestion job ${jobId}`)
      await markJobFailed(jobId, "no_files_found")
      return
    }

    /* ---------------------------------------------------------------------- */
    /* Process files                                                          */
    /* ---------------------------------------------------------------------- */

    for (const file of files as IngestionFile[]) {

      console.log(`Processing file: ${file.storage_path}`)

      const { data: storageFile, error: downloadError } =
        await supabase.storage
          .from("uploads")
          .download(file.storage_path)

      if (downloadError || !storageFile) {

        console.error("File download failed:", downloadError)

        await markJobFailed(jobId, "file_download_failed")

        return
      }

      /* ------------------------------------------------------------------ */
      /* Extract text                                                       */
      /* ------------------------------------------------------------------ */

      const extraction = await extractTextFromFile(storageFile)

      if (!extraction?.text) {

        console.warn("No text extracted")

        await markJobFailed(jobId, "text_extraction_failed")

        return
      }

      const text = extraction.text.slice(0, 500000) // safety guard

      console.log(`Extracted text length: ${text.length}`)

      /* ------------------------------------------------------------------ */
      /* AI entity extraction                                               */
      /* ------------------------------------------------------------------ */

      const entityResult = await extractEntities(text)

      if (!entityResult?.entities?.length) {

        console.warn("No entities extracted")

        continue
      }

      console.log(`Entities detected: ${entityResult.entities.length}`)

      /* ------------------------------------------------------------------ */
      /* Batch insert entities                                              */
      /* ------------------------------------------------------------------ */

      const rows = entityResult.entities.map((entity) => ({
        ingestion_job_id: jobId,
        entity_type: entity.type,
        entity_data: entity,
        confidence: entity.confidence ?? 0.8
      }))

      const { error: insertError } = await supabase
        .from("ingestion_entities")
        .insert(rows)

      if (insertError) {

        console.error("Entity insert failed:", insertError)

        await markJobFailed(jobId, "entity_insert_failed")

        return
      }
    }

    /* ---------------------------------------------------------------------- */
    /* Mark job completed                                                     */
    /* ---------------------------------------------------------------------- */

    await supabase
      .from("ingestion_jobs")
      .update({
        processing_status: "awaiting_review",
        completed_at: new Date().toISOString()
      })
      .eq("id", jobId)

    console.log(`Ingestion job completed: ${jobId}`)

  } catch (error) {

    console.error("Ingestion processor error:", error)

    await markJobFailed(jobId, "processor_exception")

  }

}

/* -------------------------------------------------------------------------- */
/* FAILURE HANDLING                                                           */
/* -------------------------------------------------------------------------- */

async function markJobFailed(jobId: string, reason: string) {

  try {

    await supabase
      .from("ingestion_jobs")
      .update({
        processing_status: "failed",
        failure_reason: reason,
        completed_at: new Date().toISOString()
      })
      .eq("id", jobId)

  } catch (error) {

    console.error("Failed to mark ingestion job as failed:", error)

  }

}
