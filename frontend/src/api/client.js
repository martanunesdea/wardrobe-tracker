/**
 * api/client.js — Centralised HTTP client for all backend calls.
 * Swap the BASE_URL to point at a different environment (staging, prod).
 * All methods return { data, error } so callers can handle errors uniformly.
 */

export const BASE_URL = process.env.REACT_APP_API_URL || "";

function getToken() {
  return localStorage.getItem("wardrobe_token");
}

async function request(method, path, body = null, isFormData = false) {
  const headers = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!isFormData) headers["Content-Type"] = "application/json";

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body
        ? isFormData
          ? body
          : JSON.stringify(body)
        : undefined,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { data: null, error: data.error || `HTTP ${res.status}` };
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (email, password) =>
    request("POST", "/api/auth/register", { email, password }),
  login: (email, password) =>
    request("POST", "/api/auth/login", { email, password }),
};

// ── Collections ───────────────────────────────────────────────────────────────
export const collectionsApi = {
  list: () => request("GET", "/api/collections"),
  create: (payload) => request("POST", "/api/collections", payload),
  update: (id, payload) => request("PUT", `/api/collections/${id}`, payload),
  delete: (id) => request("DELETE", `/api/collections/${id}`),
};

// ── Items ─────────────────────────────────────────────────────────────────────
export const itemsApi = {
  list: (collectionId) =>
    request("GET", `/api/items${collectionId ? `?collectionId=${collectionId}` : ""}`),
  create: (formData) => request("POST", "/api/items", formData, true),
  update: (id, formData) => request("PUT", `/api/items/${id}`, formData, true),
  delete: (id) => request("DELETE", `/api/items/${id}`),
};

// ── Wishlist ──────────────────────────────────────────────────────────────────
export const wishlistApi = {
  list: () => request("GET", "/api/wishlist"),
  create: (payload) => request("POST", "/api/wishlist", payload),
  delete: (id) => request("DELETE", `/api/wishlist/${id}`),
  addToWardrobe: (id, payload) =>
    request("POST", `/api/wishlist/${id}/add-to-wardrobe`, payload),
  shoppingPriority: (formula = "simple") =>
    request(
      "GET",
      `/api/wishlist/shopping-priority?formula=${encodeURIComponent(formula)}`,
    ),
};
