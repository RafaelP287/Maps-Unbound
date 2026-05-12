// Map canvas area for live sessions:
// - Embeds the Godot map editor (full DM controls available mid-session)
// - Real map picker pulling from the user's saved maps
// - Combat setup/teardown
// - Compact turn strip + round/advance controls while in combat
//
// The Godot iframe + bridge wiring mirrors what Maps.jsx does for the
// standalone editor — auto-save, manual save, save-as, and load all work
// from inside Godot's UI exactly the same way during a session.
import { useRef, useState, useCallback, useEffect } from "react";
import EncounterOverlay from "./EncounterOverlay";



import useGodotBridge from "../../maps/use-godot-bridge.js";
import { useMapsApi } from "../../maps/use-maps.js";
import MapLoadModal from "../../maps/MapLoadModal.jsx";
import MapNamingModal from "../../maps/MapNamingModal.jsx";
import ConfirmDiscardModal from "../../maps/ConfirmDiscardModal.jsx";

function SessionMapCanvas({
    turns = [],
    round = 0,
    readOnly = false,
    onAdvanceTurn: _onAdvanceTurn,
    onCombatStateChange,
    onCombatStart,
    onCombatEnd,
    onSceneNameChange,
    onTurnsChange,
    playerCharacterNames = [],
    combatEntityPool = {},
    sessionId = null,
    token = null,
}) {
    // ─── Combat / encounter setup state (unchanged from your existing code) ───
    const [isCombatState, setIsCombatState] = useState(false);
    const [isCombatSetupOpen, setIsCombatSetupOpen] = useState(false);
    const [combatSetupError, setCombatSetupError] = useState("");
    const [draftParticipants, setDraftParticipants] = useState([]);
    const rowIdRef = useRef(0);


    // Helper: post a message into the Godot iframe (it listens via window.addEventListener('message'))
    const sendToGodot = useCallback((type, data = {}) => {
        const iframe = iframeRef.current;
        if (!iframe || !iframe.contentWindow) return;
        try {
            iframe.contentWindow.postMessage(
                { source: "maps_unbound_react", type, data },
                "*"
            );
        } catch (err) {
            console.warn("Failed to post to Godot:", err.message);
        }
    }, []);

    // Players don't run combat setup, but they still need to know combat is
    // happening so the map gets the `.is-combat-state` class. They infer it
    // from the turns prop passed down from the parent.
    const isLiveCombatState = isCombatState || (readOnly && turns.length > 0);

    const nextRowId = () => {
        rowIdRef.current += 1;
        return rowIdRef.current;
    };

    const getParticipantKey = (kind, name) => `${kind}:${String(name || "").trim().toLowerCase()}`;

    const defaultHpByKind = (kind) => {
        if (kind === "Player") return 35;
        if (kind === "NPC") return 20;
        return 26;
    };

    const defaultDetailByKind = (kind) => {
        if (kind === "Enemy") return { creatureType: "Creature", cr: "CR 1" };
        if (kind === "NPC") return { className: "NPC", level: 1 };
        return { className: "Adventurer", level: 1 };
    };

    const suggestedName = (kind, list) => {
        if (kind === "Player") {
            const used = new Set(list.filter((item) => item.kind === "Player").map((item) => item.name));
            const nextPlayer = playerCharacterNames.find((name) => name && !used.has(name));
            if (nextPlayer) return nextPlayer;
        }
        const count = list.filter((item) => item.kind === kind).length + 1;
        return `${kind} ${count}`;
    };

    const createParticipant = (kind, list, seed = {}) => ({
        id: seed.id ?? nextRowId(),
        kind,
        name: seed.name ?? suggestedName(kind, list),
        initiative: seed.initiative ?? 10,
        hp: seed.hp ?? defaultHpByKind(kind),
        sourceLabel: seed.sourceLabel ?? "Custom",
        // Default: everyone visible. DM uses the eye-toggles in the sheets
        // panel (or chip) to hide a specific combatant from players.
        hiddenFromMap: seed.hiddenFromMap ?? false,
        hiddenFromInitiative: seed.hiddenFromInitiative ?? false,
        ...defaultDetailByKind(kind),
        ...seed,
    });

    // ─── Map / Godot bridge state ─────────────────────────────────────────
    const iframeRef = useRef(null);
    const bridgeRef = useRef(null);
    const pendingLoadRef = useRef(null); // map data waiting to be sent once Godot is ready
    const { getMap, createMap, updateMap, duplicateMap } = useMapsApi();

    const [showLoadModal, setShowLoadModal] = useState(false);
    const [showDiscardModal, setShowDiscardModal] = useState(false);
    const [namingModal, setNamingModal] = useState({ open: false, mode: "save", initial: "" });
    const [namingSubmitting, setNamingSubmitting] = useState(false);
    const [isManualSaving, setIsManualSaving] = useState(false);

    // True until the user picks a map. Until then, the Godot iframe isn't mounted
    // and the user sees the "Map Canvas" placeholder + the Maps button.
    const [hasOpenedMap, setHasOpenedMap] = useState(false);

    const performManualSave = useCallback(async () => {
        if (!bridgeRef.current) return;
        const id = bridgeRef.current.currentMapId;
        const name = bridgeRef.current.currentMapName;
        if (!id) return;
        setIsManualSaving(true);
        try {
            const payload = await bridgeRef.current.requestManualSave({ withThumbnail: true });
            if (!payload?.json) return;
            await updateMap(id, {
                json: payload.json,
                thumbnailB64: payload.thumbnail_b64 || "",
            });
            bridgeRef.current.markSaved(id, name);
        } catch (err) {
            console.error("Manual save failed:", err);
            alert(err.message || "Save failed. Please try again.");
        } finally {
            setIsManualSaving(false);
        }
    }, [updateMap]);

    const handleAutoSave = useCallback(
        async (json) => {
            if (!bridgeRef.current) return;
            const id = bridgeRef.current.currentMapId;
            const name = bridgeRef.current.currentMapName;
            if (!id) return;
            try {
                await updateMap(id, { json });
                bridgeRef.current.markSaved(id, name);
            } catch (err) {
                console.warn("Auto-save failed:", err.message);
            }
        },
        [updateMap]
    );

    const handleRequestSave = useCallback(
        ({ currentName }) => {
            if (!bridgeRef.current) return;
            const id = bridgeRef.current.currentMapId;
            if (id) {
                performManualSave();
            } else {
                setNamingModal({ open: true, mode: "save", initial: currentName || "" });
            }
        },
        [performManualSave]
    );

    const handleRequestSaveAs = useCallback(({ currentName }) => {
        setNamingModal({ open: true, mode: "save-as", initial: currentName || "" });
    }, []);

    const handleRequestLoad = useCallback(() => {
        setShowLoadModal(true);
    }, []);



    const bridge = useGodotBridge(iframeRef, {
        onRequestSave: handleRequestSave,
        onRequestSaveAs: handleRequestSaveAs,
        onRequestLoad: handleRequestLoad,
        onAutoSave: handleAutoSave,
       onReady: () => {},
    });
    
    

    useEffect(() => {
        bridgeRef.current = bridge;
    });
    // ─── Live map sync over WebSocket ─────────────────────────────────────
    // Outgoing: Godot's local BroadcastChannel → socket.emit → other clients.
    // Incoming: socket.on(mapState) → bridge.loadMap → DM Godot applies.
    // Persistence: POST every 5s so refresh/reconnect recovers latest state.
    useEffect(() => {
        if (!sessionId || !token) return;
        const apiServer = import.meta.env.VITE_API_SERVER || "";

        let socket = null;
        let cancelled = false;
        let postTimer = null;
        let latestForPost = null;
        const channel = new BroadcastChannel("maps_unbound");

        import("socket.io-client").then(({ io }) => {
            if (cancelled) return;
            socket = io(apiServer, { auth: { token } });

            socket.on("connect", () => {
                socket.emit("joinSession", { sessionId }, (resp) => {
                    if (!resp?.ok) console.warn("[socket DM] joinSession failed:", resp?.error);
                });
            });

            // Incoming map state from players (token moves, HP changes, etc.).
            socket.on("mapState", ({ state }) => {
                if (cancelled || !state || !bridgeRef.current) return;
                bridgeRef.current.loadMap(
                    bridgeRef.current.currentMapId || "",
                    bridgeRef.current.currentMapName || "",
                    state
                );
            });
        }).catch((err) => {
            console.warn("[socket DM] socket.io-client load failed:", err.message);
        });

        const flushPost = () => {
            postTimer = null;
            if (cancelled || !latestForPost) return;
            const payload = latestForPost;
            latestForPost = null;
            fetch(`${apiServer}/api/sessions/${sessionId}/live-map-state`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ state: payload }),
            }).catch((err) => console.warn("[live-map-state POST] failed:", err.message));
        };

        channel.onmessage = (event) => {
            const msg = event.data;
            if (!msg || msg.kind !== "state" || !msg.payload) return;
            if (socket && socket.connected) {
                socket.emit("mapState", { state: msg.payload });
            }
            latestForPost = msg.payload;
            if (postTimer) return;
            postTimer = setTimeout(flushPost, 5000);
        };

        return () => {
            cancelled = true;
            if (postTimer) clearTimeout(postTimer);
            channel.close();
            if (socket) socket.disconnect();
        };
    }, [sessionId, token]);
    // Once Godot signals ready, drain any pending map load (queued by handlePickMap
    // before the iframe was mounted/booted).
    useEffect(() => {
        if (!bridge.isReady) return;
        if (!pendingLoadRef.current) return;
        const { id, name, json } = pendingLoadRef.current;
        pendingLoadRef.current = null;
        bridge.loadMap(id, name, json);
    }, [bridge.isReady, bridge]);

    // Persist current map to the session whenever Godot tells us it changed,
    // so connected players can mirror the same map.
    useEffect(() => {
        console.log("[map-sync] effect ran", {
            sessionId,
            hasToken: !!token,
            currentMapId: bridge.currentMapId,
        });
        if (!sessionId || !token) return;
        if (!bridge.currentMapId) return;
        let cancelled = false;
        const id = bridge.currentMapId;
        console.log("[map-sync] PATCHing current-map with id:", id);
        fetch(`/api/sessions/${sessionId}/current-map`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ mapId: id }),
        }).then((r) => console.log("[map-sync] response:", r.status))
          .catch((err) => {
            if (cancelled) return;
            console.warn("[map-sync] failed:", err);
        });
        return () => { cancelled = true; };
    }, [bridge.currentMapId, sessionId, token]);

    // First-save flow (unnamed map → name modal → create)
    const performFirstSave = useCallback(
        async (name) => {
            if (!bridgeRef.current) return;
            setNamingSubmitting(true);
            try {
                const payload = await bridgeRef.current.requestManualSave({ withThumbnail: true });
                if (!payload?.json) return;
                const created = await createMap({
                    name,
                    json: payload.json,
                    thumbnailB64: payload.thumbnail_b64 || "",
                });
                bridgeRef.current.markSaved(created._id, created.name);
                setNamingModal({ open: false, mode: "save", initial: "" });
            } catch (err) {
                console.error("First save failed:", err);
                alert(err.message || "Save failed. Please try again.");
            } finally {
                setNamingSubmitting(false);
            }
        },
        [createMap]
    );

    const performSaveAs = useCallback(
        async (name) => {
            if (!bridgeRef.current) return;
            const currentId = bridgeRef.current.currentMapId;
            setNamingSubmitting(true);
            try {
                if (currentId) {
                    const dup = await duplicateMap(currentId, { name });
                    bridgeRef.current.setMapMeta(dup._id, dup.name);
                    const payload = await bridgeRef.current.requestManualSave({ withThumbnail: true });
                    if (payload?.json) {
                        await updateMap(dup._id, {
                            json: payload.json,
                            thumbnailB64: payload.thumbnail_b64 || "",
                        });
                    }
                    bridgeRef.current.markSaved(dup._id, dup.name);
                } else {
                    await performFirstSave(name);
                    return;
                }
                setNamingModal({ open: false, mode: "save", initial: "" });
            } catch (err) {
                console.error("Save As failed:", err);
                alert(err.message || "Save As failed. Please try again.");
            } finally {
                setNamingSubmitting(false);
            }
        },
        [duplicateMap, updateMap, performFirstSave]
    );

    const handlePickMap = useCallback(
        async (mapMeta) => {
            try {
                const full = await getMap(mapMeta._id);
                // Bubble the scene name up to the parent (existing behavior).
                if (onSceneNameChange) onSceneNameChange(full.name);
                // If Godot isn't booted yet (first map of the session), mount the iframe
                // and queue the load — an effect below will fire it once bridge.isReady.
                if (!bridgeRef.current?.isReady) {
                    pendingLoadRef.current = {
                        id: full._id,
                        name: full.name,
                        json: full.json,
                    };
                    setHasOpenedMap(true);
                } else {
                    // Godot is already alive — load immediately.
                    bridgeRef.current.loadMap(full._id, full.name, full.json);
                }
            } catch (err) {
                console.error("Failed to load map:", err);
                alert(err.message || "Could not load that map.");
            }
        },
        [getMap, onSceneNameChange]
    );

    const handleCreateNewFromLoad = useCallback(() => {
        // Open a blank canvas inside the session.
        if (onSceneNameChange) onSceneNameChange("");
        if (!bridgeRef.current?.isReady) {
            // Godot isn't booted yet — just mount the iframe; it'll start empty.
            setHasOpenedMap(true);
        } else {
            // Already alive — clear the canvas via newMap.
            bridgeRef.current.newMap();
        }
    }, [onSceneNameChange]);

    const handleConfirmDiscard = useCallback(() => {
        bridgeRef.current?.newMap();
        setShowDiscardModal(false);
    }, []);


    // Browser tab title sync (same format as standalone Maps.jsx)
    useEffect(() => {
        if (!hasOpenedMap) return;
        const name = bridge.currentMapName?.trim() || "(Untitled)";
        let suffix = "";
        if (isManualSaving) suffix = " • Saving...";
        else if (bridge.isDirty) suffix = " • Unsaved";
        document.title = `${name}${suffix} — Maps Unbound`;
    }, [bridge.currentMapName, bridge.isDirty, isManualSaving, hasOpenedMap]);

    // ─── Combat setup helpers (unchanged from your existing code) ─────────
    const openCombatSetup = () => {
        const seededFromTurns = turns.map((turn) =>
            createParticipant(turn.kind || "Enemy", [], {
                name: turn.name || "",
                initiative: typeof turn.initiative === "number" ? turn.initiative : 10,
                hp: typeof turn.hp === "number" ? turn.hp : defaultHpByKind(turn.kind || "Enemy"),
                sourceLabel: "Current Combat",
                className: turn.className,
                level: turn.level,
                creatureType: turn.creatureType,
                cr: turn.cr,
            })
        );

        const seededFromPlayers = (combatEntityPool.players || []).map((player) =>
            createParticipant("Player", [], {
                id: nextRowId(),
                name: player.name,
                initiative: 10,
                hp: player.hp ?? defaultHpByKind("Player"),
                sourceLabel: "Campaign Player",
                className: player.className,
                level: player.level,
                // Carry forward player-specific data so it's available
                // when computedTurns + liveCombatants are built.
                characterId: player.characterId,
                userId: player.userId,
                portraitUrl: player.portraitUrl,
                maxHp: player.maxHp ?? player.hp,
            })
        );

        const startingRows = seededFromTurns.length > 0 ? seededFromTurns : seededFromPlayers;
        setDraftParticipants(startingRows.length > 0 ? startingRows : [createParticipant("Enemy", [])]);
        setCombatSetupError("");
        setIsCombatSetupOpen(true);
    };

    const applyCombatSetup = async () => {
        const activeRows = draftParticipants.filter((row) => row.name.trim());
        if (activeRows.length === 0) {
            setCombatSetupError("Add at least one participant before starting combat.");
            return;
        }

        const seenParticipants = new Set();
        const duplicateParticipant = activeRows.find((row) => {
            const key = getParticipantKey(row.kind, row.name);
            if (!row.name.trim()) return false;
            if (seenParticipants.has(key)) return true;
            seenParticipants.add(key);
            return false;
        });
        if (duplicateParticipant) {
            setCombatSetupError(`${duplicateParticipant.name.trim()} is already in this encounter.`);
            return;
        }
        console.log("[DEBUG] activeRows:", JSON.stringify(activeRows, null, 2));
        const sortedRows = [...activeRows].sort((a, b) => {
            if (b.initiative !== a.initiative) return b.initiative - a.initiative;
            return a.name.localeCompare(b.name);
        });

        const computedTurns = sortedRows.map((row, idx) => ({
            order: idx + 1,
            initiative: Number(row.initiative) || 0,
            name: row.name.trim(),
            kind: row.kind,
            hp: Number(row.hp) || defaultHpByKind(row.kind),
            isActive: idx === 0,
            isNext: idx === 1,
            ...defaultDetailByKind(row.kind),
            className: row.className ?? defaultDetailByKind(row.kind).className,
            level: row.level ?? defaultDetailByKind(row.kind).level,
            creatureType: row.creatureType ?? defaultDetailByKind(row.kind).creatureType,
            cr: row.cr ?? defaultDetailByKind(row.kind).cr,
            // Carry character data forward (Player rows only)
            characterId: row.characterId,
            userId: row.userId,
            portraitUrl: row.portraitUrl,
            maxHp: row.maxHp ?? (Number(row.hp) || defaultHpByKind(row.kind)),
            hiddenFromMap: row.hiddenFromMap || false,
            hiddenFromInitiative: row.hiddenFromInitiative || false,
        }));

        // ─── Existing flow: update local turns + emit onCombatStart for the
        //    Encounter (historical record) system. UNCHANGED behavior.
        if (onTurnsChange) onTurnsChange(computedTurns);
        setIsCombatState(true);
        if (onCombatStateChange) onCombatStateChange(true);
        if (onCombatStart) {
            onCombatStart({
                turns: computedTurns,
                round: 1,
                mapName: bridge.currentMapName || "",
            });
        }

        // ─── NEW: also create + start a LiveCombat doc on the backend.
        //    This is what powers the InitiativeStrip, token portrait sync,
        //    HP sync, and the combat log Events panel in upcoming files.
        //    Best-effort — if it fails we log but don't block combat starting.
        if (sessionId && token) {
            try {
                const apiBase = import.meta.env.VITE_API_SERVER || "";
                const liveCombatants = computedTurns.map((turn) => ({
                    // Stable client-side id (different from the row id used
                    // in the modal — that one is just a counter).
                    id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                    kind: turn.kind,
                    name: turn.name,
                    characterId: turn.characterId || null,
                    userId: turn.userId || null,
                    initiative: turn.initiative,
                    hp: turn.hp,
                    maxHp: turn.maxHp,
                    portraitUrl: turn.portraitUrl || "",
                    hiddenFromMap: turn.hiddenFromMap || false,
                    hiddenFromInitiative: turn.hiddenFromInitiative || false,
                    tokenId: "", // filled in by Godot after token spawn
                }));

                // Step 1: create combat in setup mode (idempotent — returns
                // existing doc if one already exists for this session).
                await fetch(`${apiBase}/api/combat/session/${sessionId}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ combatants: liveCombatants }),
                });

                // Step 2: replace combatants list (in case combat already
                // existed from a prior aborted setup) and start it.
                await fetch(`${apiBase}/api/combat/session/${sessionId}/setup`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ combatants: liveCombatants }),
                });

                await fetch(`${apiBase}/api/combat/session/${sessionId}/start`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                });

                console.log("[DEBUG] liveCombatants[0]:", JSON.stringify(liveCombatants[0], null, 2));
                console.log("[DEBUG] computedTurns[0]:", JSON.stringify(computedTurns[0], null, 2));
                console.log("[DEBUG] combatEntityPool.players[0]:", JSON.stringify(combatEntityPool.players[0], null, 2));
                sendToGodot("mu:spawn_combat_tokens", {
                    combatants: liveCombatants,
                });
            } catch (err) {
                console.warn("Failed to create LiveCombat:", err.message);
            }
        }

        setIsCombatSetupOpen(false);
    };

    const addCustomEntity = (kind, name) => {
        const trimmedName = String(name || "").trim();
        if (!trimmedName) {
            setCombatSetupError("New entities need a name before they can be added.");
            return false;
        }

        const participantKey = getParticipantKey(kind, trimmedName);
        const exists = draftParticipants.some((row) => getParticipantKey(row.kind, row.name) === participantKey);
        if (exists) {
            setCombatSetupError(`${trimmedName} is already in this encounter.`);
            return false;
        }

        setDraftParticipants((prev) => [
            ...prev,
            createParticipant(kind, prev, {
                name: trimmedName,
                sourceLabel: "Custom Entity",
            }),
        ]);
        setCombatSetupError("");
        return true;
    };

    const addParticipantFromPool = (kind, entry) => {
        const participantName = entry.name || "";
        const participantKey = getParticipantKey(kind, participantName);
        const exists = draftParticipants.some((row) => getParticipantKey(row.kind, row.name) === participantKey);
        if (participantName.trim() && exists) {
            setCombatSetupError(`${participantName} is already in this encounter.`);
            return;
        }

        setDraftParticipants((prev) => [
            ...prev,
            createParticipant(kind, prev, {
                name: entry.name || suggestedName(kind, prev),
                hp: entry.hp ?? defaultHpByKind(kind),
                sourceLabel: kind === "Player" ? "Campaign Player" : "Campaign Roster",
                className: entry.className,
                level: entry.level,
                creatureType: entry.creatureType,
                cr: entry.cr,
                // Player-specific data we'll need when spawning tokens.
                // For NPCs/Enemies these fields are undefined (and that's fine).
                characterId: entry.characterId,
                userId: entry.userId,
                portraitUrl: entry.portraitUrl,
                maxHp: entry.maxHp ?? entry.hp,
            }),
        ]);
        setCombatSetupError("");
    };

    const updateParticipantKind = (id, kind) => {
        setDraftParticipants((prev) =>
            prev.map((item) =>
                item.id === id
                    ? {
                          ...item,
                          kind,
                          hp: defaultHpByKind(kind),
                          sourceLabel: "Custom",
                         
                          ...defaultDetailByKind(kind),
                      }
                    : item
            )
        );
        setCombatSetupError("");
    };

    const updateParticipantName = (id, name) => {
        setDraftParticipants((prev) => prev.map((item) => (item.id === id ? { ...item, name } : item)));
        setCombatSetupError("");
    };

    const updateParticipantInitiative = (id, initiative) => {
        setDraftParticipants((prev) => prev.map((item) => (item.id === id ? { ...item, initiative } : item)));
        setCombatSetupError("");
    };

    const updateParticipantHp = (id, hp) => {
        setDraftParticipants((prev) => prev.map((item) => (item.id === id ? { ...item, hp } : item)));
        setCombatSetupError("");
    };

    const updateParticipantHiddenMap = (id, value) => {
        setDraftParticipants((prev) =>
            prev.map((item) => (item.id === id ? { ...item, hiddenFromMap: value } : item))
        );
    };

    const updateParticipantHiddenInit = (id, value) => {
        setDraftParticipants((prev) =>
            prev.map((item) => (item.id === id ? { ...item, hiddenFromInitiative: value } : item))
        );
    };

    const removeParticipant = (id) => {
        setDraftParticipants((prev) => prev.filter((item) => item.id !== id));
        setCombatSetupError("");
    };

    // ─── Render ───────────────────────────────────────────────────────────
    return (
        <main className={["session-dm__map", isLiveCombatState ? "is-combat-state" : ""].filter(Boolean).join(" ")}>
            {/* Godot iframe — mounts only after the user picks/creates a map */}
            {hasOpenedMap && (
                <iframe
                    ref={iframeRef}
                    src="/maps-unbound-godot.html"
                    title="Map Editor"
                    className="session-dm__map-iframe"
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        border: "none",
                        zIndex: 1,
                    }}
                />
            )}

            {/* Empty-state placeholder before any map is opened */}
            {!hasOpenedMap && (
                <div className="session-dm__map-overlay">
                    <div>
                        <h2>{isLiveCombatState ? "Combat State" : "Map Canvas"}</h2>
                        <p>
                            {isLiveCombatState
                                ? "Initiative is live. Keep turns visible and track movement."
                                : "Choose a map to fill the canvas."}
                        </p>
                    </div>
                </div>
            )}
<div className="session-dm__map-controls" aria-label="Map quick tools">
                {!readOnly && (
                    <button
                        type="button"
                        className="session-dm__map-btn"
                        onClick={() => setShowLoadModal(true)}
                    >
                        Maps
                    </button>
                )}
                <button type="button" className="session-dm__map-btn">Roll Dice</button>
                <button type="button" className="session-dm__map-btn">Ping</button>
                {!readOnly && <button type="button" className="session-dm__map-btn">Hitbox</button>}
                {!readOnly && (
                    <button
                        type="button"
                        className={[
                            "session-dm__map-btn",
                            isCombatState ? "session-dm__map-btn--danger" : "",
                        ].filter(Boolean).join(" ")}
                        onClick={async () => {
                            if (isCombatState) {
                                // Call the historical Encounter end (existing flow).
                                if (onCombatEnd) {
                                    onCombatEnd({
                                        turns,
                                        round: turns.length > 0 ? round + 1 : 0,
                                        mapName: bridge.currentMapName || "",
                                    });
                                }
                                // End the LiveCombat doc so the strip disappears.
                                if (sessionId && token) {
                                    try {
                                        const apiBase = import.meta.env.VITE_API_SERVER || "";
                                        await fetch(
                                            `${apiBase}/api/combat/session/${sessionId}/end`,
                                            {
                                                method: "POST",
                                                headers: { Authorization: `Bearer ${token}` },
                                            }
                                        );
                                    } catch (err) {
                                        console.warn("Failed to end LiveCombat:", err.message);
                                    }
                                }
                                // Tell Godot to despawn combat tokens.
                                sendToGodot("mu:clear_combat_tokens", {});
                                setIsCombatState(false);
                                if (onTurnsChange) onTurnsChange([]);
                                if (onCombatStateChange) onCombatStateChange(false);
                                return;
                            }
                            openCombatSetup();
                        }}
                        aria-pressed={isCombatState}
                    >
                        {isCombatState ? "End Combat" : "Start Combat"}
                    </button>
                )}
            </div>

            {!readOnly && (
                <EncounterOverlay
                    isOpen={isCombatSetupOpen}
                    draftParticipants={draftParticipants}
                    combatSetupError={combatSetupError}
                    onClose={() => setIsCombatSetupOpen(false)}
                    onAddCustomEntity={addCustomEntity}
                    onAddParticipantFromPool={addParticipantFromPool}
                    entityPool={combatEntityPool}
                    onKindChange={updateParticipantKind}
                    onNameChange={updateParticipantName}
                    onInitiativeChange={updateParticipantInitiative}
                    onHpChange={updateParticipantHp}
                    onHiddenMapChange={updateParticipantHiddenMap}
                    onHiddenInitChange={updateParticipantHiddenInit}
                    onRemove={removeParticipant}
                    onApply={applyCombatSetup}
                />
            )}

            {/* Map management modals — same components used by standalone Maps.jsx */}
            {!readOnly && (
                <>
                    <MapLoadModal
                        isOpen={showLoadModal}
                        onClose={() => setShowLoadModal(false)}
                        onPickMap={handlePickMap}
                        onCreateNew={handleCreateNewFromLoad}
                    />

                    <MapNamingModal
                        isOpen={namingModal.open}
                        mode={namingModal.mode}
                        initialName={namingModal.initial}
                        submitting={namingSubmitting}
                        onCancel={() => !namingSubmitting && setNamingModal({ open: false, mode: "save", initial: "" })}
                        onSubmit={(name) => {
                            if (namingModal.mode === "save-as") {
                                performSaveAs(name);
                            } else {
                                performFirstSave(name);
                            }
                        }}
                    />

                    <ConfirmDiscardModal
                        isOpen={showDiscardModal}
                        mapName={bridge.currentMapName}
                        onCancel={() => setShowDiscardModal(false)}
                        onConfirm={handleConfirmDiscard}
                    />
                </>
            )}
        </main>
    );
}

export default SessionMapCanvas;
