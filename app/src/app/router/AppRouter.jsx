import { BrowserRouter, Routes, Route } from "react-router-dom";

import EventRequestPage from "../../modules/eventRequests/EventRequestPage";
import CommandDashboardPage from "../../modules/admin/CommandDashboardPage";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Dashboard */}
        <Route
          path="/"
          element={<CommandDashboardPage />}
        />

        <Route
          path="/dashboard"
          element={<CommandDashboardPage />}
        />

        {/* Existing page */}
        <Route
          path="/event-request"
          element={<EventRequestPage />}
        />

      </Routes>
    </BrowserRouter>
  );
}