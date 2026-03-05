// app/src/App.tsx

import React, { Suspense, useCallback, useEffect, useMemo, useRef } from "react";
import { Routes, Route } from "react-router-dom";

import { syncPendingFollowUps } from "./shared/utils/syncEngine";

/**
 * Central route registry — prevents “magic strings” across the app.
 */
export const ROUTES = {
  ROOT: "/",

  EVENT_REQUEST: "/event-request",

  CONTACT_IMPORT: "/contact-import",

  THANK_YOU: "/thank-you",

  LIVE_CONTACT: "/live-contact",
  LIVE_CONTACTS: "/live-contacts",

  CONTACTS: "/contacts",
  CONTACT_PROFILE: "/contacts/:id",

  BUSINESS_CARD_SCAN: "/business-card-scan",
} as const;

const SYNC_INTERVAL_MS = 15_000;

/**
 * Lazy loaded pages
 */

const LandingPage = React.lazy(() => import("./pages/LandingPage"));

const EventRequestPage = React.lazy(
  () => import("./modules/eventRequests/EventRequestPage")
);

const ContactImportPage = React.lazy(
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
    runSync("initial");

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

      { path: ROUTES.CONTACT_IMPORT, element: <ContactImportPage /> },

      { path: ROUTES.THANK_YOU, element: <ThankYouPage /> },

      { path: ROUTES.LIVE_CONTACT, element: <LiveContactPage /> },
      { path: ROUTES.LIVE_CONTACTS, element: <LiveContactsListPage /> },

      { path: ROUTES.CONTACTS, element: <ContactsDirectoryPage /> },
      { path: ROUTES.CONTACT_PROFILE, element: <ContactProfilePage /> },

      { path: ROUTES.BUSINESS_CARD_SCAN, element: <BusinessCardScanPage /> },

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