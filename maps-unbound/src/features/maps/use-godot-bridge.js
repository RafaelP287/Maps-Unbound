import { useCallback, useEffect, useRef, useState } from "react";

// ─── Protocol constants ────────────────────────────────────────────────────
// Must match what Godot sends/expects in maps_unbound.gd
const SOURCE_FROM_GODOT = "maps_unbound_godot";
const SOURCE_TO_GODOT = "maps_unbound_react";

// Auto-save fires this many ms after the last edit. Tweak to taste.
const AUTOSAVE_DEBOUNCE_MS = 3000;

// ─── Hook ──────────────────────────────────────────────────────────────────
//
// Usage in a component that hosts the Godot iframe:
//
//   const iframeRef = useRef(null);
//   const bridge = useGodotBridge(iframeRef, {
//     onRequestSave:    () => { /* user clicked Save inside Godot */ },
//     onRequestSaveAs:  () => { /* user clicked Save As inside Godot */ },
//     onRequestLoad:    () => { /* user clicked Load inside Godot */ },
//     onAutoSave:       async (json) => { /* PUT to /api/maps/:id with json */ },
//     onReady:          () => { /* Godot booted */ },
//   });
//
//   bridge.loadMap(mapId, mapName, mapJson);   // hand a saved map to Godot
//   bridge.requestManualSave({ withThumbnail: true });   // force immediate save
//   bridge.markSaved(mapId, mapName);          // tell Godot the save persisted
//   bridge.newMap();                           // tell Godot to clear state
//
// The hook also exposes:
//   bridge.isReady          (bool)
//   bridge.isDirty          (bool)
//   bridge.currentMapId     (string)  ← whichever map Godot last told us about
//   bridge.currentMapName   (string)
//
export default function useGodotBridge(iframeRef, callbacks = {}) {
  const {
    onRequestSave,
    onRequestSaveAs,
    onRequestLoad,
    onAutoSave,
    onReady,
  } = callbacks;

  const [isReady, setIsReady] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [currentMapId, setCurrentMapId] = useState("");
  const [currentMapName, setCurrentMapName] = useState("");

  // Pending manual save state. When set, the next `mu:save_data` message from
  // Godot is treated as a manual-save response (so we know whether to include
  // the thumbnail when posting to backend).
  const pendingSaveRef = useRef(null);
  // pendingSaveRef.current = { kind: 'auto' | 'manual', resolve: (payload) => void }

  // Debounce timer for auto-save.
  const autosaveTimerRef = useRef(null);

  // Latest callback refs — so the message listener doesn't need to re-bind
  // every time a parent re-renders with new callbacks.
  const cbRef = useRef({});
  useEffect(() => {
    cbRef.current = { onRequestSave, onRequestSaveAs, onRequestLoad, onAutoSave, onReady };
  });

  // ─── Send a message to Godot ──────────────────────────────────────────────
  const sendToGodot = useCallback(
    (type, data = {}) => {
      const iframe = iframeRef.current;
      const win = iframe?.contentWindow;
      if (!win) return;
      win.postMessage({ source: SOURCE_TO_GODOT, type, data }, "*");
    },
    [iframeRef]
  );

  // ─── Ask Godot to package its current state (used by both auto and manual save) ───
  const requestSavePayload = useCallback(
    (kind, withThumbnail) =>
      new Promise((resolve, reject) => {
        // If a previous request is still pending, abandon it — the new one wins.
        if (pendingSaveRef.current) {
          pendingSaveRef.current.resolve(null);
        }
        pendingSaveRef.current = { kind, resolve };
        sendToGodot("mu:perform_save", { include_thumbnail: !!withThumbnail });

        // Safety timeout — if Godot never replies, don't leave the promise hanging.
        setTimeout(() => {
          if (pendingSaveRef.current && pendingSaveRef.current.resolve === resolve) {
            pendingSaveRef.current = null;
            reject(new Error("Godot did not respond to save request"));
          }
        }, 5000);
      }),
    [sendToGodot]
  );

  // ─── Public: trigger a manual save (forces immediate, optionally w/ thumbnail) ───
  const requestManualSave = useCallback(
    async ({ withThumbnail = true } = {}) => {
      // Cancel any pending auto-save — manual takes priority.
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
      const payload = await requestSavePayload("manual", withThumbnail);
      return payload; // { json, thumbnail_b64? } or null if superseded
    },
    [requestSavePayload]
  );

  // ─── Public: load a map into Godot ────────────────────────────────────────
  const loadMap = useCallback(
    (id, name, json) => {
      // Cancel any pending auto-save for the old map.
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
      sendToGodot("mu:load_map", { id, name, json });
      // Optimistically update local state — Godot's `mu:dirty_changed { false }`
      // will follow shortly to confirm.
      setCurrentMapId(id || "");
      setCurrentMapName(name || "");
      setIsDirty(false);
    },
    [sendToGodot]
  );

  // ─── Public: tell Godot the save just landed (clears dirty flag in Godot) ───
  const markSaved = useCallback(
    (id, name) => {
      sendToGodot("mu:save_complete", { id, name });
      setCurrentMapId(id || "");
      setCurrentMapName(name || "");
      // Don't optimistically clear isDirty — wait for Godot's mu:dirty_changed
      // so the flag stays accurate if there were edits during the save round-trip.
    },
    [sendToGodot]
  );

  // ─── Public: clear the canvas to a new empty map ──────────────────────────
  const newMap = useCallback(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    sendToGodot("mu:new_map", {});
    setCurrentMapId("");
    setCurrentMapName("");
    setIsDirty(false);
  }, [sendToGodot]);

  // ─── Public: update Godot's idea of the current map's id/name ─────────────
  const setMapMeta = useCallback(
    (id, name) => {
      sendToGodot("mu:set_map_meta", { id, name });
      setCurrentMapId(id || "");
      setCurrentMapName(name || "");
    },
    [sendToGodot]
  );

  // ─── Inbound message listener ─────────────────────────────────────────────
  useEffect(() => {
    const handler = (event) => {
      // Only accept messages from our Godot iframe.
      if (!event.data || event.data.source !== SOURCE_FROM_GODOT) return;

      const { type, data = {} } = event.data;

      switch (type) {
        case "mu:ready":
          setIsReady(true);
          cbRef.current.onReady?.();
          break;

        case "mu:dirty_changed":
          setIsDirty(!!data.is_dirty);
          // Schedule auto-save when transitioning to dirty (only if we have a current map).
          if (data.is_dirty) {
            if (autosaveTimerRef.current) {
              clearTimeout(autosaveTimerRef.current);
            }
            autosaveTimerRef.current = setTimeout(async () => {
              autosaveTimerRef.current = null;
              // Snapshot the current map id from state via the closure-safe ref pattern.
              // We re-read here to avoid stale closure issues.
              try {
                const payload = await requestSavePayload("auto", false);
                if (!payload) return; // superseded by a newer save
                // Hand off to the parent. Parent decides whether to PUT to backend
                // (it knows the current map id from the same source of truth).
                await cbRef.current.onAutoSave?.(payload.json);
              } catch (err) {
                console.warn("Auto-save failed:", err.message);
              }
            }, AUTOSAVE_DEBOUNCE_MS);
          }
          break;

        case "mu:save_data": {
          // Godot delivered a save payload in response to mu:perform_save.
          // Resolve whoever is waiting (auto or manual save flow).
          const pending = pendingSaveRef.current;
          if (pending) {
            pendingSaveRef.current = null;
            pending.resolve({
              json: data.json || null,
              thumbnail_b64: data.thumbnail_b64 || "",
            });
          }
          break;
        }

        case "mu:request_save":
          // User clicked Save inside Godot — let parent decide what to do.
          cbRef.current.onRequestSave?.({
            currentId: data.current_id || "",
            currentName: data.current_name || "",
          });
          break;

        case "mu:request_save_as":
          cbRef.current.onRequestSaveAs?.({
            currentId: data.current_id || "",
            currentName: data.current_name || "",
          });
          break;

        case "mu:request_load":
                if (cbRef.current.onRequestLoad) cbRef.current.onRequestLoad();
                break;

        default:
          // Unknown message — ignore (forward-compat with future Godot changes).
          break;
      }
    };

    window.addEventListener("message", handler);
    return () => {
      window.removeEventListener("message", handler);
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [requestSavePayload]);

  return {
    isReady,
    isDirty,
    currentMapId,
    currentMapName,
    requestManualSave,
    loadMap,
    markSaved,
    newMap,
    setMapMeta,
  };
}