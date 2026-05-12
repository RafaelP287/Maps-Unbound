/* globalEngine */
import React, { useRef, useEffect, useCallback, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import Gate from "../../shared/Gate.jsx";

import useGodotBridge from "./use-godot-bridge.js";
import { useMapsApi } from "./use-maps.js";
import MapLoadModal from "./MapLoadModal.jsx";
import MapNamingModal from "./MapNamingModal.jsx";
import ConfirmDiscardModal from "./ConfirmDiscardModal.jsx";

// ─── Constants ────────────────────────────────────────────────────────────────
const DICE_TYPES = [
    { type: "d20", label: "d20" },
    { type: "d12", label: "d12" },
    { type: "d10", label: "d10" },
    { type: "d10x", label: "d100" },
    { type: "d8", label: "d8" },
    { type: "d6", label: "d6" },
    { type: "d4", label: "d4" },
];

const ROLL_COOLDOWN = 500;
const MIN_QTY = 1;
const MAX_QTY = 30;

// ═══════════════════════════════════════════════════════════════════════════
// Maps page
// ═══════════════════════════════════════════════════════════════════════════
function Maps({
    initializeDice,
    cleanupDice,
    retryDice,
    resizeDice,
    rollDice,
    isDiceReady,
    diceError,
    pixelRatio,
    rollNotifs,
}) {
    const { isLoggedIn } = useAuth();
    const canvasRef = useRef(null);
    const iframeRef = useRef(null);
    const didInitDice = useRef(false);
    const resizeTimerRef = useRef(null);
    const lastRollRef = useRef(0);
    const didAutoLoadRef = useRef(false);
    const bridgeRef = useRef(null);

    // ─── Dice panel state ─────────────────────────────────────────────────
    const [isOpen, setIsOpen] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [mode, setMode] = useState("normal"); // 'normal' | 'advantage' | 'disadvantage'

    // ─── Map management state ─────────────────────────────────────────────
    const { getMap, createMap, updateMap, duplicateMap } = useMapsApi();

    // Modals — driven by Godot postMessage events and by user actions on the bridge.
    const [showLoadModal, setShowLoadModal] = useState(false);
    const [showDiscardModal, setShowDiscardModal] = useState(false);
    const [namingModal, setNamingModal] = useState({
        open: false,
        mode: "save", // "save" | "save-as"
        initial: "",
    });
    const [namingSubmitting, setNamingSubmitting] = useState(false);

    // True while a manual save is round-tripping (used to gate the status indicator).
    const [isManualSaving, setIsManualSaving] = useState(false);
    // True while we're auto-loading the user's most recent map on first visit.
    const [autoLoading, setAutoLoading] = useState(false);

    // ─── Godot bridge ─────────────────────────────────────────────────────
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

    // ─── Auto-load most recent map on first visit ─────────────────────────
    useEffect(() => {
        if (!isLoggedIn || !bridge.isReady || didAutoLoadRef.current) return;
        didAutoLoadRef.current = true;

        (async () => {
            try {
                const res = await fetch(
                    `${import.meta.env.VITE_API_SERVER || ""}/api/maps`,
                    { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } }
                );
                if (!res.ok) throw new Error(`Failed to list maps (${res.status})`);
                const list = await res.json();
                if (!Array.isArray(list) || list.length === 0) {
                    // No saved maps yet — nothing to load, just show blank canvas.
                    return;
                }
                // We DO have a map to load — show the overlay now.
                setAutoLoading(true);
                const explicitId = sessionStorage.getItem("maps-unbound-open");
                sessionStorage.removeItem("maps-unbound-open");
                const target = explicitId
                    ? list.find((m) => m._id === explicitId)
                    : list.reduce((best, m) =>
                        new Date(m.updatedAt) > new Date(best.updatedAt) ? m : best
                      );
                if (!target) return;
                const full = await getMap(target._id);
                bridge.loadMap(full._id, full.name, full.json);
            } catch (err) {
                console.warn("Auto-load most recent map failed:", err.message);
            } finally {
                setAutoLoading(false);
            }
        })();
    }, [isLoggedIn, bridge.isReady, bridge, getMap]);



    // ─── First-save flow: name → create → mark saved ──────────────────────
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

    // ─── Save As flow: prompt → duplicate (or create if no current map) ────
    const performSaveAs = useCallback(
        async (name) => {
            if (!bridgeRef.current) return;
            const currentId = bridgeRef.current.currentMapId;
            setNamingSubmitting(true);
            try {
                if (currentId) {
                    // Duplicate the existing map server-side, then load the duplicate so
                    // future saves go to the copy (matches user expectation of "Save As").
                    const dup = await duplicateMap(currentId, { name });
                    // Fetch full JSON for the new copy and rebroadcast to Godot, but keep
                    // the canvas exactly as-is (don't re-apply state — could lose unsaved
                    // edits made between the original and the duplicate). We just update
                    // Godot's notion of "what map am I editing" to point at the new id.
                    bridgeRef.current.setMapMeta(dup._id, dup.name);
                    // Now save current state to the new id so the duplicate matches what
                    // the user sees (including any edits since the original last saved).
                    const payload = await bridgeRef.current.requestManualSave({ withThumbnail: true });
                    if (payload?.json) {
                        await updateMap(dup._id, {
                            json: payload.json,
                            thumbnailB64: payload.thumbnail_b64 || "",
                        });
                    }
                    bridgeRef.current.markSaved(dup._id, dup.name);
                } else {
                    // No current map — Save As behaves like first-save.
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

    // ─── New map (with discard confirmation if dirty) ─────────────────────
    const handleConfirmDiscard = useCallback(() => {
        if (!bridgeRef.current) return;
        bridgeRef.current.newMap();
        setShowDiscardModal(false);
    }, []);

    // The Godot scene has its own "New Map" button you'd connect to a new handler.
    // Currently nothing in Godot triggers this — we keep it here for future wiring.
    // (Once you add a New button in Godot's scene that posts mu:request_new, we'd
    //  branch here on bridge.isDirty to show the discard modal vs. clear directly.)


    // ─── Pick map from Load modal: fetch full JSON, hand to Godot ─────────
    const handlePickMap = useCallback(
        async (mapMeta) => {
            try {
                const full = await getMap(mapMeta._id);
                bridgeRef.current?.loadMap(full._id, full.name, full.json);
            } catch (err) {
                console.error("Failed to load map:", err);
                alert(err.message || "Could not load that map.");
            }
        },
        [getMap]
    );

    const handleCreateNewFromLoad = useCallback(() => {
        // From the Load modal's "Create New" tile.
        if (bridgeRef.current?.isDirty) {
            setShowDiscardModal(true);
        } else {
            bridgeRef.current?.newMap();
        }
    }, []);

    // ─── Status label updates browser tab title ───────────────────────────
    useEffect(() => {
        const name = bridge.currentMapName?.trim() || "(Untitled)";
        let suffix = "";
        if (isManualSaving) suffix = " • Saving...";
        else if (bridge.isDirty) suffix = " • Unsaved";
        document.title = `${name}${suffix} — Maps Unbound`;
        return () => {
            document.title = "Maps Unbound";
        };
    }, [bridge.currentMapName, bridge.isDirty, isManualSaving]);

    // ═══════════════════════════════════════════════════════════════════════
    // Below this line is your existing dice setup — preserved as-is.
    // ═══════════════════════════════════════════════════════════════════════

    const handleRoll = useCallback(
        (diceType) => {
            const now = Date.now();
            if (now - lastRollRef.current < ROLL_COOLDOWN) return;
            lastRollRef.current = now;
            rollDice(diceType, quantity, mode);
            setIsOpen(false);
        },
        [rollDice, quantity, mode]
    );

    const sizeCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = Math.floor(window.innerWidth * pixelRatio);
        canvas.height = Math.floor(window.innerHeight * pixelRatio);
    }, [pixelRatio]);

    // Mount / unmount dice
    useEffect(() => {
        if (!isLoggedIn) return;
        const canvas = canvasRef.current;
        if (!canvas || didInitDice.current) return;
        didInitDice.current = true;
        sizeCanvas();
        const rafId = requestAnimationFrame(async () => {
            await initializeDice(canvas);
        });
        return () => {
            cancelAnimationFrame(rafId);
            clearTimeout(resizeTimerRef.current);
            didInitDice.current = false;
            cleanupDice();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoggedIn]);

    // Resize handling for dice canvas
    useEffect(() => {
        const handleResize = () => {
            clearTimeout(resizeTimerRef.current);
            resizeTimerRef.current = setTimeout(() => {
                const canvas = canvasRef.current;
                if (!canvas) return;
                sizeCanvas();
                resizeDice(canvas);
            }, 700);
        };
        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
            clearTimeout(resizeTimerRef.current);
        };
    }, [sizeCanvas, resizeDice]);

    // Touch guards
    useEffect(() => {
        const noPinch = (e) => {
            if (e.touches.length > 1) e.preventDefault();
        };
        const noDblTap = (e) => e.preventDefault();
        document.addEventListener("touchmove", noPinch, { passive: false });
        document.addEventListener("dblclick", noDblTap);
        return () => {
            document.removeEventListener("touchmove", noPinch);
            document.removeEventListener("dblclick", noDblTap);
        };
    }, []);

    // Godot iframe resize trigger
    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe) return;
        iframe.onload = () => iframe.contentWindow?.dispatchEvent(new Event("resize"));
    }, []);

    // Close dice panel when clicking outside
    useEffect(() => {
        if (!isOpen) return;
        const close = (e) => {
            if (!e.target.closest("#dice-panel") && !e.target.closest("#dice-fab")) {
                setIsOpen(false);
            }
        };
        document.addEventListener("pointerdown", close);
        return () => document.removeEventListener("pointerdown", close);
    }, [isOpen]);

    const handleRetry = () => {
        didInitDice.current = false;
        sizeCanvas();
        requestAnimationFrame(async () => {
            await retryDice(canvasRef.current);
        });
    };

    if (!isLoggedIn) return <Gate>Sign in to create maps.</Gate>;

    // ─── Render ───────────────────────────────────────────────────────────
    return (
        <div
            style={{
                width: "100%",
                height: "100vh",
                background: "#1a1a1a",
                overflow: "hidden",
                position: "relative",
                userSelect: "none",
                WebkitUserSelect: "none",
            }}
            onWheel={(e) => e.preventDefault()}
            onTouchMove={(e) => e.preventDefault()}
        >
            {/* Godot iframe — your existing setup, untouched */}
            <iframe
                ref={iframeRef}
                src="/maps-unbound-godot.html"
                title="Map Editor"
                style={{
                    position: "absolute",
                    top: 60,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    border: "none",
                    zIndex: 1,
                }}
            />

            {/* Dice canvas — unchanged */}
            <canvas
                ref={canvasRef}
                style={{
                    display: "block",
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    zIndex: 5,
                    pointerEvents: "none",
                    touchAction: "none",
                }}
            />

            {/* Roll notifications */}
            <div style={s.notifStack}>
                {rollNotifs.map((notif) => (
                    <RollNotif key={notif.id} notif={notif} />
                ))}
            </div>

            {/* Auto-load overlay (only on first visit while we fetch the most-recent map) */}
            {autoLoading && (
                <div style={s.loadingOverlay}>
                    <span style={s.loadingText}>Unfurling your last map…</span>
                </div>
            )}

            {/* Dice error pill — unchanged */}
            {diceError && (
                <div style={{ ...s.pill, background: "rgba(160,30,30,0.9)", flexDirection: "column", gap: 8 }}>
                    <span>⚠️ {diceError}</span>
                    <button onClick={handleRetry} style={s.retryBtn}>
                        Retry
                    </button>
                </div>
            )}

            {/* Dice panel + FAB — unchanged */}
            {isDiceReady && (
                <>
                    {isOpen && (
                        <div id="dice-panel" style={s.panel}>
                            <div style={s.modeRow}>
                                {["advantage", "normal", "disadvantage"].map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => setMode(m)}
                                        style={{
                                            ...s.modeBtn,
                                            ...(mode === m ? s.modeBtnActive : {}),
                                            color:
                                                m === "advantage"
                                                    ? "#5eca7e"
                                                    : m === "disadvantage"
                                                        ? "#e05c5c"
                                                        : "#d4af37",
                                            borderColor:
                                                m === "advantage"
                                                    ? mode === m
                                                        ? "#5eca7e"
                                                        : "rgba(94,202,126,0.3)"
                                                    : m === "disadvantage"
                                                        ? mode === m
                                                            ? "#e05c5c"
                                                            : "rgba(224,92,92,0.3)"
                                                        : mode === m
                                                            ? "#d4af37"
                                                            : "rgba(212,175,55,0.3)",
                                        }}
                                    >
                                        {m === "advantage" ? "Adv" : m === "disadvantage" ? "Dis" : "Nor"}
                                    </button>
                                ))}
                            </div>

                            {mode === "normal" && (
                                <div style={s.qtyRow}>
                                    <span style={s.qtyLabel}>Qty</span>
                                    <div style={s.qtyControls}>
                                        <button
                                            style={s.qtyBtn}
                                            onClick={() => setQuantity((q) => Math.max(MIN_QTY, q - 1))}
                                            disabled={quantity <= MIN_QTY}
                                        >
                                            −
                                        </button>
                                        <span style={s.qtyValue}>{quantity}</span>
                                        <button
                                            style={s.qtyBtn}
                                            onClick={() => setQuantity((q) => Math.min(MAX_QTY, q + 1))}
                                            disabled={quantity >= MAX_QTY}
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div style={s.divider} />

                            {DICE_TYPES.map(({ type, label }) => (
                                <DiceRow
                                    key={type}
                                    type={type}
                                    label={label}
                                    quantity={mode === "normal" && type !== "d10x" ? quantity : null}
                                    mode={mode}
                                    onRoll={handleRoll}
                                />
                            ))}
                        </div>
                    )}

                    <button
                        id="dice-fab"
                        onClick={() => setIsOpen((o) => !o)}
                        style={{
                            ...s.fab,
                            background: isOpen ? "rgba(212,175,55,0.25)" : "rgba(10,8,5,0.85)",
                            boxShadow: isOpen
                                ? "0 0 0 2px #d4af37, 0 8px 24px rgba(0,0,0,0.6)"
                                : "0 4px 16px rgba(0,0,0,0.6)",
                        }}
                        title="Roll Dice"
                    >
                        <img
                            src="/d20.svg"
                            alt="Roll"
                            style={{ width: 38, height: 38, filter: "brightness(1.8) saturate(0.8)" }}
                        />
                    </button>
                </>
            )}

            {/* ─── Map management modals ──────────────────────────────────── */}
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
        </div>
    );
}

