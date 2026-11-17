import React from "react";

const ARROW = "url(#home-arrow)";

export default function HomeHowItWorks() {
  return (
    <section className="home-section">
      <h2 className="home-section__title">
        How a game reaches your browser
      </h2>

      <div className="home-section__body">
        <svg className="home-diagrm" height="190" aria-hidden="true">
            <defs>
                <marker
                  id="home-arrow"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto"
                  >
                    <path d="M1 1 9 5 1 9" />
                  </marker>
            </defs>
            
            <g className="home-diagram__names">
                <text x="16.7%" y="16">Browser</text>
                <text x="50%" y="16">Backend</text>
                <text x="83.3%" y="16">Game server</text>
            </g>

            <g className="home-diagram__lifelines">
                <line x1="16.7%" y1="30" x2="16.7%" y2="188" />
                <line x1="50%" y1="30" x2="50%" y2="86" />
                <line x1="83.3%" y1="30" x2="83.3%" y2="188" />
            </g>

            <text x="33.3%" y="58">1, 2, 3</text>
            <line x1="16.7%" y1="68" x2="50%" y2="68" markerEnd={ARROW} />
            <text x="66.7%" y="58">1, 3</text>
            <line x1="50%" y1="68" x2="83.3%" y2="68" markerEnd={ARROW} />

            <text x="50%" y="124">video</text>
            <line x1="83.3%" y1="134" x2="16.7%" y2="134" markerEnd={ARROW} />
            <text x="50%" y="168">input</text>
            <line x1="16.7%" y1="178" x2="83.3%" y2="178" markerEnd={ARROW} />
        </svg>
        
        <p className="home-section__lead">
          What happens when you press Play:
        </p>

        <ol className="home-steps">
          <li>
            <h3>The browser asks for a session.</h3>
            <p>
              The backend checks who you are and tells the game
              server to start. The game server opens a virtual
              screen (Xvfb) and starts recording it (FFmpeg).
            </p>
          </li>
          <li>
            <h3>The browser asks how to connect.</h3>
            <p>
              The backend replies with the address of my relay
              and a password for it that expires after six hours.
            </p>
          </li>
          <li>
            <h3>Both sides agree on a connection.</h3>
            <p>
              The browser sends an offer through the backend and
              gets the game server's answer back (WebRTC
              signaling).
            </p>
          </li>
          <li>
            <h3>They connect directly.</h3>
            <p>
              On my home network the browser reaches the game
              server itself. From outside, the video goes through
              my own relay (coturn), because the game server sits
              behind a home router and uses different ports every
              session.
            </p>
          </li>
          <li>
            <h3>The game starts once the connection is up.</h3>
            <p>Not earlier, so you see it from its first frame.</p>
          </li>
        </ol>

        <p className="home-section__lead">While you play:</p>

        <dl className="home-flow">
          <dt>Picture</dt>
          <dd>
            game &rarr; virtual screen &rarr; FFmpeg &rarr; VP8
            encoder &rarr; your browser, 30 times a second
          </dd>
          <dt>Input</dt>
          <dd>
            your keys and clicks &rarr; data channel &rarr;
            xdotool &rarr; the game
          </dd>
        </dl>

        <p>
          The backend never touches the video. It checks who you
          are and passes the connection messages; after that the
          browser and the game server talk directly. Each session
          gets its own virtual screen, so players can't see or
          control each other's games.
        </p>
      </div>
    </section>
  );
}