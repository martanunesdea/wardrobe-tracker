/**
 * components/ItemModal.jsx — Create / Edit item modal.
 * Uses shared Modal and StarRating. Handles photo upload and delete.
 */

import React, { useState, useEffect, useRef } from "react";
import Modal from "./shared/Modal";
import StarRating from "./shared/StarRating";
import { BASE_URL } from "../api/client";
import { flattenCollections } from "../utils/collections";

const EMPTY_FORM = {
  name: "", rating: 3, brand: "", size: "", price: "",
  dateBought: "", timesUsed: 0, collectionId: "",
};

export default function ItemModal({ item, collections, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();
  const blobUrlRef = useRef(null);

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name || "",
        rating: item.rating || 3,
        brand: item.brand || "",
        size: item.size || "",
        price: item.price != null ? String(item.price) : "",
        dateBought: item.dateBought || "",
        timesUsed: item.timesUsed || 0,
        collectionId: item.collectionId || "",
      });
      setPhotoPreview(
        item.photoUrl
          ? item.photoUrl.startsWith("http")
            ? item.photoUrl
            : `${BASE_URL}${item.photoUrl}`
          : null
      );
    }
  }, [item]);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target ? e.target.value : e }));

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    const url = URL.createObjectURL(file);
    blobUrlRef.current = url;
    setPhotoFile(file);
    setPhotoPreview(url);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return setError("Name is required");
    if (!form.rating) return setError("Rating is required");
    setSaving(true);
    setError("");

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => v !== "" && fd.append(k, v));
    if (photoFile) fd.append("photo", photoFile);

    const { error: err } = await onSave(fd);
    setSaving(false);
    if (err) setError(err);
    else onClose();
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this item?")) return;
    await onDelete();
    onClose();
  };

  const flatCols = flattenCollections(collections);

  return (
    <Modal title={item ? "Edit Item" : "Add Item"} onClose={onClose}>
      {/* Photo */}
      <div style={photoSection} onClick={() => fileRef.current.click()}>
        {photoPreview ? (
          <img src={photoPreview} alt="preview" style={photoImg} />
        ) : (
          <div style={photoPlaceholder}>
            <span style={{ fontSize: 32 }}>📷</span>
            <span style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>Tap to add photo</span>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} hidden />
      </div>

      <div style={grid}>
        <div style={fieldFull}>
          <label style={label}>Name *</label>
          <input style={input} value={form.name} onChange={set("name")} placeholder="e.g. Navy Crew Neck" />
        </div>

        <div style={fieldFull}>
          <label style={label}>Rating *</label>
          <StarRating value={form.rating} onChange={(v) => setForm((f) => ({ ...f, rating: v }))} size="lg" />
        </div>

        <div>
          <label style={label}>Brand</label>
          <input style={input} value={form.brand} onChange={set("brand")} placeholder="e.g. Uniqlo" />
        </div>

        <div>
          <label style={label}>Size</label>
          <input style={input} value={form.size} onChange={set("size")} placeholder="e.g. M / 32" />
        </div>

        <div>
          <label style={label}>Price</label>
          <input style={input} type="number" min="0" step="0.01" value={form.price} onChange={set("price")} placeholder="0.00" />
        </div>

        <div>
          <label style={label}>Date Bought</label>
          <input style={input} type="date" value={form.dateBought} onChange={set("dateBought")} />
        </div>

        <div>
          <label style={label}>Times Worn</label>
          <input style={input} type="number" min="0" value={form.timesUsed} onChange={set("timesUsed")} />
        </div>

        <div style={fieldFull}>
          <label style={label}>Collection</label>
          <select style={input} value={form.collectionId} onChange={set("collectionId")}>
            <option value="">— Uncategorised —</option>
            {flatCols.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <p style={errorStyle}>{error}</p>}

      <div style={actions}>
        {item && (
          <button style={deleteBtn} onClick={handleDelete}>
            🗑 Delete
          </button>
        )}
        <button style={cancelBtn} onClick={onClose}>Cancel</button>
        <button style={saveBtn} onClick={handleSubmit} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </Modal>
  );
}

const photoSection = {
  margin: "0 0 16px", borderRadius: 12, overflow: "hidden",
  cursor: "pointer", border: "2px dashed #374151", height: 160,
  display: "flex", alignItems: "center", justifyContent: "center",
};
const photoImg = { width: "100%", height: "100%", objectFit: "cover" };
const photoPlaceholder = {
  display: "flex", flexDirection: "column", alignItems: "center",
};
const grid = {
  display: "grid", gridTemplateColumns: "1fr 1fr",
  gap: "12px 16px",
};
const fieldFull = { gridColumn: "1 / -1" };
const label = { display: "block", color: "#9ca3af", fontSize: 12, marginBottom: 4 };
const input = {
  width: "100%", padding: "10px 12px", borderRadius: 8,
  border: "1px solid #374151", background: "#1f2937",
  color: "#f9fafb", fontSize: 14, boxSizing: "border-box",
};
const errorStyle = { color: "#ef4444", fontSize: 13, marginTop: 12 };
const actions = {
  display: "flex", gap: 8, paddingTop: 20, justifyContent: "flex-end",
};
const saveBtn = {
  padding: "10px 24px", borderRadius: 8, border: "none",
  background: "linear-gradient(135deg, #6c63ff, #a855f7)",
  color: "#fff", fontWeight: 600, cursor: "pointer",
};
const cancelBtn = {
  padding: "10px 16px", borderRadius: 8, border: "1px solid #374151",
  background: "transparent", color: "#9ca3af", cursor: "pointer",
};
const deleteBtn = {
  padding: "10px 16px", borderRadius: 8, border: "none",
  background: "#7f1d1d", color: "#fca5a5", cursor: "pointer",
  marginRight: "auto",
};
