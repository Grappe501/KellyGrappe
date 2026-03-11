import { Routes, Route } from "react-router-dom";

import LandingPage from "../../pages/LandingPage";
import ThankYouPage from "../../pages/ThankYouPage";
import NotFoundPage from "../../pages/NotFoundPage";

import LiveContactsListPage from "../../modules/liveContact/LiveContactsListPage";
import LiveContactPage from "../../modules/liveContact/LiveContactPage";

import TeamSignupPage from "../../modules/teamSignup/TeamSignupPage";

import ContactsDirectoryPage from "../../modules/contacts/ContactsDirectoryPage";
import ContactProfilePage from "../../modules/contacts/ContactProfilePage";

import WarRoomDashboardPage from "../../modules/dashboard/WarRoomDashboardPage";

export default function AppRouter() {
  return (
    <Routes>

      <Route path="/" element={<LandingPage />} />

      <Route path="/dashboard" element={<WarRoomDashboardPage />} />

      <Route path="/live" element={<LiveContactsListPage />} />
      <Route path="/live/new" element={<LiveContactPage />} />

      <Route path="/contacts" element={<ContactsDirectoryPage />} />
      <Route path="/contacts/:id" element={<ContactProfilePage />} />

      <Route path="/team-signup" element={<TeamSignupPage />} />

      <Route path="/thank-you" element={<ThankYouPage />} />

      <Route path="*" element={<NotFoundPage />} />

    </Routes>
  );
}