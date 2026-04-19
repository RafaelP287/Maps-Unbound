import { Link } from "react-router-dom";

import placeholderImage from "./images/DnD.jpg";
import CampaignHero from "./CampaignHero.jsx";
import CampaignSections from "./CampaignSections.jsx";
import useCampaignSessions from "./use-campaign-sessions.js";

function CampaignPlayerView({ campaign, user }) {
  const dmMember = campaign.members.find((m) => m.role === "DM");
  const dm = dmMember?.userId?.username || "Unknown";
  // Player-facing roster excludes the DM for party-size displays.
  const players = campaign.members.filter((m) => m.role === "Player");
  const backgroundImage = campaign.image || placeholderImage;
  const { sessions } = useCampaignSessions(campaign._id);

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
          <CampaignSections campaign={campaign} dm={dm} players={players} sessions={sessions} user={user} />

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
