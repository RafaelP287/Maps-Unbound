import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";

import placeholderImage from "./images/DnD.jpg";
import CampaignHero from "./CampaignHero.jsx";
import CampaignSections from "./CampaignSections.jsx";
import useCampaignSessions from "./use-campaign-sessions.js";
import ActiveCharacterPicker from "./ActiveCharacterPicker.jsx";

function CampaignPlayerView({ campaign, user }) {
  const navigate = useNavigate();
  const { token } = useAuth();
  const dmMember = campaign.members.find((m) => m.role === "DM");
  const dm = dmMember?.userId?.username || "Unknown";
  // Player-facing roster excludes the DM for party-size displays.
  const players = campaign.members.filter((m) => m.role === "Player");
  const backgroundImage = campaign.image || placeholderImage;
  const { sessions, loading: sessionsLoading, refetch: refetchSessions } = useCampaignSessions(campaign._id);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leavingCampaign, setLeavingCampaign] = useState(false);
  const [leaveError, setLeaveError] = useState("");
  const openLobby = [...sessions]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .find((session) => session.status === "In Progress" && !session.startedAt && !session.endedAt);

  useEffect(() => {
    if (!campaign._id) return;

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      refetchSessions();
    }, 15000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refetchSessions();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [campaign._id, refetchSessions]);

  const currentUserId = user?.id;

  const handleLeaveCampaign = async () => {
    if (!currentUserId) {
      setLeaveError("Unable to identify your user account.");
      return;
    }

    setLeavingCampaign(true);
    setLeaveError("");
    try {
      const res = await fetch(`/api/campaigns/${campaign._id}/members/${currentUserId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Status ${res.status}`);
      }
      navigate("/campaigns", { replace: true });
    } catch (err) {
      setLeaveError(err.message || "Failed to leave campaign.");
      setLeavingCampaign(false);
    }
  };

  return (
    <div className="campaign-page">
      {/* Hero background */}
      <div className="campaign-hero-bg-wrap">
        <div className="campaign-hero-bg-img" style={{ backgroundImage: `url(${backgroundImage})` }} />
        <div className="campaign-hero-bg-fade" />
      </div>

      <div className="campaign-content-wrap">
        <CampaignHero campaign={campaign} />
        <div className="campaign-card-panel">
          <ActiveCharacterPicker campaign={campaign} user={user} />

          {openLobby && (
            <section className="campaign-player-lobby-panel">
              <div>
                <p className="campaign-index-eyebrow">Open Lobby</p>
                <h2>{openLobby.title || "Session Lobby"}</h2>
                <p>The DM has opened the table lobby for this campaign.</p>
              </div>
              <Link
                to={`/session/player?campaignId=${campaign._id}&sessionId=${openLobby._id}&sessionName=${encodeURIComponent(openLobby.title || "Session")}`}
                className="campaign-btn-link btn-primary"
              >
                Join Lobby
              </Link>
            </section>
          )}

          <CampaignSections
            campaign={campaign}
            dm={dm}
            players={players}
            sessions={sessions}
            sessionsLoading={sessionsLoading}
            user={user}
            onSessionsChanged={refetchSessions}
          />

          {/* Footer */}
          <div className="campaign-footer campaign-footer-split">
            <Link to="/campaigns" className="btn-ghost campaign-btn-link">← Back to Campaigns</Link>
            <button type="button" className="btn-delete" onClick={() => setShowLeaveConfirm(true)}>
              Leave Campaign
            </button>
          </div>
        </div>
      </div>

      {showLeaveConfirm && (
        <div className="campaign-modal-overlay">
          <div className="campaign-modal-box">
            <div className="campaign-modal-icon">⚠</div>
            <h3 className="campaign-modal-title">Leave Campaign?</h3>
            <p className="campaign-modal-body">
              You will lose access to <strong style={{ color: "var(--gold-light)" }}>{campaign.title}</strong>. A DM will need to invite you again if you want back in.
            </p>
            {leaveError && <p className="campaign-error-text">{leaveError}</p>}
            <div className="campaign-btn-row">
              <button className="btn-delete" onClick={handleLeaveCampaign} disabled={leavingCampaign}>
                {leavingCampaign ? "Leaving..." : "Leave Campaign"}
              </button>
              <button className="btn-cancel" onClick={() => setShowLeaveConfirm(false)} disabled={leavingCampaign}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CampaignPlayerView;
