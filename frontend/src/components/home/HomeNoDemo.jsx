import React, { useState } from "react";
import { REPO_URL, emailAddress } from "./links.jsx";

export default function HomeNoDemo() {
  const [email, setEmail] = useState("");

  function askForDemo() {
    const address = emailAddress();
    setEmail(address);
    window.location.href = "mailto:" + address;
  }
  return (
    <section className="home-section" id="no-demo">
      <h2 className="home-section__title">Why there's no demo login</h2>

      <div className="home-section__body">
        <p className="home-section__lead">
          A shared demo login would be the quick way to let you
          in. I left it out on purpose, because it would skip
          the account rules.
        </p>
        <p>
          Every account needs a verified email and my approval.
          A password posted on a public page skips both.
        </p>

        <p className="home-section__lead">What you can do instead:</p>

        <ul className="home-bullets">
          <li>
            Watch <a href="#tour">the tour at the top</a>. It
            shows the app from login to a running game.
          </li>
          <li>
            Read <a href={REPO_URL}>the code on GitHub</a>.
          </li>
          <li>
            Ask me for a live demo. I'm happy to walk through
            it on a call.
          </li>
        </ul>

        <button
        type="button"
        className="btn home-demo-button"
        onClick={askForDemo}
        >
          Ask for a live demo
        </button>
        {email && <p className="home-demo-email">{email}</p>}
      </div>
    </section>
  );
}