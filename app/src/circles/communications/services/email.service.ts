import { supabase } from "@/shared/utils/db/client"

type SendEmailInput = {
  to: string
  subject: string
  body: string
  contactId?: string
}

export const emailService = {
  async sendEmail({ to, subject, body }: SendEmailInput) {
    const payload = {
      channel: "email",
      recipient: to,
      subject,
      body,
      status: "queued"
    }

    const { data, error } = await supabase
      .from("message_queue")
      .insert([payload])
      .select("id, status")
      .single()

    if (error) throw error

    return {
      success: true,
      queued: true,
      queueId: data?.id,
      status: data?.status ?? "queued"
    }
  }
}
