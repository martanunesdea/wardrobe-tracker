/**
 * components/WardrobeView.jsx — File-tree wardrobe layout.
 * Collections: colour-coded depth, item count vs target, avg rating bar.
 * Items: flat rows with photo, name, stars, brand, wear count.
 */

import React, { useMemo, useState } from "react";
import StarRating, { RatingBar } from "./shared/StarRating";
import ItemModal from "./ItemModal";
import { BASE_URL } from "../api/client";

const DEPTH_COLORS = ["#6c63ff", "#a855f7", "#ec4899", "#f59e0b"];
const MAX_RENDER_DEPTH = 10;

// ── Sub-components ───────────────────────────────────────────────────────────

function ItemRow({ item, onClick }) {
  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      style={itemRowStyle}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <div style={itemPhoto}>
        {item.photoUrl ? (
          <img
            src={item.photoUrl.startsWith("http") ? item.photoUrl : `${BASE_URL}${item.photoUrl}`}
            alt={item.name}
            style={photoThumb}
          />
        ) : (
          <span style={{ fontSize: 20 }}>👕</span>
        )}
      </div>
      <span style={itemName}>{item.name}</span>
      <StarRating value={item.rating} size="sm" />
      <span style={itemMeta}>{item.brand || "—"}</span>
      <span style={wearCount}>👟 {item.timesUsed}×</span>
    </div>
  );
}

function AddCollectionForm({ parentId, depth, onCreate, onCancel }) {
  const [name, setName] = useState("");
  const [targetCount, setTargetCount] = useState("10");
  const [targetRating, setTargetRating] = useState("4");

  const parseTargets = () => ({
    targetItemCount: Math.min(999, Math.max(1, Number(targetCount) || 10)),
    targetAvgRating: Math.min(5, Math.max(0, Number(targetRating) || 4)),
  });

  const submit = async () => {
    if (!name.trim()) return;
    const payload = { name: name.trim(), ...parseTargets() };
    if (parentId) payload.parentId = parentId;
    await onCreate(payload);
    onCancel();
  };

  const handleKeyDown = async (e) => {
    if (e.key === "Enter") await submit();
    if (e.key === "Escape") onCancel();
  };

  return (
    <div style={{ ...addRow, marginLeft: depth * 20, flexWrap: "wrap" }}>
      <input
        style={{ ...inlineInput, flex: "1 1 140px", minWidth: 100 }}
        placeholder={parentId ? "Sub-collection name…" : "Collection name…"}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
      />
      <label style={editColLabel}>
        Target #
        <input
          type="number" min={1} max={999} style={editColNum}
          value={targetCount} onChange={(e) => setTargetCount(e.target.value)}
        />
      </label>
      <label style={editColLabel}>
        Target ★
        <input
          type="number" min={0} max={5} step={0.1} style={editColNum}
          value={targetRating} onChange={(e) => setTargetRating(e.target.value)}
        />
      </label>
      <button style={confirmBtn} onClick={submit}>Add</button>
      <button style={cancelInlineBtn} onClick={onCancel}>✕</button>
    </div>
  );
}

