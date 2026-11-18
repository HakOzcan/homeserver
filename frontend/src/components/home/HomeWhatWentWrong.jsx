import React from "react";

export default function HomeWhatWentWrong() {
  return (
    <section className="home-section">
      <h2 className="home-section__title">
        Three things that went wrong
      </h2>

      <div className="home-section__body">
        <p className="home-section__lead">
          Running it is where most of the learning happened.
          Three examples, each with a different lesson.
        </p>

        <ol className="home-list">
          <li>
            <h3>A silent failure four minutes into every session</h3>
            <p>
              <strong>Symptom:</strong> none that a player could
              see, which is why it lasted.
            </p>
            <p>
              <strong>Cause:</strong> the game server reads
              FFmpeg's messages line by line and writes them to
              the log. FFmpeg's progress messages end with a
              "back to the start of the line" character, not a
              "new line" one. So the reader never saw a line end,
              kept collecting, and crashed at its 64&nbsp;KB
              limit. Measured with a real FFmpeg, that is about
              four minutes in. From then on, FFmpeg's real errors
              never reached the log.
            </p>
            <p>
              <strong>Found:</strong> in a review of the game
              server's code, then confirmed by measuring.
            </p>
            <p>
              <strong>Fix:</strong> one flag, -nostats, which
              turns the progress messages off.
            </p>
            <p className="home-lesson">
              <strong>What I took from it:</strong> the part that
              reports problems can be the part that is broken.
            </p>
          </li>
          <li>
            <h3>An update I didn't ask for took the login down</h3>
            <p>
              <strong>Symptom:</strong> the login page said
              "Login failed: Unknown error". Every request to the
              API failed.
            </p>
            <p>
              <strong>Cause:</strong> the backend's list of
              libraries gave almost no version numbers, so a
              rebuild installed the newest of each. That included
              a new SQLAlchemy (2.1), which looks for a different
              database driver by default than the one installed.
              The backend crashed on start, again and again.
            </p>
            <p>
              <strong>Fix:</strong> first, hold SQLAlchemy below
              2.1 to get the site back. Then the real fix: all
              three services now have a lock file, a generated
              list with the exact version of every library, and
              the database address names its driver.
            </p>
            <p className="home-lesson">
              <strong>What I took from it:</strong> if the
              versions aren't written down, every rebuild is a
              silent upgrade.
            </p>
          </li>
          <li>
            <h3>Any logged-in user could end anyone's game</h3>
            <p>
              <strong>Symptom:</strong> none. It was found in a
              review of the gaming routes, by asking for each one:
              who is allowed to call this?
            </p>
            <p>
              <strong>Cause:</strong> the routes that stop a
              session and connect to its video checked that you
              were logged in, but not that the session was yours.
              The list of all sessions was open to every user too,
              so the ids were easy to get. I confirmed it on the
              live server: my account could stop a test session
              that wasn't mine.
            </p>
            <p>
              <strong>Fix:</strong> the backend now looks up who
              owns a session before it acts. If the session isn't
              yours, the answer is 404, the same as for a session
              that doesn't exist, so a stranger can't even learn
              that it is there. The list of all sessions is for
              admins only.
            </p>
            <p className="home-lesson">
              <strong>What I took from it:</strong> "logged in"
              and "allowed" are two different checks.
            </p>
          </li>
        </ol>
      </div>
    </section>
  );
}