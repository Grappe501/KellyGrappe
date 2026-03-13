import React from "react";
import { Routes, Route } from "react-router-dom";

import WarRoomDashboardPage from "./modules/dashboard/WarRoomDashboardPage";

/**
 * IMPORTANT
 * The BrowserRouter is already defined in main.tsx.
 * This file must ONLY define Routes.
 */

export default function App() {
  return (
    <Routes>

      {/* Default landing */}
      <Route path="/" element={<WarRoomDashboardPage />} />

      {/* War Room */}
      <Route path="/war-room" element={<WarRoomDashboardPage />} />

    </Routes>
  );
}
