import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import Container from "../../shared/components/Container";
import { Card, CardHeader, CardContent } from "../../shared/components/Card";
import {
  Input,
  Label,
  Textarea,
  Button,
  Select,
  HelpText,
} from "../../shared/components/FormControls";

import {
  addLiveFollowUp,
  getContactById,
  listLiveFollowUpsForContact,
  type Contact,
  type LiveFollowUp,
  updateContact,
} from "../../shared/utils/db/contactsDb";

function safeTrim(v: unknown) {
  return String(v ?? "").trim();
}

function splitCsvTags(raw: string) {
  return raw
    .split(",")
    .map((part) => safeTrim(part))
    .filter(Boolean);
}

export default function ContactProfilePage() {
  const { id } = useParams();

  const [contact, setContact] = useState<Contact | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [followUps, setFollowUps] = useState<LiveFollowUp[]>([]);
  const [newFollowUp, setNewFollowUp] = useState({
    notes: "",
    status: "NEW" as "NEW" | "IN_PROGRESS" | "COMPLETED",
    initials: "SYS",
  });

  useEffect(() => {
    if (id) {
      loadContact(id);
      loadFollowUps(id);
    }
  }, [id]);

  async function loadContact(contactId: string) {
    const row = await getContactById(contactId);
    setContact(row);
  }

  async function loadFollowUps(contactId: string) {
    const rows = await listLiveFollowUpsForContact(contactId);
    setFollowUps(rows);
  }

  async function save() {
    if (!contact) return;

    setSaving(true);
    try {
      await updateContact(contact.id, contact);
      setEditing(false);
      await loadContact(contact.id);
    } finally {
      setSaving(false);
    }
  }

  async function createFollowUp() {
    if (!contact || !safeTrim(newFollowUp.notes)) return;

    await addLiveFollowUp({
      contactId: contact.id,
      followUpStatus: newFollowUp.status,
      archived: false,
      followUpNotes: newFollowUp.notes,
      notes: newFollowUp.notes,
      name: contact.fullName,
      phone: contact.phone,
      email: contact.email,
      location: [contact.city, contact.county, contact.state].filter(Boolean).join(", "),
      source: contact.createdFrom || "CRM_PROFILE",
      entryInitials: newFollowUp.initials,
      permissionToContact: true,
    });

    setNewFollowUp({ notes: "", status: "NEW", initials: newFollowUp.initials });
    await loadFollowUps(contact.id);
  }

  const reachLabel = useMemo(() => {
    if (!contact) return "";
    if (contact.phone && contact.email) return "Phone + Email";
    if (contact.phone) return "Phone";
    if (contact.email) return "Email";
    return "No direct reach method";
  }, [contact]);

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
      <div className="space-y-6">
        <Card>
          <CardHeader
            title={contact.fullName || "Unnamed Contact"}
            subtitle="Contact profile, campaign intelligence, and follow-up command panel."
          />

          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                ["Reach", reachLabel],
                ["Best Method", contact.bestContactMethod || "Unknown"],
                ["Category", contact.category || "OTHER"],
                ["Support", contact.supportLevel || "Unknown"],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">{value}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={contact.fullName || ""}
                    disabled={!editing}
                    onChange={(e) => setContact({ ...contact, fullName: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={contact.phone || ""}
                    disabled={!editing}
                    onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={contact.email || ""}
                    disabled={!editing}
                    onChange={(e) => setContact({ ...contact, email: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="organization">Organization</Label>
                  <Input
                    id="organization"
                    value={contact.organization || ""}
                    disabled={!editing}
                    onChange={(e) => setContact({ ...contact, organization: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={contact.city || ""}
                    disabled={!editing}
                    onChange={(e) => setContact({ ...contact, city: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="county">County</Label>
                  <Input
                    id="county"
                    value={contact.county || ""}
                    disabled={!editing}
                    onChange={(e) => setContact({ ...contact, county: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={contact.state || ""}
                    disabled={!editing}
                    onChange={(e) => setContact({ ...contact, state: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="zip">ZIP</Label>
                  <Input
                    id="zip"
                    value={contact.zip || ""}
                    disabled={!editing}
                    onChange={(e) => setContact({ ...contact, zip: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    id="category"
                    value={contact.category || "OTHER"}
                    disabled={!editing}
                    onChange={(e) => setContact({ ...contact, category: e.target.value as Contact["category"] })}
                  >
                    <option value="VOTER">Voter</option>
                    <option value="VOLUNTEER">Volunteer</option>
                    <option value="DONOR">Donor</option>
                    <option value="LEADER">Leader</option>
                    <option value="PRESS">Press</option>
                    <option value="STAFF">Staff</option>
                    <option value="OTHER">Other</option>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="bestContactMethod">Best contact method</Label>
                  <Select
                    id="bestContactMethod"
                    value={contact.bestContactMethod || "TEXT"}
                    disabled={!editing}
                    onChange={(e) =>
                      setContact({
                        ...contact,
                        bestContactMethod: e.target.value as Contact["bestContactMethod"],
                      })
                    }
                  >
                    <option value="PHONE">Phone</option>
                    <option value="TEXT">Text</option>
                    <option value="EMAIL">Email</option>
                    <option value="IN_PERSON">In Person</option>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="supportLevel">Support level</Label>
                  <Select
                    id="supportLevel"
                    value={contact.supportLevel || "UNSURE"}
                    disabled={!editing}
                    onChange={(e) =>
                      setContact({
                        ...contact,
                        supportLevel: e.target.value as Contact["supportLevel"],
                      })
                    }
                  >
                    <option value="STRONG_SUPPORT">Strong Support</option>
                    <option value="LEAN_SUPPORT">Lean Support</option>
                    <option value="UNSURE">Unsure</option>
                    <option value="LEAN_OPPOSE">Lean Oppose</option>
                    <option value="STRONG_OPPOSE">Strong Oppose</option>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="tags">Tags / Hashtags</Label>
                  <Input
                    id="tags"
                    value={(contact.tags || []).join(", ")}
                    disabled={!editing}
                    onChange={(e) => setContact({ ...contact, tags: splitCsvTags(e.target.value) })}
                  />
                  <HelpText>Use tags for skills, teams, geography, and campaign roles.</HelpText>
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="rolePotential">Role potential / skills</Label>
                  <Input
                    id="rolePotential"
                    value={(contact.rolePotential || []).join(", ")}
                    disabled={!editing}
                    onChange={(e) =>
                      setContact({ ...contact, rolePotential: splitCsvTags(e.target.value) })
                    }
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="teamAssignments">Team assignments</Label>
                  <Input
                    id="teamAssignments"
                    value={(contact.teamAssignments || []).join(", ")}
                    disabled={!editing}
                    onChange={(e) =>
                      setContact({ ...contact, teamAssignments: splitCsvTags(e.target.value) })
                    }
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="notes">Conversation / profile notes</Label>
                  <Textarea
                    id="notes"
                    value={contact.conversationNotes || ""}
                    disabled={!editing}
                    onChange={(e) => setContact({ ...contact, conversationNotes: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <div className="text-sm font-semibold text-slate-900">Quick actions</div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {!editing ? (
                      <Button onClick={() => setEditing(true)}>Edit Profile</Button>
                    ) : (
                      <>
                        <Button onClick={save} disabled={saving}>
                          {saving ? "Saving…" : "Save Changes"}
                        </Button>
                        <Button variant="secondary" onClick={() => setEditing(false)}>
                          Cancel
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                  <div className="text-sm font-semibold text-slate-900">Create follow-up task</div>
                  <div className="mt-4 space-y-3">
                    <div>
                      <Label htmlFor="newFollowUpStatus">Status</Label>
                      <Select
                        id="newFollowUpStatus"
                        value={newFollowUp.status}
                        onChange={(e) =>
                          setNewFollowUp({
                            ...newFollowUp,
                            status: e.target.value as typeof newFollowUp.status,
                          })
                        }
                      >
                        <option value="NEW">New</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="newFollowUpInitials">Entry initials</Label>
                      <Input
                        id="newFollowUpInitials"
                        value={newFollowUp.initials}
                        maxLength={3}
                        onChange={(e) => setNewFollowUp({ ...newFollowUp, initials: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="newFollowUpNotes">Notes</Label>
                      <Textarea
                        id="newFollowUpNotes"
                        value={newFollowUp.notes}
                        onChange={(e) => setNewFollowUp({ ...newFollowUp, notes: e.target.value })}
                      />
                    </div>

                    <Button onClick={createFollowUp} disabled={!safeTrim(newFollowUp.notes)}>
                      Add Follow-Up
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Follow-up timeline"
            subtitle="Every interaction here can feed assignments, event teams, and future outreach flows."
          />
          <CardContent>
            {followUps.length ? (
              <div className="space-y-3">
                {followUps.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-slate-900">{item.followUpStatus}</div>
                      <div className="text-xs text-slate-500">
                        {new Date(item.createdAt).toLocaleString()} • {item.entryInitials || "UNK"}
                      </div>
                    </div>
                    <div className="mt-2 text-sm leading-relaxed text-slate-700">
                      {item.followUpNotes || item.notes || "No notes recorded."}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500">No follow-ups logged yet.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
