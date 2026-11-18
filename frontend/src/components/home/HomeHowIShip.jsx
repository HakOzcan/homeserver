import React from "react";

export default function HomeHowIShip() {
  return (
    <section className="home-section">
      <h2 className="home-section__title">How I ship changes</h2>

      <div className="home-section__body">
        <p className="home-section__lead">
          There is one server and no test copy of it. The outage
          described above changed how I ship. The rule now: a
          change runs on the real server before it is merged.
        </p>

        <ol className="home-steps home-steps--compact">
          <li>A change gets its own branch.</li>
          <li>
            The server checks out that branch and rebuilds only
            the services the change touches.
          </li>
          <li>
            I test it there. For a bug, the aim is a check that
            fails before the fix and passes after it.
          </li>
          <li>
            Then it is merged, and the server switches back to
            main. No rebuild is needed: main now holds exactly
            the code that is already running.
          </li>
        </ol>

        <h3>Dependencies</h3>
        <p>
          Every service builds from a lock file, and the lock is
          always written by the tool (pip or npm), never by
          hand.
        </p>
        <p>
          Exact versions also made an audit possible. The first
          check against the OSV vulnerability database found
          known problems in libraries that run in production. I
          replaced the library that signs login tokens
          (python-jose &rarr; PyJWT), and existing logins kept
          working through the swap. I also updated the affected
          frontend libraries, axios and react-router among them.
        </p>
        <p>
          At the last check (4&nbsp;November 2026), nothing that
          runs in production had a known problem. 22 remained,
          all in build tools (Vite and its helpers), which run
          only while the site is being built. Upgrading Vite is
          on my list.
        </p>

        <h3>Working with an AI assistant</h3>
        <p>
          I build this with an AI assistant (Claude) in a
          teaching setup. It explains the idea first and
          proposes the code. I apply every change by hand, and I
          run, test and deploy it myself. It also reviews each
          commit before the deploy. One review caught a typo
          that would have taken the whole backend down.
        </p>

        <h3>What is missing</h3>
        <p>
          The tests are manual. There is no automated test suite
          and no CI yet.
        </p>
      </div>
    </section>
  );
}