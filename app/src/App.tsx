import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import EventRequestPage from './modules/eventRequests/EventRequestPage';
import ThankYouPage from './pages/ThankYouPage';
import LiveContactPage from './modules/liveContact/LiveContactPage';
import LiveContactsListPage from './modules/liveContact/LiveContactsListPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/event-request" element={<EventRequestPage />} />
      <Route path="/thank-you" element={<ThankYouPage />} />

      {/* Live Contact – No Gate */}
      <Route path="/live-contact" element={<LiveContactPage />} />
      <Route path="/live-contacts" element={<LiveContactsListPage />} />
    </Routes>
  );
}