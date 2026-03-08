import { Link } from "react-router-dom";

const formatStartDate = (value) => {
  if (!value) return "TBD";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "TBD" : date.toLocaleDateString();
};

function CampaignSections({ campaign, dm, players, isDM = false, user = null, onStartEditing = null }) {
  return (
    <div className="campaign-sections-stack">
      {/* Important campaign metadata shown at top for quick scanning. */}
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

      {/* Placeholder scaffolds below are intentionally simple so each section can evolve into richer card collections. */}
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
          {/* Character-to-campaign linking is not modeled yet; this marks the eventual slot. */}
          <span className="campaign-section-empty">No character sheets linked yet.</span>
        </div>
        <div className="campaign-section-actions">
          <span className="campaign-resource-count">0 linked sheets</span>
          <div className="campaign-inline-actions">
            <Link to="/characters" className="btn-ghost campaign-btn-link">
              {isDM ? "Manage Characters" : "View Characters"}
            </Link>
            <Link to="/create-character" className="btn-primary campaign-btn-link">
              Create Character
            </Link>
          </div>
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
          {/* Future map cards (thumbnail/title/scene tags) should render in this region. */}
          <span className="campaign-section-empty">No campaign maps linked yet.</span>
        </div>
        <div className="campaign-section-actions">
          <span className="campaign-resource-count">0 linked maps</span>
          <div className="campaign-inline-actions">
            <Link to="/maps" className="btn-ghost campaign-btn-link">
              {isDM ? "Manage Maps" : "View Maps"}
            </Link>
            <Link to="/maps" className="btn-primary campaign-btn-link">
              {isDM ? "Prep Encounter Map" : "Open Map Board"}
            </Link>
          </div>
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
          {/* Timeline entries will become repeatable cards (session date, recap, key outcomes). */}
          <span className="campaign-section-empty">No sessions logged yet.</span>
        </div>
        <div className="campaign-section-actions">
          <span className="campaign-resource-count">0 timeline entries</span>
          <div className="campaign-inline-actions">
            {isDM ? (
              <button className="btn-ghost" onClick={onStartEditing} type="button">
                Edit Campaign Notes
              </button>
            ) : (
              <Link to="/campaigns" className="btn-ghost campaign-btn-link">View Campaigns</Link>
            )}
            <span className="campaign-helper-text">Session timeline cards are coming soon.</span>
          </div>
        </div>
      </section>
    </div>
  );
}

export default CampaignSections;
