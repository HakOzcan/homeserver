import axios from "axios";

export const api = axios.create({
  baseURL: "https://api.hakserver.cc/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if(error.response && error.response.status === 401) {
      const detail = error.response.data?.detail || "";
      localStorage.removeItem("token");
      localStorage.removeItem("user_email");

      const reason = detail.includes("another location")
        ? "session_replaced"
        : "expired";
      window.location.href = `/login?reason=${reason}`;
    }
    return Promise.reject(error);
  }
);
