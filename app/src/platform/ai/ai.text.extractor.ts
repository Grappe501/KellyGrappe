/**
 * ai.text.extractor.ts
 *
 * Universal text extraction service for Civic OS ingestion pipeline.
 *
 * Handles:
 * - spreadsheets (xlsx / xls / csv / ods)
 * - images (OCR)
 * - pdf documents
 * - audio transcription
 *
 * Returns normalized text for AI entity extraction.
 */

import * as XLSX from "xlsx"
import Tesseract from "tesseract.js"
import { transcribeAudio } from "./ai.audio.transcriber"

export type ExtractableFile = File | Blob | Buffer

export interface ExtractionResult {
  text: string
  metadata?: Record<string, unknown>
}

function detectMimeType(file: unknown): string {
  const f = file as { type?: string; name?: string } | null

  if (f?.type) return f.type

  if (f?.name) {
    const ext = f.name.split(".").pop()?.toLowerCase()

    if (!ext) return ""

    const map: Record<string, string> = {
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      xls: "application/vnd.ms-excel",
      csv: "text/csv",
      ods: "application/vnd.oasis.opendocument.spreadsheet",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      pdf: "application/pdf",
      mp3: "audio/mpeg",
      wav: "audio/wav",
      m4a: "audio/mp4",
      ogg: "audio/ogg"
    }

    return map[ext] || ""
  }

  return ""
}

async function readArrayBuffer(file: unknown): Promise<ArrayBuffer> {
  const maybeArrayBufferFile = file as { arrayBuffer?: () => Promise<ArrayBuffer> }

  if (typeof maybeArrayBufferFile?.arrayBuffer === "function") {
    const buffer = await maybeArrayBufferFile.arrayBuffer()
    return buffer
  }

  if (Buffer.isBuffer(file)) {
    const uint8 = new Uint8Array(file)
    return uint8.buffer.slice(
      uint8.byteOffset,
      uint8.byteOffset + uint8.byteLength
    )
  }

  throw new Error("Unsupported file buffer format")
}

async function extractSpreadsheetText(file: ExtractableFile): Promise<ExtractionResult> {
  const buffer = await readArrayBuffer(file)

  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true
  })

  const extracted: Record<string, unknown[]> = {}

  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name]

    if (!sheet) {
      extracted[name] = []
      continue
    }

    extracted[name] = XLSX.utils.sheet_to_json(sheet, {
      defval: null
    })
  }

  return {
    text: JSON.stringify(extracted),
    metadata: {
      sheetCount: workbook.SheetNames.length,
      source: "spreadsheet"
    }
  }
}

async function extractImageText(file: ExtractableFile): Promise<ExtractionResult> {
  const result = await Tesseract.recognize(file)

  return {
    text: result.data.text || "",
    metadata: {
      confidence: result.data.confidence,
      source: "image-ocr"
    }
  }
}

async function extractPDFText(file: ExtractableFile): Promise<ExtractionResult> {
  const buffer = await readArrayBuffer(file)

  const pdfModule = await import("pdf-parse")
  const parsePdf =
    (pdfModule as unknown as { default?: (input: Buffer) => Promise<{ text?: string; numpages?: number }> }).default ??
    (pdfModule as unknown as (input: Buffer) => Promise<{ text?: string; numpages?: number }>)

  if (typeof parsePdf !== "function") {
    throw new Error("pdf-parse loader did not return a callable parser")
  }

  const parsed = await parsePdf(Buffer.from(buffer))

  return {
    text: parsed.text || "",
    metadata: {
      pages: parsed.numpages ?? 0,
      source: "pdf"
    }
  }
}

async function extractAudioText(file: ExtractableFile): Promise<ExtractionResult> {
  const transcript = await transcribeAudio(file)

  return {
    text: transcript || "",
    metadata: {
      source: "audio-transcription"
    }
  }
}

export async function extractTextFromFile(
  file: ExtractableFile
): Promise<ExtractionResult> {
  try {
    const mimeType = detectMimeType(file)

    if (!mimeType) {
      throw new Error("Unable to determine file type")
    }

    if (
      mimeType.includes("spreadsheet") ||
      mimeType.includes("excel") ||
      mimeType.includes("csv") ||
      mimeType.includes("ods")
    ) {
      return await extractSpreadsheetText(file)
    }

    if (mimeType.startsWith("image/")) {
      return await extractImageText(file)
    }

    if (mimeType === "application/pdf") {
      return await extractPDFText(file)
    }

    if (mimeType.startsWith("audio/")) {
      return await extractAudioText(file)
    }

    return {
      text: "",
      metadata: {
        unsupported: true,
        mimeType
      }
    }
  } catch (error) {
    console.error("Text extraction failed:", error)

    return {
      text: "",
      metadata: {
        error: true,
        message: error instanceof Error ? error.message : "Unknown extraction error"
      }
    }
  }
}
