/**
 * hooks/useWardrobe.js — Single source of truth for wardrobe data.
 * Fetches collections and items, exposes mutation helpers.
 */

import { useState, useEffect, useCallback } from "react";
import { collectionsApi, itemsApi } from "../api/client";

export function useWardrobe() {
  const [collections, setCollections] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [colRes, itemRes] = await Promise.all([
      collectionsApi.list(),
      itemsApi.list(),
    ]);
    if (colRes.error) setError(colRes.error);
    else setCollections(colRes.data || []);
    if (itemRes.error) setError(itemRes.error);
    else setItems(itemRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // ── Collection mutations ────────────────────────────────────────────────────
  const createCollection = async (payload) => {
    const { data, error } = await collectionsApi.create(payload);
    if (!error) await refresh();
    return { data, error };
  };

  const updateCollection = async (id, payload) => {
    const { data, error } = await collectionsApi.update(id, payload);
    if (!error) await refresh();
    return { data, error };
  };

  const deleteCollection = async (id) => {
    const { error } = await collectionsApi.delete(id);
    if (!error) await refresh();
    return { error };
  };

  // ── Item mutations ──────────────────────────────────────────────────────────
  const createItem = async (formData) => {
    const { data, error } = await itemsApi.create(formData);
    if (!error) await refresh();
    return { data, error };
  };

  const updateItem = async (id, formData) => {
    const { data, error } = await itemsApi.update(id, formData);
    if (!error) await refresh();
    return { data, error };
  };

  const deleteItem = async (id) => {
    const { error } = await itemsApi.delete(id);
    if (!error) await refresh();
    return { error };
  };

  return {
    collections,
    items,
    loading,
    error,
    refresh,
    createCollection,
    updateCollection,
    deleteCollection,
    createItem,
    updateItem,
    deleteItem,
  };
}
