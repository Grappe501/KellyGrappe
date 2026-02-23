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
          title="Invite Kelly to Your Event"
          subtitle="We go where the people are. If people are gathering in your community, Kelly wants to show up, listen, and serve."
        />
        <CardContent>
          <p className="text-sm text-slate-300 leading-relaxed">
            Whether it’s a basketball game, church event, town hall, house meetup, or fundraiser — we would love to hear from you.
          </p>

          <div className="mt-6">
            <Button onClick={() => nav('/event-request')}>
              Submit an Event Request
            </Button>
          </div>

          <div className="mt-6 rounded-xl bg-slate-950/40 p-4 ring-1 ring-white/10">
            <p className="text-xs text-slate-400 leading-relaxed">
              Tip: You can bookmark this page or add it to your home screen for quick access.
            </p>
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}
