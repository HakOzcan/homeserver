import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.jsx";
import "../styles/library.css";

export default function LibraryPage() {
  const nav = useNavigate();
  const [library, setLibrary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/media/library");
        setLibrary(res.data);
      } catch (err) {
        setError("Failed to load library: " + (err.response?.data?.detail || "Unknown error"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="lib">
      <div className="lib__topbar topbar">
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

      {loading && <p className="lib__message">Loading...</p>}
      {error && <p className="lib__message msg--error">{error}</p>}

      {library && (
        <>
          <section className="lib__section">
            <h2 className="lib__section-title">
              Hero: {library.hero?.title || "None"}
            </h2>
          </section>

          {library.continue_watching.length > 0 && (
            <section className="lib__section">
              <h2 className="lib__section-title">
                Continue Watching ({library.continue_watching.length})
              </h2>
            </section>
          )}

          <section className="lib__section">
            <h2 className="lib__section-title">
              Recently Added ({library.recently_added.length})
            </h2>
          </section>

          {Object.entries(library.genre_rows).map(([genre, items]) => (
            <section key={genre} className="lib__section">
              <h2 className="lib__section-title">
                {genre} ({items.length})
              </h2>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
