import type { Handler } from "@netlify/functions"
import sgMail from "@sendgrid/mail"

const apiKey = process.env.SENDGRID_API_KEY
const fromEmail = process.env.SENDGRID_FROM_EMAIL

if (apiKey) {
  sgMail.setApiKey(apiKey)
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Method Not Allowed" })
      }
    }

    if (!apiKey || !fromEmail) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing SendGrid configuration" })
      }
    }

    const data = JSON.parse(event.body || "{}")
    const to = data?.to
    const subject = data?.subject
    const text = data?.text || data?.body || ""
    const html = data?.html

    if (!to || !subject || !text) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "to, subject, and text/body are required" })
      }
    }

    await sgMail.send({
      to,
      from: fromEmail,
      subject,
      text,
      html: html || undefined
    })

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    }
  } catch (error: any) {
    console.error("send-email failed", error)

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Email send failed",
        details: error?.message || "Unknown error"
      })
    }
  }
}
