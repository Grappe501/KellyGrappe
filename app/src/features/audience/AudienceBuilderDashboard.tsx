/**
 * AudienceBuilderDashboard.tsx
 *
 * Visual interface for building targeted messaging audiences.
 */

import React, { useState } from "react"
import { Card, CardHeader, CardContent } from "@components/Card"

import {
  buildAudience,
  type AudienceMember
} from "@platform/audience/audience.builder.engine"

export default function AudienceBuilderDashboard() {

  const [county, setCounty] = useState("")
  const [hasEmail, setHasEmail] = useState(false)
  const [hasPhone, setHasPhone] = useState(false)

  const [members, setMembers] = useState<AudienceMember[]>([])
  const [loading, setLoading] = useState(false)

  async function runAudienceBuilder() {

    setLoading(true)

    try {

      const result = await buildAudience({
        county: county || undefined,
        hasEmail,
        hasPhone
      })

      setMembers(result.members)

    } catch (err) {

      console.error("Audience build failed", err)

    }

    setLoading(false)

  }

  return (

    <div className="space-y-6">

      <Card>

        <CardHeader
          title="Audience Builder"
          subtitle="Create targeted messaging audiences"
        />

        <CardContent>

          <div className="space-y-4">

            <div>

              <label className="text-sm">County</label>

              <input
                className="border rounded p-2 w-full"
                value={county}
                onChange={(e) => setCounty(e.target.value)}
              />

            </div>

            <div className="flex gap-4">

              <label className="flex items-center gap-2">

                <input
                  type="checkbox"
                  checked={hasEmail}
                  onChange={(e) => setHasEmail(e.target.checked)}
                />

                Has Email

              </label>

              <label className="flex items-center gap-2">

                <input
                  type="checkbox"
                  checked={hasPhone}
                  onChange={(e) => setHasPhone(e.target.checked)}
                />

                Has Phone

              </label>

            </div>

            <button
              className="bg-blue-600 text-white px-4 py-2 rounded"
              onClick={runAudienceBuilder}
            >
              Build Audience
            </button>

          </div>

        </CardContent>

      </Card>

      <Card>

        <CardHeader
          title="Audience Results"
          subtitle={`Members found: ${members.length}`}
        />

        <CardContent>

          {loading && (
            <div className="text-sm text-slate-500">
              Building audience…
            </div>
          )}

          {!loading && members.length === 0 && (
            <div className="text-sm text-slate-600">
              No members match this audience.
            </div>
          )}

          <div className="space-y-2">

            {members.map((member) => (

              <div
                key={member.id}
                className="border rounded p-2 text-sm"
              >

                <strong>{member.fullName || "Unnamed"}</strong>

                <div className="text-xs text-slate-600">

                  {member.email && <div>Email: {member.email}</div>}
                  {member.phone && <div>Phone: {member.phone}</div>}
                  {member.county && <div>County: {member.county}</div>}

                </div>

              </div>

            ))}

          </div>

        </CardContent>

      </Card>

    </div>

  )

}
