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

/**
 * @brief How often the guard wakes to evaluate the token (cheap; no network
 *        unless a renewal is actually due).
 * @details Short on purpose. The old design leaned on a single 50-minute timer,
 *          so one throttled or slept tick could let the token lapse. A one-minute
 *          heartbeat is self-correcting: a missed tick is retried ~60s later,
 *          still well before expiry.
 */
const TOKEN_CHECK_INTERVAL_MS = 60 * 1000;

/**
 * @brief Renew once the token has this much (or less) life remaining.
 * @details Compared against the token's own `exp` claim rather than a fixed
 *          cadence, so it tracks the backend's ACCESS_TOKEN_EXPIRE_MINUTES
 *          automatically and can never silently drift out of sync again. With a
 *          60-minute token this opens a 15-minute window in which up to ~15
 *          one-per-minute attempts can land — vs. the old single 10-min-margin shot.
 */
const REFRESH_BEFORE_EXPIRY_MS = 15 * 60 * 1000;

/**
 * @brief Treat the user as "active" if they interacted within this window.
 * @details A sliding timestamp, not a per-tick boolean, so passive playback —
 *          which only emits "media-activity" every 5 min and no mouse/keyboard
 *          events — still reads as active. A genuinely idle user falls out of the
 *          window and is allowed to lapse (the "log out dormant users" half).
 */
const ACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;

/**
 * @brief Extract a JWT's `exp` (expiry) claim, in epoch milliseconds.
 * @param token Raw JWT string from localStorage.
 * @return Expiry time in ms since epoch, or 0 if it can't be parsed.
 * @details A JWT is three base64url segments separated by dots; the middle one is
 *          the JSON payload. We convert base64url -> base64 before decoding (JWT
 *          uses '-'/'_' where base64 uses '+'/'/'). Only the public `exp` claim is
 *          read; the signature is still verified server-side on every request, so
 *          reading it client-side purely to schedule work is safe.
 */
function getTokenExpiryMs(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    return (payload.exp || 0) * 1000; // exp is in seconds; JS timestamps are ms
  } catch {
    return 0;
  }
}

/**
 * @brief Keep an *active* user's session alive by renewing the access token
 *        shortly before it expires, while letting a *dormant* user's session lapse.
 * @details Replaces the previous fixed 50-minute setInterval. Two problems drove it:
 *          1. The old effect bailed at mount if no token was present, and login is a
 *             client-side navigation (no remount), so after logging in the loop never
 *             armed — the token hit its hard 60-min expiry and the 401 interceptor
 *             logged the user out. This version runs unconditionally and checks for
 *             the token *inside* each tick, so it self-arms the moment a token
 *             appears (login) and self-disarms when it is removed (logout).
 *          2. A single coarse timer with a thin margin is unreliable exactly under
 *             video-watching conditions (background-tab throttling, device sleep, a
 *             tick landing during a pause). This version derives timing from the
 *             token's own `exp` and checks frequently, so a missed tick is harmless.
 */
function useTokenRefresh() {
  const lastActivityAt = useRef(Date.now());

  useEffect(() => {
    /** @brief Any sign of life — including the "media-activity" event fired by the
     *         video player and game stream — refreshes the activity clock. */
    const markActive = () => { lastActivityAt.current = Date.now(); };
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart", "media-activity"];
    events.forEach((e) => window.addEventListener(e, markActive, { passive: true }));

    /**
     * @brief One evaluation pass. Idempotent and cheap, so it can run as often as we
     *        like; it only hits the network when a renewal is actually due.
     */
    const maybeRefresh = async () => {
      const token = localStorage.getItem("token");
      if (!token) return; // logged out (or not yet logged in) — nothing to manage

      const msUntilExpiry = getTokenExpiryMs(token) - Date.now();
      const isActive = Date.now() - lastActivityAt.current < ACTIVITY_TIMEOUT_MS;

      // Idle, or still comfortably far from expiry -> leave it alone.
      if (!isActive || msUntilExpiry > REFRESH_BEFORE_EXPIRY_MS) return;

      try {
        const res = await api.post("/auth/refresh");
        localStorage.setItem("token", res.data.access_token);
      } catch {
        // Renewal failed (e.g. token already dead): the 401 response interceptor
        // clears storage and redirects to /login.
      }
    };

    const intervalId = setInterval(maybeRefresh, TOKEN_CHECK_INTERVAL_MS);

    /**
     * @brief Re-check the instant the tab becomes visible again.
     * @details Browsers freeze timers in fully backgrounded tabs; on return we
     *          evaluate immediately so a token that entered its refresh window while
     *          frozen is renewed at once instead of waiting a full tick.
     */
    const onVisible = () => { if (document.visibilityState === "visible") maybeRefresh(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      events.forEach((e) => window.removeEventListener(e, markActive));
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
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
