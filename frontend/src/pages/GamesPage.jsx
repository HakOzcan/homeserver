import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.jsx";
import "../styles/games.css";

export default function GamesPage() {
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [coverUrls, setCoverUrls] = useState({});

  useEffect(() => {
    api
      .get("/gaming/catalog")
      .then((res) => setGames(res.data))
      .catch((err) => setError("Failed to load game catalog"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (games.length === 0) return;

    const controller = new AbortController();
    const urls = {};

    games.forEach((g) =>
      api
        .get(`/gaming/covers/${g.id}`, {
          responseType: "blob",
          signal: controller.signal,
        })
        .then((res) => {
          const url = URL.createObjectURL(res.data);
          urls[g.id] = url;
          setCoverUrls((prev) => ({ ...prev, [g.id]: url }));
        })
        .catch(() => {
          // Cover failed to load - left undefined so placeholder shows
        })
    );
    return () => {
      controller.abort();
      Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [games]);

  return (
    <div className="gamesPage">
      <div className="gamesHeader">
        <div>
          <h1 className="gamesTitle">Cloud Gaming</h1>
          <p className="gamesSubtitle">
            Pick a game and press Play - games run server-side.
          </p>
        </div>
        <button className="btn btn--ghost" onClick={() => navigate("/dashboard")}>
          ← Dashboard
        </button>
      </div>

      {loading && <p className="gamesLoading">Loading catalog...</p>}
      {error && <p className="gamesError">{error}</p>}

      <div className="gamesGrid">
        {games.map((g) => (
          <div key={g.id} className="gameCard">
            <div className="gameCoverWrap">
              {coverUrls[g.id] ? (
                <img
                  src={coverUrls[g.id]}
                  alt={g.name}
                  className="gameCover"
                  />
              ) : (
                <div className="gameCoverPlaceholder">
                  <span>{g.name[0]}</span>
                </div>
              )}
            </div>

            <div className="gameCardBody">
              <div className="gameName">{g.name}</div>
              <div className="gameType">{g.type}</div>

              <button
                className="btn"
                onClick={() => navigate(`/games/play/${g.id}`)}
              >
                Play
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}