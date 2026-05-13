/**
 * hooks/useWishlist.js — Wishlist data and mutations.
 */

import { useState, useEffect, useCallback } from "react";
import { wishlistApi } from "../api/client";

export function useWishlist() {
  const [wishlist, setWishlist] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [priorityFormula, setPriorityFormula] = useState("simple");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [wRes, pRes] = await Promise.all([
      wishlistApi.list(),
      wishlistApi.shoppingPriority(priorityFormula),
    ]);
    if (wRes.error) setError(wRes.error);
    else setWishlist(wRes.data || []);
    if (pRes.error) setError(pRes.error);
    else setPriorities(pRes.data || []);
    setLoading(false);
  }, [priorityFormula]);

  useEffect(() => { refresh(); }, [refresh]);

  const addWish = async (payload) => {
    const { data, error } = await wishlistApi.create(payload);
    if (!error) setWishlist((prev) => [data, ...prev]);
    return { data, error };
  };

  const removeWish = async (id) => {
    const { error } = await wishlistApi.delete(id);
    if (!error) setWishlist((prev) => prev.filter((w) => w.id !== id));
    return { error };
  };

  const promoteToWardrobe = async (id, payload) => {
    const { data, error } = await wishlistApi.addToWardrobe(id, payload);
    if (!error) {
      setWishlist((prev) => prev.filter((w) => w.id !== id));
      refresh(); // Refresh priorities
    }
    return { data, error };
  };

  return {
    wishlist,
    priorities,
    loading,
    error,
    refresh,
    addWish,
    removeWish,
    promoteToWardrobe,
    priorityFormula,
    setPriorityFormula,
  };
}
