import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api.jsx";
import PasswordRequirements from "../components/PasswordRequirements.jsx";
import "../styles/auth.css";

export default function RegisterPage() {
  const nav = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPasswordRules, setShowPasswordRules] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();

    if (email !== confirmEmail) {
      setMsg("Emails do not match.");
      return;
    }
    if (password !== confirmPassword) {
      setMsg("Passwords do not match.");
      return;
    }

    setMsg("");
    setLoading(true);
    try {
      await api.post("/auth/register", { email, password, username });
      setMsg("Registered! Please check your email to verify your account.");
      // send user to login after a short delay (or immediately)
      setTimeout(() => nav("/login"), 800);
    } catch (err) {
      setMsg("Registration failed: " + (err.response?.data?.detail || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page page--center">
      <div className="card">
        <h2 className="card__title">Register</h2>

        <form onSubmit={handleRegister} className="form">
          <input
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username (display name)"
          />

          <input
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            type="email"
            required
          />

          <input
            className={`input ${confirmEmail && email !== confirmEmail ? "input--bad" : ""}`}
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            placeholder="Confirm Email"
            type="email"
            required
          />

          <div className="passwordRow">
            <input
              className="input input--grow"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setShowPasswordRules(true)}
              onBlur={() => setShowPasswordRules(false)}
              placeholder="Password"
              type="password"
              required
            />

            {showPasswordRules && (
              <div className="passwordPopover">
                <PasswordRequirements password={password} />
              </div>
            )}
          </div>

          <input
            className={`input ${confirmPassword && password !== confirmPassword ? "input--bad" : ""}`}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm Password"
            type="password"
            required
          />

          <button className="btn btn--primary btn--half" disabled={loading} type="submit">
            {loading ? "Registering..." : "Register"}
          </button>

          {msg && <p className={`msg ${msg.toLowerCase().includes("failed") ? "msg--error" : "msg--ok"}`}>{msg}</p>}

          <p className="hint">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
