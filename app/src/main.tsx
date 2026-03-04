import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";

import "./styles.css";
import "./styles/theme.css";

/**
 * This is the correct place to add top-level app providers later:
 * - ErrorBoundary
 * - Toast/Notifications provider
 * - Auth/session provider
 * - Feature flags / telemetry
 * - Query client (React Query), etc.
 *
 * For now, we keep behavior identical to your current setup.
 */

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element #root not found. Check index.html.");
}

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);