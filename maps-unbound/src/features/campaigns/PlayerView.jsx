import { Link } from "react-router-dom";

import placeholderImage from "./images/DnD.jpg";
import CampaignHero from "./CampaignHero.jsx";
import CampaignSections from "./CampaignSections.jsx";

function PlayerView({ campaign, user }) {
  const dmMember = campaign.members.find((m) => m.role === "DM");
  const dm = dmMember?.userId?.username || "Unknown";
  // Player-facing roster excludes the DM for party-size displays.
  const players = campaign.members.filter((m) => m.role === "Player");
  const backgroundImage = campaign.image || placeholderImage;

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
          <CampaignSections campaign={campaign} dm={dm} players={players} user={user} />

          {/* Footer */}
          <div className="campaign-footer">
            <Link to="/campaigns"><button className="btn-ghost">← Back to Campaigns</button></Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlayerView;
