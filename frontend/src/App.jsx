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
  const [view, setView] = useState("login"); // "login" | "register" | "dashboard" | "library" | "player"
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);

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
    <div style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "900px", margin: "0 auto" }}>
      <h1>HomeServer</h1>

      {/* REGISTER */}
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

      {/* LOGIN */}
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


      {/* DASHBOARD */}
      {view === "dashboard" && (
        <div>
          <h2>Dashboard</h2>
          <p>Welcome, {username}!</p>
          <button onClick={fetchVideos}>Open Library</button>
          <button onClick={handleLogout}>Logout</button>
          <button
            onClick={handleAccountDeletion}
            style={{ backgroundColor: "crimson", color: "white", marginLeft: "0.5rem" }}
          >
            Delete My Account
          </button>
        </div>
      )}

      {/* LIBRARY */}
      {view === "library" && (
        <div>
          <h2>Video Library</h2>
          <ul style={{ listStyle: "none", padding: 0}}>
            {videos.map((v,i) => (
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

      <p style={{ color: "darkred" }}>{message}</p>
    </div>
  );
}

export default App;
