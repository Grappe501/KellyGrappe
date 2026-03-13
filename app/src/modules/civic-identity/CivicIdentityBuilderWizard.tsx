/**
 * CivicIdentityBuilderWizard.tsx
 *
 * Wizard for building a civic identity profile.
 *
 * Public Layers:
 * - civic profile
 * - contact channels
 * - organization memberships
 * - public interests
 *
 * Private Layers (hidden from public):
 * - civic signals
 * - reputation seed score
 *
 * This feeds:
 * IdentityGraph
 * CommunityFootprintEngine
 * OrganizerProgressionEngine
 */

import React, { useState } from "react"
import { Card, CardHeader, CardContent } from "@components/Card"

type CivicProfile = {
  displayName: string
  city: string
  state: string
  neighborhood?: string
  bio?: string
}

type ContactChannels = {
  email?: string
  phone?: string
  twitter?: string
  instagram?: string
  linkedin?: string
}

type OrganizationMembership = {
  name: string
  role?: string
}

type CivicSignals = {
  interests: string[]
  engagementStyle: "observer" | "supporter" | "volunteer" | "organizer"
}

type CivicIdentityProfile = {
  profile: CivicProfile
  contacts: ContactChannels
  organizations: OrganizationMembership[]
  interests: string[]
  signals: CivicSignals

  /**
   * Hidden system layer
   */
  reputationScore: number
}

const STEPS = [
  "basic",
  "contacts",
  "organizations",
  "interests",
  "signals",
  "review"
] as const

export default function CivicIdentityBuilderWizard() {

  const [stepIndex, setStepIndex] = useState(0)

  const [profile, setProfile] = useState<CivicProfile>({
    displayName: "",
    city: "",
    state: ""
  })

  const [contacts, setContacts] = useState<ContactChannels>({})

  const [organizations, setOrganizations] = useState<OrganizationMembership[]>([])

  const [interests, setInterests] = useState<string[]>([])

  const [signals, setSignals] = useState<CivicSignals>({
    interests: [],
    engagementStyle: "observer"
  })

  const step = STEPS[stepIndex]

  function nextStep() {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(stepIndex + 1)
    }
  }

  function previousStep() {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1)
    }
  }

  function buildProfile(): CivicIdentityProfile {

    /**
     * Initial hidden reputation score.
     * Later this will be calculated from activity.
     */

    const reputationScore = 50

    return {
      profile,
      contacts,
      organizations,
      interests,
      signals,
      reputationScore
    }
  }

  function submitProfile() {

    const identity = buildProfile()

    console.log("Civic identity created:", identity)

    /**
     * Later:
     * save to identity service / database
     */
  }

  function renderStep() {

    switch (step) {

      case "basic":
        return (
          <>
            <input
              placeholder="Display name"
              value={profile.displayName}
              onChange={(e) =>
                setProfile({ ...profile, displayName: e.target.value })
              }
              className="border p-2 w-full mb-2"
            />

            <input
              placeholder="City"
              value={profile.city}
              onChange={(e) =>
                setProfile({ ...profile, city: e.target.value })
              }
              className="border p-2 w-full mb-2"
            />

            <input
              placeholder="State"
              value={profile.state}
              onChange={(e) =>
                setProfile({ ...profile, state: e.target.value })
              }
              className="border p-2 w-full"
            />
          </>
        )

      case "contacts":
        return (
          <>
            <input
              placeholder="Email"
              value={contacts.email ?? ""}
              onChange={(e) =>
                setContacts({ ...contacts, email: e.target.value })
              }
              className="border p-2 w-full mb-2"
            />

            <input
              placeholder="Phone"
              value={contacts.phone ?? ""}
              onChange={(e) =>
                setContacts({ ...contacts, phone: e.target.value })
              }
              className="border p-2 w-full mb-2"
            />

            <input
              placeholder="Twitter handle"
              value={contacts.twitter ?? ""}
              onChange={(e) =>
                setContacts({ ...contacts, twitter: e.target.value })
              }
              className="border p-2 w-full"
            />
          </>
        )

      case "organizations":
        return (
          <>
            <button
              className="border px-3 py-1 mb-3"
              onClick={() =>
                setOrganizations([
                  ...organizations,
                  { name: "", role: "" }
                ])
              }
            >
              Add Organization
            </button>

            {organizations.map((org, index) => (
              <div key={index} className="mb-2">

                <input
                  placeholder="Organization name"
                  value={org.name}
                  onChange={(e) => {
                    const copy = [...organizations]
                    copy[index].name = e.target.value
                    setOrganizations(copy)
                  }}
                  className="border p-2 w-full mb-1"
                />

                <input
                  placeholder="Role"
                  value={org.role ?? ""}
                  onChange={(e) => {
                    const copy = [...organizations]
                    copy[index].role = e.target.value
                    setOrganizations(copy)
                  }}
                  className="border p-2 w-full"
                />

              </div>
            ))}
          </>
        )

      case "interests":
        return (
          <>
            <input
              placeholder="Add civic interest"
              onKeyDown={(e) => {

                if (e.key === "Enter") {

                  const value = (e.target as HTMLInputElement).value

                  if (value) {
                    setInterests([...interests, value])
                    ;(e.target as HTMLInputElement).value = ""
                  }

                }

              }}
              className="border p-2 w-full"
            />

            <div className="mt-2 text-sm">
              {interests.map((interest, i) => (
                <div key={i}>{interest}</div>
              ))}
            </div>
          </>
        )

      case "signals":
        return (
          <>
            <div className="text-sm mb-2">
              How do you usually participate in civic life?
            </div>

            <select
              value={signals.engagementStyle}
              onChange={(e) =>
                setSignals({
                  ...signals,
                  engagementStyle: e.target.value as CivicSignals["engagementStyle"]
                })
              }
              className="border p-2 w-full"
            >
              <option value="observer">Observer</option>
              <option value="supporter">Supporter</option>
              <option value="volunteer">Volunteer</option>
              <option value="organizer">Organizer</option>
            </select>
          </>
        )

      case "review":

        const identity = buildProfile()

        return (
          <div className="text-sm space-y-2">

            <div>
              <strong>Name:</strong> {identity.profile.displayName}
            </div>

            <div>
              <strong>Location:</strong> {identity.profile.city},{" "}
              {identity.profile.state}
            </div>

            <div>
              <strong>Organizations:</strong> {identity.organizations.length}
            </div>

            <div>
              <strong>Interests:</strong> {identity.interests.join(", ")}
            </div>

          </div>
        )

    }

  }

  return (

    <Card>

      <CardHeader
        title="Civic Identity Builder"
        subtitle="Create your community profile"
      />

      <CardContent>

        {renderStep()}

        <div className="flex justify-between mt-4">

          <button
            onClick={previousStep}
            disabled={stepIndex === 0}
            className="text-sm text-blue-600"
          >
            Back
          </button>

          {step === "review" ? (

            <button
              onClick={submitProfile}
              className="text-sm text-green-600"
            >
              Create Profile
            </button>

          ) : (

            <button
              onClick={nextStep}
              className="text-sm text-blue-600"
            >
              Next
            </button>

          )}

        </div>

      </CardContent>

    </Card>

  )

}
