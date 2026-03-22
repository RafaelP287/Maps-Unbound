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
    const [searchParams] = useSearchParams();
    const campaignId = searchParams.get("campaignId");
    const { campaign, loading } = useCampaign(campaignId);

    const campaignName = loading ? "Loading..." : campaign?.title || "Campaign Name";
    const players = (campaign?.members || [])
        .filter((member) => member.role === "Player")
        .map((member) => {
            const username = member.userId?.username || "Unknown";
            return {
                username,
                initial: username.slice(0, 1).toUpperCase() || "?",
            };
        });
    const mockTurns = [
        {
            order: 1,
            name: "Astra Vex",
            hp: "24 / 31",
            kind: "Player",
            className: "Rogue",
            level: 6,
            isActive: true,
        },
        {
            order: 2,
            name: "Korrin Holt",
            hp: "38 / 44",
            kind: "Player",
            className: "Fighter",
            level: 7,
        },
        {
            order: 3,
            name: "Red Wing",
            hp: "112 / 140",
            kind: "Enemy",
            cr: "CR 8",
            creatureType: "Dragon",
        },
        {
            order: 4,
            name: "Lyra Dawn",
            hp: "19 / 28",
            kind: "NPC",
            className: "Cleric",
            level: 5,
        },
        {
            order: 5,
            name: "Onyx Shade",
            hp: "27 / 30",
            kind: "Enemy",
            cr: "CR 4",
            creatureType: "Humanoid",
        },
    ];

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
            />
            <SessionLeftPanel
                isCollapsed={isLeftCollapsed}
                onToggle={() => setIsLeftCollapsed((prev) => !prev)}
                turns={mockTurns}
            />
            <SessionMapCanvas
                showTurnOrder={isRightCollapsed}
                turns={mockTurns}
            />
            <SessionRightPanel
                isCollapsed={isRightCollapsed}
                onToggle={() => setIsRightCollapsed((prev) => !prev)}
                turns={mockTurns}
            />
            <SessionBottomPanel
                isCollapsed={isBottomCollapsed}
                onToggle={() => setIsBottomCollapsed((prev) => !prev)}
            />
        </div>
    )
}

export default SessionDMView;
