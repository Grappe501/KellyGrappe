import { useNavigate } from 'react-router-dom';
import Container from '../shared/components/Container';
import { Card, CardHeader, CardContent } from '../shared/components/Card';
import { Button } from '../shared/components/FormControls';

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

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button onClick={() => nav('/event-request')}>Submit an Event Request</Button>
            <Button variant="secondary" onClick={() => nav('/team-signup')}>
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
