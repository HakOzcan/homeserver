import React, { useState } from "react";
import axios from "axios";

// Axios instance for API
const api = axios.create({
  baseURL: "https://api.hakserver.cc/api",
});

function App() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [view, setView] = useState("login"); // "login" | "register" | "dashboard"

  // --- Register ---
  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await api.post("/auth/register", { username, password });
      setMessage("Registration successful! You can now log in.");
      setView("login");
    } catch (err) {
      setMessage("Registration failed: " + (err.response?.data?.detail || "Unknown error"));
    }
  };

  // --- Login ---
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/auth/login", { username, password });
      const token = res.data.access_token;
      localStorage.setItem("token", token);
      setIsLoggedIn(true);
      setMessage("Login successful!");
      setView("dashboard");
    } catch (err) {
      setMessage("Login failed: " + (err.response?.data?.detail || "Unknown error"));
    }
  };

  // --- Test Protected route ---
  const testProtected = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/protected", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage(res.data.message);
    } catch {
      setMessage("Unauthorized or token expired.");
    }
  };

  // --- Logout ---
  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    setUsername("");
    setPassword("");
    setMessage("Logged out.");
    setView("login");
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "400px", margin: "0 auto" }}>
      <h1>HomeServer</h1>

      {view === "register" && (
        <form onSubmit={handleRegister}>
          <h2>Register</h2>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
          />
          <button type="submit">Register</button>
          <p>
            Already have an account?{" "}
            <button type="button" onClick={() => setView("login")}>
              Login here
            </button>
          </p>
        </form>
      )}

      {view === "login" && (
        <form onSubmit={handleLogin}>
          <h2>Login</h2>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
          />
          <button type="submit">Login</button>
          <p>
            Don’t have an account?{" "}
            <button type="button" onClick={() => setView("register")}>
              Register here
            </button>
          </p>
        </form>
      )}

      {view === "dashboard" && (
        <div>
          <h2>Dashboard</h2>
          <p>Welcome, {username}!</p>
          <button onClick={testProtected}>Test Protected Route</button>
          <button onClick={handleLogout}>Logout</button>
        </div>
      )}

      <p style={{ color: "darkred" }}>{message}</p>
    </div>
  );
}

export default App;
