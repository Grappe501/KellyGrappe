import React, { useEffect, useState } from "react"

import { Card, CardHeader, CardContent } from "@components/Card"
import { listContacts } from "@services/contacts.service"

type ContactsCardProps = {
  contacts?: number
}

export default function ContactsCard({ contacts }: ContactsCardProps) {
  const [count, setCount] = useState<number>(contacts ?? 0)
  const [loading, setLoading] = useState<boolean>(contacts === undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof contacts === "number") {
      setCount(contacts)
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const rows = await listContacts()

        if (!cancelled) {
          setCount(rows.length)
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error("ContactsCard failed", err)
          setError(err?.message ?? "Failed to load contacts")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [contacts])

  return (
    <Card>
      <CardHeader
        title="Contacts"
        subtitle="Total contacts captured"
      />

      <CardContent>
        {loading ? (
          <div className="text-sm text-slate-500">Loading contacts...</div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : (
          <div className="space-y-1">
            <div className="text-3xl font-bold text-slate-900">
              {count.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500">
              Contacts in system
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}