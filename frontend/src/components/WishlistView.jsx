/**
 * components/WishlistView.jsx — Wishlist + Shopping Priority tab.
 */

import React, { useState } from "react";
import { flattenCollections } from "../utils/collections";

const STATUS_COLOR = { red: "#ef4444", amber: "#f59e0b", green: "#10b981" };
const STATUS_BG = { red: "#7f1d1d22", amber: "#78350f22", green: "#064e3b22" };
const STATUS_LABEL = { red: "Urgent", amber: "Needs attention", green: "On track" };

const FORMULA_OPTIONS = [
  { value: "simple", label: "Simple average (50/50)" },
  { value: "harmonic", label: "Harmonic mean" },
  { value: "min_based", label: "Min-based mean" },
];

export default function WishlistView({
  wishlist,
  priorities,
  addWish,
  removeWish,
  promoteToWardrobe,
  collections,
  priorityFormula,
  setPriorityFormula,
}) {
  const [form, setForm] = useState({ name: "", url: "", notes: "" });
  const [showForm, setShowForm] = useState(false);
  const [promoting, setPromoting] = useState(null); // wish id
  const [promoteForm, setPromoteForm] = useState({ collectionId: "", rating: 3 });
  const [error, setError] = useState("");

  const handleAdd = async () => {
    if (!form.name.trim()) return setError("Name is required");
    setError("");
    await addWish(form);
    setForm({ name: "", url: "", notes: "" });
    setShowForm(false);
  };

  const handlePromote = async () => {
    await promoteToWardrobe(promoting, promoteForm);
    setPromoting(null);
  };

  const flatCols = flattenCollections(collections);

  return (
    <div style={container}>
      <div style={viewToolbar}>
        <span style={viewToolbarSpacer} aria-hidden />
        <label style={formulaLabel}>
          Priority calculation
          <select
            style={formulaSelect}
            value={priorityFormula}
            onChange={(e) => setPriorityFormula(e.target.value)}
            aria-label="Priority calculation formula"
          >
            {FORMULA_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Shopping Priority */}
      <section style={section}>
        <h2 style={heading}>Shopping Priority</h2>
        <p style={sub}>Collections ranked by how far they are from their targets.</p>
        {priorities.length === 0 ? (
          <p style={empty}>No collections to rank yet.</p>
        ) : (
          <div style={priorityList}>
            {priorities.map((p, i) => (
              <div key={p.collectionId} style={{ ...priorityCard, background: STATUS_BG[p.status] }}>
                <div style={rankNum}>#{i + 1}</div>
                <div style={priorityInfo}>
                  <span style={priorityName}>{p.collectionName}</span>
                  <span style={{ ...statusBadge, background: STATUS_COLOR[p.status] + "33", color: STATUS_COLOR[p.status] }}>
                    {STATUS_LABEL[p.status]}
                  </span>
                </div>
                <div style={priorityStats}>
                  <span style={stat}>
                    🧥 {p.itemCount}/{p.targetItemCount} items ({p.itemFillPct}%)
                  </span>
                  <span style={stat}>
                    ⭐ {p.avgRating}/{p.targetAvgRating} avg rating
                  </span>
                </div>
                <div style={scoreBar}>
                  <div
                    style={{
                      height: 4, borderRadius: 2,
                      width: `${p.score}%`,
                      background: STATUS_COLOR[p.status],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Wishlist */}
      <section style={section}>
        <div style={wishHeader}>
          <h2 style={heading}>Wishlist</h2>
          <button style={addBtn} onClick={() => setShowForm((v) => !v)}>
            {showForm ? "✕ Cancel" : "+ Add Item"}
          </button>
        </div>

        {showForm && (
          <div style={addForm}>
            <input
              style={input} placeholder="Item name *"
              value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <input
              style={input} placeholder="URL (optional)"
              value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            />
            <input
              style={input} placeholder="Notes (optional)"
              value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
            {error && <p style={errorTxt}>{error}</p>}
            <button style={saveBtn} onClick={handleAdd}>Save to Wishlist</button>
          </div>
        )}

        {wishlist.length === 0 && !showForm && (
          <p style={empty}>Your wishlist is empty. Add items you'd like to buy.</p>
        )}

        <div style={wishList}>
          {wishlist.map((w) => (
            <div key={w.id} style={wishCard}>
              <div style={wishMain}>
                <span style={wishName}>{w.name}</span>
                {w.url && /^https?:\/\//.test(w.url) && (
                  <a href={w.url} target="_blank" rel="noopener noreferrer" style={urlLink}>
                    🔗 View
                  </a>
                )}
              </div>
              {w.notes && <p style={wishNotes}>{w.notes}</p>}
              <div style={wishActions}>
                <button style={promoteBtn} onClick={() => { setPromoting(w.id); setPromoteForm({ collectionId: "", rating: 3 }); }}>
                  ✓ Add to Wardrobe
                </button>
                <button style={deleteWishBtn} onClick={() => {
                  if (window.confirm(`Remove "${w.name}" from wishlist?`)) removeWish(w.id);
                }}>Remove</button>
              </div>

              {/* Promote inline form */}
              {promoting === w.id && (
                <div style={promoteForm_}>
                  <select
                    style={input}
                    value={promoteForm.collectionId}
                    onChange={(e) => setPromoteForm((f) => ({ ...f, collectionId: e.target.value }))}
                  >
                    <option value="">— No collection —</option>
                    {flatCols.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <label style={smallLabel}>Initial rating:</label>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        style={{ ...starBtn, color: n <= promoteForm.rating ? "#f59e0b" : "#374151" }}
                        onClick={() => setPromoteForm((f) => ({ ...f, rating: n }))}
                      >★</button>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={saveBtn} onClick={handlePromote}>Confirm</button>
                    <button style={cancelInline} onClick={() => setPromoting(null)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const container = { padding: "0 0 40px" };
const viewToolbar = {
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  marginBottom: 20,
  minHeight: 36,
};
const viewToolbarSpacer = { flex: 1 };
const formulaLabel = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  color: "#9ca3af",
  fontSize: 13,
  fontWeight: 500,
};
const formulaSelect = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #374151",
  background: "#1f2937",
  color: "#f9fafb",
  fontSize: 13,
  cursor: "pointer",
  minWidth: 220,
};
const section = { marginBottom: 40 };
const heading = { color: "#f9fafb", fontSize: 20, fontWeight: 700, margin: "0 0 4px" };
const sub = { color: "#6b7280", fontSize: 13, margin: "0 0 16px" };
const empty = { color: "#6b7280", fontSize: 14, padding: "16px 0" };
const priorityList = { display: "flex", flexDirection: "column", gap: 8 };
const priorityCard = {
  borderRadius: 10, padding: "12px 16px", border: "1px solid rgba(255,255,255,0.06)",
};
const rankNum = { color: "#6b7280", fontSize: 12, marginBottom: 4 };
const priorityInfo = { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 };
const priorityName = { color: "#f9fafb", fontWeight: 600, fontSize: 14 };
const statusBadge = { fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10 };
const priorityStats = { display: "flex", gap: 16 };
const stat = { color: "#9ca3af", fontSize: 12 };
const scoreBar = { height: 4, background: "#1f2937", borderRadius: 2, marginTop: 8, overflow: "hidden" };
const wishHeader = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 };
const addBtn = {
  padding: "8px 16px", borderRadius: 8, border: "none",
  background: "linear-gradient(135deg, #6c63ff, #a855f7)",
  color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 13,
};
const addForm = {
  background: "#111827", borderRadius: 12, padding: 16,
  border: "1px solid #1f2937", marginBottom: 16,
  display: "flex", flexDirection: "column", gap: 10,
};
const input = {
  padding: "10px 12px", borderRadius: 8, border: "1px solid #374151",
  background: "#1f2937", color: "#f9fafb", fontSize: 14,
};
const errorTxt = { color: "#ef4444", fontSize: 12, margin: 0 };
const saveBtn = {
  padding: "10px 20px", borderRadius: 8, border: "none",
  background: "linear-gradient(135deg, #6c63ff, #a855f7)",
  color: "#fff", fontWeight: 600, cursor: "pointer",
};
const wishList = { display: "flex", flexDirection: "column", gap: 8 };
const wishCard = {
  background: "#111827", borderRadius: 10, padding: "14px 16px",
  border: "1px solid #1f2937",
};
const wishMain = { display: "flex", alignItems: "center", gap: 10, marginBottom: 4 };
const wishName = { color: "#f9fafb", fontWeight: 600, fontSize: 14, flex: 1 };
const urlLink = { color: "#818cf8", fontSize: 12, textDecoration: "none" };
const wishNotes = { color: "#6b7280", fontSize: 12, margin: "0 0 8px" };
const wishActions = { display: "flex", gap: 8 };
const promoteBtn = {
  padding: "6px 12px", borderRadius: 6, border: "none",
  background: "#064e3b", color: "#6ee7b7", cursor: "pointer", fontSize: 12, fontWeight: 600,
};
const deleteWishBtn = {
  padding: "6px 12px", borderRadius: 6, border: "none",
  background: "#1f2937", color: "#6b7280", cursor: "pointer", fontSize: 12,
};
const promoteForm_ = {
  marginTop: 10, display: "flex", flexDirection: "column", gap: 8,
  padding: "10px 0 0", borderTop: "1px solid #1f2937",
};
const smallLabel = { color: "#9ca3af", fontSize: 12 };
const starBtn = { background: "none", border: "none", fontSize: 20, cursor: "pointer" };
const cancelInline = {
  padding: "10px 16px", borderRadius: 8, border: "1px solid #374151",
  background: "transparent", color: "#9ca3af", cursor: "pointer",
};
