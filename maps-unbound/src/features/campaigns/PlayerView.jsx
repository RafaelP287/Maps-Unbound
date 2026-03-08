import { Link } from "react-router-dom";

import placeholderImage from "./images/DnD.jpg";
import CampaignHero from "./CampaignHero.jsx";

function PlayerView({ campaign, user }) {
  const dmMember = campaign.members.find((m) => m.role === "DM");
  const dm = dmMember?.userId?.username || "Unknown";
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
          {/* Details panel */}
          <div className="campaign-details-panel">
            <div className="campaign-details-header">
              <span className="campaign-details-icon">⚜</span>
              <span className="campaign-details-heading">Campaign Details</span>
              <span className="campaign-details-icon">⚜</span>
            </div>
            <div className="campaign-details-grid">
              <div className="campaign-detail-row">
                <span className="campaign-detail-key">Dungeon Master</span>
                <span className="campaign-detail-val">{dm}</span>
              </div>
              <div className="campaign-detail-divider" />
              <div className="campaign-detail-row">
                <span className="campaign-detail-key">Adventurers</span>
                <span className="campaign-detail-val">
                  {players.length > 0
                    ? players.map((p) => (
                        <span key={p.userId._id}>
                          {p.userId?.username}
                          {p.userId?._id?.toString() === user?.id?.toString() && (
                            <span className="badge-player">You</span>
                          )}
                        </span>
                      )).reduce((acc, el, i) => i === 0 ? [el] : [...acc, " · ", el], [])
                    : <em style={{ color: "#7a6e5e" }}>No players yet</em>}
                </span>
              </div>
            </div>
          </div>

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