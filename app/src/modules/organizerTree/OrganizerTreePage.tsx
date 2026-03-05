/* app/src/modules/organizerTree/OrganizerTreePage.tsx
   Power-of-5 Organizer Tree Viewer
*/

import React, { useEffect, useState } from "react"

import Container from "../../shared/components/Container"
import { Card, CardHeader, CardContent } from "../../shared/components/Card"

import {
  listContactRelationships,
} from "../../shared/utils/db/services/relationships.service"

import {
  listContacts
} from "../../shared/utils/db/services/contacts.service"

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type Contact = {
  id: string
  fullName?: string
}

type Relationship = {
  id: string
  fromContactId: string
  toContactId: string
  relationshipType: string
}

/* -------------------------------------------------------------------------- */
/* TREE NODE                                                                  */
/* -------------------------------------------------------------------------- */

type TreeNode = {
  contact: Contact
  children: TreeNode[]
}

/* -------------------------------------------------------------------------- */
/* BUILD TREE                                                                 */
/* -------------------------------------------------------------------------- */

function buildTree(
  contacts: Contact[],
  relationships: Relationship[],
  rootId: string
): TreeNode | null {

  const contactMap = new Map<string, Contact>()
  contacts.forEach(c => contactMap.set(c.id, c))

  const childMap = new Map<string, string[]>()

  relationships.forEach(r => {

    if (
      r.relationshipType !== "TEAM_MEMBER" &&
      r.relationshipType !== "POWER_OF_FIVE"
    ) return

    if (!childMap.has(r.fromContactId)) {
      childMap.set(r.fromContactId, [])
    }

    childMap.get(r.fromContactId)!.push(r.toContactId)

  })

  function buildNode(contactId: string): TreeNode | null {

    const contact = contactMap.get(contactId)
    if (!contact) return null

    const childrenIds = childMap.get(contactId) ?? []

    const children = childrenIds
      .map(id => buildNode(id))
      .filter(Boolean) as TreeNode[]

    return {
      contact,
      children
    }

  }

  return buildNode(rootId)
}

/* -------------------------------------------------------------------------- */
/* TREE VIEW                                                                  */
/* -------------------------------------------------------------------------- */

function TreeNodeView({ node }: { node: TreeNode }) {

  return (

    <div className="ml-4 border-l border-slate-200 pl-4 mt-3">

      <div className="font-medium text-sm">
        {node.contact.fullName || "Unnamed"}
      </div>

      {node.children.length > 0 && (

        <div className="mt-2">

          {node.children.map(child => (

            <TreeNodeView
              key={child.contact.id}
              node={child}
            />

          ))}

        </div>

      )}

    </div>

  )
}

/* -------------------------------------------------------------------------- */
/* COMPONENT                                                                  */
/* -------------------------------------------------------------------------- */

export default function OrganizerTreePage() {

  const [contacts, setContacts] = useState<Contact[]>([])
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [rootId, setRootId] = useState<string | null>(null)

  const [tree, setTree] = useState<TreeNode | null>(null)
  const [loading, setLoading] = useState(true)

  /* ---------------------------------------------------------------------- */
  /* INITIAL LOAD                                                           */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {

    async function loadContacts() {

      const c = await listContacts()

      setContacts(c)

      if (c.length > 0) {
        setRootId(c[0].id)
      }

    }

    loadContacts()

  }, [])

  /* ---------------------------------------------------------------------- */
  /* LOAD RELATIONSHIPS                                                     */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {

    if (!rootId) return

    async function loadRelationships() {

      setLoading(true)

      /* FIX: cast to string because we guard above */
      const r = await listContactRelationships(rootId as string)

      setRelationships(r)

      setLoading(false)

    }

    loadRelationships()

  }, [rootId])

  /* ---------------------------------------------------------------------- */
  /* BUILD TREE                                                             */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {

    if (!rootId) return

    const t = buildTree(contacts, relationships, rootId)

    setTree(t)

  }, [rootId, contacts, relationships])

  /* ---------------------------------------------------------------------- */
  /* RENDER                                                                 */
  /* ---------------------------------------------------------------------- */

  return (

    <Container>

      <div className="p-6 space-y-6">

        {/* HEADER */}

        <div>

          <h1 className="text-2xl font-bold">
            Power-of-5 Organizer Tree
          </h1>

          <p className="text-sm text-slate-600">
            Visualize organizer recruitment networks
          </p>

        </div>

        {/* SELECT ORGANIZER */}

        <Card>

          <CardHeader
            title="Organizer Selection"
            subtitle="Choose a root organizer"
          />

          <CardContent>

            <select
              className="border rounded p-2 w-full"
              value={rootId ?? ""}
              onChange={(e) => setRootId(e.target.value)}
            >

              {contacts.map(c => (

                <option
                  key={c.id}
                  value={c.id}
                >
                  {c.fullName || "Unnamed"}
                </option>

              ))}

            </select>

          </CardContent>

        </Card>

        {/* TREE */}

        <Card>

          <CardHeader
            title="Organizer Network"
            subtitle="Power-of-5 structure"
          />

          <CardContent>

            {loading ? (

              <div className="text-sm text-slate-500">
                Loading network…
              </div>

            ) : tree ? (

              <TreeNodeView node={tree} />

            ) : (

              <div className="text-sm text-slate-600">
                No relationships found
              </div>

            )}

          </CardContent>

        </Card>

      </div>

    </Container>

  )
}