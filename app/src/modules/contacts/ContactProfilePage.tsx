import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import Container from "../../shared/components/Container";
import { Card, CardHeader, CardContent } from "../../shared/components/Card";
import { Input, Label, Textarea, Button } from "../../shared/components/FormControls";

import { getContactById, updateContact, Contact } from "../../shared/utils/db/contactsDb";

export default function ContactProfilePage() {
  const { id } = useParams();

  const [contact, setContact] = useState<Contact | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (id) loadContact(id);
  }, [id]);

  async function loadContact(contactId: string) {
    const row = await getContactById(contactId);
    setContact(row);
  }

  async function save() {
    if (!contact) return;

    await updateContact(contact.id, contact);
    setEditing(false);
  }

  if (!contact) {
    return (
      <Container>
        <Card>
          <CardContent>Loading contact…</CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container>
      <Card>
        <CardHeader
          title={contact.fullName || "Unnamed Contact"}
          subtitle="Contact profile & campaign intelligence"
        />

        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={contact.fullName || ""}
                disabled={!editing}
                onChange={(e) =>
                  setContact({ ...contact, fullName: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={contact.phone || ""}
                disabled={!editing}
                onChange={(e) =>
                  setContact({ ...contact, phone: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={contact.email || ""}
                disabled={!editing}
                onChange={(e) =>
                  setContact({ ...contact, email: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={contact.city || ""}
                disabled={!editing}
                onChange={(e) =>
                  setContact({ ...contact, city: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="county">County</Label>
              <Input
                id="county"
                value={contact.county || ""}
                disabled={!editing}
                onChange={(e) =>
                  setContact({ ...contact, county: e.target.value })
                }
              />
            </div>

          </div>

          <div>
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={(contact.tags || []).join(", ")}
              disabled={!editing}
              onChange={(e) =>
                setContact({
                  ...contact,
                  tags: e.target.value.split(",").map((x) => x.trim()),
                })
              }
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={contact.conversationNotes || ""}
              disabled={!editing}
              onChange={(e) =>
                setContact({ ...contact, conversationNotes: e.target.value })
              }
            />
          </div>

          <div className="flex justify-end gap-3">
            {!editing ? (
              <Button onClick={() => setEditing(true)}>Edit</Button>
            ) : (
              <>
                <Button variant="secondary" onClick={() => setEditing(false)}>
                  Cancel
                </Button>

                <Button onClick={save}>Save</Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}