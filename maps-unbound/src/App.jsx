import { BrowserRouter, Routes, Route } from "react-router-dom";
import React, { useState, useRef, useCallback, useEffect } from "react";
import { ThreeDDice } from "dddice-js";
import AppLayout from "./layout/AppLayout.jsx";

import Home from "./features/home/Home.jsx";
import Maps from "./features/maps/Maps.jsx";

import Session from "./features/session/Session.jsx";
import SessionDMView from "./features/session/SessionDMView.jsx";

import Campaigns from "./features/campaigns/CampaignsPage.jsx";
import CreateCampaign from "./features/campaigns/CreateCampaign.jsx";
import ViewCampaign from "./features/campaigns/ViewCampaign.jsx";
import Characters from "./features/characters/Characters.jsx";
import CreateCharacter from "./features/characters/CreateCharacter.jsx";
import PartyFinder from "./features/partyfinder/PartyFinder.jsx";
import Profile from "./features/profile/Profile.jsx";
import Signup from "./features/auth/Signup.jsx";
import Login from "./features/auth/Login.jsx";

const DDDICE_API_KEY = import.meta.env.VITE_DDDICE_API_KEY;

if (!DDDICE_API_KEY) {
    console.error("Missing VITE_DDDICE_API_KEY in .env");
}

const PIXEL_RATIO = 1;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const NOTIF_LIFETIME = 6000;
const MAX_NOTIFS = 6;

