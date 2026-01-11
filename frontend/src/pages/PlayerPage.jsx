import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import VideoPlayer from "../components/VideoPlayer";
import "../styles/app.css";

export default function PlayerPage() {
  const nav = useNavigate();
  const params = useParams();

  // Because route is /player/*, the param is stored under params["*"]
  const encoded = params["*"] || "";
  const video = decodeURIComponent(encoded);

  return (
    <div className="page">
      <div className="topbar">
        <button className="btn btn--ghost" onClick={() => nav("/library")}>
          ← Back
        </button>
        <div className="brand">Player</div>
        <div style={{ width: 90 }} />
      </div>

      <div className="content">
        <VideoPlayer video={video} onBack={() => nav("/library")} />
      </div>
    </div>
  );
}
