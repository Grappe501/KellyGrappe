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
          title="Thank You!"
          subtitle="Your event request has been received."
        />
        <CardContent>
          <p className="text-sm text-slate-300 leading-relaxed">
            Our team will review the details and reach out if we need additional information.
            We appreciate you helping us show up for Arkansas communities.
          </p>

          <div className="mt-6 space-y-3">
            <Button onClick={() => nav('/')}>Back to Home</Button>
            <Button variant="secondary" onClick={() => nav('/event-request')}>
              Submit Another Event Request
            </Button>
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}
