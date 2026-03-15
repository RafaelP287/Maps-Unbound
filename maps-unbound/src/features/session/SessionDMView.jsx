import SessionTopBar from "./components/SessionTopBar";
import SessionLeftPanel from "./components/SessionLeftPanel";
import SessionMapCanvas from "./components/SessionMapCanvas";
import SessionRightPanel from "./components/SessionRightPanel";
import SessionBottomPanel from "./components/SessionBottomPanel";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import useCampaign from "../campaigns/use-campaign";
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

    const collapseClassName = [
        "session-dm",
        isLeftCollapsed ? "is-left-collapsed" : "",
        isRightCollapsed ? "is-right-collapsed" : "",
        isBottomCollapsed ? "is-bottom-collapsed" : "",
    ].filter(Boolean).join(" ");

    return (
        <div className={collapseClassName}>
            <SessionTopBar
                campaignName={campaignName}
                players={players}
            />
            <SessionLeftPanel
                isCollapsed={isLeftCollapsed}
                onToggle={() => setIsLeftCollapsed((prev) => !prev)}
            />
            <SessionMapCanvas />
            <SessionRightPanel
                isCollapsed={isRightCollapsed}
                onToggle={() => setIsRightCollapsed((prev) => !prev)}
            />
            <SessionBottomPanel
                isCollapsed={isBottomCollapsed}
                onToggle={() => setIsBottomCollapsed((prev) => !prev)}
            />
        </div>
    )
}

export default SessionDMView;
