import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "./lib/api.jsx";
import "./styles/verify.css";

export default function VerifyPage() {
  const [params] = useSearchParams();
  const token = params.get("token");

  const [status, setStatus] = useState("idle"); // idle | ok | fail | loading
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setStatus("fail");
        setMsg("Missing verification token.");
        return;
      }

      setStatus("loading");
      setMsg("");

      try {
        await api.get(`/auth/verify?token=${encodeURIComponent(token)}`);
        setStatus("ok");
        setMsg("Your email was verified successfully. Please wait for admin approval.");
      } catch (err) {
        setStatus("fail");
        setMsg(err.response?.data?.detail || "Verification failed. Token may be expired.");
      }
    };

    run();
  }, [token]);

  return (
    <div className="page page--center">
      <div className="card">
        <h2 className="card__title">Email Verification</h2>

        {status === "loading" && <p className="muted">Verifying your email...</p>}

        {status !== "loading" && <p className={status === "ok" ? "msg msg--ok" : "msg msg--error"}>{msg}</p>}

        <div className="row row--center">
          <Link className="btn btn--ghost" to="/login">
            Go to Login
          </Link>

          {/* Optional later: a resend endpoint */}
          {/* <button className="btn btn--primary">Resend Verification</button> */}
        </div>
      </div>
    </div>
  );
}
