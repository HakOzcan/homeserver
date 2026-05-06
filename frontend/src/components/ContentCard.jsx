import React from "react";

export default function ContentCard({ item, posterUrl, progress, onClick }) {
  return (
    <div
      className={`card-content ${onClick ? "card-content--clickable" : ""}`}
      onClick={onClick}
    >
      <div className="card-content__poster">
        {posterUrl ? (
          <img src={posterUrl} alt={item.title} className="card-content__img" />
        ) : (
          <div className="card-content__placeholder">
            <span>{item.title[0]}</span>
          </div>
        )}
        {item.rating && (
          <span className="card-content__rating">★ {item.rating.toFixed(1)}</span>
        )}
        {typeof progress === "number" && (
          <div className="card-content__progress">
            <div
              className="card-content__progress-bar"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
      <div className="card-content__info">
        <div className="card-content__title">{item.title}</div>
        <div className="card-content__year">{item.release_year}</div>
      </div>
    </div>
  );
}