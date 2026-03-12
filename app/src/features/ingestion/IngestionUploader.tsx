import React, { useState } from "react"
import { uploadFileForIngestion } from "@shared/services/ingestion/upload.service"

export default function IngestionUploader() {

  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleUpload(
    e: React.ChangeEvent<HTMLInputElement>
  ) {

    const file = e.target.files?.[0]

    if (!file) return

    setUploading(true)
    setMessage(null)

    try {

      const result = await uploadFileForIngestion({
        file,
        organizationId: "ORG_ID_HERE",
        sourceType: "documents",
        sourceName: file.name
      })

      console.log("Created ingestion job:", result.jobId)

      setMessage(`Upload successful. Job ID: ${result.jobId}`)

    } catch (error) {

      console.error("Upload failed", error)

      setMessage("Upload failed. Please try again.")

    } finally {

      setUploading(false)

    }

  }

  return (

    <div className="p-4 border rounded max-w-md space-y-3">

      <h2 className="text-lg font-semibold">
        Upload File for Ingestion
      </h2>

      <input
        type="file"
        onChange={handleUpload}
        disabled={uploading}
        className="block w-full text-sm"
      />

      {uploading && (
        <div className="text-sm text-slate-500">
          Uploading file…
        </div>
      )}

      {message && (
        <div className="text-sm text-slate-700">
          {message}
        </div>
      )}

    </div>

  )

}
