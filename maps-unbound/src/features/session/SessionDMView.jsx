import SessionTopBar from "./components/SessionTopBar";
import SessionLeftPanel from "./components/SessionLeftPanel";
import SessionMapCanvas from "./components/SessionMapCanvas";
import SessionRightPanel from "./components/SessionRightPanel";
import SessionBottomPanel from "./components/SessionBottomPanel";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import useCampaign from "../campaigns/use-campaign";
import LoadingPage from "../../shared/Loading.jsx";
import "./session.css";

function SessionDMView() {
    const navigate = useNavigate();
    const { token } = useAuth();
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
    const [searchParams] = useSearchParams();
    const campaignId = searchParams.get("campaignId");
    const sessionId = searchParams.get("sessionId");
    const sessionNameParam = searchParams.get("sessionName");
    const { campaign, loading } = useCampaign(campaignId);

    const campaignName = loading ? "Loading..." : campaign?.title || "";
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

    const handleAdvanceTurn = () => {
        if (turns.length === 0) {
            return;
        }

        const currentActiveIndex = turns.findIndex((turn) => turn.isActive);
        const activeIndex = currentActiveIndex >= 0 ? currentActiveIndex : 0;
        const nextActiveIndex = (activeIndex + 1) % turns.length;
        const isEndingLastTurn = activeIndex === turns.length - 1;

        const nextTurns = turns.map((turn, idx) => ({
            ...turn,
            isActive: idx === nextActiveIndex,
            isNext: idx === ((nextActiveIndex + 1) % turns.length),
        }));

        setTurns(nextTurns);
        if (isEndingLastTurn) {
            setCombatRound((prevRound) => prevRound + 1);
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

    if (loading) {
        return <LoadingPage>Preparing the session board...</LoadingPage>;
    }

    return (
        <div className={collapseClassName}>
            <SessionTopBar
                campaignName={campaignName}
                players={players}
                sceneName={sceneName}
                sessionName={sessionNameParam || ""}
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
                onSceneNameChange={setSceneName}
                onTurnsChange={handleTurnsChange}
                playerCharacterNames={playerCharacterNames}
            />
            <SessionRightPanel
                isCollapsed={isRightCollapsed}
                onToggle={() => setIsRightCollapsed((prev) => !prev)}
            />
            <SessionBottomPanel
                isCollapsed={isBottomCollapsed}
                onToggle={() => setIsBottomCollapsed((prev) => !prev)}
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
