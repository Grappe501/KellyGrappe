// app/src/App.tsx

import { useEffect, useRef } from "react";
import { Routes, Route } from "react-router-dom";

import { syncPendingFollowUps } from "./shared/utils/syncEngine";

import LandingPage from "./pages/LandingPage";
import EventRequestPage from "./modules/eventRequests/EventRequestPage";
import TeamSignupPage from "./modules/teamSignup/TeamSignupPage";
import ThankYouPage from "./pages/ThankYouPage";

import LiveContactPage from "./modules/liveContact/LiveContactPage";
import LiveContactsListPage from "./modules/liveContact/LiveContactsListPage";
import BusinessCardScanPage from "./modules/businessCardScan/BusinessCardScanPage";

export default function App() {
  const syncInProgressRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function runSync(source: string) {
      if (syncInProgressRef.current) return;

      try {
        syncInProgressRef.current = true;

        window.dispatchEvent(
          new CustomEvent("sync:started", { detail: { source } })
        );

        await syncPendingFollowUps();

        window.dispatchEvent(
          new CustomEvent("sync:completed", { detail: { source } })
        );
      } catch (err) {
        console.error(`Sync failed (${source}):`, err);

        window.dispatchEvent(
          new CustomEvent("sync:error", {
            detail: { source, error: err },
          })
        );
      } finally {
        syncInProgressRef.current = false;
      }
    }

    if (isMounted) {
      runSync("initial");
    }

    const interval = setInterval(() => {
      runSync("interval");
    }, 15000); // retry every 15 seconds

    function handleOnline() {
      runSync("online");
    }

    window.addEventListener("online", handleOnline);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("online", handleOnline);
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

      <Route
        path="/business-card-scan"
        element={<BusinessCardScanPage />}
      />
    </Routes>
  );
}