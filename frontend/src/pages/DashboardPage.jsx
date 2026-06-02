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
    <div className="page" style={{ display: "flex", flexDirection: "column" }}>
      <div className="topbar">
        <div className="brand">HakServer</div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span className="muted">{`Welcome, ${displayName || "user"}`}</span>
          <button className="btn btn--ghost" onClick={logout}>
            Logout
          </button>
        </div>
      </div>

      <div className="dash__grid">
        <div className="dash__card" onClick={() => nav("/library")}>
          <div className="dash__card-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.125c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125Z" />
            </svg>
          </div>
          <h3 className="dash__card-title">Library</h3>
          <p className="dash__card-desc">Browse movies, TV shows, and your watchlist</p>
        </div>

        <div className="dash__card" onClick={() => nav("/games")}>
          <div className="dash__card-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
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

      <div className="dash__footer">
        <button className="btn btn--danger" onClick={deleteMe}>
          Delete My Account
        </button>
        {msg && <p className="msg msg--error" style={{ margin: 0 }}>{msg}</p>}
      </div>
    </div>
  );
}
