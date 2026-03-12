import React from "react";

/*
 Auto route registry
 Pages register themselves here
*/

export type RouteDefinition = {
  path: string;
  component: React.LazyExoticComponent<React.ComponentType<any>>;
};

export const autoRoutes: RouteDefinition[] = [
  {
    path: "/live",
    component: React.lazy(() => import("../../modules/liveContact/LiveContactsListPage")),
  },
  {
    path: "/live/new",
    component: React.lazy(() => import("../../modules/liveContact/LiveContactPage")),
  },
  {
    path: "/contacts",
    component: React.lazy(() => import("../../modules/contacts/ContactsDirectoryPage")),
  },
  {
    path: "/contacts/:id",
    component: React.lazy(() => import("../../modules/contacts/ContactProfilePage")),
  },
  {
    path: "/team-signup",
    component: React.lazy(() => import("../../modules/teamSignup/TeamSignupPage")),
  },
  {
    path: "/dashboard",
    component: React.lazy(() => import("../../modules/dashboard/WarRoomDashboardPage")),
  },
];