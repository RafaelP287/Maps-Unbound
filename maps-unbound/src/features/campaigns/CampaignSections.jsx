import { Link } from "react-router-dom";

const formatStartDate = (value) => {
  if (!value) return "TBD";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "TBD" : date.toLocaleDateString();
};

function CampaignSections({ campaign, dm, players, isDM = false, user = null }) {
  return (
    <div className="campaign-sections-stack">
      <section className="campaign-section-panel">
        <div className="campaign-details-header">
          <span className="campaign-details-icon">✦</span>
          <span className="campaign-details-heading">Important Details</span>
          <span className="campaign-details-icon">✦</span>
        </div>
        <div className="campaign-details-grid">
          <div className="campaign-detail-row">
            <span className="campaign-detail-key">Dungeon Master</span>
            <span className="campaign-detail-val">
              {dm}
              {isDM && <span className="badge-dm">You</span>}
            </span>
          </div>
          <div className="campaign-detail-divider" />
          <div className="campaign-detail-row">
            <span className="campaign-detail-key">Style</span>
            <span className="campaign-detail-val">{campaign.playStyle || "Online"}</span>
          </div>
          <div className="campaign-detail-divider" />
          <div className="campaign-detail-row">
            <span className="campaign-detail-key">Status</span>
            <span className="campaign-detail-val">{campaign.status || "Planning"}</span>
          </div>
          <div className="campaign-detail-divider" />
          <div className="campaign-detail-row">
            <span className="campaign-detail-key">Start Date</span>
            <span className="campaign-detail-val">{formatStartDate(campaign.startDate)}</span>
          </div>
          <div className="campaign-detail-divider" />
          <div className="campaign-detail-row">
            <span className="campaign-detail-key">Party Size</span>
            <span className="campaign-detail-val">{players.length}/{campaign.maxPlayers || 5}</span>
          </div>
          <div className="campaign-detail-divider" />
          <div className="campaign-detail-row">
            <span className="campaign-detail-key">Adventurers</span>
            <span className="campaign-detail-val">
              {players.length > 0 ? players.map((p) => (
                <span key={p.userId._id}>
                  {p.userId?.username}
                  {p.userId?._id?.toString() === user?.id?.toString() && (
                    <span className="badge-player">You</span>
                  )}
                </span>
              )).reduce((acc, el, i) => i === 0 ? [el] : [...acc, " · ", el], []) : (
                <em style={{ color: "#7a6e5e" }}>No players yet</em>
              )}
            </span>
          </div>
        </div>
      </section>

      <section className="campaign-section-panel">
        <div className="campaign-details-header">
          <span className="campaign-details-icon">✦</span>
          <span className="campaign-details-heading">Characters</span>
          <span className="campaign-details-icon">✦</span>
        </div>
        <p className="campaign-section-subtext">
          Character sheets and party roster for this campaign.
        </p>
        <div className="campaign-section-placeholder">
          <span className="campaign-section-empty">No character sheets linked yet.</span>
        </div>
        <div className="campaign-section-actions">
          <span className="campaign-resource-count">0 linked sheets</span>
          <Link to="/characters">
            <button className="btn-ghost">{isDM ? "Manage Characters" : "View Characters"}</button>
          </Link>
        </div>
      </section>

      <section className="campaign-section-panel">
        <div className="campaign-details-header">
          <span className="campaign-details-icon">✦</span>
          <span className="campaign-details-heading">Maps</span>
          <span className="campaign-details-icon">✦</span>
        </div>
        <p className="campaign-section-subtext">
          Campaign maps, encounter layouts, and location handouts.
        </p>
        <div className="campaign-map-placeholder">
          <span className="campaign-section-empty">No campaign maps linked yet.</span>
        </div>
        <div className="campaign-section-actions">
          <span className="campaign-resource-count">0 linked maps</span>
          <Link to="/maps">
            <button className="btn-ghost">{isDM ? "Manage Maps" : "View Maps"}</button>
          </Link>
        </div>
      </section>

      <section className="campaign-section-panel">
        <div className="campaign-details-header">
          <span className="campaign-details-icon">✦</span>
          <span className="campaign-details-heading">Session Timeline</span>
          <span className="campaign-details-icon">✦</span>
        </div>
        <p className="campaign-section-subtext">
          Session notes, recaps, and major story beats over time.
        </p>
        <div className="campaign-timeline-item">
          <span className="campaign-section-empty">No sessions logged yet.</span>
        </div>
        <div className="campaign-section-actions">
          <span className="campaign-resource-count">0 timeline entries</span>
          <button className="btn-ghost" disabled>Coming Soon</button>
        </div>
      </section>
    </div>
  );
}

export default CampaignSections;
