/**
 * TemplateLibraryCard.tsx
 *
 * Messaging template library for campaign communications.
 *
 * Allows organizers to:
 * - browse messaging templates
 * - preview templates
 * - generate new templates with AI
 *
 * Integrations:
 *  - ai.message.strategist
 *  - future template.service
 */

import React, { useEffect, useMemo, useState } from "react"
import { Card, CardHeader, CardContent } from "@components/Card"
import {
  runMessageStrategist,
  convertStrategyToTemplateDrafts,
  type MessageStrategistRequest,
  type MessagingChannel,
  type MessagingObjective,
  type MessagingTone,
  type MessageTemplateDraft
} from "@platform/ai/ai.message.strategist"

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type Template = {
  id: string
  name: string
  channel: string
  description: string
}

type GeneratorFormState = {
  channel: MessagingChannel
  objective: MessagingObjective
  tone: MessagingTone
  audienceLabel: string
  county: string
  issue: string
  callToAction: string
  additionalInstructions: string
  variantCount: number
}

/* -------------------------------------------------------------------------- */
/* CONSTANTS                                                                  */
/* -------------------------------------------------------------------------- */

const CHANNEL_OPTIONS: MessagingChannel[] = [
  "email",
  "sms",
  "phonebank",
  "social",
  "substack",
  "direct_mail",
  "discord"
]

const OBJECTIVE_OPTIONS: MessagingObjective[] = [
  "volunteer_recruitment",
  "donation_ask",
  "event_invite",
  "event_reminder",
  "persuasion",
  "turnout",
  "leadership_development",
  "community_update",
  "fundraising_followup",
  "rapid_response"
]

const TONE_OPTIONS: MessagingTone[] = [
  "urgent",
  "hopeful",
  "professional",
  "grassroots",
  "friendly",
  "persuasive",
  "firm",
  "inspirational"
]

const INITIAL_FORM: GeneratorFormState = {
  channel: "email",
  objective: "volunteer_recruitment",
  tone: "grassroots",
  audienceLabel: "",
  county: "",
  issue: "",
  callToAction: "",
  additionalInstructions: "",
  variantCount: 3
}

/* -------------------------------------------------------------------------- */
/* COMPONENT                                                                  */
/* -------------------------------------------------------------------------- */

