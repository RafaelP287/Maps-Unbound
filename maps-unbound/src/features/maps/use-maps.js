import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";

// Base URL for the maps API. Vite injects VITE_API_SERVER from frontend/.env.
const API_BASE = `${import.meta.env.VITE_API_SERVER || ""}/api/maps`;

// ─── Shared fetch wrapper ──────────────────────────────────────────────────
// Wraps fetch with auth header injection and error normalization.
// Throws an Error with the server's error message on non-2xx.
async function authFetch(token, path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  // Try to parse a JSON body even on error responses so we can surface the message.
  let data = null;
  try {
    data = await res.json();
  } catch {
    // Some endpoints (rare) return empty bodies — that's fine.
  }
  if (!res.ok) {
    throw new Error(data?.error || data?.message || `Request failed (${res.status})`);
  }
  return data;
}

// ═══════════════════════════════════════════════════════════════════════════
// useMyMaps — list all of the current user's maps (no JSON bodies, just metadata)
// ═══════════════════════════════════════════════════════════════════════════
//
// Used by MapLoadModal to show the grid of saved maps with thumbnails.
// Returns: { maps, loading, error, refetch }
//
export function useMyMaps() {
  const { token, isLoggedIn } = useAuth();
  const [maps, setMaps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refetch = useCallback(async () => {
    if (!isLoggedIn || !token) {
      setMaps([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await authFetch(token, "");
      setMaps(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load maps");
      setMaps([]);
    } finally {
      setLoading(false);
    }
  }, [token, isLoggedIn]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { maps, loading, error, refetch };
}

// ═══════════════════════════════════════════════════════════════════════════
// useMapsApi — imperative actions: get / create / update / delete / duplicate
// ═══════════════════════════════════════════════════════════════════════════
//
// Returns plain async functions you can call from event handlers.
// These do NOT manage their own loading/error state — components decide
// what UI to show during in-flight operations.
//
export function useMapsApi() {
  const { token } = useAuth();

  // GET /api/maps/:id  →  full map including JSON body
  const getMap = useCallback(
    async (id) => authFetch(token, `/${id}`),
    [token]
  );

  // POST /api/maps  →  create a new map
  // payload: { name, description?, json, thumbnailB64? }
  const createMap = useCallback(
    async (payload) =>
      authFetch(token, "", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    [token]
  );

  // PUT /api/maps/:id  →  update name / description / json / thumbnail (any subset)
  // Auto-save calls this with just { json } (no thumbnail).
  // Manual save calls this with { json, thumbnailB64 }.
  // Rename-only calls this with { name }.
  const updateMap = useCallback(
    async (id, payload) =>
      authFetch(token, `/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    [token]
  );

  // DELETE /api/maps/:id
  const deleteMap = useCallback(
    async (id) =>
      authFetch(token, `/${id}`, {
        method: "DELETE",
      }),
    [token]
  );

  // POST /api/maps/:id/duplicate  →  create a copy with auto-suffixed name
  // payload: { name? }   — optional override; otherwise auto-suffix " (2)" etc.
  const duplicateMap = useCallback(
    async (id, payload = {}) =>
      authFetch(token, `/${id}/duplicate`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    [token]
  );

  return {
    getMap,
    createMap,
    updateMap,
    deleteMap,
    duplicateMap,
  };
}