function App() {
    const dddiceRef         = useRef(null);
    const roomSlugRef       = useRef(null);
    const isInitializingRef = useRef(false);
    const canvasRef         = useRef(null);
    const seenRollsRef      = useRef(new Set());
    // Stores the mode ('normal'|'advantage'|'disadvantage') of the roll
    // currently in-flight so roll:finished can use it.
    const nextRollModeRef   = useRef('normal');
    // Track when tab was hidden so we know if the device likely slept
    const hiddenAtRef       = useRef(null);

    const [isDiceReady, setIsDiceReady] = useState(false);
    const [diceError,   setDiceError]   = useState(null);
    const [rollNotifs,  setRollNotifs]  = useState([]);

    // ── Helpers ────────────────────────────────────────────────────────────
    const deleteRoom = useCallback(async (slug) => {
        if (!slug) return;
        try {
            await fetch(`https://dddice.com/api/1.0/room/${slug}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${DDDICE_API_KEY}` },
            });
        } catch (e) { /* best-effort */ }
    }, []);

    const stopRenderer = useCallback(async () => {
        if (dddiceRef.current) {
            try { dddiceRef.current.stop(); } catch (_) {}
            dddiceRef.current = null;
            await sleep(50);
        }
    }, []);

    const pushNotif = useCallback((notif) => {
        setRollNotifs((prev) => [notif, ...prev].slice(0, MAX_NOTIFS));
        setTimeout(() => {
            setRollNotifs((prev) => prev.filter((n) => n.id !== notif.id));
        }, NOTIF_LIFETIME);
    }, []);

    // ── Roll event handler ─────────────────────────────────────────────────
    const subscribeToRolls = useCallback((instance) => {
        if (!instance) return;

        instance.on('roll:finished', (roll) => {
            try {
                const rollId = roll.uuid || roll.id;
                if (rollId && seenRollsRef.current.has(rollId)) return;
                if (rollId) seenRollsRef.current.add(rollId);

                const values = roll.values || [];
                if (values.length === 0) return;

                const mode = nextRollModeRef.current;
                nextRollModeRef.current = 'normal'; // consume

                // ── d% ────────────────────────────────────────────────────
                const isPercentRoll = values.some(d => d.type === 'd10x');
                if (isPercentRoll) {
                    const tensDie  = values.find(d => d.type === 'd10x');
                    const onesDie  = values.find(d => d.type === 'd10');
                    const tensFace = tensDie ? (tensDie.value ?? 10) : 10;
                    const tensRaw  = tensFace === 10 ? 0 : tensFace * 10;
                    const onesRaw  = onesDie  ? (onesDie.value  ?? 10) : 10;
                    const ones     = onesRaw  === 10 ? 0 : onesRaw;
                    const total    = (tensRaw === 0 && onesRaw === 10) ? 100 : tensRaw + ones;
                    pushNotif({
                        id: Date.now() + Math.random(),
                        isPercent: true,
                        tensDisplay: tensRaw === 0 ? '00' : String(tensRaw),
                        onesDisplay: String(ones),
                        total,
                    });
                    return;
                }

                // ── Advantage / Disadvantage ──────────────────────────────
                if ((mode === 'advantage' || mode === 'disadvantage') && values.length === 2) {
                    const [a, b] = values;
                    const chosen = mode === 'advantage'
                        ? (a.value >= b.value ? a : b)
                        : (a.value <= b.value ? a : b);
                    pushNotif({
                        id: Date.now() + Math.random(),
                        isAdvDis: true,
                        mode,
                        diceType: a.type,
                        rolls: [a.value, b.value],
                        chosen: chosen.value,
                    });
                    return;
                }

                // ── Normal ────────────────────────────────────────────────
                const total = values.reduce((s, d) => s + (d.value ?? 0), 0);
                pushNotif({
                    id: Date.now() + Math.random(),
                    isPercent: false,
                    isAdvDis: false,
                    values: values.map(d => ({ type: d.type, value: d.value })),
                    total,
                });
            } catch (e) {
                console.warn("[dddice] roll:finished error", e);
            }
        });
    }, [pushNotif]);

    // ── Renderer lifecycle ─────────────────────────────────────────────────
    const startRenderer = useCallback(async (canvasElement) => {
        if (!canvasElement) return;
        await stopRenderer();
        canvasRef.current = canvasElement;
        dddiceRef.current = new ThreeDDice(canvasElement, DDDICE_API_KEY);
        dddiceRef.current.start();
        subscribeToRolls(dddiceRef.current);
        if (roomSlugRef.current) {
            await dddiceRef.current.connect(roomSlugRef.current);
        }
    }, [stopRenderer, subscribeToRolls]);

    const cleanupDice = useCallback(async () => {
        await stopRenderer();
        if (roomSlugRef.current) {
            await deleteRoom(roomSlugRef.current);
            roomSlugRef.current = null;
        }
        seenRollsRef.current.clear();
        nextRollModeRef.current = 'normal';
        setIsDiceReady(false);
        setDiceError(null);
        setRollNotifs([]);
        isInitializingRef.current = false;
    }, [deleteRoom, stopRenderer]);

    const resizeDice = useCallback(async (canvasElement) => {
        if (!canvasElement || !roomSlugRef.current) return;
        await startRenderer(canvasElement);
        setIsDiceReady(true);
    }, [startRenderer]);

    const initializeDice = useCallback(async (canvasElement) => {
        if (!canvasElement)         { setDiceError("No canvas element."); return; }
        if (isInitializingRef.current || dddiceRef.current) return;
        if (!DDDICE_API_KEY)        { setDiceError("VITE_DDDICE_API_KEY missing from .env"); return; }

        isInitializingRef.current = true;
        setDiceError(null);
        setIsDiceReady(false);

        try {
            // Create a fresh dddice room if we don't already have one
            if (!roomSlugRef.current) {
                const res = await fetch("https://dddice.com/api/1.0/room", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${DDDICE_API_KEY}`,
                    },
                });
                if (!res.ok) throw new Error(`Failed to create dddice room (${res.status})`);
                const data = await res.json();
                roomSlugRef.current = data?.data?.slug;
                if (!roomSlugRef.current) throw new Error("No room slug returned from dddice");
            }

            await startRenderer(canvasElement);
            setIsDiceReady(true);
        } catch (err) {
            console.error("[dddice] initializeDice failed", err);
            setDiceError(err?.message || "Failed to initialize dice");
            setIsDiceReady(false);
        } finally {
            isInitializingRef.current = false;
        }
    }, [startRenderer]);

    const retryDice = useCallback(async (canvasElement) => {
        await cleanupDice();
        await initializeDice(canvasElement);
    }, [cleanupDice, initializeDice]);

    // ── Tab close ──────────────────────────────────────────────────────────
    useEffect(() => {
        const onUnload = () => {
            const slug = roomSlugRef.current;
            if (!slug) return;
            fetch(`https://dddice.com/api/1.0/room/${slug}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${DDDICE_API_KEY}` },
                keepalive: true,
            });
        };
        window.addEventListener("beforeunload", onUnload);
        return () => window.removeEventListener("beforeunload", onUnload);
    }, []);

    // ── Sleep / wake handling ──────────────────────────────────────────────
    // When laptop sleeps, the WebSocket to dddice dies and the room may expire.
    // We track how long the tab was hidden; if it was > 30s we do a full reinit.
    // If it was brief (just switching tabs), we just try a quick reconnect.
    useEffect(() => {
        const onVisibility = async () => {
            if (document.visibilityState === 'hidden') {
                hiddenAtRef.current = Date.now();
                return;
            }

            // Tab became visible
            const hiddenMs = hiddenAtRef.current ? Date.now() - hiddenAtRef.current : 0;
            hiddenAtRef.current = null;

            if (!canvasRef.current) return;

            if (hiddenMs > 30_000 || !dddiceRef.current) {
                // Device likely slept or connection fully dropped — full reinit
                console.log("[dddice] Wake after sleep, reinitializing...");
                await cleanupDice();
                await initializeDice(canvasRef.current);
            } else {
                // Short absence — try a quick reconnect
                try {
                    await dddiceRef.current.connect(roomSlugRef.current);
                    setIsDiceReady(true);
                    setDiceError(null);
                } catch {
                    console.log("[dddice] Reconnect failed, reinitializing...");
                    await cleanupDice();
                    await initializeDice(canvasRef.current);
                }
            }
        };

        document.addEventListener("visibilitychange", onVisibility);
        return () => document.removeEventListener("visibilitychange", onVisibility);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cleanupDice]);

    // ── Roll ───────────────────────────────────────────────────────────────
    const rollDice = useCallback((diceType = "d20", quantity = 1, mode = 'normal') => {
        if (!dddiceRef.current || !roomSlugRef.current) return;

        nextRollModeRef.current = mode;

        let dice;
        if (diceType === 'd10x') {
            // d% is always exactly 2 dice — one d10x (tens) + one d10 (ones)
            dice = [
                { type: 'd10x', theme: 'dddice-bees' },
                { type: 'd10',  theme: 'dddice-bees' },
            ];
        } else if (mode === 'advantage' || mode === 'disadvantage') {
            // Always roll exactly 2 dice regardless of quantity setting
            dice = [
                { type: diceType, theme: 'dddice-bees' },
                { type: diceType, theme: 'dddice-bees' },
            ];
        } else {
            dice = Array.from({ length: quantity }, () => ({ type: diceType, theme: 'dddice-bees' }));
        }

        dddiceRef.current.roll(dice);
    }, []);

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<AppLayout />}>
                    <Route index element={<Home />} />
                    <Route path="profile" element={<Profile />} />
                    <Route
                        path="maps"
                        element={
                            <Maps
                                initializeDice={initializeDice}
                                cleanupDice={cleanupDice}
                                retryDice={retryDice}
                                resizeDice={resizeDice}
                                rollDice={rollDice}
                                isDiceReady={isDiceReady}
                                diceError={diceError}
                                pixelRatio={PIXEL_RATIO}
                                rollNotifs={rollNotifs}
                            />
                        }
                    />
                    <Route path="session">
                        <Route index element={<Session />} />
                        <Route path="dm" element={<SessionDMView />} />
                    </Route>
                    <Route path="characters" element={<Characters />} />
                    <Route path="create-character" element={<CreateCharacter />} />
                    <Route path="campaigns">
                        <Route index element={<Campaigns />} />
                        <Route path="new" element={<CreateCampaign />} />
                        <Route path=":id" element={<ViewCampaign />} />
                    </Route>
                    <Route path="party-finder" element={<PartyFinder />} />
                    <Route path="signup" element={<Signup />} />
                    <Route path="login" element={<Login />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
