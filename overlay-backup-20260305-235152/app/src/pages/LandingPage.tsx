import { useNavigate } from 'react-router-dom';
import Container from '../shared/components/Container';
import { Card, CardHeader, CardContent } from '../shared/components/Card';
import { Button } from '../shared/components/FormControls';
import { ROUTES } from '../shared/routes';

export default function LandingPage() {
  const nav = useNavigate();

  return (
    <Container>
      <Card>
        <CardHeader
          title="Campaign Operations Portal"
          subtitle="Structured, transparent intake forms for the Kelly Grappe campaign."
        />
        <CardContent>
          <p className="text-sm text-slate-700 leading-relaxed">
            Choose the intake you need. Submissions create a tracking record and notify the team.
          </p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button onClick={() => nav(ROUTES.EVENT_REQUEST)}>
              Submit an Event Request
            </Button>

            <Button
              variant="secondary"
              onClick={() => nav(ROUTES.CONTACT_IMPORT)}
            >
              Import Contacts
            </Button>

            <Button
              variant="secondary"
              onClick={() => nav(ROUTES.LIVE_CONTACT)}
            >
              Live Contact (Field Entry)
            </Button>
          </div>

          <div className="mt-3">
            <Button
              variant="ghost"
              onClick={() => nav(ROUTES.TEAM_SIGNUP)}
            >
              Join a People Powered Team
            </Button>
          </div>

          <div className="mt-6 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <p className="text-xs text-slate-600 leading-relaxed">
              Tip: You can bookmark this page or add it to your home screen for quick access.
            </p>
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}
