// app/src/App.tsx

import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { Routes, Route } from "react-router-dom";

import { syncPendingFollowUps } from "./shared/utils/syncEngine";

/* -------------------------------------------------------------------------- */
/* ROUTE REGISTRY                                                             */
/* -------------------------------------------------------------------------- */
/*
  All application routes must be declared here.

  Benefits:
  - Prevents magic strings
  - Enables typed navigation helpers
  - Enables future permission guards
  - Central place to view system surface area
*/

export const ROUTES = {
  ROOT: "/",

  /* Intake */

  EVENT_REQUEST: "/event-request",
  CONTACT_IMPORT: "/contact-import",
  LIVE_CONTACT: "/live-contact",

  /* Operations */

  LIVE_CONTACTS: "/live-contacts",

  /* CRM */

  CONTACTS: "/contacts",
  CONTACT_PROFILE: "/contacts/:id",

  /* Utilities */

  BUSINESS_CARD_SCAN: "/business-card-scan",

  /* System */

  THANK_YOU: "/thank-you",

  /* Campaign Intelligence */

  DASHBOARD: "/dashboard",
  ORGANIZER_TREE: "/organizer-tree",

} as const;

export type AppRouteKey = keyof typeof ROUTES;

/* -------------------------------------------------------------------------- */
/* SYNC CONFIG                                                                */
/* -------------------------------------------------------------------------- */

const SYNC_INTERVAL_MS = 15_000;

/*
  This will evolve into a multi-module sync engine.
  For now only followups are synced.
*/

/* -------------------------------------------------------------------------- */
/* LAZY MODULE LOADERS                                                        */
/* -------------------------------------------------------------------------- */

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

/* Campaign Intelligence */

const WarRoomDashboardPage = React.lazy(
  () => import("./modules/dashboard/WarRoomDashboardPage")
);

const OrganizerTreePage = React.lazy(
  () => import("./modules/organizerTree/OrganizerTreePage")
);

/* System */

const NotFoundPage = React.lazy(() => import("./pages/NotFoundPage"));

/* DEV TOOLING */

const DevDebugOverlay = React.lazy(
  () => import("./shared/components/DevDebugOverlay")
);

/* -------------------------------------------------------------------------- */
/* PAGE LOADER                                                                */
/* -------------------------------------------------------------------------- */

function PageLoader() {
  return (
    <div className="p-6 text-sm text-slate-600">
      Loading…
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* ROUTE TYPE                                                                 */
/* -------------------------------------------------------------------------- */

type AppRoute = {
  path: string;
  element: React.ReactNode;
};

/* -------------------------------------------------------------------------- */
/* APP                                                                        */
/* -------------------------------------------------------------------------- */

export default function App() {

  const syncInProgressRef = useRef(false);

  /* ---------------------------------------------------------------------- */
  /* SYNC ENGINE                                                             */
  /* ---------------------------------------------------------------------- */

  const runSync = useCallback(async (source: string) => {

    if (syncInProgressRef.current) return;

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return;
    }

    try {

      syncInProgressRef.current = true;

      window.dispatchEvent(
        new CustomEvent("sync:started", { detail: { source } })
      );

      /*
        Future expansion:
        syncContacts()
        syncMedia()
        syncVoterMatches()
        syncRelationships()
      */

      await syncPendingFollowUps();

      window.dispatchEvent(
        new CustomEvent("sync:completed", { detail: { source } })
      );

    } catch (err) {

      console.error(`Sync failed (${source})`, err);

      window.dispatchEvent(
        new CustomEvent("sync:error", {
          detail: { source, error: err },
        })
      );

    } finally {

      syncInProgressRef.current = false;

    }

  }, []);

  /* ---------------------------------------------------------------------- */
  /* SYNC TRIGGERS                                                           */
  /* ---------------------------------------------------------------------- */

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

  /* ---------------------------------------------------------------------- */
  /* ROUTES                                                                  */
  /* ---------------------------------------------------------------------- */

  const routes: AppRoute[] = useMemo(
    () => [

      /* Landing */

      { path: ROUTES.ROOT, element: <LandingPage /> },

      /* Intake */

      { path: ROUTES.EVENT_REQUEST, element: <EventRequestPage /> },

      { path: ROUTES.CONTACT_IMPORT, element: <ContactImportPage /> },

      { path: ROUTES.LIVE_CONTACT, element: <LiveContactPage /> },

      { path: ROUTES.THANK_YOU, element: <ThankYouPage /> },

      /* Operations */

      { path: ROUTES.LIVE_CONTACTS, element: <LiveContactsListPage /> },

      /* CRM */

      { path: ROUTES.CONTACTS, element: <ContactsDirectoryPage /> },

      { path: ROUTES.CONTACT_PROFILE, element: <ContactProfilePage /> },

      /* Utilities */

      { path: ROUTES.BUSINESS_CARD_SCAN, element: <BusinessCardScanPage /> },

      /* Campaign Intelligence */

      { path: ROUTES.DASHBOARD, element: <WarRoomDashboardPage /> },

      { path: ROUTES.ORGANIZER_TREE, element: <OrganizerTreePage /> },

      /* 404 */

      { path: "*", element: <NotFoundPage /> },

    ],
    []
  );

  /* ---------------------------------------------------------------------- */
  /* RENDER                                                                  */
  /* ---------------------------------------------------------------------- */

  return (

    <Suspense fallback={<PageLoader />}>

      {import.meta.env.DEV ? <DevDebugOverlay /> : null}

      <Routes>

        {routes.map((r) => (
          <Route
            key={r.path}
            path={r.path}
            element={r.element}
          />
        ))}

      </Routes>

    </Suspense>

  );

}
