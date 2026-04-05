import { useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import useCampaign from "../campaigns/use-campaign";
import { useAuth } from "../../context/AuthContext.jsx";
import "./session.css";
import LoadingPage from "../../shared/Loading.jsx";

function Session() {
    const navigate = useNavigate();
    const { token } = useAuth();
    const [searchParams] = useSearchParams();
    const campaignId = searchParams.get("campaignId");
    const sessionId = searchParams.get("sessionId");
    const sessionNameParam = searchParams.get("sessionName");
    const { campaign, loading } = useCampaign(campaignId);
    const [sessionName, setSessionName] = useState(sessionNameParam || "Session Name");
    const [enteringDm, setEnteringDm] = useState(false);
    const [lobbyError, setLobbyError] = useState("");
    const campaignName = loading ? "Loading..." : campaign?.title || "Unknown Campaign";

    if (loading) {
        return <LoadingPage>Preparing the session...</LoadingPage>;
    }

    const handleEnterDm = async () => {
        if (enteringDm) return;
        const nextSessionName = sessionName.trim() || "Session Name";
        setEnteringDm(true);
        setLobbyError("");
        try {
            if (sessionId && token) {
                const res = await fetch(`/api/sessions/${sessionId}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ title: nextSessionName }),
                });
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data.error || "Failed to save session name");
                }
            }

            const query = new URLSearchParams();
            if (campaignId) query.set("campaignId", campaignId);
            if (sessionId) query.set("sessionId", sessionId);
            query.set("sessionName", nextSessionName);
            navigate(`/session/dm?${query.toString()}`);
        } catch (err) {
            setLobbyError(err.message || "Failed to continue to DM view.");
        } finally {
            setEnteringDm(false);
        }
    };

    return (
        <div className="session-page">
            <div className="session-card">
                <h1>Session Lobby</h1>
                <p>This will probably be a lobby waiting page or a page to select the campaign.</p>
                {campaignId && (
                    <p>Selected campaign: {campaignName}</p>
                )}
                <label className="session-lobby__label" htmlFor="session-name-input">
                    Session name (DM):
                </label>
                <input
                    id="session-name-input"
                    className="session-lobby__input"
                    type="text"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                />
                <p>Button to test for DM View.</p>
                <div className="session-actions">
                    <button type="button" onClick={handleEnterDm} disabled={enteringDm}>
                        {enteringDm ? "Opening..." : "DM View"}
                    </button>
                </div>
                {lobbyError && <p className="campaign-error-text">{lobbyError}</p>}
            </div>
        </div>
    )
}

export default Session;
