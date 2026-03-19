import type { Handler } from "@netlify/functions"

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const fromNumber = process.env.TWILIO_FROM_NUMBER
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID

function buildTwilioBody(to: string, message: string) {
  const params = new URLSearchParams()
  params.set("To", to)
  params.set("Body", message)

  if (messagingServiceSid) {
    params.set("MessagingServiceSid", messagingServiceSid)
  } else if (fromNumber) {
    params.set("From", fromNumber)
  }

  return params
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Method Not Allowed" })
      }
    }

    if (!accountSid || !authToken || (!fromNumber && !messagingServiceSid)) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing Twilio configuration" })
      }
    }

    const data = JSON.parse(event.body || "{}")
    const to = data?.to
    const message = data?.message || data?.body

    if (!to || !message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "to and message/body are required" })
      }
    }

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: buildTwilioBody(to, message)
      }
    )

    const text = await response.text()
    const payload = text ? JSON.parse(text) : {}

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: "SMS send failed",
          details: payload?.message || payload?.detail || text
        })
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        sid: payload?.sid || null,
        status: payload?.status || null
      })
    }
  } catch (error: any) {
    console.error("send-sms failed", error)

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "SMS send failed",
        details: error?.message || "Unknown error"
      })
    }
  }
}
