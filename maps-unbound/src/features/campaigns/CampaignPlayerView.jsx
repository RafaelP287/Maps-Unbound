import { Link } from "react-router-dom";
import { useEffect } from "react";

import placeholderImage from "./images/DnD.jpg";
import LoadingPage from "../../shared/Loading.jsx";
import CampaignHero from "./CampaignHero.jsx";
import CampaignSections from "./CampaignSections.jsx";
import useCampaignSessions from "./use-campaign-sessions.js";

function CampaignPlayerView({ campaign, user }) {
  const dmMember = campaign.members.find((m) => m.role === "DM");
  const dm = dmMember?.userId?.username || "Unknown";
  // Player-facing roster excludes the DM for party-size displays.
  const players = campaign.members.filter((m) => m.role === "Player");
  const backgroundImage = campaign.image || placeholderImage;
  const { sessions, loading: sessionsLoading, refetch: refetchSessions } = useCampaignSessions(campaign._id);
  const openLobby = [...sessions]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .find((session) => session.status === "In Progress" && !session.startedAt && !session.endedAt);

  useEffect(() => {
    if (!campaign._id) return;

    const intervalId = window.setInterval(() => {
      refetchSessions();
    }, 5000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refetchSessions();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [campaign._id, refetchSessions]);

  if (sessionsLoading) {
    return <LoadingPage>Unravelling the scroll...</LoadingPage>;
  }

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
          {openLobby && (
            <section className="campaign-player-lobby-panel">
              <div>
                <p className="campaign-index-eyebrow">Open Lobby</p>
                <h2>{openLobby.title || "Session Lobby"}</h2>
                <p>The DM has opened the table lobby for this campaign.</p>
              </div>
              <Link
                to={`/session?campaignId=${campaign._id}&sessionId=${openLobby._id}&sessionName=${encodeURIComponent(openLobby.title || "Session")}`}
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
          />

          {/* Footer */}
          <div className="campaign-footer campaign-footer-split">
            <Link to="/campaigns" className="btn-ghost campaign-btn-link">← Back to Campaigns</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CampaignPlayerView;
