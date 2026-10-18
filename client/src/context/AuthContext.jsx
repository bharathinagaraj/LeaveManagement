import { createContext, useContext, useState, useCallback } from "react";
import { login as loginRequest, clearSession } from "@/services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("leav_user")) || null;
    } catch {
      return null;
    }
  });

  const login = useCallback(async (email, password, role) => {
    const loggedInUser = await loginRequest(email, password, role);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const value = { user, loading: false, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}