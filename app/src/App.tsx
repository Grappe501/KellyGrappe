import React from "react";
import { Routes, Route } from "react-router-dom";

import WarRoomDashboardPage from "./modules/dashboard/WarRoomDashboardPage";
import ElectionInformationPage from "./modules/election/ElectionInformationPage";
import PollingOperationsPage from "./modules/election/PollingOperationsPage";

/**
 * IMPORTANT
 * The BrowserRouter is already defined in main.tsx.
 * This file must ONLY define Routes.
 */

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<WarRoomDashboardPage />} />
      <Route path="/war-room" element={<WarRoomDashboardPage />} />
      <Route path="/voter-center" element={<ElectionInformationPage />} />
      <Route path="/elections" element={<ElectionInformationPage />} />
      <Route path="/polling-operations" element={<PollingOperationsPage />} />
    </Routes>
  );
}
