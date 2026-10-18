import api from "./api";

// role: "employee" | "manager" — each role has its own table and login endpoint.
export const login = async (email, password, role) => {
  const { data } = await api.post(`/auth/login/${role}`, { email, password });
  sessionStorage.setItem("leav_token", data.token);
  sessionStorage.setItem("leav_user", JSON.stringify(data.user));
  return data.user;
};

export const register = async ({ name, email, password }) => {
  const { data } = await api.post("/auth/register", {
    name,
    email,
    password,
  });
  return data.user;
};

export const fetchMe = async () => {
  const { data } = await api.get("/auth/me");
  return data.user;
};

export const clearSession = () => {
  sessionStorage.removeItem("leav_token");
  sessionStorage.removeItem("leav_user");
};