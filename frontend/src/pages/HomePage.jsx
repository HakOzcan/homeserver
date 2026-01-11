import React from "react";
import { Link } from "react-router-dom";
import "../styles/home.css";

export default function HomePage() {
  return (
    <div className="home">
      <div className="home__overlay" />
      <div className="home__card">
        <h1 className="home__title">HakServer</h1>
        <p className="home__subtitle">Your personal cloud streaming and storage platform.</p>

        <div className="home__actions">
          <Link className="btn btn--primary" to="/login">
            Login
          </Link>
          <Link className="btn btn--ghost" to="/register">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
