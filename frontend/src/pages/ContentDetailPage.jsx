import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api.jsx";
import "../styles/library.css";

export default function ContentDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [content, setContent] = useState(null);
  const [episodes, setEpisodes] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [backdropUrl, setBackdropUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/media/content/${id}`);
        setContent(res.data);

        if (res.data.content_type === "tv") {
          const epRes = await api.get(`/media/content/${id}/episodes`);
          setEpisodes(epRes.data.seasons);
          const seasonKeys = Object.keys(epRes.data.seasons).sort((a, b) => a - b);
          if (seasonKeys.length > 0) setSelectedSeason(seasonKeys[0]);
        }
      } catch (err) {
        setError("Failed to load content: " + (err.response?.data?.detail || "Unknown error"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    if (!content) return;
    const controller = new AbortController();
    api.get(`/media/image/${content.content_type}/${content.tmdb_id}/backdrop.jpg`, {
      responseType: "blob",
      signal: controller.signal,
    })
      .then(res => setBackdropUrl(URL.createObjectURL(res.data)))
      .catch(() => {});
    return () => {
      controller.abort();
      if (backdropUrl) URL.revokeObjectURL(backdropUrl);
    };
  }, [content]);

  if (loading) {
    return (
      <div className="lib">
        <div className="lib__loading">
          <div className="lib__skeleton-hero" />
          <div className="lib__skeleton-row" />
        </div>
      </div>
    );
  }

  if (error) return <div className="lib"><p className="lib__message msg--error">{error}</p></div>;
  if (!content) return null;

  return (
    <div className="lib">
      <section className="hero">
        {backdropUrl && <img className="hero__backdrop" src={backdropUrl} alt="" />}
        <div className="hero__gradient" />
        <div className="hero__content">
          <button className="btn btn--ghost detail__back" onClick={() => nav("/library")}>← Library</button>
          <h1 className="hero__title">{content.title}</h1>
          <div className="hero__meta">
            {content.rating && <span className="hero__rating">★ {content.rating.toFixed(1)}</span>}
            {content.release_year && <span>{content.release_year}</span>}
            {content.runtime && <span>{content.runtime} min</span>}
          </div>
          {content.genres && (
            <div className="hero__genres">
              {content.genres.map(g => g.name).join(" · ")}
            </div>
          )}
          <p className="hero__overview">{content.overview}</p>

          {content.content_type === "movie" && (
            <button
              className="btn btn--play"
              onClick={() => nav(`/player/movies/${content.tmdb_id}`)}
            >
              ▶ Play
            </button>
          )}
        </div>
      </section>

      {content.cast && content.cast.length > 0 && (
        <section className="lib__section">
          <h2 className="lib__section-title">Cast</h2>
          <div className="lib__row">
            {content.cast.slice(0, 10).map(member => (
                <div key={member.name} className="detail__cast-card">
                    <div className="detail__cast-avatar">
                        {member.name[0]}
                    </div>
                    <div className="detail__cast-name">{member.name}</div>
                    {member.character && (
                        <div className="detail__cast-role">{member.character}</div>
                    )}
                </div>
            ))}
          </div>
        </section>
      )}

      {content.content_type === "tv" && episodes && (
        <section className="lib__section">
          <h2 className="lib__section-title">Episodes</h2>
          <div className="detail__season-tabs">
            {Object.keys(episodes).sort((a, b) => a - b).map(season => (
              <button
                key={season}
                className={`btn detail__season-tab ${selectedSeason === season ? "detail__season-tab--active" : ""}`}
                onClick={() => setSelectedSeason(season)}
              >
                Season {season}
              </button>
            ))}
          </div>
          {selectedSeason && episodes[selectedSeason] && (
            <div className="detail__episode-list">
              {episodes[selectedSeason].map(ep => (
                <div
                  key={ep.episode_number}
                  className="detail__episode"
                  onClick={() => nav(`/player/tv/${content.tmdb_id}/${String(ep.season_number).padStart(2, "0")}/${String(ep.episode_number).padStart(2, "0")}`)}
                >
                  <span className="detail__episode-num">E{ep.episode_number}</span>
                  <div className="detail__episode-info">
                    <div className="detail__episode-title">
                      {ep.title || `Episode ${ep.episode_number}`}
                    </div>
                    {ep.overview && <div className="detail__episode-overview">{ep.overview}</div>}
                  </div>
                  {ep.runtime && <span className="detail__episode-runtime">{ep.runtime} min</span>}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}