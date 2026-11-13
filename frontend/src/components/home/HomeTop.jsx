import React from "react";
import { Link } from "react-router-dom";

const REPO_URL = "https://github.com/HakOzcan/homeserver";

export default function HomeTop() {
    return (
        <header className="home-top">
            <nav className="home-top__bar">
                <Link className="btn btn--ghost" to="/login">Log in</Link>
                <Link className="btn btn--ghost" to="/register">Register</Link>
            </nav>

            <div className="home-top__grid">
                <div>
                    <h1 className="home-top__name">HakServer</h1>
                    <p className="home-top__tagline">
                        A self-hosted streaming and cloud-gaming platform,
                        built and run by Hakan Ozcan.
                    </p>
                    <p className="home-top__lede">
                        Games run on a Mac Mini in my home and stream to a 
                        browser tab over WebRTC, with nothing to install.
                    </p>
                    <a className="btn home-top__code" href={REPO_URL}>
                        View the code on GitHub
                    </a>
                    <p className="home-top__note">
                        Private instance: accounts are approved by hand.
                        <br />
                        <a href ="#no-demo">
                            Why there's no demo login {" "}
                            <span aria-hidden="true">&darr;</span>
                        </a>
                    </p>
                </div>

                <div className="home-top__tour">
                    The tour video will be here.
                </div>
            </div>
        </header>
    );
}