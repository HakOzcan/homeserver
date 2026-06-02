import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.jsx";
import "../styles/app.css";

export default function DashboardPage() {
  const nav = useNavigate();
  const [msg, setMsg] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/auth/me");
        setDisplayName(res.data.username || "");
        setIsAdmin(res.data.is_admin);
      } catch (err) {
        if (err.response?.status !== 401) {
          setMsg("Failed to load user data");
        }
      }
    };
    load();
  }, [nav]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user_email");
    nav("/login");
  };

  const deleteMe = async () => {
    setMsg("");
    try {
      const res = await api.delete("/auth/delete");
      setMsg(res.data.message || "Account deleted.");
      logout();
    } catch (err) {
      setMsg("Failed to delete user: " + (err.response?.data?.detail || "Unknown error"));
    }
  };

  return (
    <div className="page">
      <div className="topbar">
        <div className="brand">HakServer</div>
        <button className="btn btn--ghost" onClick={logout}>
          Logout
        </button>
      </div>

      <div className="content content--narrow">
        <div className="dash__welcome">
          <h2 className="dash__greeting">{`Welcome back, ${displayName || "user"}!`}</h2>
        </div>

        <div className="dash__grid">
          <div className="dash__card" onClick={() => nav("/library")}>
            <div className="dash__card-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-2.625 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0 1 18 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5c0 .621-.504 1.125-1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M6 9.375v1.5c0 .621.504 1.125 1.125 1.125M6 12v1.5c0 .621.504 1.125 1.125 1.125m-2.25 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M6 13.5v1.5c0 .621.504 1.125 1.125 1.125" />
              </svg>
            </div>
            <h3 className="dash__card-title">Library</h3>
            <p className="dash__card-desc">Browse movies, TV shows, and your watchlist</p>
          </div>

          <div className="dash__card" onClick={() => nav("/games")}>
            <div className="dash__card-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 0 1-.657.643 48.39 48.39 0 0 1-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 0 1-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 0 0-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 0 1-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 0 0 .657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 0 1-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.401.604-.401.959v0c0 .333.277.599.61.58a48.1 48.1 0 0 0 5.427-.63 48.05 48.05 0 0 0 .582-4.717.532.532 0 0 0-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 0 0 .659-.663 47.703 47.703 0 0 0-.31-4.82 48.847 48.847 0 0 1-6.067.21.64.64 0 0 1-.657-.643v0Z" />
              </svg>
            </div>
            <h3 className="dash__card-title">Games</h3>
            <p className="dash__card-desc">Play cloud-streamed games in your browser</p>
          </div>

          {isAdmin && (
            <div className="dash__card" onClick={() => nav("/admin")}>
              <div className="dash__card-icon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
              </div>
              <h3 className="dash__card-title">Admin Panel</h3>
              <p className="dash__card-desc">Manage users and approve registrations</p>
            </div>
          )}
        </div>

        <div className="dash__account">
          <button className="btn btn--danger" onClick={deleteMe}>
            Delete My Account
          </button>
        </div>

        {msg && <p className="msg msg--error">{msg}</p>}
      </div>
    </div>
  );
}