// ─── Dice Row in panel ────────────────────────────────────────────────────────
function DiceRow({ type, label, quantity, mode, onRoll }) {
    const [cooling, setCooling] = useState(false);

    const handleClick = () => {
        if (cooling) return;
        onRoll(type);
        setCooling(true);
        setTimeout(() => setCooling(false), 500);
    };

    const modeHint =
        mode === "advantage" ? " (2, high)" : mode === "disadvantage" ? " (2, low)" : "";
    const qtyBadge = quantity && quantity > 1 ? `×${quantity}` : null;

    return (
        <button
            onClick={handleClick}
            disabled={cooling}
            style={{
                ...s.diceRow,
                opacity: cooling ? 0.5 : 1,
                background: cooling ? "rgba(255,255,255,0.03)" : "transparent",
            }}
        >
            <span style={s.diceRowLabel}>{label}</span>
            <span style={s.diceRowHint}>
                {qtyBadge && <span style={s.qtyBadge}>{qtyBadge}</span>}
                {modeHint && <span style={s.modeBadge(mode)}>{modeHint}</span>}
            </span>
        </button>
    );
}

// ─── Roll notification card ───────────────────────────────────────────────────
function RollNotif({ notif }) {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 10);
        return () => clearTimeout(t);
    }, []);

    const cardStyle = {
        ...s.notifCard,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(30px)",
    };

    if (notif.isPercent) {
        return (
            <div style={cardStyle}>
                <div style={s.notifLabel}>d% Percentile</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                        <span style={s.subLabel}>00–90</span>
                        <span style={s.diePip}>{notif.tensDisplay}</span>
                    </div>
                    <span style={{ color: "rgba(212,175,55,0.5)", fontWeight: "bold", paddingTop: 10 }}>+</span>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                        <span style={s.subLabel}>0–9</span>
                        <span style={s.diePip}>{notif.onesDisplay}</span>
                    </div>
                </div>
                <div style={s.totalRow}>
                    <span style={s.totalLabel}>Result</span>
                    <span style={s.totalValue}>{notif.total}</span>
                </div>
            </div>
        );
    }

    if (notif.isAdvDis) {
        const isAdv = notif.mode === "advantage";
        const color = isAdv ? "#5eca7e" : "#e05c5c";
        return (
            <div style={cardStyle}>
                <div style={{ ...s.notifLabel, color }}>
                    {isAdv ? "▲ Advantage" : "▼ Disadvantage"} — {notif.diceType}
                </div>
                <div style={{ display: "flex", gap: 6, marginBottom: 4, alignItems: "center" }}>
                    {notif.rolls.map((v, i) => (
                        <span
                            key={i}
                            style={{
                                ...s.diePip,
                                background:
                                    v === notif.chosen
                                        ? `rgba(${isAdv ? "94,202,126" : "224,92,92"},0.2)`
                                        : "rgba(255,255,255,0.05)",
                                border: `1px solid ${v === notif.chosen ? color : "rgba(255,255,255,0.1)"}`,
                                color: v === notif.chosen ? color : "rgba(255,255,255,0.35)",
                                textDecoration: v !== notif.chosen ? "line-through" : "none",
                            }}
                        >
                            {v}
                        </span>
                    ))}
                </div>
                <div style={s.totalRow}>
                    <span style={s.totalLabel}>Result</span>
                    <span style={{ ...s.totalValue, color }}>{notif.chosen}</span>
                </div>
            </div>
        );
    }

    const grouped = notif.values.reduce((acc, d) => {
        acc[d.type] = (acc[d.type] || 0) + 1;
        return acc;
    }, {});
    const diceLabel = Object.entries(grouped)
        .map(([t, c]) => (c > 1 ? `${c}× ${t}` : t))
        .join(" + ");

    return (
        <div style={cardStyle}>
            <div style={s.notifLabel}>{diceLabel}</div>
            <div
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 4,
                    marginBottom: notif.values.length > 1 ? 4 : 0,
                }}
            >
                {notif.values.map((d, i) => (
                    <span key={i} style={s.diePip}>
                        {d.value}
                    </span>
                ))}
            </div>
            {notif.values.length > 1 && (
                <div style={s.totalRow}>
                    <span style={s.totalLabel}>Total</span>
                    <span style={s.totalValue}>{notif.total}</span>
                </div>
            )}
        </div>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
    notifStack: {
        position: "absolute",
        top: 70,
        right: 16,
        zIndex: 20,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        alignItems: "flex-end",
        pointerEvents: "none",
        maxHeight: "calc(100vh - 160px)",
        overflow: "hidden",
    },
    notifCard: {
        background: "rgba(10,8,5,0.88)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(212,175,55,0.3)",
        borderRadius: 12,
        padding: "10px 14px",
        minWidth: 140,
        maxWidth: 220,
        boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
        transition: "opacity 0.25s ease, transform 0.25s ease",
        pointerEvents: "none",
    },
    notifLabel: {
        color: "rgba(212,175,55,0.85)",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        marginBottom: 6,
        fontFamily: "'Cinzel', serif",
    },
    subLabel: { color: "rgba(255,255,255,0.35)", fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase" },
    diePip: {
        background: "rgba(212,175,55,0.12)",
        border: "1px solid rgba(212,175,55,0.25)",
        borderRadius: 6,
        color: "#f0e0a0",
        fontSize: 14,
        fontWeight: "bold",
        padding: "2px 7px",
        minWidth: 24,
        textAlign: "center",
        fontFamily: "'Cinzel', serif",
    },
    totalRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 6,
        paddingTop: 6,
        borderTop: "1px solid rgba(212,175,55,0.15)",
    },
    totalLabel: { color: "rgba(255,255,255,0.4)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" },
    totalValue: { color: "#f4e5b0", fontSize: 20, fontWeight: "bold", fontFamily: "'Cinzel', serif" },

    fab: {
        position: "absolute",
        bottom: 20,
        right: 20,
        zIndex: 15,
        width: 60,
        height: 60,
        borderRadius: "50%",
        border: "1px solid rgba(212,175,55,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "all 0.2s ease",
        backdropFilter: "blur(8px)",
    },

    panel: {
        position: "absolute",
        bottom: 90,
        right: 20,
        zIndex: 15,
        background: "rgba(8,6,3,0.92)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(212,175,55,0.2)",
        borderRadius: 16,
        padding: "14px 0 10px",
        minWidth: 180,
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        display: "flex",
        flexDirection: "column",
        gap: 2,
    },

    modeRow: { display: "flex", gap: 6, padding: "0 14px 10px", justifyContent: "center" },
    modeBtn: {
        flex: 1,
        padding: "5px 0",
        borderRadius: 8,
        border: "1px solid",
        background: "transparent",
        cursor: "pointer",
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: "0.05em",
        transition: "all 0.15s ease",
    },
    modeBtnActive: { background: "rgba(255,255,255,0.08)" },

    qtyRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px 10px", gap: 8 },
    qtyLabel: { color: "rgba(255,255,255,0.4)", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase" },
    qtyControls: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 8,
        padding: "3px 8px",
    },
    qtyBtn: {
        background: "none",
        border: "none",
        color: "#d4af37",
        fontSize: 18,
        fontWeight: "bold",
        cursor: "pointer",
        padding: "0 2px",
        lineHeight: 1,
    },
    qtyValue: { color: "#fff", fontSize: 15, fontWeight: "bold", minWidth: 22, textAlign: "center" },

    divider: { height: 1, background: "rgba(255,255,255,0.08)", margin: "0 0 4px" },

    diceRow: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "9px 16px",
        border: "none",
        width: "100%",
        textAlign: "left",
        cursor: "pointer",
        transition: "background 0.1s ease",
        borderRadius: 0,
        gap: 8,
    },
    diceRowLabel: {
        color: "#f0e0a0",
        fontSize: 15,
        fontWeight: "700",
        fontFamily: "'Cinzel', serif",
        letterSpacing: "0.03em",
    },
    diceRowHint: { display: "flex", gap: 4, alignItems: "center" },
    qtyBadge: {
        color: "rgba(212,175,55,0.7)",
        fontSize: 11,
        fontWeight: "600",
        background: "rgba(212,175,55,0.1)",
        borderRadius: 4,
        padding: "1px 5px",
    },
    modeBadge: (mode) => ({
        color: mode === "advantage" ? "#5eca7e" : mode === "disadvantage" ? "#e05c5c" : "#d4af37",
        fontSize: 10,
        opacity: 0.8,
    }),

    pill: {
        position: "absolute",
        bottom: 100,
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(8px)",
        color: "rgba(255,255,255,0.85)",
        fontSize: 13,
        padding: "10px 20px",
        borderRadius: 20,
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        gap: 8,
        whiteSpace: "nowrap",
    },
    retryBtn: {
        background: "rgba(255,255,255,0.15)",
        border: "1px solid rgba(255,255,255,0.3)",
        color: "#fff",
        borderRadius: 8,
        padding: "4px 14px",
        cursor: "pointer",
        fontSize: 13,
    },

    loadingOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 8,
        background: "rgba(8,6,3,0.92)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(6px)",
    },
    loadingText: {
        color: "#f0e0a0",
        fontFamily: "'Cinzel', serif",
        fontSize: "1.1rem",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
    },
};

export default Maps;