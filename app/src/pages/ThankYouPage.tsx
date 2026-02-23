import { useNavigate } from 'react-router-dom';
import Container from '../shared/components/Container';
import { Card, CardHeader, CardContent } from '../shared/components/Card';
import { Button } from '../shared/components/FormControls';

export default function ThankYouPage() {
  const nav = useNavigate();

  return (
    <Container>
      <Card>
        <CardHeader
          title="Submission received"
          subtitle="Thank you. Our team has been notified and will follow up if we need anything else."
        />
        <CardContent>
          <p className="text-sm text-slate-700 leading-relaxed">
            If you submitted an event request or volunteer signup, a confirmation email may take a few minutes to arrive.
          </p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button onClick={() => nav('/')}>Back to Home</Button>
            <Button variant="secondary" onClick={() => nav('/team-signup')}>
              Submit Another Volunteer Signup
            </Button>
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}
