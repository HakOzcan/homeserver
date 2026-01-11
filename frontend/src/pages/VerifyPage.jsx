import React, { useEffect, useState } from "react";

export default function VerifyPage({ api, onGoLogin }) {
  const [status, setStatus] = useState("loading"); // loading | success | pending | already | error
  const [msg, setMsg] = useState("");
  const [token, setToken] = useState("");
  const [resendMsg, setResendMsg] = useState("");
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedToken = params.get("token");

    if (!requestedToken) {
      setStatus("error");
      setMsg("Missing verification token.");
      return;
    }
    else{
        setToken(requestedToken);
    }

    (async () => {
      try {
        // NOTE: your api baseURL is already .../api
        const res = await api.get(`/auth/verify?token=${token}`);

        const { email_verified, is_active, message } = res.data;

        setMsg(message || "Email verified.");

        if (is_active === true) {
          setStatus("success"); // verified + approved
        } else {
          // verified but waiting for admin approval
          setStatus("pending");
        }
      } catch (err) {
        const detail = err.response?.data?.detail || "Verification failed.";
        setStatus("error");
        setMsg(detail);
      }
    })();
  }, [api]);

  const resendVerification = async () => {
    try {
      setResending(true);
      setResendMsg("");
      await api.post("/auth/resend-verification", { token });
      setResendMsg("Verification email sent. Please check your inbox (and spam).");
    } catch (err) {
      setResendMsg(err.response?.data?.detail || "Failed to resend verification email.");
    } finally {
      setResending(false);
    }
  };

  // ---- UI ----
  return (
    <div style={styles.container}>
      <h2 style={{ marginBottom: "0.75rem", textAlign: "center" }}>Email Verification</h2>

      {status === "loading" && <p style={styles.text}>Verifying your email…</p>}

      {status === "pending" && (
        <>
          <p style={styles.success}>
            ✅ Your email was verified successfully.
          </p>
          <p style={styles.text}>
            Please wait for admin approval to complete registration.
          </p>
          <button style={styles.button} onClick={onGoLogin}>Go to Login</button>
        </>
      )}

      {status === "success" && (
        <>
          <p style={styles.success}>✅ Your account is active.</p>
          <p style={styles.text}>You can log in now.</p>
          <button style={styles.button} onClick={onGoLogin}>Go to Login</button>
        </>
      )}

      {status === "error" && (
        <>
          <p style={styles.error}>❌ {msg}</p>

          <div style={{ marginTop: "1rem" }}>
            <p style={styles.text}>
              Want a new verification link?
            </p>
            <button style={styles.button} onClick={resendVerification} disabled={resending}>
              {resending ? "Sending…" : "Send new verification email"}
            </button>

            {resendMsg && (
              <p style={{ ...styles.text, marginTop: "0.75rem" }}>{resendMsg}</p>
            )}

            <button style={styles.linkBtn} onClick={onGoLogin}>Back to Login</button>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "420px",
    margin: "4rem auto",
    padding: "1.5rem",
    border: "1px solid #ddd",
    borderRadius: "12px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
    background: "#fff",
    fontFamily: "sans-serif",
  },
  text: { textAlign: "center", margin: "0.5rem 0" },
  success: { textAlign: "center", color: "green", fontWeight: 600 },
  error: { textAlign: "center", color: "crimson", fontWeight: 600 },
  input: {
    width: "100%",
    padding: "0.65rem",
    border: "1px solid #ccc",
    borderRadius: "8px",
    marginTop: "0.5rem",
  },
  button: {
    width: "100%",
    marginTop: "0.75rem",
    padding: "0.65rem",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
  },
  linkBtn: {
    width: "100%",
    marginTop: "0.5rem",
    padding: "0.5rem",
    border: "1px solid #ccc",
    borderRadius: "8px",
    background: "transparent",
    cursor: "pointer",
  },
};
