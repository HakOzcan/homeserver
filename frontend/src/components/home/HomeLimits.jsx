import React from "react";

export default function HomeLimits() {
  return (
    <section className="home-section">
      <h2 className="home-section__title">Limits, and what's next</h2>

      <div className="home-section__body">
        <p className="home-section__lead">What it can't do today:</p>

        <ol className="home-list">
          <li>
            <h3>No sound</h3>
            <p>
              The game server records only the screen, so the games
              are silent. Sound needs its own audio track next to
              the video, from the game all the way to the browser.
            </p>
          </li>
          <li>
            <h3>Keyboard and mouse only</h3>
            <p>
              The game page sends keyboard and mouse input. There
              are no touch controls, so it is made for a computer,
              not for a phone.
            </p>
          </li>
          <li>
            <h3>Some networks can't connect</h3>
            <p>
              A network that lets out only normal web traffic blocks
              the stream. The video needs UDP, or at least the
              relay's own port (3478). The usual fix is a relay that
              speaks TLS on port 443, the web's port. On my one
              public address, that port already belongs to the
              website.
            </p>
          </li>
          <li>
            <h3>A slow start</h3>
            <p>
              Connecting takes a few seconds. Each side first
              collects every address it can be reached at, and only
              then sends the list. Sending each address as soon as
              it is found (trickle ICE) would cut the wait.
            </p>
          </li>
        </ol>

        <p className="home-section__small">
          Two more limits are told above, next to <a href="#decisions">the
          decisions that caused them</a>: the 2&nbsp;Mbps floor, and the
          relay's restart when my public address changes.
        </p>

        <p className="home-section__lead">What's next, in this order:</p>

        <ol className="home-steps home-steps--compact">
          <li>
            Automated tests and CI, so the checks I run by hand
            today run on every change.
          </li>
          <li>Sound.</li>
          <li>A faster start, with trickle ICE.</li>
        </ol>
      </div>
    </section>
  );
}