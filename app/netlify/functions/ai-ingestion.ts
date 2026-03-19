import { createClient } from "@supabase/supabase-js"
import { extractTextFromFile } from "./_lib/ai.text.extractor"
import { extractEntities } from "./_lib/ai.entity.extractor"

// =========================
// ENV + CLIENT
// =========================

function mustEnv(name: string) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

const supabase = createClient(
  mustEnv("SUPABASE_URL"),
  mustEnv("SUPABASE_SERVICE_ROLE_KEY")
)

// =========================
// TYPES
// =========================

interface IngestionFile {
  id: string
  ingestion_job_id: string
  storage_path: string
  file_name?: string
}

// =========================
// HANDLER
// =========================

export const handler = async (event: any) => {
  try {
    const body = JSON.parse(event.body || "{}")
    const jobId = body?.jobId

    if (!jobId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing jobId" })
      }
    }

    await processIngestionJob(jobId)

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, jobId })
    }

  } catch (err: any) {
    console.error("Handler error:", err)

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err?.message || "Ingestion failed"
      })
    }
  }
}

// =========================
// PROCESSOR
// =========================

async function processIngestionJob(jobId: string): Promise<void> {

  console.log(`🚀 Starting ingestion job: ${jobId}`)

  try {

    await supabase
      .from("ingestion_jobs")
      .update({ processing_status: "processing" })
      .eq("id", jobId)

    const { data: files, error: filesError } = await supabase
      .from("ingestion_files")
      .select("*")
      .eq("ingestion_job_id", jobId)

    if (filesError || !files?.length) {
      console.error("File lookup failed:", filesError)
      await markJobFailed(jobId, "file_lookup_failed")
      return
    }

    for (const file of files as IngestionFile[]) {

      console.log(`📄 Processing: ${file.storage_path}`)

      const { data: storageFile, error: downloadError } =
        await supabase.storage
          .from("uploads")
          .download(file.storage_path)

      if (downloadError || !storageFile) {
        console.error("Download failed:", downloadError)
        await markJobFailed(jobId, "file_download_failed")
        return
      }

      const extraction = await extractTextFromFile(storageFile)

      if (!extraction?.text) {
        await markJobFailed(jobId, "text_extraction_failed")
        return
      }

      const text = extraction.text.slice(0, 500000)

      const entityResult = await extractEntities(text)

      if (!entityResult?.entities?.length) continue

      const rows = entityResult.entities.map((entity: any) => ({
        ingestion_job_id: jobId,
        entity_type: entity.type,
        entity_data: entity,
        confidence: entity.confidence ?? 0.8
      }))

      const { error: insertError } = await supabase
        .from("ingestion_entities")
        .insert(rows)

      if (insertError) {
        await markJobFailed(jobId, "entity_insert_failed")
        return
      }
    }

    await supabase
      .from("ingestion_jobs")
      .update({
        processing_status: "awaiting_review",
        completed_at: new Date().toISOString()
      })
      .eq("id", jobId)

    console.log(`✅ Job complete: ${jobId}`)

  } catch (error) {
    console.error("Processor error:", error)
    await markJobFailed(jobId, "processor_exception")
  }
}

// =========================
// FAILURE HANDLER
// =========================

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
    console.error("Failed to mark job as failed:", error)
  }
}