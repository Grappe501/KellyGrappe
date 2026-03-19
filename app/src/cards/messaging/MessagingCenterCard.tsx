import React, { useEffect, useState } from "react"

import { processMessages } from "@/kernel/processor/message.processor"

import { Card, CardHeader, CardContent } from "@components/Card"
import { Input, Textarea, Button, Label } from "@components/FormControls"

import { listContactsDirectoryRows } from "@services/contacts.service"

import { emailService } from "@/circles/communications/services/email.service"
import { smsService } from "@/circles/communications/services/sms.service"

type ContactRow = {
  id: string
  fullName: string
  phone?: string
  email?: string
}

type ProcessorSummary = {
  processed: number
  sent: number
  failed: number
  errors: string[]
}

const TEMPLATES = [
  {
    label: "Volunteer Reminder",
    subject: "Volunteer Reminder",
    body: "Reminder: thank you for being part of the team. Please confirm your availability."
  },
  {
    label: "Event Reminder",
    subject: "Event Reminder",
    body: "Reminder: our event is coming up soon. Let us know if you can attend."
  },
  {
    label: "Follow-Up",
    subject: "Following Up",
    body: "Following up from our last conversation. Let us know if you have any questions."
  }
]

function summarizeProcessorRun(summary: ProcessorSummary): string {
  if (!summary.processed) {
    return "ℹ️ No queued messages to process"
  }

  if (!summary.failed) {
    return `✅ Processed ${summary.processed} message${summary.processed === 1 ? "" : "s"} — ${summary.sent} sent`
  }

  return `⚠️ Processed ${summary.processed} message${summary.processed === 1 ? "" : "s"} — ${summary.sent} sent, ${summary.failed} failed`
}

export default function MessagingCenterCard() {
  const [contacts, setContacts] = useState<ContactRow[]>([])
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<ContactRow[]>([])
  const [selectedContactId, setSelectedContactId] = useState<string | undefined>()

  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")

  const [status, setStatus] = useState("")
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const rows = await listContactsDirectoryRows()
        setContacts(rows)
      } catch (err) {
        console.error(err)
        setStatus("❌ Failed to load contacts")
      }
    }

    load()
  }, [])

  function runSearch(q: string) {
    const v = q.trim().toLowerCase()

    if (!v) {
      setResults([])
      return
    }

    const matches = contacts
      .filter((c) =>
        c.fullName?.toLowerCase().includes(v) ||
        c.phone?.includes(v) ||
        c.email?.toLowerCase().includes(v)
      )
      .slice(0, 6)

    setResults(matches)
  }

  function selectContact(c: ContactRow) {
    if (c.phone) setPhone(c.phone)
    if (c.email) setEmail(c.email)

    setSelectedContactId(c.id)
    setResults([])
    setSearch("")
    setStatus(`Selected ${c.fullName}`)
  }

  async function runProcessor() {
    if (processing) return

    try {
      setProcessing(true)
      setStatus("⚙️ Processing message queue...")

      const summary = await processMessages()
      setStatus(summarizeProcessorRun(summary))

      if (summary.errors.length) {
        console.warn("Processor errors:", summary.errors)
      }
    } catch (err: any) {
      console.error(err)
      setStatus("❌ Processor failed: " + (err?.message || "Unknown error"))
    } finally {
      setProcessing(false)
    }
  }

  async function sendSMS() {
    if (!phone || !message) {
      setStatus("❌ Phone and message required")
      return
    }

    try {
      setLoading(true)
      setStatus("📱 Queueing SMS...")

      const result = await smsService.sendSMS({
        to: phone,
        message,
        contactId: selectedContactId
      })

      console.log("SMS RESULT:", result)
      setStatus("📨 SMS queued — processing...")

      await runProcessor()
    } catch (err: any) {
      console.error(err)
      setStatus("❌ SMS failed: " + (err?.message || "Unknown error"))
    } finally {
      setLoading(false)
    }
  }

  async function sendEmail() {
    if (!email || !subject || !message) {
      setStatus("❌ Email, subject, and message required")
      return
    }

    try {
      setLoading(true)
      setStatus("📧 Queueing Email...")

      const result = await emailService.sendEmail({
        to: email,
        subject,
        body: message,
        contactId: selectedContactId
      })

      console.log("EMAIL RESULT:", result)
      setStatus("📨 Email queued — processing...")

      await runProcessor()
    } catch (err: any) {
      console.error(err)
      setStatus("❌ Email failed: " + (err?.message || "Unknown error"))
    } finally {
      setLoading(false)
    }
  }

  function applyTemplate(t: { subject: string; body: string }) {
    setSubject(t.subject)
    setMessage(t.body)
  }

  return (
    <Card>
      <CardHeader
        title="Messaging Center"
        subtitle="Send SMS or Email"
      />

      <CardContent>
        <div className="space-y-5">
          <div>
            <Label>Search Contact</Label>

            <Input
              placeholder="Search name, phone, email"
              value={search}
              onChange={(e) => {
                const v = e.target.value
                setSearch(v)
                runSearch(v)
              }}
            />

            {results.length > 0 && (
              <div className="mt-2 border rounded divide-y">
                {results.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => selectContact(c)}
                    className="p-3 text-sm hover:bg-slate-50 cursor-pointer"
                  >
                    <div className="font-semibold">{c.fullName}</div>

                    <div className="text-xs text-slate-500">
                      {c.phone} {c.email}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label>Phone</Label>
            <Input
              placeholder="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div>
            <Label>Email</Label>
            <Input
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <Label>Email Subject</Label>
            <Input
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div>
            <Label>Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map((t) => (
              <Button
                key={t.label}
                size="sm"
                variant="secondary"
                onClick={() => applyTemplate(t)}
              >
                {t.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              disabled={loading || processing}
              onClick={sendSMS}
            >
              {loading ? "Working..." : "Send SMS"}
            </Button>

            <Button
              variant="secondary"
              disabled={loading || processing}
              onClick={sendEmail}
            >
              {loading ? "Working..." : "Send Email"}
            </Button>

            <Button
              variant="ghost"
              disabled={processing}
              onClick={runProcessor}
            >
              {processing ? "Processing..." : "Run Processor"}
            </Button>
          </div>

          <div className="text-xs text-slate-600">
            {status || "No messages sent yet"}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
