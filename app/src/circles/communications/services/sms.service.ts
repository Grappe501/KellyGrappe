import { supabase } from "@/shared/utils/db/client"

type SendSmsInput = {
  to: string
  message: string
  contactId?: string
}

export const smsService = {
  async sendSMS({ to, message }: SendSmsInput) {
    const payload = {
      channel: "sms",
      recipient: to,
      body: message,
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
