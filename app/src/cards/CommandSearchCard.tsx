import React, { useState } from "react"

import { Card, CardHeader, CardContent } from "../shared/components/Card"
import { Button, Input } from "../shared/components/FormControls"

import { searchContacts } from "../shared/utils/db/services/contacts.service"
import type { Contact } from "../shared/utils/db/contactsDb.types"

type CommandSearchCardProps = {
  onSelectContact?: (contact: Contact) => void
}

export default function CommandSearchCard({
  onSelectContact,
}: CommandSearchCardProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function runSearch(value: string) {
    const q = value.trim()

    if (!q) {
      setResults([])
      setError(null)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const contacts = await searchContacts(q, { limit: 10 })

      setResults(contacts)
    } catch (err: any) {
      console.error("Command search failed", err)
      setError(err?.message ?? "Search failed")
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  function handleChange(value: string) {
    setQuery(value)
    void runSearch(value)
  }

  return (
    <Card>
      <CardHeader
        title="Command Search"
        subtitle="Find any contact instantly"
      />

      <CardContent>
        <div className="space-y-4">
          <Input
            placeholder="Search name, phone, email..."
            value={query}
            onChange={(e) => handleChange(e.target.value)}
          />

          {loading && (
            <div className="text-xs text-slate-500">
              Searching...
            </div>
          )}

          {error && (
            <div className="text-xs text-red-600">
              {error}
            </div>
          )}

          {!loading && !error && query.trim() && results.length === 0 && (
            <div className="text-xs text-slate-500">
              No matching contacts found.
            </div>
          )}

          {results.length > 0 && (
            <div className="overflow-hidden rounded border divide-y">
              {results.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between gap-3 p-3 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      {contact.fullName || "Unnamed"}
                    </div>

                    <div className="truncate text-xs text-slate-500">
                      {contact.phone || "No phone"}
                      {contact.email ? ` • ${contact.email}` : ""}
                    </div>
                  </div>

                  <Button
                    onClick={() => onSelectContact?.(contact)}
                  >
                    Select
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
