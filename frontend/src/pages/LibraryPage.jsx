import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import "../styles/library.css";

export default function LibraryPage() {
  const nav = useNavigate();
  const [videos, setVideos] = useState([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const load = async () => {
      setMsg("");
      try {
        const res = await api.get("/media/list");
        setVideos(res.data.videos || []);
      } catch (err) {
        setMsg("Failed to load videos: " + (err.response?.data?.detail || "Unknown error"));
      }
    };
    load();
  }, []);

  return (
    <div className="page">
      <div className="topbar">
        <button className="btn btn--ghost" onClick={() => nav("/dashboard")}>
          ← Dashboard
        </button>
        <div className="brand">Library</div>
        <button
          className="btn btn--ghost"
          onClick={() => {
            localStorage.removeItem("token");
            nav("/login");
          }}
        >
          Logout
        </button>
      </div>

      <div className="content">
        {msg && <p className="msg msg--error">{msg}</p>}

        <ul className="videoList">
          {videos.map((v) => (
            <li key={v} className="videoItem" onClick={() => nav(`/player/${encodeURIComponent(v)}`)}>
              {v}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
