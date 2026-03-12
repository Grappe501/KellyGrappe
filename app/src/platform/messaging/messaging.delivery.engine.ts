/**
 * messaging.delivery.engine.ts
 *
 * Messaging Delivery Engine
 *
 * Central messaging dispatcher for:
 * - Email
 * - SMS
 * - Discord
 * - Social
 * - Substack
 * - Phonebank
 * - Direct Mail
 *
 * Responsibilities:
 * - queue messages
 * - resolve audience
 * - apply variables
 * - track delivery
 * - support broadcast channels
 */

import { supabase } from "@shared/lib/supabase"

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type MessagingChannel =
  | "email"
  | "sms"
  | "discord"
  | "social"
  | "substack"
  | "phonebank"
  | "direct_mail"

export interface MessagePayload {
  subject?: string
  body: string
}

export interface AudienceMember {
  id: string
  fullName?: string
  email?: string
  phone?: string
  discordUsername?: string
}

export interface MessageSendOptions {
  channel: MessagingChannel
  templateId?: string
  variables?: Record<string, string>
}

export interface MessageSendResult {
  queued: number
  failed: number
}

interface QueueInsertPayload {
  contact_id: string | null
  channel: MessagingChannel
  subject: string | null
  body: string
  status: "queued"
  created_at: string
}

/* -------------------------------------------------------------------------- */
/* TEMPLATE VARIABLE REPLACEMENT                                              */
/* -------------------------------------------------------------------------- */

function applyVariables(
  body: string,
  variables?: Record<string, string>
): string {
  if (!variables) return body

  let result = body

  for (const key of Object.keys(variables)) {
    const token = `{{${key}}}`
    const value = variables[key]

    if (typeof value === "string") {
      result = result.replaceAll(token, value)
    }
  }

  return result
}

/* -------------------------------------------------------------------------- */
/* QUEUE MESSAGE                                                              */
/* -------------------------------------------------------------------------- */

async function queueMessage(
  member: AudienceMember | null,
  channel: MessagingChannel,
  payload: MessagePayload
): Promise<void> {

  const queuePayload: QueueInsertPayload = {
    contact_id: member?.id ?? null,
    channel,
    subject: payload.subject ?? null,
    body: payload.body,
    status: "queued",
    created_at: new Date().toISOString()
  }

  const { error } = await supabase
    .from("message_queue")
    .insert(queuePayload)

  if (error) {
    throw new Error(error.message)
  }
}

/* -------------------------------------------------------------------------- */
/* CHANNEL DELIVERY FUNCTIONS                                                 */
/* -------------------------------------------------------------------------- */

async function sendEmail(
  member: AudienceMember,
  payload: MessagePayload
): Promise<void> {

  if (!member.email) {
    throw new Error("Missing email")
  }

  await queueMessage(member, "email", payload)
}

async function sendSMS(
  member: AudienceMember,
  payload: MessagePayload
): Promise<void> {

  if (!member.phone) {
    throw new Error("Missing phone")
  }

  await queueMessage(member, "sms", payload)
}

async function sendDiscord(
  member: AudienceMember,
  payload: MessagePayload
): Promise<void> {

  if (!member.discordUsername) {
    throw new Error("Missing discord username")
  }

  await queueMessage(member, "discord", payload)
}

async function sendSocial(
  member: AudienceMember,
  payload: MessagePayload
): Promise<void> {

  await queueMessage(member, "social", payload)
}

async function sendPhonebank(
  member: AudienceMember,
  payload: MessagePayload
): Promise<void> {

  await queueMessage(member, "phonebank", payload)
}

async function sendDirectMail(
  member: AudienceMember,
  payload: MessagePayload
): Promise<void> {

  await queueMessage(member, "direct_mail", payload)
}

async function sendSubstack(
  payload: MessagePayload
): Promise<void> {

  await queueMessage(null, "substack", payload)
}

/* -------------------------------------------------------------------------- */
/* MAIN DISPATCHER                                                            */
/* -------------------------------------------------------------------------- */

export async function sendMessageToAudience(
  audience: AudienceMember[],
  payload: MessagePayload,
  options: MessageSendOptions
): Promise<MessageSendResult> {

  let queued = 0
  let failed = 0

  for (const member of audience) {

    try {

      const body = applyVariables(payload.body, options.variables)

      const message: MessagePayload = {
        subject: payload.subject,
        body
      }

      switch (options.channel) {

        case "email":
          await sendEmail(member, message)
          break

        case "sms":
          await sendSMS(member, message)
          break

        case "discord":
          await sendDiscord(member, message)
          break

        case "social":
          await sendSocial(member, message)
          break

        case "phonebank":
          await sendPhonebank(member, message)
          break

        case "direct_mail":
          await sendDirectMail(member, message)
          break

        default:
          throw new Error(`Unsupported channel: ${options.channel}`)

      }

      queued++

    } catch (err) {

      console.error("Message send failed", err)
      failed++

    }

  }

  return {
    queued,
    failed
  }

}

/* -------------------------------------------------------------------------- */
/* BROADCAST CHANNELS                                                         */
/* -------------------------------------------------------------------------- */

export async function broadcastMessage(
  payload: MessagePayload,
  channel: MessagingChannel
): Promise<void> {

  switch (channel) {

    case "substack":
      await sendSubstack(payload)
      break

    case "social":
      await queueMessage(null, "social", payload)
      break

    default:
      throw new Error(`Broadcast not supported for ${channel}`)

  }

}
