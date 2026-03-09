import React, { useState } from "react"

import { Card, CardHeader, CardContent } from "@components/Card"
import { Input, Button } from "@components/FormControls"

import { searchContacts } from "@services/contacts.service"

type ContactResult = {
  id: string
  fullName?: string
  phone?: string
  email?: string
}

export default function CommandSearchCard() {

  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ContactResult[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function runSearch(q: string) {

    const trimmed = q.trim()

    if (!trimmed) {
      setResults([])
      setError(null)
      return
    }

    try {

      setSearching(true)
      setError(null)

      const res = await searchContacts(trimmed)

      setResults(res ?? [])

    } catch (err: any) {

      console.error("CommandSearchCard search failed", err)

      setError(err?.message ?? "Search failed")
      setResults([])

    } finally {

      setSearching(false)

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
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              handleChange(e.target.value)
            }
          />

          {searching && (
            <div className="text-xs text-slate-500">
              Searching...
            </div>
          )}

          {error && (
            <div className="text-xs text-red-600">
              {error}
            </div>
          )}

          {!searching && !error && query.trim() && results.length === 0 && (
            <div className="text-xs text-slate-500">
              No matching contacts found.
            </div>
          )}

          {results.length > 0 && (

            <div className="border rounded divide-y overflow-hidden">

              {results.map((contact) => (

                <div
                  key={contact.id}
                  className="p-3 flex items-center justify-between hover:bg-slate-50"
                >

                  <div className="min-w-0">

                    <div className="font-semibold text-sm truncate">
                      {contact.fullName ?? "Unnamed Contact"}
                    </div>

                    <div className="text-xs text-slate-500 truncate">

                      {contact.phone ?? "No phone"}

                      {contact.email && (
                        <span>
                          {" • "}
                          {contact.email}
                        </span>
                      )}

                    </div>

                  </div>

                  <Button
                    onClick={() => {
                      console.log("Open contact", contact.id)
                    }}
                  >
                    Open
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