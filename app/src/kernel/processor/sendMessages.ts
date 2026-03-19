import { supabase } from "@/shared/utils/db/client"

export async function processMessages() {

  const { data: messages } = await supabase
    .from("message_queue")
    .select("*")
    .eq("status", "pending")
    .limit(10)

  for (const msg of messages || []) {

    try {

      if (msg.channel === "sms") {
        console.log("Sending SMS:", msg.recipient)
        // call Twilio here
      }

      if (msg.channel === "email") {
        console.log("Sending Email:", msg.recipient)
        // call SendGrid here
      }

      await supabase
        .from("message_queue")
        .update({ status: "sent" })
        .eq("id", msg.id)

    } catch (err) {

      await supabase
        .from("message_queue")
        .update({
          status: "failed",
          attempts: msg.attempts + 1
        })
        .eq("id", msg.id)

    }
  }
}