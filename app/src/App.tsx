import { BrowserRouter, Routes, Route } from "react-router-dom";

import LiveContactsPage from "@modules/liveContact/LiveContactsListPage";
import TeamSignupPage from "@modules/teamSignup/TeamSignupPage";
import ThankYouPage from "@modules/common/ThankYouPage";
import NotFoundPage from "@modules/common/NotFoundPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LiveContactsPage />} />
        <Route path="/team-signup" element={<TeamSignupPage />} />
        <Route path="/thank-you" element={<ThankYouPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}