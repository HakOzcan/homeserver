import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.jsx";
import "../styles/app.css";

const TV = ` _______
|  ___  |
| |~~~| |
| |___| |
|_______|
  || ||`;

const GAMEPAD = `  .------.
 / o    o \\
|    __    |
|   |__|   |
 \\_/    \\_/`;

const SHIELD = `   /\\
  /  \\
 / ✓  \\
 \\    /
  \\  /
   \\/`;

function AsciiArt({ art, style }) {
  return (
    <pre className="dash__ascii" style={style}>{art}</pre>
  );
}

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
          <AsciiArt art={TV} style={{ top: "8%", left: "10%", opacity: 0.06, fontSize: "0.7rem" }} />
          <AsciiArt art={TV} style={{ top: "55%", right: "8%", opacity: 0.04, fontSize: "0.9rem", transform: "rotate(-8deg)" }} />
          <AsciiArt art={TV} style={{ bottom: "10%", left: "25%", opacity: 0.05, fontSize: "0.55rem", transform: "rotate(5deg)" }} />
          <AsciiArt art={TV} style={{ top: "20%", right: "30%", opacity: 0.03, fontSize: "1.1rem" }} />
          <h3 className="dash__card-title">Library</h3>
          <p className="dash__card-desc">Browse movies, TV shows, and your watchlist</p>
        </div>

        <div className="dash__card" onClick={() => nav("/games")}>
          <AsciiArt art={GAMEPAD} style={{ top: "10%", right: "12%", opacity: 0.06, fontSize: "0.7rem" }} />
          <AsciiArt art={GAMEPAD} style={{ bottom: "15%", left: "10%", opacity: 0.04, fontSize: "0.9rem", transform: "rotate(6deg)" }} />
          <AsciiArt art={GAMEPAD} style={{ top: "45%", left: "28%", opacity: 0.05, fontSize: "0.55rem", transform: "rotate(-5deg)" }} />
          <AsciiArt art={GAMEPAD} style={{ bottom: "5%", right: "25%", opacity: 0.03, fontSize: "1.1rem" }} />
          <h3 className="dash__card-title">Games</h3>
          <p className="dash__card-desc">Play cloud-streamed games in your browser</p>
        </div>

        {isAdmin && (
          <div className="dash__card" onClick={() => nav("/admin")}>
            <AsciiArt art={SHIELD} style={{ top: "10%", left: "15%", opacity: 0.06, fontSize: "0.7rem" }} />
            <AsciiArt art={SHIELD} style={{ bottom: "12%", right: "10%", opacity: 0.04, fontSize: "0.9rem", transform: "rotate(-6deg)" }} />
            <AsciiArt art={SHIELD} style={{ top: "50%", right: "30%", opacity: 0.05, fontSize: "0.55rem", transform: "rotate(4deg)" }} />
            <AsciiArt art={SHIELD} style={{ top: "25%", left: "35%", opacity: 0.03, fontSize: "1.1rem" }} />
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
