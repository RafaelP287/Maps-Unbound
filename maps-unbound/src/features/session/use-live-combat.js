import { useCallback, useEffect, useRef, useState } from "react";

const API_SERVER = import.meta.env.VITE_API_SERVER || "";

// ─── useLiveCombat ─────────────────────────────────────────────────────────
// Fetches the active LiveCombat doc for the given session and re-fetches
// periodically while combat is active so the InitiativeStrip + Events panel
// stay in sync as the DM advances turns or applies damage.
//
// Phase 1: simple polling (every 1.5s while active). In Phase 3 this becomes
// a WebSocket subscription instead.
//
// Returns:
//   combat       — the LiveCombat doc, or null if no active combat
//   combatants   — combat.combatants ?? []
//   round        — combat.round ?? 0
//   activeIndex  — combat.activeTurnIndex ?? -1
//   log          — combat.log ?? []
//   refresh()    — manual re-fetch (call after DM-initiated mutations)
//   nextTurn()   — POST /next-turn and refresh
//   applyDamage(combatantId, amount, source) — POST /damage and refresh
//   endCombat()  — POST /end and refresh
//
function useLiveCombat({ sessionId, token, isCombatActive = false }) {
    const [combat, setCombat] = useState(null);
    const cancelRef = useRef(false);

    // ─── Fetch the combat doc ──────────────────────────────────────────
    const fetchCombat = useCallback(async () => {
        if (!sessionId || !token) return;
        try {
            const res = await fetch(
                `${API_SERVER}/api/combat/session/${sessionId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) {
                console.warn("[useLiveCombat] fetch failed:", res.status);
                return;
            }
            const data = await res.json();
            if (!cancelRef.current) {
                setCombat(data); // null is fine — means no active combat
            }
        } catch (err) {
            console.warn("[useLiveCombat] fetch error:", err.message);
        }
    }, [sessionId, token]);

    // ─── Poll while combat is active ───────────────────────────────────
    useEffect(() => {
        cancelRef.current = false;
        if (!sessionId || !token) return;

        // Initial fetch on mount or when combat becomes active.
        // The setState call inside fetchCombat is intentional — this is the
        // pattern for "subscribe to an external resource on mount."
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchCombat();

        // Only poll when combat is active. When combat is over, no need to
        // hammer the server.
        if (!isCombatActive) return;

        const interval = setInterval(fetchCombat, 1500);
        return () => {
            cancelRef.current = true;
            clearInterval(interval);
        };
    }, [sessionId, token, isCombatActive, fetchCombat]);

    // ─── Mutation helpers ──────────────────────────────────────────────
    // All call the API and then refresh the local combat state.

    const refresh = useCallback(() => fetchCombat(), [fetchCombat]);

    const nextTurn = useCallback(async () => {
        if (!sessionId || !token) return;
        try {
            await fetch(
                `${API_SERVER}/api/combat/session/${sessionId}/next-turn`,
                {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            await fetchCombat();
        } catch (err) {
            console.warn("[useLiveCombat] nextTurn error:", err.message);
        }
    }, [sessionId, token, fetchCombat]);

    const applyDamage = useCallback(
        async (combatantId, amount, source = "DM") => {
            if (!sessionId || !token || !combatantId) return;
            try {
                await fetch(
                    `${API_SERVER}/api/combat/session/${sessionId}/damage`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ combatantId, amount, source }),
                    }
                );
                await fetchCombat();
            } catch (err) {
                console.warn("[useLiveCombat] applyDamage error:", err.message);
            }
        },
        [sessionId, token, fetchCombat]
    );

    const endCombat = useCallback(async () => {
        if (!sessionId || !token) return;
        try {
            await fetch(
                `${API_SERVER}/api/combat/session/${sessionId}/end`,
                {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            await fetchCombat();
        } catch (err) {
            console.warn("[useLiveCombat] endCombat error:", err.message);
        }
    }, [sessionId, token, fetchCombat]);

    // Toggle a combatant's visibility flag mid-combat.
    // field is "hiddenFromMap" or "hiddenFromInitiative".
    const setVisibility = useCallback(
        async (combatantId, field, value) => {
            if (!sessionId || !token || !combatantId) return;
            try {
                await fetch(
                    `${API_SERVER}/api/combat/session/${sessionId}/combatant/${combatantId}/visibility`,
                    {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ [field]: value }),
                    }
                );
                await fetchCombat();
            } catch (err) {
                console.warn("[useLiveCombat] setVisibility error:", err.message);
            }
        },
        [sessionId, token, fetchCombat]
    );

    return {
        combat,
        combatants: combat?.combatants ?? [],
        round: combat?.round ?? 0,
        activeIndex: combat?.activeTurnIndex ?? -1,
        log: combat?.log ?? [],
        refresh,
        nextTurn,
        applyDamage,
        endCombat,
        setVisibility,
    };
}

export default useLiveCombat;