export default function TemplateLibraryCard() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  const [showGenerator, setShowGenerator] = useState(false)
  const [form, setForm] = useState<GeneratorFormState>(INITIAL_FORM)
  const [generating, setGenerating] = useState(false)
  const [generatorError, setGeneratorError] = useState<string | null>(null)
  const [generatedDrafts, setGeneratedDrafts] = useState<MessageTemplateDraft[]>([])

  async function loadTemplates() {
    setLoading(true)

    try {
      /**
       * Future implementation:
       *
       * template.service.listTemplates()
       */
      const simulated: Template[] = [
        {
          id: "1",
          name: "Volunteer Recruitment Email",
          channel: "Email",
          description: "Invite supporters to volunteer for upcoming campaign activities."
        },
        {
          id: "2",
          name: "Early Voting SMS",
          channel: "SMS",
          description: "Reminder for supporters to vote early."
        },
        {
          id: "3",
          name: "Phonebank Introduction Script",
          channel: "Phonebank",
          description: "Standard volunteer script for voter outreach."
        },
        {
          id: "4",
          name: "Campaign Announcement Post",
          channel: "Social",
          description: "Launch announcement for social media platforms."
        },
        {
          id: "5",
          name: "Substack Weekly Update",
          channel: "Substack",
          description: "Newsletter template for campaign updates."
        }
      ]

      setTemplates(simulated)
    } catch (err) {
      console.error("Template loading failed", err)
    }

    setLoading(false)
  }

  function updateForm<K extends keyof GeneratorFormState>(
    key: K,
    value: GeneratorFormState[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value
    }))
  }

  async function handleGenerateAI() {
    setGenerating(true)
    setGeneratorError(null)
    setGeneratedDrafts([])

    try {
      const request: MessageStrategistRequest = {
        channel: form.channel,
        objective: form.objective,
        tone: form.tone,
        candidateName: "Kelly Grappe",
        campaignName: "Kelly Grappe for Secretary of State",
        audience: {
          label: form.audienceLabel || undefined,
          county: form.county || undefined,
          issueInterest: form.issue || undefined
        },
        issue: form.issue || undefined,
        callToAction: form.callToAction || undefined,
        additionalInstructions: form.additionalInstructions || undefined,
        variantCount: form.variantCount
      }

      const result = await runMessageStrategist(request)

      if (!result.ok) {
        throw new Error(result.error || "AI template generation failed")
      }

      const drafts = convertStrategyToTemplateDrafts(request, result)

      setGeneratedDrafts(drafts)
    } catch (err) {
      console.error("AI template generation failed", err)
      setGeneratorError(
        err instanceof Error ? err.message : "Unknown AI generation error"
      )
    } finally {
      setGenerating(false)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  const sortedTemplates = useMemo(() => {
    return [...templates].sort((a, b) => a.name.localeCompare(b.name))
  }, [templates])

  if (loading) {
    return (
      <Card>
        <CardHeader
          title="Template Library"
          subtitle="Campaign messaging templates"
        />

        <CardContent>
          <div className="text-sm text-slate-500">
            Loading templates…
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader
        title="Template Library"
        subtitle="Reusable campaign messaging content"
      />

      <CardContent>
        <div className="space-y-3">
          {sortedTemplates.map((t) => (
            <TemplateRow
              key={t.id}
              template={t}
            />
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setShowGenerator((prev) => !prev)}
            className="bg-blue-600 text-white rounded px-4 py-2 text-sm"
          >
            {showGenerator ? "Hide AI Generator" : "Generate Template with AI"}
          </button>
        </div>

        {showGenerator && (
          <div className="mt-6 border rounded p-4 space-y-4">
            <div className="text-sm font-semibold">
              AI Messaging Strategist
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Channel">
                <select
                  className="border rounded p-2 w-full"
                  value={form.channel}
                  onChange={(e) =>
                    updateForm("channel", e.target.value as MessagingChannel)
                  }
                >
                  {CHANNEL_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {labelize(option)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Objective">
                <select
                  className="border rounded p-2 w-full"
                  value={form.objective}
                  onChange={(e) =>
                    updateForm("objective", e.target.value as MessagingObjective)
                  }
                >
                  {OBJECTIVE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {labelize(option)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Tone">
                <select
                  className="border rounded p-2 w-full"
                  value={form.tone}
                  onChange={(e) =>
                    updateForm("tone", e.target.value as MessagingTone)
                  }
                >
                  {TONE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {labelize(option)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Audience Label">
                <input
                  className="border rounded p-2 w-full"
                  value={form.audienceLabel}
                  onChange={(e) => updateForm("audienceLabel", e.target.value)}
                  placeholder="Teachers, volunteers, new supporters..."
                />
              </Field>

              <Field label="County">
                <input
                  className="border rounded p-2 w-full"
                  value={form.county}
                  onChange={(e) => updateForm("county", e.target.value)}
                  placeholder="Pulaski"
                />
              </Field>

              <Field label="Issue">
                <input
                  className="border rounded p-2 w-full"
                  value={form.issue}
                  onChange={(e) => updateForm("issue", e.target.value)}
                  placeholder="Voting rights, education, transparency..."
                />
              </Field>

              <Field label="Call To Action">
                <input
                  className="border rounded p-2 w-full"
                  value={form.callToAction}
                  onChange={(e) => updateForm("callToAction", e.target.value)}
                  placeholder="Sign up, donate, RSVP, volunteer..."
                />
              </Field>

              <Field label="Variant Count">
                <input
                  type="number"
                  min={1}
                  max={5}
                  className="border rounded p-2 w-full"
                  value={form.variantCount}
                  onChange={(e) =>
                    updateForm("variantCount", Number(e.target.value) || 3)
                  }
                />
              </Field>
            </div>

            <Field label="Additional Instructions">
              <textarea
                className="border rounded p-2 w-full min-h-[110px]"
                value={form.additionalInstructions}
                onChange={(e) =>
                  updateForm("additionalInstructions", e.target.value)
                }
                placeholder="Any extra guidance for the strategist..."
              />
            </Field>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => void handleGenerateAI()}
                disabled={generating}
                className="bg-blue-600 text-white rounded px-4 py-2 text-sm disabled:opacity-60"
              >
                {generating ? "Generating..." : "Run AI Strategist"}
              </button>

              <button
                onClick={() => {
                  setForm(INITIAL_FORM)
                  setGeneratorError(null)
                  setGeneratedDrafts([])
                }}
                type="button"
                className="border rounded px-4 py-2 text-sm"
              >
                Reset
              </button>
            </div>

            {generatorError && (
              <div className="text-sm text-red-600">
                {generatorError}
              </div>
            )}

            {generatedDrafts.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="text-sm font-semibold">
                  Generated Drafts
                </div>

                {generatedDrafts.map((draft, index) => (
                  <GeneratedDraftRow
                    key={`${draft.name}-${index}`}
                    draft={draft}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* UI HELPERS                                                                 */
/* -------------------------------------------------------------------------- */

function Field({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="text-xs text-slate-500 mb-1">
        {label}
      </div>
      {children}
    </div>
  )
}

function TemplateRow({
  template
}: {
  template: Template
}) {
  return (
    <div className="border rounded p-3">
      <div className="flex justify-between items-center">
        <div className="font-medium text-sm">
          {template.name}
        </div>

        <div className="text-xs text-slate-500">
          {template.channel}
        </div>
      </div>

      <div className="text-xs text-slate-600 mt-1">
        {template.description}
      </div>
    </div>
  )
}

function GeneratedDraftRow({
  draft
}: {
  draft: MessageTemplateDraft
}) {
  return (
    <div className="border rounded p-3 space-y-2">
      <div className="flex justify-between items-center">
        <div className="font-medium text-sm">
          {draft.name}
        </div>

        <div className="text-xs text-slate-500">
          {labelize(draft.channel)}
        </div>
      </div>

      {draft.subject && (
        <div className="text-xs text-slate-700">
          <span className="font-medium">Subject:</span> {draft.subject}
        </div>
      )}

      <div className="text-xs text-slate-700">
        <span className="font-medium">Description:</span> {draft.description}
      </div>

      <div className="text-xs text-slate-700">
        <span className="font-medium">Variables:</span>{" "}
        {draft.variables.length ? draft.variables.join(", ") : "None"}
      </div>

      <pre className="text-xs bg-slate-50 rounded p-3 overflow-auto whitespace-pre-wrap">
        {draft.body}
      </pre>
    </div>
  )
}

function labelize(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}
