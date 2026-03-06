import { useNavigate } from "react-router-dom";
import Container from "../shared/components/Container";
import { Card, CardHeader, CardContent } from "../shared/components/Card";
import { Button } from "../shared/components/FormControls";

export default function LandingPage() {
  const nav = useNavigate();

  return (
    <Container>
      <div className="space-y-6">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-700 via-slate-900 to-indigo-900 px-5 py-6 text-white">
            <h1 className="text-3xl font-semibold tracking-tight">
              Campaign Operations Portal
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-indigo-100">
              Intake, contact intelligence, voter targeting, and assignment workflows for a
              statewide field operation.
            </p>
          </div>
          <CardContent className="space-y-6 pt-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Button onClick={() => nav("/contact-import")}>
                Import Contacts
              </Button>
              <Button variant="secondary" onClick={() => nav("/contacts")}>
                Contact Intelligence
              </Button>
              <Button variant="secondary" onClick={() => nav("/voter-import")}>
                Voter File Lab
              </Button>
              <Button variant="secondary" onClick={() => nav("/live-contacts")}>
                Follow-Up Board
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card className="bg-slate-50">
                <CardHeader
                  title="Acquire"
                  subtitle="Pull in signups, voter IDs, petition lists, and supporter spreadsheets fast."
                />
                <CardContent>
                  <p className="text-sm leading-relaxed text-slate-700">
                    Import people even when names are incomplete. Create follow-ups immediately so
                    field teams can close the loop.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-slate-50">
                <CardHeader
                  title="Enrich"
                  subtitle="Build living profiles with tags, notes, roles, districts, and turnout intelligence."
                />
                <CardContent>
                  <p className="text-sm leading-relaxed text-slate-700">
                    Layer campaign notes, local survey data, initiative histories, and future API
                    enrichment into one contact record.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-slate-50">
                <CardHeader
                  title="Deploy"
                  subtitle="Use AI to sort who should volunteer, persuade, lead, or follow up next."
                />
                <CardContent>
                  <p className="text-sm leading-relaxed text-slate-700">
                    This is the command layer for assignments, event teams, precinct captains, and
                    outreach targeting.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm leading-relaxed text-indigo-950">
              <strong>Next phase wired in this overlay:</strong> statewide voter file staging,
              turnout and persuasion scoring, ballot initiative history hooks, precinct demographic
              planning, and government leadership enrichment scaffolding.
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Button variant="ghost" onClick={() => nav("/event-request")}>
                Submit Event Request
              </Button>
              <Button variant="ghost" onClick={() => nav("/live-contact")}>
                Live Contact Entry
              </Button>
              <Button variant="ghost" onClick={() => nav("/team-signup")}>
                Join a People Powered Team
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
