import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.jsx";
import ContentCard from "../components/ContentCard.jsx";
import "../styles/library.css";

export default function LibraryPage() {
  const nav = useNavigate();
  const [library, setLibrary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [imageUrls, setImageUrls] = useState({});

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

  useEffect(() => {
    if (!library) return;

    const urls = {};
    const controller = new AbortController();

    const allItems = [];
    const seen = new Set();
    const addItem = (item) => {
      if (!seen.has(item.tmdb_id)) {
        seen.add(item.tmdb_id);
        allItems.push(item);
      }
    };

    if (library.hero) addItem(library.hero);
    library.continue_watching.forEach(addItem);
    library.recently_added.forEach(addItem);
    Object.values(library.genre_rows).forEach(row => row.forEach(addItem));

    allItems.forEach(item => {
      const posterKey = `${item.content_type}/${item.tmdb_id}/poster`;
      api.get(`/media/image/${item.content_type}/${item.tmdb_id}/poster.jpg`, {
        responseType: "blob",
        signal: controller.signal,
      })
        .then(res => {
          const url = URL.createObjectURL(res.data);
          urls[posterKey] = url;
          setImageUrls(prev => ({ ...prev, [posterKey]: url }));
        })
        .catch(() => {});

      if (library.hero && item.tmdb_id === library.hero.tmdb_id) {
        const backdropKey = `${item.content_type}/${item.tmdb_id}/backdrop`;
        api.get(`/media/image/${item.content_type}/${item.tmdb_id}/backdrop.jpg`, {
          responseType: "blob",
          signal: controller.signal,
        })
          .then(res => {
            const url = URL.createObjectURL(res.data);
            urls[backdropKey] = url;
            setImageUrls(prev => ({ ...prev, [backdropKey]: url }));
          })
          .catch(() => {});
      }
    });

    return () => {
      controller.abort();
      Object.values(urls).forEach(url => URL.revokeObjectURL(url));
    };
  }, [library]);

  return (
    <div className="lib">
      <div className="lib__topbar topbar">
        <button className="btn btn--ghost" onClick={() => nav("/dashboard")}>
          ← Dashboard
        </button>
        <div className="brand">Library</div>
      </div>

      {loading && (
        <div className="lib__loading">
          <div className="lib__skeleton-hero" />
          <div className="lib__skeleton-row" />
          <div className="lib__skeleton-row" />
        </div>
      )}

      {library && !library.hero && library.recently_added.length === 0 && (
        <p className="lib__message">Your library is empty. Ask an admin to add new content</p>
      )}

      {error && <p className="lib__message msg--error">{error}</p>}

      {library && (
        <>
          {library.hero && (
            <section className="hero">
              {imageUrls[`${library.hero.content_type}/${library.hero.tmdb_id}/backdrop`] && (
                <img
                  className="hero__backdrop"
                  src={imageUrls[`${library.hero.content_type}/${library.hero.tmdb_id}/backdrop`]}
                  alt=""
                />
              )}
              <div className="hero__gradient" />
              <div className="hero__content">
                <h1 className="hero__title">{library.hero.title}</h1>
                <div className="hero__meta">
                  {library.hero.rating && (
                    <span className="hero__rating">★ {library.hero.rating.toFixed(1)}</span>
                  )}
                  {library.hero.release_year && <span>{library.hero.release_year}</span>}
                  {library.hero.runtime && <span>{library.hero.runtime} min</span>}
                </div>
                {library.hero.genres && (
                  <div className="hero__genres">
                    {library.hero.genres.map(g => g.name).join(" · ")}
                  </div>
                )}
                <p className="hero__overview">{library.hero.overview}</p>
                <div className="hero__actions">
                  <button 
                    className="btn btn--play"
                    onClick={() => nav(`/library/${library.hero.id}`)}>
                    More Info
                  </button>
                </div>
              </div>
            </section>
          )}

          {library.continue_watching.length > 0 && (
            <section className="lib__section">
              <h2 className="lib__section-title">Continue Watching</h2>
              <div className="lib__row">
                {library.continue_watching.map(item => (
                  <ContentCard
                    key={item.tmdb_id}
                    item={item}
                    posterUrl={imageUrls[`${item.content_type}/${item.tmdb_id}/poster`]}
                    progress={item.progress_percent}
                    onClick={() => nav(`/library/${item.id}`)}
                  />
                ))}
              </div>
            </section>
          )}

          <section className="lib__section">
            <h2 className="lib__section-title">Recently Added</h2>
            <div className="lib__row">
              {library.recently_added.map(item => (
                <ContentCard
                  key={item.tmdb_id}
                  item={item}
                  posterUrl={imageUrls[`${item.content_type}/${item.tmdb_id}/poster`]}
                  onClick={() => nav(`/library/${item.id}`)}
                />
              ))}
            </div>
          </section>

          {Object.entries(library.genre_rows).map(([genre, items]) => (
            <section key={genre} className="lib__section">
              <h2 className="lib__section-title">{genre}</h2>
              <div className="lib__row">
                {items.map(item => (
                  <ContentCard
                    key={item.tmdb_id}
                    item={item}
                    posterUrl={imageUrls[`${item.content_type}/${item.tmdb_id}/poster`]}
                    onClick={() => nav(`/library/${item.id}`)}
                  />
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
