import axios from "axios";

// Token-based Sanctum SPA auth (Bearer personal-access token).
// We intentionally do NOT use cookie/session auth, so:
//   - withCredentials is false (no session cookies are sent)
//   - withXSRFToken is false (no XSRF-TOKEN header is needed)
// This keeps every /api/* request in the stateless `api` middleware
// group, which performs NO CSRF verification -> a 419 can never happen.
const rawApiUrl =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "https://fastfood-backend-production-cec51710.up.railway.app/api";
const normalizedBaseUrl = rawApiUrl.endsWith("/api") ? rawApiUrl : `${rawApiUrl.replace(/\/+$/, '')}/api`;

const api = axios.create({
  baseURL: normalizedBaseUrl,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: false,
  withXSRFToken: false,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
