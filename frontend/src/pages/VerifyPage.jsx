import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api.jsx";
import "../styles/verify.css";

export default function VerifyPage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const navigate = useNavigate();

  // status: idle | loading | ok | fail | already_verified | resent
  const [status, setStatus] = useState("idle");
  const [msg, setMsg] = useState("");

  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Auto-redirect after success / already verified
  const [redirectIn, setRedirectIn] = useState(null); // number | null
  const redirectTimerRef = useRef(null);
  const countdownRef = useRef(null);

  // Frontend resend cooldown (prevents spamming button)
  const RESEND_COOLDOWN_SECONDS = 120;
  const [resendCooldown, setResendCooldown] = useState(0);
  const resendCooldownRef = useRef(null);

  const canResend = useMemo(() => {
    if (!token) return false;
    if (isVerifying || isResending) return false;
    return resendCooldown === 0;
  }, [token, isVerifying, isResending, resendCooldown]);

  const normalizeError = (err, fallback = "Something went wrong.") => {
    const data = err?.response?.data;
    const detail = data?.detail;

    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      // FastAPI validation errors
      const msgs = detail.map((e) => e?.msg).filter(Boolean);
      if (msgs.length) return msgs.join(", ");
    }
    return fallback;
  };

  const startRedirectCountdown = (seconds = 5) => {
    // clear any previous timers
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    setRedirectIn(seconds);

    countdownRef.current = setInterval(() => {
      setRedirectIn((prev) => (typeof prev === "number" ? Math.max(prev - 1, 0) : prev));
    }, 1000);

    redirectTimerRef.current = setTimeout(() => {
      navigate("/login", { replace: true });
    }, seconds * 1000);
  };

  const startResendCooldown = (seconds = RESEND_COOLDOWN_SECONDS) => {
    if (resendCooldownRef.current) clearInterval(resendCooldownRef.current);
    setResendCooldown(seconds);

    resendCooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        const next = Math.max(prev - 1, 0);
        if (next === 0 && resendCooldownRef.current) {
          clearInterval(resendCooldownRef.current);
          resendCooldownRef.current = null;
        }
        return next;
      });
    }, 1000);
  };

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setStatus("fail");
        setMsg("Missing verification token.");
        return;
      }

      setIsVerifying(true);
      setStatus("loading");
      setMsg("");

      try {
        const res = await api.get("/auth/verify", { params: { token } });

        setStatus("ok");
        setMsg(res.data?.message || "Email verified.");
        startRedirectCountdown(5);
      } catch (err) {
        const code = err?.response?.status;

        if (code === 409) {
          setStatus("already_verified");
          setMsg("Your email is already verified. You can log in.");
          startRedirectCountdown(5);
        } else {
          setStatus("fail");
          setMsg(normalizeError(err, "Verification failed. The link may be invalid or expired."));
        }
      } finally {
        setIsVerifying(false);
      }
    };

    run();

    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (resendCooldownRef.current) clearInterval(resendCooldownRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleReSend = async () => {
    if (!token) {
      setStatus("fail");
      setMsg("Missing verification token.");
      return;
    }

    if (!canResend) return;

    setIsResending(true);
    setMsg("Sending verification email...");

    try {
      const res = await api.post("/auth/resend-verification", null, { params: { token } });

      setStatus("resent");
      setMsg(res.data?.message || "Verification email sent.");
      startResendCooldown();
    } catch (err) {
      const code = err?.response?.status;

      if (code === 409) {
        setStatus("already_verified");
        setMsg("Your email is already verified. You can log in.");
        startRedirectCountdown(5);
      } else {
        setStatus("fail");
        setMsg(normalizeError(err, "Couldn't send the verification email."));
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="page page--center">
      <div className="card">
        <h2 className="card__title">Email Verification</h2>

        {status === "loading" && <p className="muted">Verifying your email...</p>}

        {status === "ok" && <p className="msg msg--ok">{msg}</p>}

        {status === "already_verified" && <p className="msg msg--ok">{msg}</p>}

        {status === "resent" && <p className="msg msg--ok">{msg}</p>}

        {status === "fail" && <p className="msg msg--error">{msg}</p>}

        {typeof redirectIn === "number" && (status === "ok" || status === "already_verified") && (
          <p className="muted">Redirecting to login in {redirectIn}s…</p>
        )}

        <div className="row row--center">
          {(status === "ok" || status === "already_verified") && (
            <Link className="btn btn--ghost" to="/login">
              Go to Login
            </Link>
          )}

          {(status === "fail" || status === "resent") && (
            <button
              className="btn btn--ghost"
              onClick={handleReSend}
              disabled={!canResend}
              title={!canResend ? "Please wait…" : "Resend verification email"}
            >
              {isResending
                ? "Sending…"
                : resendCooldown > 0
                  ? `Re-Send (${resendCooldown}s)`
                  : "Re-Send Verification"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
