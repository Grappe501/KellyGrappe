import { BrowserRouter, Routes, Route } from 'react-router-dom';
import EventRequestPage from '../../modules/eventRequests/EventRequestPage';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/event-request' element={<EventRequestPage />} />
      </Routes>
    </BrowserRouter>
  );
}
