import React, { useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import Container from "../shared/components/Container";
import { Card, CardHeader, CardContent } from "../shared/components/Card";
import { Button } from "../shared/components/FormControls";
import { ROUTES } from "../shared/routes";

type Hint = { title: string; fix: string };

export default function NotFoundPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const attempted = location.pathname;

  const hints = useMemo<Hint[]>(() => {
    const out: Hint[] = [];

    // Contacts-specific hints
    if (attempted.startsWith("/contacts")) {
      const parts = attempted.split("/").filter(Boolean); // e.g. ["contacts","123","edit"]

      if (parts.length === 1) {
        out.push({
          title:
            "This looks like the contacts area, but the URL did not match a known page.",
          fix:
            "Try /contacts for the directory, or open a contact from the directory instead of typing the URL.",
        });
      } else if (parts.length >= 3) {
        out.push({
          title: "This contact link has extra path segments.",
          fix:
            "Use /contacts/{id} only. If you copied a link like /contacts/{id}/edit, that route does not exist yet.",
        });
      } else if (parts.length === 2 && !parts[1]) {
        out.push({
          title: "Contact ID is missing.",
          fix:
            "Open the contact from /contacts instead of using a partial link.",
        });
      }
    }

    // Common URL issues
    if (attempted.includes("//")) {
      out.push({
        title: "The URL contains a double slash.",
        fix: "Remove the extra '/' and try again.",
      });
    }

    if (attempted.length > 1 && attempted.endsWith("/")) {
      out.push({
        title: "The URL ends with a trailing slash.",
        fix: "Remove the final '/' and try again.",
      });
    }

    // Generic guidance
    out.push({
      title: "No route matched this URL.",
      fix:
        "If you typed the link manually, check for typos. If you clicked a saved link, it may be outdated after an update.",
    });

    return out;
  }, [attempted]);

  function copyAttemptedUrl() {
    try {
      const full = `${window.location.origin}${attempted}`;
      void navigator.clipboard?.writeText(full);
    } catch {
      // best effort
    }
  }

  return (
    <Container>
      <Card>
        <CardHeader
          title="404 — Page Not Found"
          subtitle="This route does not exist."
        />

        <CardContent className="space-y-4 text-sm text-slate-600">
          <div className="bg-slate-100 rounded-md p-3 text-xs text-slate-700">
            Attempted path:
            <div className="font-mono break-all mt-1">{attempted}</div>
          </div>

          <div className="space-y-3">
            {hints.map((h, idx) => (
              <div key={idx} className="rounded-md border border-slate-200 p-3">
                <div className="font-semibold text-slate-800">{h.title}</div>
                <div className="mt-1">{h.fix}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={() => navigate(-1)}>Go Back</Button>

            <Link to={ROUTES.ROOT}>
              <Button variant="secondary">Return Home</Button>
            </Link>

            <Button variant="secondary" onClick={copyAttemptedUrl}>
              Copy URL
            </Button>
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}