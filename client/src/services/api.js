import axios from "axios";

const configuredBaseUrl = import.meta.env.VITE_API_URL?.replace(/\/+$/, "");
const apiBaseUrl = configuredBaseUrl
  ? `${configuredBaseUrl.replace(/\/api$/i, "")}/api`
  : "/api";

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("leav_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const apiError = error.response?.data?.error;
    const apiMessage =
      typeof apiError === "string"
        ? apiError
        : apiError && typeof apiError.message === "string"
          ? apiError.message
          : null;
    const message = apiMessage
      ? status >= 500
        ? `${apiMessage}. Check that the backend is running and PostgreSQL is available.`
        : apiMessage
      : error.response
        ? status === 500
          ? "The API server is unavailable. Start the full application with `npm run dev` from the project folder; it starts PostgreSQL, the API, and the frontend."
          : `The API could not complete this request${status ? ` (HTTP ${status})` : ""}. Open http://localhost:5000/api/health to check its database connection, then inspect the backend terminal for details.`
        : "Cannot reach the API. Start the full application with `npm run dev` from the project folder; it starts PostgreSQL, the API, and the frontend.";
    const wrapped = new Error(message);
    wrapped.status = error.response?.status;
    wrapped.originalError = error;
    return Promise.reject(wrapped);
  }
);

export default api;