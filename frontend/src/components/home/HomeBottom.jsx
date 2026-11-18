import React, { useState } from "react";
import { REPO_URL, LINKEDIN_URL, emailAddress } from "./links.jsx";

export default function HomeBottom() {
  const [email, setEmail] = useState("");

  function emailMe() {
    const address = emailAddress();
    setEmail(address);
    window.location.href = "mailto:" + address;
  }

  return (
    <footer className="home-bottom">
      <section className="home-section">
        <h2 className="home-section__title">Get in touch</h2>

        <div className="home-section__body">
          <p className="home-section__lead">
            I'm looking for a backend or platform role in Toronto.
            If you'd like to talk about one, or about this
            project, write to&nbsp;me.
          </p>

          <div className="home-bottom__buttons">
            <button
              type="button"
              className="btn home-bottom__email"
              onClick={emailMe}
            >
              Email me
            </button>
            <a className="btn btn--ghost" href={LINKEDIN_URL}>
              LinkedIn
            </a>
            <a className="btn btn--ghost" href={REPO_URL}>
              GitHub
            </a>
          </div>
          {email && <p className="home-bottom__address">{email}</p>}

          <p className="home-section__small">
            Hakan Ozcan &middot; Toronto, ON
            <br />
            This page is served by the same Mac Mini it describes.
          </p>
        </div>
      </section>
    </footer>
  );
}