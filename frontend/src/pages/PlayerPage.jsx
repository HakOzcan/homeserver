import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api.jsx";
import VideoPlayer from "../components/VideoPlayer.jsx";
import "../styles/app.css";

export default function PlayerPage() {
  const nav = useNavigate();
  const params = useParams();

  const encoded = params["*"] || "";
  const video = decodeURIComponent(encoded);

  const [title, setTitle] = useState("Now Playing");
  const [subtitle, setSubtitle] = useState(null);

  useEffect(() => {
    const parts = video.split("/");
    const tmdbId = parts[1];
    if (!tmdbId) return;

    api.get(`/media/content/by-tmdb/${tmdbId}`).then((res) => {
      setTitle(res.data.title);
    }).catch(() => {});

    if (parts[0] === "tv" && parts[2] && parts[3]) {
      setSubtitle(`S${parts[2]} E${parts[3]}`);
    }
  }, [video]);

  return (
    <div className="page">
      <div className="topbar">
        <button className="btn btn--ghost" onClick={() => nav(-1)}>
          ← Back
        </button>
        <div className="brand">{title}</div>
        <div style={{ width: 90 }} />
      </div>

      <div className="content">
        {subtitle && (
          <p className="muted" style={{ textAlign: "center", margin: "0 0 12px 0" }}>
            {subtitle}
          </p>
        )}
        <VideoPlayer video={video} />
      </div>
    </div>
  );
}