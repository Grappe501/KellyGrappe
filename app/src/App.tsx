// app/src/App.tsx

import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';

import { syncPendingFollowUps } from './shared/utils/syncEngine';

import LandingPage from './pages/LandingPage';
import EventRequestPage from './modules/eventRequests/EventRequestPage';
import TeamSignupPage from './modules/teamSignup/TeamSignupPage';
import ThankYouPage from './pages/ThankYouPage';

import LiveContactPage from './modules/liveContact/LiveContactPage';
import LiveContactsListPage from './modules/liveContact/LiveContactsListPage';
import BusinessCardScanPage from './modules/businessCardScan/BusinessCardScanPage';

export default function App() {
  useEffect(() => {
    let isMounted = true;

    async function initialSync() {
      try {
        await syncPendingFollowUps();
      } catch (err) {
        console.error('Initial sync failed:', err);
      }
    }

    if (isMounted) {
      initialSync();
    }

    const interval = setInterval(() => {
      syncPendingFollowUps().catch((err) =>
        console.error('Interval sync failed:', err)
      );
    }, 15000); // retry every 15 seconds

    function handleOnline() {
      syncPendingFollowUps().catch((err) =>
        console.error('Online sync failed:', err)
      );
    }

    window.addEventListener('online', handleOnline);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/event-request" element={<EventRequestPage />} />
      <Route path="/team-signup" element={<TeamSignupPage />} />
      <Route path="/thank-you" element={<ThankYouPage />} />

      <Route path="/live-contact" element={<LiveContactPage />} />
      <Route path="/live-contacts" element={<LiveContactsListPage />} />

      <Route path="/business-card-scan" element={<BusinessCardScanPage />} />
    </Routes>
  );
}