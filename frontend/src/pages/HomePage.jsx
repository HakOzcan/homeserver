import React from "react";
import HomeTop from "../components/home/HomeTop.jsx";
import HomeWhatItIs from "../components/home/HomeWhatItIs.jsx";
import HomeHowItWorks from "../components/home/HomeHowItWorks.jsx";
import HomeDecisions from "../components/home/HomeDecisions.jsx";
import HomeWhatWentWrong from "../components/home/HomeWhatWentWrong.jsx";
import HomeHowIShip from "../components/home/HomeHowIShip.jsx";
import HomeNoDemo from "../components/home/HomeNoDemo.jsx";
import HomeLimits from "../components/home/HomeLimits.jsx";
import HomeBottom from "../components/home/HomeBottom.jsx";
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
        <HomeNoDemo />
        <HomeLimits />
      </main>
      <HomeBottom />
    </div>
  );
}