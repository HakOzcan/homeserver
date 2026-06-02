import React, { useEffect, useRef } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import HomePage from "./pages/HomePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import LibraryPage from "./pages/LibraryPage.jsx";
import ContentDetailPage from "./pages/ContentDetailPage.jsx";
import PlayerPage from "./pages/PlayerPage.jsx";
import VerifyPage from "./pages/VerifyPage.jsx";
import AdminPanelPage from "./pages/AdminPanelPage.jsx";
import GamesPage from "./pages/GamesPage.jsx";
import GameStreamPage from "./pages/GameStreamPage.jsx";
import { api } from "./lib/api.jsx";

const REFRESH_INTERVAL = 50 * 60 * 1000;

function useTokenRefresh() {
  const isActive = useRef(false);

  useEffect (() => {
    if (!localStorage.getItem("token")) return;

    const markActive = () => { isActive.current = true; };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, markActive, { passive:true }));

    const intervalId = setInterval(async () => {
      if (!isActive.current) return;
      if (!localStorage.getItem("token")) return;

      isActive.current = false;

      try {
        const res = await api.post("/auth/refresh");
        localStorage.setItem("token", res.data.access_token);
      } catch {
        // refresh failed - 401 interceptor handles the redirect
      }
    }, REFRESH_INTERVAL);

    return () => {
      events.forEach((e) => window.removeEventListener(e, markActive));
      clearInterval(intervalId);
    };
  }, []);
}

function RequireAuth({ children }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  useTokenRefresh();
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify" element={<VerifyPage />} />

      {/* Protected */}
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/library"
        element={
          <RequireAuth>
            <LibraryPage />
          </RequireAuth>
        }
      />
      <Route
        path="/library/:id"
        element={
          <RequireAuth>
            <ContentDetailPage />
          </RequireAuth>
        }
      />
      <Route
        path="/player/*"
        element={
          <RequireAuth>
            <PlayerPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <AdminPanelPage />
          </RequireAuth>
        }
      />
      <Route
        path="/games"
        element={
          <RequireAuth>
            <GamesPage />
          </RequireAuth>
        }
      />
      <Route
        path="/games/play/:gameId"
        element={
          <RequireAuth>
            <GameStreamPage />
          </RequireAuth>
        }
      ></Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
