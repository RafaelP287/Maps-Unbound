// Primary DM runtime screen:
// owns board layout state, combat turn state, and end/pause session flows.
import SessionTopBar from "./components/SessionTopBar";
import SessionLeftPanel from "./components/SessionLeftPanel";
import SessionMapCanvas from "./components/SessionMapCanvas";
import SessionRightPanel from "./components/SessionRightPanel";
import SessionBottomPanel from "./components/SessionBottomPanel";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import useCampaign from "../campaigns/use-campaign";
import useCampaignSessions from "../campaigns/use-campaign-sessions";
import LoadingPage from "../../shared/Loading.jsx";
import "./session.css";

function SessionDMView() {
    const navigate = useNavigate();
    const { user, token } = useAuth();
    const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
    const [isRightCollapsed, setIsRightCollapsed] = useState(false);
    const [isBottomCollapsed, setIsBottomCollapsed] = useState(false);
    const [isCombatState, setIsCombatState] = useState(false);
    const [isSessionPaused, setIsSessionPaused] = useState(false);
    const [isEndSessionConfirmOpen, setIsEndSessionConfirmOpen] = useState(false);
    const [endingSession, setEndingSession] = useState(false);
    const [endSessionError, setEndSessionError] = useState("");
    const [sceneName, setSceneName] = useState("");
    const [turns, setTurns] = useState([]);
    const [combatRound, setCombatRound] = useState(0);
    const [activeEncounterId, setActiveEncounterId] = useState(null);
    const [activeEncounterNumber, setActiveEncounterNumber] = useState(null);
    const [encounterSequence, setEncounterSequence] = useState(0);
    const [combatEvents, setCombatEvents] = useState([]);
    const [notesDraft, setNotesDraft] = useState("");
    const [notesSaving, setNotesSaving] = useState(false);
    const [notesError, setNotesError] = useState("");
    const [notesStatus, setNotesStatus] = useState("");
    const [searchParams] = useSearchParams();
    const campaignId = searchParams.get("campaignId");
    const sessionId = searchParams.get("sessionId");
    const sessionNameParam = searchParams.get("sessionName");
    const { campaign, loading } = useCampaign(campaignId);
    const { sessions, loading: sessionsLoading, refetch: refetchSessions } = useCampaignSessions(campaignId);

    const orderedSessions = useMemo(() => {
        return [...sessions].sort((a, b) => {
            const aNumber = Number.isFinite(a?.sessionNumber) ? a.sessionNumber : Number.POSITIVE_INFINITY;
            const bNumber = Number.isFinite(b?.sessionNumber) ? b.sessionNumber : Number.POSITIVE_INFINITY;
            if (aNumber !== bNumber) {
                return aNumber - bNumber;
            }
            return new Date(a?.createdAt || 0).getTime() - new Date(b?.createdAt || 0).getTime();
        });
    }, [sessions]);

    const currentSession = useMemo(() => {
        if (!sessionId) {
            return null;
        }
        return orderedSessions.find((session) => session?._id === sessionId) || null;
    }, [orderedSessions, sessionId]);
    const existingEncounterCount = Array.isArray(currentSession?.encounterIds) ? currentSession.encounterIds.length : 0;

    useEffect(() => {
        setEncounterSequence(existingEncounterCount);
        setActiveEncounterNumber(null);
    }, [currentSession?._id, existingEncounterCount]);

    const previousSessionNotes = useMemo(() => {
        if (!sessionId) {
            return [];
        }

        const currentIndex = orderedSessions.findIndex((session) => session?._id === sessionId);
        const priorSessions = currentIndex >= 0
            ? orderedSessions.slice(0, currentIndex)
            : orderedSessions.filter((session) => session?._id !== sessionId);

        return priorSessions
            .flatMap((session) =>
                (Array.isArray(session?.notes) ? session.notes : []).map((note, noteIndex) => ({
                    id: `${session._id || "session"}-${note.createdAt || noteIndex}`,
                    sessionId: session._id || "",
                    sessionNumber: session.sessionNumber,
                    sessionTitle: session.title || `Session ${session.sessionNumber || "?"}`,
                    content: note.content || "",
                    createdAt: note.createdAt || session.createdAt,
                    authorRole: note.authorRole || "DM",
                }))
            )
            .filter((note) => note.content)
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }, [orderedSessions, sessionId]);
    const currentSessionNotes = useMemo(() => {
        if (!currentSession || !Array.isArray(currentSession.notes)) {
            return [];
        }
        return currentSession.notes
            .map((note, noteIndex) => ({
                id: `${currentSession._id || "session"}-current-${note.createdAt || noteIndex}`,
                sessionTitle: currentSession.title || `Session ${currentSession.sessionNumber || "?"}`,
                content: note.content || "",
                createdAt: note.createdAt || currentSession.createdAt,
                authorRole: note.authorRole || "DM",
            }))
            .filter((note) => note.content)
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }, [currentSession]);

    const campaignName = loading ? "Loading..." : campaign?.title || "";
    const sessionName = currentSession?.title || sessionNameParam || "";
    const players = (campaign?.members || [])
        .filter((member) => member.role === "Player")
        .map((member) => {
            const username = member.userId?.username || "";
            return {
                username,
                initial: username.slice(0, 1).toUpperCase() || "",
            };
        });
    const playerCharacterNames = players.map((player) => player.username).filter(Boolean);
    const sheetEntities = [
        ...players.map((player, idx) => ({
            kind: "Player",
            name: player.username || `Player ${idx + 1}`,
            className: "Adventurer",
            level: 1,
            hp: 30,
        })),
        ...(campaign?.npcs || []).map((npc, idx) => ({
            kind: "NPC",
            name: npc.name || `NPC ${idx + 1}`,
            className: npc.role || "NPC",
            level: 1,
            hp: 20,
        })),
        ...(campaign?.enemies || []).map((enemy, idx) => ({
            kind: "Enemy",
            name: enemy.name || `Enemy ${idx + 1}`,
            creatureType: enemy.role || "Enemy",
            cr: "CR ?",
            hp: 26,
        })),
    ];

    const createCombatEvent = (title, detail, tone = "neutral", kind = "note") => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title,
        detail,
        tone,
        kind,
        createdAt: new Date().toISOString(),
    });

    const pushCombatEvents = (entries) => {
        setCombatEvents((prev) => [...prev, ...entries]);
    };

    const serializeEncounterInitiative = (encounterTurns = []) =>
        encounterTurns.map((turn) => ({
            name: turn.name || "",
            kind: turn.kind || "Enemy",
            hp: turn.hp !== undefined && turn.hp !== null ? String(turn.hp) : "",
            initiative: Number.isFinite(Number(turn.initiative)) ? Number(turn.initiative) : 0,
        }));

    const getActiveTurnIndex = (encounterTurns = []) => {
        const activeIndex = encounterTurns.findIndex((turn) => turn.isActive);
        return activeIndex >= 0 ? activeIndex : 0;
    };

    const syncEncounterState = async (encounterId, encounterTurns, nextRound, statusOverride = null) => {
        if (!encounterId || !token) {
            return;
        }

        const payload = {
            initiative: serializeEncounterInitiative(encounterTurns),
            activeTurnIndex: getActiveTurnIndex(encounterTurns),
            rounds: Math.max(0, nextRound),
            relatedMap: sceneName || "",
        };
        if (statusOverride) {
            payload.status = statusOverride;
        }
        if (statusOverride === "Completed") {
            payload.endedAt = new Date().toISOString();
            payload.summary = sceneName ? `Scene: ${sceneName}` : "";
        }

        const res = await fetch(`/api/encounters/${encounterId}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "Failed to sync encounter");
        }
    };

    const handleTurnsChange = (nextTurns) => {
        if (!nextTurns || nextTurns.length === 0) {
            setTurns([]);
            setCombatRound(0);
            return;
        }

        const normalizedTurns = nextTurns.map((turn, idx) => ({
            ...turn,
            order: idx + 1,
            isActive: idx === 0,
            isNext: idx === 1,
        }));

        setTurns(normalizedTurns);
        setCombatRound(0);
    };

    const handleCombatStart = async ({ turns: startingTurns = [], round = 1, mapName = "" }) => {
        const opener = startingTurns.find((turn) => turn.isActive)?.name || startingTurns[0]?.name || "Unknown";
        const participants = startingTurns.length;
        const locationLabel = mapName ? ` at ${mapName}` : "";
        const encounterNumber = encounterSequence + 1;
        const encounterLabel = `Encounter ${encounterNumber}`;
        try {
            if (sessionId && token) {
                const res = await fetch("/api/encounters", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        sessionId,
                        name: encounterLabel,
                        status: "In Progress",
                        startedAt: new Date().toISOString(),
                        rounds: Math.max(1, round),
                        relatedMap: mapName || "",
                        initiative: serializeEncounterInitiative(startingTurns),
                        activeTurnIndex: getActiveTurnIndex(startingTurns),
                        setActive: true,
                    }),
                });
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data.error || "Failed to create encounter");
                }
                const encounter = await res.json();
                setActiveEncounterId(encounter._id);
                setActiveEncounterNumber(encounterNumber);
                setEncounterSequence(encounterNumber);
            }

            pushCombatEvents([
                createCombatEvent(
                    `${encounterLabel} Started`,
                    `${opener} acts first in Round ${round}.${locationLabel} ${participants} combatants entered initiative.`,
                    "alert",
                    "encounter-start"
                ),
                createCombatEvent(
                    `Round ${round}`,
                    locationLabel ? `Combat opened${locationLabel}.` : "Combat opened.",
                    "highlight",
                    "round"
                ),
                createCombatEvent(
                    opener,
                    "",
                    "neutral",
                    "turn"
                ),
            ]);
        } catch (err) {
            setActiveEncounterId(null);
            pushCombatEvents([
                createCombatEvent("Encounter Start Failed", err.message || "Failed to save encounter.", "muted", "note"),
            ]);
        }
    };

    const handleCombatEnd = async ({ turns: endingTurns = [], round = 0, mapName = "" }) => {
        const closer = endingTurns.find((turn) => turn.isActive)?.name || "No active combatant";
        const locationLabel = mapName ? ` at ${mapName}` : "";
        const encounterLabel = activeEncounterNumber ? `Encounter ${activeEncounterNumber}` : "Encounter";
        try {
            if (activeEncounterId) {
                await syncEncounterState(activeEncounterId, endingTurns, round, "Completed");
                setActiveEncounterId(null);
            }
            setActiveEncounterNumber(null);

            pushCombatEvents([
                createCombatEvent(
                    `${encounterLabel} Ended`,
                    `${closer} held the active turn when combat ended${locationLabel}${round ? ` in Round ${round}` : ""}.`,
                    "muted",
                    "encounter-end"
                ),
            ]);
        } catch (err) {
            pushCombatEvents([
                createCombatEvent("Encounter End Failed", err.message || "Failed to save encounter.", "muted", "note"),
            ]);
        }
    };

    const handleAdvanceTurn = () => {
        if (turns.length === 0) {
            return;
        }

        const currentActiveIndex = turns.findIndex((turn) => turn.isActive);
        const activeIndex = currentActiveIndex >= 0 ? currentActiveIndex : 0;
        const nextActiveIndex = (activeIndex + 1) % turns.length;
        const isEndingLastTurn = activeIndex === turns.length - 1;
        const nextRoundValue = isEndingLastTurn ? combatRound + 2 : combatRound + 1;

        const nextTurns = turns.map((turn, idx) => ({
            ...turn,
            isActive: idx === nextActiveIndex,
            isNext: idx === ((nextActiveIndex + 1) % turns.length),
        }));

        setTurns(nextTurns);
        const upcomingEvents = [];
        if (isEndingLastTurn) {
            const nextRound = combatRound + 2;
            upcomingEvents.push(
                createCombatEvent(
                    `Round ${nextRound}`,
                    `${nextTurns[nextActiveIndex]?.name || "The next combatant"} opens the round.`,
                    "highlight",
                    "round"
                )
            );
            setCombatRound((prevRound) => prevRound + 1);
        }
        upcomingEvents.push(
            createCombatEvent(
                `${nextTurns[nextActiveIndex]?.name || "Unknown"}`,
                "",
                "neutral",
                "turn"
            )
        );
        pushCombatEvents(upcomingEvents);
        if (activeEncounterId) {
            syncEncounterState(activeEncounterId, nextTurns, nextRoundValue).catch((err) => {
                pushCombatEvents([
                    createCombatEvent("Encounter Sync Failed", err.message || "Failed to update encounter.", "muted", "note"),
                ]);
            });
        }
    };

    const collapseClassName = [
        "session-dm",
        isLeftCollapsed ? "is-left-collapsed" : "",
        isRightCollapsed ? "is-right-collapsed" : "",
        isBottomCollapsed ? "is-bottom-collapsed" : "",
    ].filter(Boolean).join(" ");
    const exitLink = campaignId ? `/campaigns/${campaignId}` : "/session";

    const handleEndSession = async () => {
        if (endingSession) {
            return;
        }

        if (!sessionId || !token) {
            navigate(exitLink);
            return;
        }

        setEndingSession(true);
        setEndSessionError("");
        try {
            if (activeEncounterId && turns.length > 0) {
                await syncEncounterState(activeEncounterId, turns, combatRound + 1, "Completed");
                setActiveEncounterId(null);
            }
            const res = await fetch(`/api/sessions/${sessionId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    status: "Completed",
                    endedAt: new Date().toISOString(),
                    summary: sceneName ? `Scene: ${sceneName}` : undefined,
                }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Failed to end session");
            }
            navigate(exitLink);
        } catch (err) {
            setEndSessionError(err.message || "Failed to end session.");
        } finally {
            setEndingSession(false);
        }
    };

    const handleSaveSessionNote = async () => {
        const content = notesDraft.trim();
        if (!content) {
            setNotesError("Write a note before saving.");
            setNotesStatus("");
            return;
        }
        if (!sessionId || !token) {
            setNotesError("Missing session context. Open a session from campaign view and try again.");
            setNotesStatus("");
            return;
        }

        setNotesSaving(true);
        setNotesError("");
        setNotesStatus("");
        try {
            const res = await fetch(`/api/sessions/${sessionId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    sessionNoteContent: content,
                }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Failed to save note");
            }
            setNotesDraft("");
            setNotesStatus("Session note saved.");
            await refetchSessions();
        } catch (err) {
            setNotesError(err.message || "Failed to save note.");
        } finally {
            setNotesSaving(false);
        }
    };

    if (loading || sessionsLoading) {
        return <LoadingPage>Preparing the session board...</LoadingPage>;
    }

    return (
        <div className={collapseClassName}>
            <SessionTopBar
                campaignName={campaignName}
                players={players}
                sceneName={sceneName}
                sessionName={sessionName}
                isCombatState={isCombatState}
                onPauseSession={() => setIsSessionPaused(true)}
                onEndSession={() => setIsEndSessionConfirmOpen(true)}
            />
            <SessionLeftPanel
                isCollapsed={isLeftCollapsed}
                onToggle={() => setIsLeftCollapsed((prev) => !prev)}
                turns={turns}
                entities={sheetEntities}
            />
            <SessionMapCanvas
                turns={turns}
                round={combatRound}
                onAdvanceTurn={handleAdvanceTurn}
                onCombatStateChange={setIsCombatState}
                onCombatStart={handleCombatStart}
                onCombatEnd={handleCombatEnd}
                onSceneNameChange={setSceneName}
                onTurnsChange={handleTurnsChange}
                playerCharacterNames={playerCharacterNames}
            />
            <SessionRightPanel
                isCollapsed={isRightCollapsed}
                onToggle={() => setIsRightCollapsed((prev) => !prev)}
                events={combatEvents}
            />
            <SessionBottomPanel
                isCollapsed={isBottomCollapsed}
                onToggle={() => setIsBottomCollapsed((prev) => !prev)}
                notesDraft={notesDraft}
                onNotesDraftChange={(value) => {
                    setNotesDraft(value);
                    if (notesError) {
                        setNotesError("");
                    }
                    if (notesStatus) {
                        setNotesStatus("");
                    }
                }}
                onSaveNotes={handleSaveSessionNote}
                notesSaving={notesSaving}
                notesError={notesError}
                notesStatus={notesStatus}
                currentNotes={currentSessionNotes}
                previousNotes={previousSessionNotes}
                previousNotesLoading={sessionsLoading}
                canSaveNotes={Boolean(sessionId && token && user)}
            />
            {isSessionPaused && (
                <div className="session-dm__pause-overlay" role="dialog" aria-modal="true" aria-label="Session paused">
                    <div className="session-dm__pause-overlay-card">
                        <h2>Session Is Currently Paused</h2>
                        <p>Gameplay is paused. Resume when everyone is ready.</p>
                        <button
                            type="button"
                            className="session-dm__exit session-dm__pause-overlay-btn"
                            onClick={() => setIsSessionPaused(false)}
                        >
                            End Pause
                        </button>
                    </div>
                </div>
            )}
            {isEndSessionConfirmOpen && (
                <div className="session-dm__pause-overlay session-dm__confirm-overlay" role="dialog" aria-modal="true" aria-label="End session confirmation">
                    <div className="session-dm__pause-overlay-card">
                        <h2>End Session?</h2>
                        <p>Are you sure you want to end this session now?</p>
                        {endSessionError && <p className="session-dm__pause-overlay-error">{endSessionError}</p>}
                        <div className="session-dm__confirm-actions">
                            <button
                                type="button"
                                className="session-dm__exit session-dm__pause"
                                onClick={() => {
                                    setIsEndSessionConfirmOpen(false);
                                    setEndSessionError("");
                                }}
                                disabled={endingSession}
                            >
                                Keep Session Open
                            </button>
                            <button
                                type="button"
                                className="session-dm__exit"
                                onClick={handleEndSession}
                                disabled={endingSession}
                            >
                                {endingSession ? "Ending..." : "Yes, End Session"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default SessionDMView;
