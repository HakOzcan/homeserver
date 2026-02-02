import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.jsx";


export default function AdminPanelPage() {
  const [pending, setPending] = useState([]);
  const [msg, setMsg] = useState("");

  const token = localStorage.getItem("token");

  const load = async () => {
    try {
      const res = await api.get("/admin/pending-users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPending(res.data.users);
    } catch (err) {
      setMsg(err.response?.data?.detail || "Failed to load pending users");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const approve = async (id) => {
    try {
      await api.post(`/admin/approve/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMsg("Approved ✅");
      load();
    } catch (err) {
      setMsg(err.response?.data?.detail || "Approve failed");
    }
  };

  const reject = async (id) => {
    try {
      await api.post(`/admin/reject/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMsg("Rejected ❌");
      load();
    } catch (err) {
      setMsg(err.response?.data?.detail || "Reject failed");
    }
  };

  return (
  <div className="page page--center">
      <div className="content content--narrow">
      <div className="topbar">
          <div className="brand">HomeServer</div>
          <div className="row">
          <Link to="/dashboard" className="btn btn--ghost">
              ← Dashboard
          </Link>
          </div>
      </div>  
      <div className="content">
          <div className="card">
          <h2 className="card__title">Admin Panel</h2>  
          {msg && (
              <p className={`msg ${msg.toLowerCase().includes("error") || msg.toLowerCase().includes("fail") ? "msg--error" : "msg--ok"}`}>
              {msg}
              </p>
          )}  
          {pending.length === 0 ? (
              <p className="muted" style={{ textAlign: "center" }}>
              No pending users 🎉
              </p>
          ) : (
              <ul className="videoList">
              {pending.map((u) => (
                  <li key={u.id} className="videoItem" style={{ cursor: "default" }}>
                  <div>
                      <b>{u.email}</b> <span className="muted">({u.username || "no username"})</span>
                  </div>  
                  <div className="row" style={{ marginTop: 10 }}>
                      <button className="btn btn--primary" onClick={() => approve(u.id)}>
                      Approve
                      </button>
                      <button className="btn btn--danger" onClick={() => reject(u.id)}>
                      Reject
                      </button>
                  </div>
                  </li>
              ))}
              </ul>
          )}
          </div>
      </div>
      </div>
  </div>
  );
}
