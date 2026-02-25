import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import EventRequestPage from './modules/eventRequests/EventRequestPage';
import TeamSignupPage from './modules/teamSignup/TeamSignupPage';
import ThankYouPage from './pages/ThankYouPage';
import LiveContactPage from './modules/liveContact/LiveContactPage';
import LiveContactsListPage from './modules/liveContact/LiveContactsListPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/event-request" element={<EventRequestPage />} />
      <Route path="/team-signup" element={<TeamSignupPage />} />
      <Route path="/thank-you" element={<ThankYouPage />} />

      <Route path="/live-contact" element={<LiveContactPage />} />
      <Route path="/live-contacts" element={<LiveContactsListPage />} />
    </Routes>
  );
}