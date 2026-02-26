import React from 'react';
import Container from '../../shared/components/Container';
import { Card, CardHeader, CardContent } from '../../shared/components/Card';

export default function EventApprovalDashboard() {
  return (
    <Container>
      <Card className="bg-white text-slate-900">
        <CardHeader
          title="Event Approvals"
          subtitle="Phase 2 wires this to the calendar + holds. Phase 1 delivers the wizard and clean data pipeline."
        />
        <CardContent>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            This dashboard is scaffolded in Phase 1 so routing and UI structure are ready.
            In Phase 2 we will connect it to Supabase + Google Calendar hold/confirm.
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}
