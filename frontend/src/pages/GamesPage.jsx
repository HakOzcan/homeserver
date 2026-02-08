import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/games.css";

const MOCK_GAMES = [
  {
    id: "horror-lab",
    title: "Horror Lab (Mockup)",
    cover: "https://picsum.photos/seed/horror/640/360",
  },
  {
    id: "space-runner",
    title: "Space Runner (Mockup)",
    cover: "https://picsum.photos/seed/space/640/360",
  },
  {
    id: "neon-racer",
    title: "Neon Racer (Mockup)",
    cover: "https://picsum.photos/seed/neon/640/360",
  },
  {
    id: "castle-defense",
    title: "Castle Defense (Mockup)",
    cover: "https://picsum.photos/seed/castle/640/360",
  },
];

export default function GamesPage() {
  const navigate = useNavigate();

  return (
    <div className="gamesPage">
      <div className="gamesHeader">
        <div>
          <h1 className="gamesTitle">Cloud Gaming</h1>
          <p className="gamesSubtitle">
            Pick a game and press Play (currently dysfunctional).
          </p>
        </div>

        <button className="btn btn--ghost" onClick={() => navigate("/dashboard")}>
          ← Dashboard
        </button>
      </div>

      <div className="gamesGrid">
        {MOCK_GAMES.map((g) => (
          <div key={g.id} className="gameCard">
            <div className="gameCoverWrap">
              <img className="gameCover" src={g.cover} alt={g.title} />
            </div>

            <div className="gameCardBody">
              <div className="gameName">{g.title}</div>

              <button
                className="btn"
                onClick={() => alert("Coming soon: cloud gaming streaming + input!")}
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
