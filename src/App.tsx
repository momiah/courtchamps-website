import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import Header from "./components/Header";
import RequireRole from "./components/auth/RequireRole";

import HomePage from "./pages/home/HomePage";
import Players from "./pages/players/Players";
import PlayerProfile from "./pages/players/PlayerProfile";
import DeleteAccount from "./pages/accounts/DeleteAccount";
import JoinPage from "./pages/join/JoinPage";
import VideoPage from "pages/gameVideos/VideoPage";
import Login from "./pages/Login";
import Courts from "./pages/admin/Courts";
import LadderList from "./pages/admin/LadderList";
import LadderEdit from "./pages/admin/LadderEdit";
import SupportTickets from "./pages/admin/SupportTickets";
import Feedback from "./pages/admin/Feedback";
import GameDisputes from "./pages/admin/GameDisputes";
import NoShows from "./pages/admin/NoShows";

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppShell />
      </Router>
    </AuthProvider>
  );
}

function AppShell() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  return (
    <>
      {isAdminRoute ? null : <Header />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/players" element={<Players />} />
        <Route path="/players/:userId" element={<PlayerProfile />} />
        <Route path="/accounts/delete-account" element={<DeleteAccount />} />
        {/* e.g. https://courtchamps.com/join/league/abc123 */}
        <Route
          path="/join/:competitionType/:competitionId"
          element={<JoinPage />}
        />
        <Route path="/videos" element={<VideoPage />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/admin"
          element={
            <RequireRole>
              <Navigate to="/admin/ladders" replace />
            </RequireRole>
          }
        />
        <Route
          path="/admin/ladders"
          element={
            <RequireRole>
              <LadderList />
            </RequireRole>
          }
        />
        <Route
          path="/admin/ladders/new"
          element={
            <RequireRole>
              <LadderEdit />
            </RequireRole>
          }
        />
        <Route
          path="/admin/ladders/:ladderId"
          element={
            <RequireRole>
              <LadderEdit />
            </RequireRole>
          }
        />
        <Route
          path="/admin/courts"
          element={
            <RequireRole>
              <Courts />
            </RequireRole>
          }
        />
        <Route
          path="/admin/support"
          element={
            <RequireRole>
              <SupportTickets />
            </RequireRole>
          }
        />
        <Route
          path="/admin/feedback"
          element={
            <RequireRole>
              <Feedback />
            </RequireRole>
          }
        />
        <Route
          path="/admin/disputes"
          element={
            <RequireRole>
              <GameDisputes />
            </RequireRole>
          }
        />
        <Route
          path="/admin/no-shows"
          element={
            <RequireRole>
              <NoShows />
            </RequireRole>
          }
        />
      </Routes>
    </>
  );
}
