import React, { useEffect, useState } from "react"

import { Card, CardHeader, CardContent } from "@components/Card"

import { listContacts } from "@services/contacts.service"
import type { Contact } from "@db/contactsDb.types"

export default function ContactsCard() {

  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadContacts() {

    try {

      setLoading(true)

      const data = await listContacts()

      setContacts(data)

      setError(null)

    } catch (err: any) {

      console.error("ContactsCard load failed", err)

      setError(err?.message ?? "Failed to load contacts")

    } finally {

      setLoading(false)

    }

  }

  useEffect(() => {

    loadContacts()

  }, [])

  if (loading) {

    return (

      <Card>

        <CardHeader
          title="Contacts Captured"
          subtitle="Total people recorded in the system"
        />

        <CardContent>

          <div className="text-sm text-slate-500">
            Loading contacts…
          </div>

        </CardContent>

      </Card>

    )

  }

  if (error) {

    return (

      <Card>

        <CardHeader
          title="Contacts Captured"
          subtitle="Total people recorded in the system"
        />

        <CardContent>

          <div className="text-sm text-red-600">
            {error}
          </div>

        </CardContent>

      </Card>

    )

  }

  return (

    <Card>

      <CardHeader
        title="Contacts Captured"
        subtitle="Total people recorded in the system"
      />

      <CardContent>

        <div className="text-4xl font-bold text-slate-800">

          {contacts.length.toLocaleString()}

        </div>

        <div className="text-xs text-slate-500 mt-1">

          Contacts in database

        </div>

      </CardContent>

    </Card>

  )

}