function CollectionHeader({
  col, depth, isOpen, isEditing, editingCol, setEditingCol,
  onToggle, onOpenAddCollection, onNewItem, onUpdate, onDelete,
}) {
  const accentColor = DEPTH_COLORS[depth % DEPTH_COLORS.length];

  return (
    <div style={{ ...collectionRowStyle, borderLeft: `3px solid ${accentColor}` }}>
      <button style={toggleBtn} onClick={onToggle}>
        {isOpen ? "▾" : "▸"}
      </button>

      {isEditing ? (
        <div style={editColWrap}>
          <input
            style={{ ...inlineInput, flex: "1 1 120px", minWidth: 80 }}
            value={editingCol.name}
            onChange={(e) => setEditingCol((c) => ({ ...c, name: e.target.value }))}
            placeholder="Name"
            autoFocus
          />
          <label style={editColLabel}>
            Target #
            <input
              type="number" min={1} max={999} style={editColNum}
              value={editingCol.targetItemCount}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                setEditingCol((c) => ({
                  ...c,
                  targetItemCount: Number.isNaN(n) ? c.targetItemCount : n,
                }));
              }}
            />
          </label>
          <label style={editColLabel}>
            Target ★
            <input
              type="number" min={0} max={5} step={0.1} style={editColNum}
              value={editingCol.targetAvgRating}
              onChange={(e) => {
                const n = parseFloat(e.target.value);
                setEditingCol((c) => ({
                  ...c,
                  targetAvgRating: Number.isNaN(n) ? c.targetAvgRating : n,
                }));
              }}
            />
          </label>
          <button
            type="button" style={confirmBtn}
            onClick={async () => {
              const name = (editingCol.name || "").trim();
              if (!name) return;
              const tCount = Math.min(999, Math.max(1, Number(editingCol.targetItemCount) || 10));
              const tRating = Math.min(5, Math.max(0, Number(editingCol.targetAvgRating) || 4));
              await onUpdate(col.id, { name, targetItemCount: tCount, targetAvgRating: tRating });
              setEditingCol(null);
            }}
          >
            Save
          </button>
          <button type="button" style={cancelInlineBtn} onClick={() => setEditingCol(null)}>✕</button>
        </div>
      ) : (
        <span style={{ ...collectionName, color: accentColor }}>{col.name}</span>
      )}

      <span style={countBadge}>{col.itemCount}/{col.targetItemCount}</span>

      <div style={{ width: 120 }}>
        <RatingBar avg={col.avgRating || 0} target={col.targetAvgRating} width={80} />
      </div>

      <div style={colActions}>
        <button
          style={iconBtn} title="Edit"
          onClick={() =>
            setEditingCol({
              ...col,
              targetItemCount: col.targetItemCount ?? 10,
              targetAvgRating: col.targetAvgRating ?? 4,
            })
          }
        >
          ✎
        </button>
        <button style={iconBtn} title="Add sub-collection" onClick={onOpenAddCollection}>＋☰</button>
        <button style={iconBtn} title="Add item" onClick={onNewItem}>＋</button>
        <button
          style={{ ...iconBtn, color: "#ef4444" }} title="Delete collection"
          onClick={async () => {
            if (window.confirm(`Delete "${col.name}" and all its items?`))
              await onDelete(col.id);
          }}
        >🗑</button>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function WardrobeView({
  collections, items, createCollection, updateCollection,
  deleteCollection, createItem, updateItem, deleteItem,
}) {
  const [expanded, setExpanded] = useState({});
  const [editingCol, setEditingCol] = useState(null);
  const [modalItem, setModalItem] = useState(null);
  const [addingColFor, setAddingColFor] = useState(null);

  const toggle = (id) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const { rootCollections, childrenByParentId, itemsByCollectionId } = useMemo(() => {
    const roots = [];
    const children = new Map();
    const itemsByCol = new Map();

    for (const c of collections) {
      const pid = c.parentId || null;
      if (!pid) roots.push(c);
      if (!children.has(pid)) children.set(pid, []);
      children.get(pid).push(c);
    }

    for (const i of items) {
      const cid = i.collectionId || null;
      if (!itemsByCol.has(cid)) itemsByCol.set(cid, []);
      itemsByCol.get(cid).push(i);
    }

    return { rootCollections: roots, childrenByParentId: children, itemsByCollectionId: itemsByCol };
  }, [collections, items]);

  const renderCollection = (col, depth = 0) => {
    if (depth > MAX_RENDER_DEPTH) return null;

    const children = childrenByParentId.get(col.id) || [];
    const colItems = itemsByCollectionId.get(col.id) || [];
    const isOpen = expanded[col.id] !== false;
    const isEditing = editingCol?.id === col.id;

    return (
      <div key={col.id} style={{ marginLeft: depth * 20 }}>
        <CollectionHeader
          col={col} depth={depth} isOpen={isOpen} isEditing={isEditing}
          editingCol={editingCol} setEditingCol={setEditingCol}
          onToggle={() => toggle(col.id)}
          onOpenAddCollection={() => setAddingColFor(col.id)}
          onNewItem={() => setModalItem({ _new: true, collectionId: col.id })}
          onUpdate={updateCollection}
          onDelete={deleteCollection}
        />

        {addingColFor === col.id && (
          <AddCollectionForm
            parentId={col.id}
            depth={depth + 1}
            onCreate={createCollection}
            onCancel={() => setAddingColFor(null)}
          />
        )}

        {isOpen && (
          <>
            {children.map((child) => renderCollection(child, depth + 1))}
            {colItems.map((item) => (
              <ItemRow key={item.id} item={item} onClick={() => setModalItem(item)} />
            ))}
          </>
        )}
      </div>
    );
  };

  return (
    <div style={container}>
      <div style={header}>
        <h2 style={heading}>My Wardrobe</h2>
        <button style={addBtn} onClick={() => setAddingColFor("root")}>
          + New Collection
        </button>
      </div>

      {addingColFor === "root" && (
        <AddCollectionForm
          parentId={null}
          depth={0}
          onCreate={createCollection}
          onCancel={() => setAddingColFor(null)}
        />
      )}

      {rootCollections.length === 0 && addingColFor !== "root" && (
        <div style={empty}>
          <p>No collections yet. Create one to start organising your wardrobe.</p>
        </div>
      )}

      <div style={tree}>
        {rootCollections.map((col) => renderCollection(col, 0))}
      </div>

      {modalItem && (
        <ItemModal
          item={modalItem._new ? null : modalItem}
          collections={collections}
          onSave={async (fd) => {
            if (modalItem._new) {
              if (modalItem.collectionId) fd.append("collectionId", modalItem.collectionId);
              return await createItem(fd);
            }
            return await updateItem(modalItem.id, fd);
          }}
          onDelete={() => deleteItem(modalItem.id)}
          onClose={() => setModalItem(null)}
        />
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const container = { padding: "0 0 40px" };
const header = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 };
const heading = { color: "#f9fafb", fontSize: 22, fontWeight: 700, margin: 0 };
const addBtn = {
  padding: "8px 16px", borderRadius: 8, border: "none",
  background: "linear-gradient(135deg, #6c63ff, #a855f7)",
  color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 13,
};
const tree = { display: "flex", flexDirection: "column", gap: 2 };
const collectionRowStyle = {
  display: "flex", alignItems: "center", gap: 10,
  padding: "10px 12px", background: "#111827",
  borderRadius: 8, cursor: "default", flexWrap: "wrap",
};
const editColWrap = {
  display: "flex", flex: 1, flexWrap: "wrap",
  alignItems: "center", gap: 8, minWidth: 0,
};
const editColLabel = {
  display: "flex", alignItems: "center", gap: 6,
  color: "#9ca3af", fontSize: 11, whiteSpace: "nowrap",
};
const editColNum = {
  width: 56, padding: "4px 6px", borderRadius: 6,
  border: "1px solid #374151", background: "#1f2937",
  color: "#f9fafb", fontSize: 13,
};
const toggleBtn = {
  background: "none", border: "none", color: "#6b7280",
  cursor: "pointer", fontSize: 14, padding: 2, minWidth: 16,
};
const collectionName = { fontWeight: 600, fontSize: 14, flex: 1 };
const countBadge = {
  fontSize: 12, color: "#9ca3af",
  background: "#1f2937", padding: "2px 8px", borderRadius: 10,
};
const colActions = { display: "flex", gap: 4 };
const iconBtn = {
  background: "none", border: "none", color: "#6b7280",
  cursor: "pointer", fontSize: 14, padding: "2px 4px", borderRadius: 4,
};
const itemRowStyle = {
  display: "flex", alignItems: "center", gap: 10,
  padding: "8px 12px 8px 52px", borderRadius: 6,
  cursor: "pointer", transition: "background 0.15s",
  background: "rgba(255,255,255,0.02)",
  marginBottom: 1, border: "none", width: "100%",
  textAlign: "left",
};
const itemPhoto = {
  width: 36, height: 36, borderRadius: 6, overflow: "hidden",
  background: "#1f2937", display: "flex", alignItems: "center",
  justifyContent: "center", flexShrink: 0,
};
const photoThumb = { width: "100%", height: "100%", objectFit: "cover" };
const itemName = { color: "#e5e7eb", fontSize: 13, flex: 1, fontWeight: 500 };
const itemMeta = { color: "#6b7280", fontSize: 12, minWidth: 60 };
const wearCount = { color: "#6b7280", fontSize: 12 };
const addRow = {
  display: "flex", gap: 8, padding: "6px 0 6px 20px", alignItems: "center",
};
const inlineInput = {
  padding: "6px 10px", borderRadius: 6, border: "1px solid #374151",
  background: "#1f2937", color: "#f9fafb", fontSize: 13, flex: 1,
};
const confirmBtn = {
  padding: "6px 12px", borderRadius: 6, border: "none",
  background: "#6c63ff", color: "#fff", cursor: "pointer", fontSize: 12,
};
const cancelInlineBtn = {
  background: "none", border: "none", color: "#6b7280",
  cursor: "pointer", fontSize: 16,
};
const empty = { textAlign: "center", color: "#6b7280", padding: "40px 0" };
