import SessionTopBar from "./components/SessionTopBar";
import SessionLeftPanel from "./components/SessionLeftPanel";
import SessionMapCanvas from "./components/SessionMapCanvas";
import SessionRightPanel from "./components/SessionRightPanel";
import SessionBottomPanel from "./components/SessionBottomPanel";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import useCampaign from "../campaigns/use-campaign";
import LoadingPage from "../../shared/Loading.jsx";
import "./session.css";

function SessionDMView() {
    const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
    const [isRightCollapsed, setIsRightCollapsed] = useState(false);
    const [isBottomCollapsed, setIsBottomCollapsed] = useState(false);
    const [isCombatState, setIsCombatState] = useState(false);
    const [sceneName, setSceneName] = useState("");
    const [turns, setTurns] = useState([]);
    const [combatRound, setCombatRound] = useState(0);
    const [searchParams] = useSearchParams();
    const campaignId = searchParams.get("campaignId");
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

    if (loading) {
        return <LoadingPage>Preparing the session board...</LoadingPage>;
    }

    return (
        <div className={collapseClassName}>
            <SessionTopBar
                campaignName={campaignName}
                players={players}
                campaignId={campaignId}
                sceneName={sceneName}
                sessionName={sessionNameParam || ""}
                isCombatState={isCombatState}
            />
            <SessionLeftPanel
                isCollapsed={isLeftCollapsed}
                onToggle={() => setIsLeftCollapsed((prev) => !prev)}
                turns={turns}
            />
            <SessionMapCanvas
                showTurnOrder={isRightCollapsed}
                turns={turns}
                onCombatStateChange={setIsCombatState}
                onSceneNameChange={setSceneName}
                onTurnsChange={handleTurnsChange}
                playerCharacterNames={playerCharacterNames}
            />
            <SessionRightPanel
                isCollapsed={isRightCollapsed}
                onToggle={() => setIsRightCollapsed((prev) => !prev)}
                turns={turns}
                round={combatRound}
                onAdvanceTurn={handleAdvanceTurn}
            />
            <SessionBottomPanel
                isCollapsed={isBottomCollapsed}
                onToggle={() => setIsBottomCollapsed((prev) => !prev)}
            />
        </div>
    )
}

export default SessionDMView;
