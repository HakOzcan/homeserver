import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "../lib/api.jsx";
import "../styles/verify.css";

export default function VerifyPage() {
  const [params] = useSearchParams();
  const requestedToken = params.get("token");

  const [status, setStatus] = useState("idle"); // idle | ok | fail | loading | resent
  const [token, setToken] = useState(requestedToken);
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
        await api.get("/auth/verify", token);
        setStatus("ok");
        setMsg("Your email was verified successfully. Please wait for admin approval.");
      } catch (err) {
        setStatus("fail");
        setMsg(err.response?.data?.detail || "Verification failed. Token may be expired.");
      }
    };

    run();
  }, [token]);

  const handleReSend = async () => {
  setMsg("Sending verification email...");

    try{
        const res = await api.get("/auth/resend-verification", token);
        setStatus("resent");
        setMsg(res.data.message);
      } catch (err) {
        setStatus("fail");
        setMsg(err.response?.data?.detail || "Couldn't send the verification email!");
    }
  }



  return (
    <div className="page page--center">
      <div className="card">
        <h2 className="card__title">Email Verification</h2>

        {status === "loading" && <p className="muted">Verifying your email...</p>}

        {status === "ok" && <p className={"msg msg--ok"}>{msg}</p>}

        {status === "fail" && <p className={"msg msg--error"}>{msg}</p>}

        <div className="row row--center">
          {status === "ok" && (
            <Link className="btn btn--ghost" to="/login">
            Go to Login
          </Link>
          )}

          {status === "fail" && (
            <button className="btn btn--ghost" onClick={handleReSend}>
            Re-Send Verification
          </button>
          )}
        </div>
      </div>
    </div>
  );
}
