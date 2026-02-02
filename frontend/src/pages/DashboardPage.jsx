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
        <p className="muted">{"Welcome, " + displayName ? displayName : "user" + "!"}</p>

        <div className="row">
          <button className="btn btn--primary" onClick={() => nav("/library")}>
            Open Library
          </button>
          {
            isAdmin && (
              <button className="btn btn--primary" onClick={() => nav("/admin")}>
                Admin Panel
              </button>
            )
          }
          <button className="btn btn--danger" onClick={deleteMe}>
            Delete My Account
          </button>
        </div>

        {msg && <p className="msg msg--error">{msg}</p>}
      </div>
    </div>
  );
}
