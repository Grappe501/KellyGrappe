import { supabase } from "@/shared/utils/db/client"

type QueueMessage = {
  id: string
  channel: "email" | "sms" | string
  recipient: string
  subject?: string | null
  body?: string | null
  status?: string | null
}

export type ProcessMessagesSummary = {
  processed: number
  sent: number
  failed: number
  errors: string[]
}

function getFunctionsBaseUrl(): string {
  const configured = (import.meta.env.VITE_FUNCTIONS_BASE_URL || "").trim()

  if (configured) {
    return configured.replace(/\/$/, "")
  }

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      throw new Error(
        "Netlify functions are not available from plain Vite dev. Set VITE_FUNCTIONS_BASE_URL to your deployed site URL or run through Netlify dev."
      )
    }
  }

  return ""
}

async function parseJsonSafe(response: Response): Promise<any> {
  const text = await response.text()
  if (!text) return {}

  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

async function deliverMessage(message: QueueMessage) {
  const baseUrl = getFunctionsBaseUrl()

  const endpoint =
    message.channel === "sms"
      ? `${baseUrl}/.netlify/functions/send-sms`
      : `${baseUrl}/.netlify/functions/send-email`

  const payload =
    message.channel === "sms"
      ? {
          to: message.recipient,
          message: message.body ?? ""
        }
      : {
          to: message.recipient,
          subject: message.subject ?? "Campaign Message",
          text: message.body ?? "",
          body: message.body ?? ""
        }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  })

  const data = await parseJsonSafe(response)

  if (!response.ok) {
    throw new Error(data?.details || data?.error || `Delivery failed with ${response.status}`)
  }

  return data
}

export async function processMessages(): Promise<ProcessMessagesSummary> {
  const summary: ProcessMessagesSummary = {
    processed: 0,
    sent: 0,
    failed: 0,
    errors: []
  }

  const { data: messages, error } = await supabase
    .from("message_queue")
    .select("id, channel, recipient, subject, body, status")
    .in("status", ["queued", "pending"])
    .limit(10)

  if (error) {
    throw error
  }

  for (const message of (messages || []) as QueueMessage[]) {
    summary.processed += 1

    try {
      await deliverMessage(message)

      const { error: updateError } = await supabase
        .from("message_queue")
        .update({ status: "sent" })
        .eq("id", message.id)

      if (updateError) {
        throw updateError
      }

      summary.sent += 1
    } catch (err: any) {
      summary.failed += 1
      summary.errors.push(`${message.channel}:${message.recipient} -> ${err?.message || "Unknown error"}`)

      const { error: updateError } = await supabase
        .from("message_queue")
        .update({ status: "failed" })
        .eq("id", message.id)

      if (updateError) {
        summary.errors.push(`status-update:${message.id} -> ${updateError.message}`)
      }
    }
  }

  return summary
}
