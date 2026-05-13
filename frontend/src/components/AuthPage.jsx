/**
 * components/AuthPage.jsx — Login / Register screen.
 */

import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";

export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fn = mode === "login" ? login : register;
    const { error: err } = await fn(email, password);
    if (err) setError(err);
    setLoading(false);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <div style={styles.logo}>👗</div>
        <h1 style={styles.title}>Wardrobe</h1>
        <p style={styles.subtitle}>
          {mode === "login" ? "Sign in to your wardrobe" : "Create your account"}
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            style={styles.input}
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Password (min 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.btn} type="submit" disabled={loading}>
            {loading ? "…" : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <p style={styles.toggle}>
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            style={styles.link}
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
          >
            {mode === "login" ? "Register" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
  },
  card: {
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 20,
    padding: "48px 40px",
    width: "100%",
    maxWidth: 400,
    textAlign: "center",
    boxShadow: "0 25px 50px rgba(0,0,0,0.4)",
  },
  logo: { fontSize: 48, marginBottom: 8 },
  title: { color: "#fff", fontSize: 32, fontWeight: 700, margin: "0 0 8px" },
  subtitle: { color: "rgba(255,255,255,0.6)", margin: "0 0 32px", fontSize: 14 },
  form: { display: "flex", flexDirection: "column", gap: 12 },
  input: {
    padding: "14px 16px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
    fontSize: 15,
    outline: "none",
  },
  error: { color: "#ff6b6b", fontSize: 13, margin: 0 },
  btn: {
    padding: "14px",
    borderRadius: 10,
    border: "none",
    background: "linear-gradient(135deg, #6c63ff, #a855f7)",
    color: "#fff",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 4,
  },
  toggle: { marginTop: 24, color: "rgba(255,255,255,0.5)", fontSize: 13 },
  link: {
    background: "none",
    border: "none",
    color: "#a78bfa",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
  },
};
