/**
 * hooks/useAuth.js — Authentication context and hook.
 * Wraps token storage and provides login/logout/register to the whole app.
 */

import React, { createContext, useContext, useState, useCallback } from "react";
import { authApi } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("wardrobe_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback(async (email, password) => {
    const { data, error } = await authApi.login(email, password);
    if (error) return { error };
    localStorage.setItem("wardrobe_token", data.token);
    localStorage.setItem("wardrobe_user", JSON.stringify(data.user));
    setUser(data.user);
    return { error: null };
  }, []);

  const register = useCallback(async (email, password) => {
    const { data, error } = await authApi.register(email, password);
    if (error) return { error };
    localStorage.setItem("wardrobe_token", data.token);
    localStorage.setItem("wardrobe_user", JSON.stringify(data.user));
    setUser(data.user);
    return { error: null };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("wardrobe_token");
    localStorage.removeItem("wardrobe_user");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
