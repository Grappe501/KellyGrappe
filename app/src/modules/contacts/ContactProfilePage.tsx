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

function yesNo(value?: boolean) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "—";
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

  const profileStrength = useMemo(() => {
    if (!contact) return 0;
    const checks = [
      contact.fullName,
      contact.email,
      contact.phone,
      contact.city,
      contact.county,
      contact.precinct,
      contact.congressionalDistrict,
      contact.tags?.length,
      contact.rolePotential?.length,
      contact.conversationNotes,
    ];
    const completed = checks.filter(Boolean).length;
    return Math.round((completed / checks.length) * 100);
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
            title={contact.fullName || "Unknown Contact"}
            subtitle="Contact profile, field notes, and voter intelligence"
          />
          <CardContent className="space-y-6">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Profile strength</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">{profileStrength}%</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Turnout score</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {typeof contact.turnoutScore === "number" ? `${Math.round(contact.turnoutScore * 100)}%` : "—"}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Persuasion score</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {typeof contact.persuasionScore === "number" ? `${Math.round(contact.persuasionScore * 100)}%` : "—"}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Ballot initiative links</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">{contact.ballotInitiativeCount ?? 0}</div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" value={contact.fullName || ""} disabled={!editing} onChange={(e) => setContact({ ...contact, fullName: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="organization">Organization</Label>
                    <Input id="organization" value={contact.organization || ""} disabled={!editing} onChange={(e) => setContact({ ...contact, organization: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" value={contact.phone || ""} disabled={!editing} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={contact.email || ""} disabled={!editing} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input id="city" value={contact.city || ""} disabled={!editing} onChange={(e) => setContact({ ...contact, city: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="county">County</Label>
                    <Input id="county" value={contact.county || ""} disabled={!editing} onChange={(e) => setContact({ ...contact, county: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="precinct">Precinct</Label>
                    <Input id="precinct" value={contact.precinct || ""} disabled={!editing} onChange={(e) => setContact({ ...contact, precinct: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="bestMethod">Best contact method</Label>
                    <Select id="bestMethod" value={contact.bestContactMethod || "PHONE"} disabled={!editing} onChange={(e) => setContact({ ...contact, bestContactMethod: e.target.value as Contact["bestContactMethod"] })}>
                      <option value="PHONE">Phone</option>
                      <option value="TEXT">Text</option>
                      <option value="EMAIL">Email</option>
                      <option value="IN_PERSON">In person</option>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="support">Support level</Label>
                    <Select id="support" value={contact.supportLevel || "UNSURE"} disabled={!editing} onChange={(e) => setContact({ ...contact, supportLevel: e.target.value as Contact["supportLevel"] })}>
                      <option value="STRONG_SUPPORT">Strong Support</option>
                      <option value="LEAN_SUPPORT">Lean Support</option>
                      <option value="UNSURE">Unsure</option>
                      <option value="LEAN_OPPOSE">Lean Oppose</option>
                      <option value="STRONG_OPPOSE">Strong Oppose</option>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="voterFileId">Voter file ID</Label>
                    <Input id="voterFileId" value={contact.voterFileId || ""} disabled={!editing} onChange={(e) => setContact({ ...contact, voterFileId: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="tags">Tags / hashtags</Label>
                    <Input id="tags" value={(contact.tags || []).join(", ")} disabled={!editing} onChange={(e) => setContact({ ...contact, tags: splitCsvTags(e.target.value) })} />
                    <HelpText>Use tags for skills, roles, coalitions, churches, unions, and precinct work.</HelpText>
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="rolePotential">Role potential / skills</Label>
                    <Input id="rolePotential" value={(contact.rolePotential || []).join(", ")} disabled={!editing} onChange={(e) => setContact({ ...contact, rolePotential: splitCsvTags(e.target.value) })} />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="teamAssignments">Team assignments</Label>
                    <Input id="teamAssignments" value={(contact.teamAssignments || []).join(", ")} disabled={!editing} onChange={(e) => setContact({ ...contact, teamAssignments: splitCsvTags(e.target.value) })} />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="notes">Conversation / profile notes</Label>
                    <Textarea id="notes" value={contact.conversationNotes || ""} disabled={!editing} onChange={(e) => setContact({ ...contact, conversationNotes: e.target.value })} />
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  {!editing ? (
                    <Button onClick={() => setEditing(true)}>Edit profile</Button>
                  ) : (
                    <>
                      <Button variant="secondary" onClick={() => setEditing(false)}>
                        Cancel
                      </Button>
                      <Button onClick={save} disabled={saving}>
                        {saving ? "Saving…" : "Save profile"}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <h2 className="text-lg font-semibold text-slate-900">Voter intelligence</h2>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">Congressional district</div>
                      <div className="mt-2 font-medium text-slate-900">{contact.congressionalDistrict || "—"}</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">State House district</div>
                      <div className="mt-2 font-medium text-slate-900">{contact.stateHouseDistrict || "—"}</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">State Senate district</div>
                      <div className="mt-2 font-medium text-slate-900">{contact.stateSenateDistrict || "—"}</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">Organizer score</div>
                      <div className="mt-2 font-medium text-slate-900">
                        {typeof contact.organizerScore === "number" ? `${Math.round(contact.organizerScore * 100)}%` : "—"}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-slate-700">
                    <p>Voted 2018: {yesNo(contact.votingHistory2018)}</p>
                    <p>Voted 2020: {yesNo(contact.votingHistory2020)}</p>
                    <p>Voted 2022: {yesNo(contact.votingHistory2022)}</p>
                  </div>
                  <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-950">
                    <strong>Leader signals:</strong>{" "}
                    {(contact.governmentLeaderRoles ?? []).join(", ") || "No government leadership enrichment yet."}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <h2 className="text-lg font-semibold text-slate-900">Create follow-up</h2>
                  <div className="mt-4 space-y-3">
                    <div>
                      <Label>Status</Label>
                      <Select value={newFollowUp.status} onChange={(e) => setNewFollowUp({ ...newFollowUp, status: e.target.value as any })}>
                        <option value="NEW">NEW</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="COMPLETED">COMPLETED</option>
                      </Select>
                    </div>
                    <div>
                      <Label>Initials</Label>
                      <Input value={newFollowUp.initials} onChange={(e) => setNewFollowUp({ ...newFollowUp, initials: e.target.value.toUpperCase() })} />
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Textarea value={newFollowUp.notes} onChange={(e) => setNewFollowUp({ ...newFollowUp, notes: e.target.value })} />
                    </div>
                    <Button onClick={createFollowUp}>Create follow-up</Button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <h2 className="text-lg font-semibold text-slate-900">Follow-up history</h2>
                  <div className="mt-4 space-y-3">
                    {followUps.length ? (
                      followUps.map((followUp) => (
                        <div key={followUp.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-slate-900">{followUp.followUpStatus}</span>
                            <span className="text-xs text-slate-500">{new Date(followUp.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap text-slate-700">{followUp.followUpNotes || followUp.notes || "—"}</p>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-slate-500">No follow-up history yet.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
