import { useNavigate } from "react-router-dom";
import Container from "../shared/components/Container";
import { Card, CardHeader, CardContent } from "../shared/components/Card";
import { Button } from "../shared/components/FormControls";
import { ROUTES } from "../shared/routes";

const actions = [
  {
    title: "Import Contacts",
    body: "Pull volunteer and supporter lists into the CRM, auto-create follow-up tasks, and get outreach moving fast.",
    cta: "Open Import Center",
    route: ROUTES.CONTACT_IMPORT,
    primary: true,
  },
  {
    title: "Contacts Command Center",
    body: "Search people by hashtag, location, role potential, and AI-ranked mission fit. Open profiles and enrich them over time.",
    cta: "Open Contacts",
    route: ROUTES.CONTACTS,
  },
  {
    title: "Live Contact Entry",
    body: "Capture field conversations, event encounters, and walk-list conversations from the ground in real time.",
    cta: "Open Field Intake",
    route: ROUTES.LIVE_CONTACT,
  },
  {
    title: "Live Follow-Up Board",
    body: "See who still needs outreach, what is assigned, and where the campaign needs immediate response.",
    cta: "Open Board",
    route: ROUTES.LIVE_CONTACTS,
  },
  {
    title: "Event Requests",
    body: "Track event asks, scheduling needs, and campaign logistics through the structured intake workflow.",
    cta: "Open Event Requests",
    route: ROUTES.EVENT_REQUEST,
  },
  {
    title: "Team Signup",
    body: "Keep the volunteer front door active for people who want to raise a hand and join the mission.",
    cta: "Open Signup",
    route: ROUTES.TEAM_SIGNUP,
  },
];

export default function LandingPage() {
  const nav = useNavigate();

  return (
    <Container>
      <div className="space-y-6">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-sky-600 px-6 py-8 text-white">
            <div className="max-w-3xl space-y-3">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-100">
                Kelly Grappe Campaign Operations Portal
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Build the people machine first.
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-indigo-50 sm:text-base">
                This portal is now centered on contact acquisition, enrichment, assignment, and
                follow-through so the campaign can start texting, emailing, and organizing from one
                connected system.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button onClick={() => nav(ROUTES.CONTACT_IMPORT)}>Start Importing Contacts</Button>
                <Button variant="secondary" onClick={() => nav(ROUTES.CONTACTS)}>
                  Open Command Center
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {actions.map((item) => (
            <Card key={item.title} className="h-full">
              <CardHeader title={item.title} subtitle={item.body} />
              <CardContent>
                <Button
                  variant={item.primary ? "primary" : "secondary"}
                  onClick={() => nav(item.route)}
                >
                  {item.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader
            title="Built for the next phase"
            subtitle="Contact profiles now become the home base for assignments, field teams, role tags, notes, and AI-assisted contact selection."
          />
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-sm font-semibold text-slate-900">Capture</div>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Import lists, scan cards, and add field contacts without losing people just because
                  their name was unreadable.
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-sm font-semibold text-slate-900">Enrich</div>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Open a profile to add hashtags, geography, skills, notes, assignments, support
                  level, and future campaign intelligence.
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-sm font-semibold text-slate-900">Activate</div>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Use the AI Mission Finder to surface the right people for field events, volunteer
                  roles, and outreach pushes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
