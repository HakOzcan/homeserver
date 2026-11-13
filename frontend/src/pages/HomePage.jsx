import React from "react";
import HomeTop from "../components/home/HomeTop.jsx";
import HomeWhatItIs from "../components/home/HomeWhatItIs.jsx";
import "../styles/home.css";

export default function HomePage() {
  return (
    <div className="home">
      <HomeTop />
      <main className="home-paper">
        <HomeWhatItIs />
      </main>
    </div>
  );
}