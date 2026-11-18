import React from "react";

export default function HomeDecisions() {
  return (
    <section className="home-section" id="decisions">
      <h2 className="home-section__title">
        Four decisions, and what each one cost
      </h2>

      <div className="home-section__body">
        <ol className="home-list">
          <li>
            <h3>WebRTC instead of a WebSocket</h3>
            <p>
              The first version sent JPEG images over a WebSocket.
              A WebSocket runs on TCP, which delivers everything in
              order, so one lost packet holds up every frame behind
              it. WebRTC runs on UDP, so a late frame is skipped,
              and VP8 sends only what changed since the last frame.
            </p>
            <p className="home-cost">
              <strong>Cost:</strong> many more parts to run. A
              connection handshake, a relay, and firewall and
              router rules.
            </p>
          </li>
          <li>
            <h3>The game server is the WebRTC peer</h3>
            <p>
              The video goes straight from the game server to the
              browser, with no stop at the backend. For that, the
              game server uses the host's network: WebRTC tells the
              other side its real addresses, and inside Docker's
              private network those would be addresses nobody
              outside can reach.
            </p>
            <p className="home-cost">
              <strong>Cost:</strong> the game server is no longer
              hidden inside Docker's network. A firewall rule does
              that job now: only the backend's Docker network can
              call it.
            </p>
          </li>
          <li>
            <h3>My own relay, with passwords that expire</h3>
            <p>
              Players outside my home can't reach the game server
              directly, so their video goes through a relay (coturn)
              on a fixed range of ports that the router forwards.
            </p>
            <p>
              I run the relay myself instead of renting one. I want
              the platform to depend on as few outside services as
              possible, and it is a learning project: setting up
              each part myself is how I learn what it really does.
            </p>
            <p>
              The browser needs a password for the relay, and
              anything a browser holds, its user can read. So the
              backend makes a password for each logged-in user that
              stops working after six hours, and the relay refuses
              to forward to anything on my home network except the
              game server.
            </p>
            <p className="home-cost">
              <strong>Cost:</strong> the relay is one more service
              that I have to keep running and secure. It also
              learns my public address only when it starts, so if
              my provider changes it, the relay needs a restart.
            </p>
          </li>
          <li>
            <h3>A minimum bitrate, after measuring</h3>
            <p>
              The picture kept redrawing in blurry waves. The
              browser's WebRTC statistics showed the stream stuck
              near 120&nbsp;kbps: aiortc, the Python WebRTC library,
              follows the browser's bandwidth estimate, and the
              estimate never grew because aiortc sends no test
              traffic. I set a floor of 2&nbsp;Mbps, plus a full frame
              every 3&nbsp;seconds to wipe leftover traces of old images.
            </p>
            <p className="home-cost">
              <strong>Cost:</strong> a connection that can't carry
              2&nbsp;Mbps now loses packets instead of getting a softer
              picture. The fix also reaches inside aiortc, so its
              version is pinned and the code falls back to the
              defaults if that part ever changes.
            </p>
          </li>
        </ol>
      </div>
    </section>
  );
}