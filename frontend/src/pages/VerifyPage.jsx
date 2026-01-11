import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "../lib/api.jsx";
import "../styles/verify.css";

export default function VerifyPage() {
  const [params] = useSearchParams();
  const token = params.get("token");

  const [status, setStatus] = useState("idle"); // idle | loading | ok | fail | resent
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

      // 🔎 DEBUG: guarantees visibility even if request fails
      const url = `/auth/verify?token=${encodeURIComponent(token)}`;
      console.log("VERIFY REQUEST URL:", api.defaults.baseURL + url);

      try {
        const res = await api.get(url); // ← token is now part of URL
        setStatus("ok");
        setMsg(res.data.message || "Email verified.");
      } catch (err) {
        setStatus("fail");

        const detail = err?.response?.data?.detail;
        const text =
          typeof detail === "string"
            ? detail
            : Array.isArray(detail)
              ? detail.map(e => e.msg).join(", ")
              : "Verification failed.";

        setMsg(text);
      }
    };

    run();
  }, [token]);

  const handleReSend = async () => {
    if (!token) {
      setStatus("fail");
      setMsg("Missing verification token.");
      return;
    }

    setMsg("Sending verification email...");

    const url = `/auth/resend-verification?token=${encodeURIComponent(token)}`;
    console.log("RESEND REQUEST URL:", api.defaults.baseURL + url);

    try {
      const res = await api.post(url); // ← token visible
      setStatus("resent");
      setMsg(res.data.message);
    } catch (err) {
      setStatus("fail");
      setMsg(err?.response?.data?.detail || "Couldn't send verification email.");
    }
  };

  return (
    <div className="page page--center">
      <div className="card">
        <h2 className="card__title">Email Verification</h2>

        {status === "loading" && <p className="muted">Verifying your email...</p>}
        {status === "ok" && <p className="msg msg--ok">{msg}</p>}
        {status === "fail" && <p className="msg msg--error">{msg}</p>}
        {status === "resent" && <p className="msg msg--ok">{msg}</p>}

        <div className="row row--center">
          {status === "ok" && (
            <Link className="btn btn--ghost" to="/login">
              Go to Login
            </Link>
          )}

          {(status === "fail" || status === "resent") && (
            <button className="btn btn--ghost" onClick={handleReSend}>
              Re-Send Verification
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
