import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.jsx";
import "../styles/app.css";

export default function DashboardPage() {
  const nav = useNavigate();
  const [msg, setMsg] = useState("");
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    // Optional: call /me to get username from token
    const load = async () => {
      try {
        const res = await api.get("/auth/me");
        // If sub is email now, you might want a /me endpoint later.
        setDisplayName(res.data.username || "");
      } catch {
        // token expired
        localStorage.removeItem("token");
        nav("/login");
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
        <h2>Dashboard</h2>
        <p className="muted">{displayName ? displayName : "Welcome!"}</p>

        <div className="row">
          <button className="btn btn--primary" onClick={() => nav("/library")}>
            Open Library
          </button>
          <button className="btn btn--danger" onClick={deleteMe}>
            Delete My Account
          </button>
        </div>

        {msg && <p className="msg msg--error">{msg}</p>}
      </div>
    </div>
  );
}
