import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import EventRequestPage from './modules/eventRequests/EventRequestPage';
import ThankYouPage from './pages/ThankYouPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/event-request" element={<EventRequestPage />} />
      <Route path="/thank-you" element={<ThankYouPage />} />
    </Routes>
  );
}
