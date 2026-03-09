import React, { useState } from "react"

import { Card, CardHeader, CardContent } from "@components/Card"
import { Button, Input, Textarea } from "@components/FormControls"

type MessageChannel = "sms" | "email"

function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, "")
  if (!digits) return ""
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`
  return raw.trim()
}

export default function MessagingCenterCard() {

  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")

  const [status, setStatus] = useState("")
  const [sending, setSending] = useState<MessageChannel | null>(null)

  async function sendSMS() {

    try {

      const normalized = normalizePhone(phone)

      setSending("sms")
      setStatus("Sending SMS...")

      const res = await fetch("/.netlify/functions/send-sms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          to: normalized,
          message
        })
      })

      const data = await res.json()

      setStatus(`SMS result: ${JSON.stringify(data)}`)

    } catch (err: any) {

      console.error("SMS failed", err)

      setStatus(err?.message ?? "SMS failed")

    } finally {

      setSending(null)

    }

  }

  async function sendEmail() {

    try {

      setSending("email")
      setStatus("Sending Email...")

      const res = await fetch("/.netlify/functions/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          to: email,
          subject,
          text: message
        })
      })

      const data = await res.json()

      setStatus(`Email result: ${JSON.stringify(data)}`)

    } catch (err: any) {

      console.error("Email failed", err)

      setStatus(err?.message ?? "Email failed")

    } finally {

      setSending(null)

    }

  }

  return (

    <Card>

      <CardHeader
        title="Messaging Center"
        subtitle="Send SMS or Email to voters"
      />

      <CardContent>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <Input
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <Input
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            placeholder="Email Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />

        </div>

        <div className="mt-4">

          <Textarea
            placeholder="Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
          />

        </div>

        <div className="flex gap-3 mt-4">

          <Button
            onClick={sendSMS}
            disabled={sending !== null}
          >
            Send SMS
          </Button>

          <Button
            onClick={sendEmail}
            disabled={sending !== null}
          >
            Send Email
          </Button>

        </div>

        {status && (

          <div className="text-xs text-slate-500 mt-3">

            {status}

          </div>

        )}

      </CardContent>

    </Card>

  )

}