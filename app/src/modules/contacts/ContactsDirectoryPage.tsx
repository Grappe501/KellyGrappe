import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Container from "../../shared/components/Container";
import { Card, CardHeader, CardContent } from "../../shared/components/Card";
import { Input, Label } from "../../shared/components/FormControls";

import {
  listContactsDirectoryRows,
  ContactDirectoryRow,
} from "../../shared/utils/contactsDb";

/**
 * Priority scoring for campaign follow-up workflow.
 * Lower number = higher priority.
 */
function followUpPriority(status?: string): number {
  switch (status) {
    case "CRITICAL":
      return 1;
    case "NEW":
      return 2;
    case "IN_PROGRESS":
      return 3;
    case "COMPLETED":
      return 4;
    case "ARCHIVED":
      return 5;
    default:
      return 6;
  }
}

/**
 * Visual indicator color for follow-up status
 */
function rowStyle(status?: string): string {
  switch (status) {
    case "CRITICAL":
      return "bg-red-50";
    case "NEW":
      return "bg-yellow-50";
    case "IN_PROGRESS":
      return "bg-blue-50";
    case "COMPLETED":
      return "bg-green-50";
    case "ARCHIVED":
      return "bg-slate-100 text-slate-400";
    default:
      return "";
  }
}

export default function ContactsDirectoryPage() {
  const navigate = useNavigate();

  const [contacts, setContacts] = useState<ContactDirectoryRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContacts();
  }, []);

  async function loadContacts() {
    try {
      const rows = await listContactsDirectoryRows();
      setContacts(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error("Failed to load contacts directory", err);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Search filtering
   */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    let rows = contacts;

    if (q) {
      rows = rows.filter((c) => {
        const tagText = (c.tags ?? []).join(" ").toLowerCase();

        return (
          c.fullName?.toLowerCase().includes(q) ||
          c.phone?.includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.city?.toLowerCase().includes(q) ||
          c.county?.toLowerCase().includes(q) ||
          tagText.includes(q)
        );
      });
    }

    /**
     * Sort by campaign priority
     */
    rows = [...rows].sort((a, b) => {
      const p =
        followUpPriority(a.followUpStatus) -
        followUpPriority(b.followUpStatus);

      if (p !== 0) return p;

      if (a.followUpTargetAt && b.followUpTargetAt) {
        return a.followUpTargetAt.localeCompare(b.followUpTargetAt);
      }

      const an = (a.fullName ?? "").toLowerCase();
      const bn = (b.fullName ?? "").toLowerCase();

      return an.localeCompare(bn);
    });

    return rows;
  }, [contacts, search]);

  return (
    <Container>
      <Card>
        <CardHeader
          title="Contacts Directory"
          subtitle="Campaign contact intelligence system"
        />

        <CardContent className="space-y-6">

          {/* SEARCH */}
          <div>
            <Label htmlFor="search">Search Contacts</Label>

            <Input
              id="search"
              placeholder="Name, phone, email, city, county, tags…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* LOADING */}
          {loading && (
            <div className="text-sm text-slate-500">
              Loading contacts…
            </div>
          )}

          {/* DIRECTORY TABLE */}
          {!loading && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border">

                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Location</th>
                    <th className="p-2 text-left">Tags</th>
                    <th className="p-2 text-left">Follow-Up</th>
                    <th className="p-2 text-left">Target</th>
                  </tr>
                </thead>

                <tbody>

                  {filtered.map((c) => {
                    const location =
                      [c.city, c.county].filter(Boolean).join(" ");

                    const tags =
                      (c.tags ?? []).slice(0, 3).join(", ");

                    const followStatus =
                      c.followUpStatus ?? "NONE";

                    const followTarget =
                      c.followUpTargetAt
                        ? new Date(
                            c.followUpTargetAt
                          ).toLocaleDateString()
                        : "";

                    return (
                      <tr
                        key={c.id}
                        className={`border-t cursor-pointer hover:bg-slate-50 ${rowStyle(
                          c.followUpStatus
                        )}`}
                        onClick={() =>
                          navigate(`/contacts/${c.id}`)
                        }
                      >

                        <td className="p-2 font-medium">
                          {c.fullName ?? "Unnamed Contact"}
                        </td>

                        <td className="p-2">
                          {location}
                        </td>

                        <td className="p-2">
                          {tags}
                        </td>

                        <td className="p-2">
                          {followStatus}
                        </td>

                        <td className="p-2">
                          {followTarget}
                        </td>

                      </tr>
                    );
                  })}

                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-6 text-center text-slate-500"
                      >
                        No contacts found.
                      </td>
                    </tr>
                  )}

                </tbody>
              </table>
            </div>
          )}

        </CardContent>
      </Card>
    </Container>
  );
}