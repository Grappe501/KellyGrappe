// app/src/App.tsx

import React, { Suspense, useCallback, useEffect, useMemo, useRef } from "react";
import { Routes, Route } from "react-router-dom";

import { syncPendingFollowUps } from "./shared/utils/syncEngine";

/**
 * Central route registry — prevents “magic strings” across the app.
 * Add all new routes here first.
 */
export const ROUTES = {
  ROOT: "/",
  EVENT_REQUEST: "/event-request",
  TEAM_SIGNUP: "/team-signup",
  THANK_YOU: "/thank-you",

  LIVE_CONTACT: "/live-contact",
  LIVE_CONTACTS: "/live-contacts",

  CONTACTS: "/contacts",
  CONTACT_PROFILE: "/contacts/:id",

  BUSINESS_CARD_SCAN: "/business-card-scan",
} as const;

const SYNC_INTERVAL_MS = 15_000;

/**
 * Lazy load pages/modules to keep initial load fast as the system grows.
 */
const LandingPage = React.lazy(() => import("./pages/LandingPage"));
const EventRequestPage = React.lazy(
  () => import("./modules/eventRequests/EventRequestPage")
);
const TeamSignupPage = React.lazy(
  () => import("./modules/teamSignup/TeamSignupPage")
);
const ThankYouPage = React.lazy(() => import("./pages/ThankYouPage"));

const LiveContactPage = React.lazy(
  () => import("./modules/liveContact/LiveContactPage")
);
const LiveContactsListPage = React.lazy(
  () => import("./modules/liveContact/LiveContactsListPage")
);

const ContactsDirectoryPage = React.lazy(
  () => import("./modules/contacts/ContactsDirectoryPage")
);
const ContactProfilePage = React.lazy(
  () => import("./modules/contacts/ContactProfilePage")
);

const BusinessCardScanPage = React.lazy(
  () => import("./modules/businessCardScan/BusinessCardScanPage")
);

const NotFoundPage = React.lazy(() => import("./pages/NotFoundPage"));

// DEV-only overlay (global, safe, production-off)
const DevDebugOverlay = React.lazy(
  () => import("./shared/components/DevDebugOverlay")
);

/**
 * Small fallback loader
 */
function PageLoader() {
  return <div className="p-6 text-sm text-slate-600">Loading…</div>;
}

type AppRoute = {
  path: string;
  element: React.ReactNode;
};

export default function App() {
  const syncInProgressRef = useRef(false);

  const runSync = useCallback(async (source: string) => {
    if (syncInProgressRef.current) return;

    if (typeof navigator !== "undefined" && navigator.onLine === false) return;

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
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (isMounted) {
      runSync("initial");
    }

    const interval = window.setInterval(() => {
      runSync("interval");
    }, SYNC_INTERVAL_MS);

    function handleOnline() {
      runSync("online");
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        runSync("visible");
      }
    }

    function handleFocus() {
      runSync("focus");
    }

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      isMounted = false;
      window.clearInterval(interval);

      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [runSync]);

  const routes: AppRoute[] = useMemo(
    () => [
      { path: ROUTES.ROOT, element: <LandingPage /> },
      { path: ROUTES.EVENT_REQUEST, element: <EventRequestPage /> },
      { path: ROUTES.TEAM_SIGNUP, element: <TeamSignupPage /> },
      { path: ROUTES.THANK_YOU, element: <ThankYouPage /> },

      { path: ROUTES.LIVE_CONTACT, element: <LiveContactPage /> },
      { path: ROUTES.LIVE_CONTACTS, element: <LiveContactsListPage /> },

      { path: ROUTES.CONTACTS, element: <ContactsDirectoryPage /> },
      { path: ROUTES.CONTACT_PROFILE, element: <ContactProfilePage /> },

      { path: ROUTES.BUSINESS_CARD_SCAN, element: <BusinessCardScanPage /> },

      // True 404 route
      { path: "*", element: <NotFoundPage /> },
    ],
    []
  );

  return (
    <Suspense fallback={<PageLoader />}>
      {import.meta.env.DEV ? <DevDebugOverlay /> : null}

      <Routes>
        {routes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
      </Routes>
    </Suspense>
  );
}