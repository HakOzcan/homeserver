import React from "react";
import HomeTop from "../components/home/HomeTop.jsx";
import HomeWhatItIs from "../components/home/HomeWhatItIs.jsx";
import HomeHowItWorks from "../components/home/HomeHowItWorks.jsx";
import HomeDecisions from "../components/home/HomeDecisions.jsx";
import HomeWhatWentWrong from "../components/home/HomeWhatWentWrong.jsx";
import HomeHowIShip from "../components/home/HomeHowIShip.jsx";
import "../styles/home.css";

export default function HomePage() {
  return (
    <div className="home">
      <HomeTop />
      <main className="home-paper">
        <HomeWhatItIs />
        <HomeHowItWorks />
        <HomeDecisions />
        <HomeWhatWentWrong />
        <HomeHowIShip />
      </main>
    </div>
  );
}