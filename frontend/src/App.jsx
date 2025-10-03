import React, { useState } from "react";
import axios from "axios";

// Create axios instance with API base URL
const api = axios.create({
  baseURL: "https://api.hakserver.cc/api", // backend subdomain
});

function App() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/auth/login", { username, password });
      const token = res.data.access_token;
      localStorage.setItem("token", token);
      setMessage("Login successful! Token saved.");
    } catch (err) {
      setMessage("Login failed.");
    }
  };

  const testProtected = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/protected", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage(res.data.message);
    } catch (err) {
      setMessage("Unauthorized");
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>HomeServer Login</h1>
      <form onSubmit={handleLogin}>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />
        <button type="submit">Login</button>
      </form>
      <button onClick={testProtected}>Test Protected</button>
      <p>{message}</p>
    </div>
  );
}

export default App;
