import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Container from '../../shared/components/Container';
import { Card, CardHeader, CardContent } from '../../shared/components/Card';
import { Button, ErrorText, HelpText, Input, Label } from '../../shared/components/FormControls';

const UNLOCK_KEY = 'LIVE_CONTACT_UNLOCKED';

type Props = {
  mode: 'gate' | 'protect';
  children: React.ReactNode;
};

function getConfiguredPasscode() {
  const v = (import.meta as any)?.env?.VITE_LIVE_CONTACT_PASSCODE;
  return typeof v === 'string' ? v : '';
}

function isUnlocked() {
  try {
    return sessionStorage.getItem(UNLOCK_KEY) === 'true';
  } catch {
    return false;
  }
}

function setUnlocked() {
  try {
    sessionStorage.setItem(UNLOCK_KEY, 'true');
  } catch {
    // ignore
  }
}

export default function LiveContactGate({ mode, children }: Props) {
  const nav = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const unlocked = useMemo(() => isUnlocked(), []);

  // Protect-only mode: redirect if not unlocked
  if (mode === 'protect' && !unlocked) {
    nav('/live-contact', { replace: true });
    return null;
  }

  // Gate mode: show passcode screen if not unlocked
  if (mode === 'gate' && !unlocked) {
    const configured = getConfiguredPasscode();

    return (
      <Container>
        <Card className="bg-white text-slate-900">
          <CardHeader
            title="Live Contact"
            subtitle="Enter the field passcode to add contacts and manage follow-ups."
            className="bg-white"
          />
          <CardContent className="bg-white space-y-6">
            <div>
              <Label htmlFor="passcode">Passcode</Label>
              <Input
                id="passcode"
                name="passcode"
                type="password"
                placeholder="Enter passcode"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (error) setError(null);
                }}
              />
              <HelpText>This page is restricted for field use.</HelpText>
            </div>

            {error ? <ErrorText>{error}</ErrorText> : null}

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                onClick={() => {
                  setError(null);

                  if (!configured) {
                    setError('Passcode is not configured. Add VITE_LIVE_CONTACT_PASSCODE to environment variables.');
                    return;
                  }

                  if (code.trim() !== configured.trim()) {
                    setError('Incorrect passcode.');
                    return;
                  }

                  setUnlocked();
                  nav('/live-contact', { replace: true });
                }}
                className="w-full sm:w-auto"
              >
                Unlock
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={() => nav('/')}
                className="w-full sm:w-auto"
              >
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return <>{children}</>;
}
