import React, { useState, useEffect } from "react";
import axios from "axios";
import VideoPlayer from "./components/VideoPlayer";
import PasswordRequirements from "./components/PasswordRequirements";
import VerifyPage from "./pages/VerifyPage";

// Axios instance for API
const api = axios.create({
  baseURL: "https://api.hakserver.cc/api",
});

function App() {
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [view, setView] = useState("login"); // "login" | "register" | "dashboard" | "library" | "player"
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showPasswordRules, setShowPasswordRules] = useState(false);

  useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("token")) {
    setView("verify");
  }
  }, []);

  // --- Register ---
  const handleRegister = async (e) => {
    try {
      await api.post("/auth/register", { email, username, password });
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
      const res = await api.post("/auth/login", { email, password });
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

  // --- Account Deletion --- 
  const handleAccountDeletion = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.delete("/auth/delete", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage(res.data.message);
      handleLogout();
    } catch (err) {
      setMessage("Failed to delete user: " + (err.response?.data?.detail || "Unknown error"))
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

  // --- Library / Streaming ---
  const fetchVideos = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/media/list", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVideos(res.data.videos);
      setView("library");
    } catch (err) {
      setMessage("Failed to load videos: " + (err.response?.data?.detail || "Unknown error"));
    }
  }

  const openVideo = (video) => {
    setSelectedVideo(video);
    setView("player")
  }

  const backToLibrary = () => {
    setSelectedVideo(null);
    setView("library");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        backgroundColor: "#f9fafc",
        paddingTop: "3rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ marginBottom: "2rem", color: "#222" }}>HakServer</h1>

      <div
        style={{
          backgroundColor: "#fff",
          border: "1px solid #ddd",
          borderRadius: "12px",
          padding: "2rem 3rem",
          boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
          width: "100%",
          maxWidth: "400px",
          position: "relative",
        }}
      >
        {/* REGISTER */}
        {view === "register" && (
          <form onSubmit={(e) => {
            e.preventDefault();

            if (email !== confirmEmail) {
              alert("Emails do not match!");
              return;
            }
            if (password !== confirmPassword) {
              alert("Passwords do not match!");
              return;
            }
            handleRegister();
            }}
          >
            <h2 style={{ textAlign: "center" }}>Register</h2>
            <div style={{marginBottom: "1rem"}}>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                                style={{
                  width: "90%",
                  padding: "0.6rem",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                }}
              />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                type="email"
                required
                style={{
                  width: "90%",
                  padding: "0.6rem",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                }}
              />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <input
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder="Confirm Your Email"
                type="email"
                required
                style={{
                  width: "90%",
                  padding: "0.6rem",
                  border: email === confirmEmail ? "1px solid #ccc" : "1px solid red",
                  borderRadius: "6px",
                }}
              />
              {
                email && confirmEmail && email !== confirmEmail && (
                  <p style={{color:"red", fontSize: "0.8rem"}}>Emails do not match!</p>
                )
              }
            </div>
            <div style={{ position: "relative", marginBottom: "1rem" }}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setShowPasswordRules(true)}
                onBlur={() => setShowPasswordRules(false)}
                placeholder="Password"
                required
                style={{
                  width: "90%",
                  padding: "0.6rem",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                }}
              />
              {showPasswordRules && (
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "calc(100% + 12px)",
                    transform: "translateY(-50%)",
                    background: "#fff",
                    border: "1px solid #ccc",
                    borderRadius: "8px",
                    padding: "0.75rem",
                    fontSize: "0.85rem",
                    minWidth: "200px",
                    zIndex: 10,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  }}
                >
                  <PasswordRequirements password={password} />
                </div>
              )}
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Your Password"
                type="password"
                required
                style={{
                  width: "90%",
                  padding: "0.6rem",
                  border: password === confirmPassword ? "1px solid #ccc" : "1px solid red",
                  borderRadius: "6px",
                }}
              />
              {
                password && confirmPassword && password !== confirmPassword && (
                  <p style={{color:"red", fontSize: "0.8rem"}}>Passwords do not match!</p>
                )
              }
            </div>
            <button
              type="submit"
              style={{
                width: "50%",
                padding: "0.6rem",
                backgroundColor: "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                display: "block",
                margin: "1rem auto 0 auto",
              }}
            >
              Register
            </button>
            <p style={{ marginTop: "1rem", textAlign: "center" }}>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setView("login")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#3b82f6",
                  cursor: "pointer",
                }}
              >
                Login here
              </button>
            </p>
          </form>
        )}

        {/* VERIFY */}
        {view === "verify" && (
          <VerifyPage
            api={api}
            onGoLogin={() => {
              // clear query string so it doesn't keep re-opening verify view
              window.history.replaceState({}, document.title, window.location.pathname);
              setView("login");
            }}
          />
        )}

        {/* LOGIN */}
        {view === "login" && (
          <form onSubmit={handleLogin}>
            <h2 style={{ textAlign: "center" }}>Login</h2>
            <div style={{ marginBottom: "1rem" }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                style={{
                  width: "90%",
                  padding: "0.6rem",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                }}
              />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                style={{
                  width: "90%",
                  padding: "0.6rem",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                }}
              />
            </div>
            <button
              type="submit"
              style={{
                width: "50%",
                padding: "0.6rem",
                backgroundColor: "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                display: "block",
                margin: "1rem auto 0 auto",
              }}
            >
              Login
            </button>
            <p style={{ marginTop: "1rem", textAlign: "center" }}>
              Don’t have an account?{" "}
              <button
                type="button"
                onClick={() => setView("register")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#3b82f6",
                  cursor: "pointer",
                }}
              >
                Register here
              </button>
            </p>
          </form>
        )}

        {/* DASHBOARD */}
        {view === "dashboard" && (
          <div style={{ textAlign: "center" }}>
            <h2>Dashboard</h2>
            <p>Welcome, {username}!</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <button onClick={fetchVideos}>Open Library</button>
              <button onClick={handleLogout}>Logout</button>
              <button
                onClick={handleAccountDeletion}
                style={{ backgroundColor: "crimson", color: "white" }}
              >
                Delete My Account
              </button>
            </div>
          </div>
        )}

        {/* LIBRARY */}
        {view === "library" && (
          <div>
            <h2>Video Library</h2>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {videos.map((v, i) => (
                <li
                  key={i}
                  style={{
                    marginBottom: "0.5rem",
                    cursor: "pointer",
                    backgroundColor: "#eee",
                    padding: "0.5rem",
                    borderRadius: "8px",
                  }}
                  onClick={() => openVideo(v)}
                >
                  {v}
                </li>
              ))}
            </ul>
            <button onClick={handleLogout}>Logout</button>
          </div>
        )}

        {/* VIDEO PLAYER */}
        {view === "player" && <VideoPlayer video={selectedVideo} onBack={backToLibrary} />}
      </div>

      <p style={{ color: "darkred", marginTop: "1rem" }}>{message}</p>
    </div>
  );
}

export default App;
