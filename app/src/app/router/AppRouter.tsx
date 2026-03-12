import React, { Suspense } from "react"
import { Routes, Route } from "react-router-dom"

import LandingPage from "../../pages/LandingPage"
import ThankYouPage from "../../pages/ThankYouPage"
import NotFoundPage from "../../pages/NotFoundPage"

import { getPlatformRoutes } from "./platformRoutes"

function RouteLoading() {
  return <div style={{ padding: 24 }}>Loading…</div>
}

export default function AppRouter() {
  const routes = getPlatformRoutes()

  return (
    <Suspense fallback={<RouteLoading />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        {routes.map((route) => {
          const Component = React.lazy(route.componentLoader)

          return (
            <Route
              key={route.path}
              path={route.path}
              element={<Component />}
            />
          )
        })}

        <Route path="/thank-you" element={<ThankYouPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
