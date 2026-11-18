import React from "react";

const STACK = [
  "Python", "FastAPI", "PostgreSQL", "React", "WebRTC (aiortc)",
  "FFmpeg", "coturn", "nginx", "Docker Compose", "Kotlin",
];

export default function HomeWhatItIs() {
  return (
    <section className="home-section">
      <h2 className="home-section__title">What it is</h2>

      <div className="home-section__body">
        <p className="home-section__lead">
          One Mac Mini at home, running everything in Docker.
        </p>

        <h3>Cloud gaming</h3>
        <p>
          Pick a game and it starts on the server. The picture
          comes to your browser as live video, and your keys and
          clicks go back, all over WebRTC. Three small games
          today (Snake, Tetris, Minesweeper), up to three
          sessions at once.
        </p>

        <h3>Media library</h3>
        <p>
          A Netflix-style library that remembers where you
          stopped. Video is served as HLS in H.264 and HEVC, and
          the player offers only what your device can decode.
        </p>

        <h3>Android TV app</h3>
        <p>
          A native Kotlin app for Android TV and Fire TV, built
          with Jetpack Compose and Media3, and tested on a real
          Fire TV.
        </p>

        <h3>Accounts</h3>
        <p>
          Email verification, admin approval for every new
          account, and one active session per user.
        </p>

        <p className="home-section__small">
          Built with: {STACK.join(" \u00b7 ")}
        </p>
      </div>
    </section>
  );
}