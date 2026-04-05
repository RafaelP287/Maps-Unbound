import { Link } from "react-router-dom";

const formatStartDate = (value) => {
  if (!value) return "TBD";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "TBD" : date.toLocaleDateString();
};

const formatQuestUpdated = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString();
};

function CampaignSections({ campaign, dm, players, sessions = [], isDM = false, user = null, onStartEditing = null }) {
  const currentQuest = campaign.currentQuest;
  const npcs = campaign.npcs || [];
  const enemies = campaign.enemies || [];
  const loot = campaign.loot || [];
  const hasQuest = Boolean(currentQuest?.title || currentQuest?.objective);
  const questUpdated = formatQuestUpdated(currentQuest?.updatedAt);
  const sortedSessions = [...sessions].sort((a, b) => {
    const aTime = a?.startedAt ? new Date(a.startedAt).getTime() : 0;
    const bTime = b?.startedAt ? new Date(b.startedAt).getTime() : 0;
    return bTime - aTime;
  });

  return (
    <div className="campaign-sections-stack">
      <section className="campaign-section-panel campaign-quest-panel">
        <div className="campaign-details-header">
          <span className="campaign-details-icon">✦</span>
          <span className="campaign-details-heading">Current Quest Tracker</span>
          <span className="campaign-details-icon">✦</span>
        </div>
        {hasQuest ? (
          <div className="campaign-quest-content">
            <div className="campaign-quest-title-row">
              <h3 className="campaign-quest-title">{currentQuest.title || "Untitled Quest"}</h3>
              <span className={`campaign-quest-status quest-${(currentQuest.status || "In Progress").toLowerCase().replace(/\s+/g, "-")}`}>
                {currentQuest.status || "In Progress"}
              </span>
            </div>
            <p className="campaign-quest-objective-text">
              {currentQuest.objective || "No objective details added yet."}
            </p>
            {questUpdated && (
              <p className="campaign-helper-text">Updated {questUpdated}</p>
            )}
          </div>
        ) : (
          <div className="campaign-quest-empty">
            <p className="campaign-section-empty">No active quest selected yet.</p>
            {isDM && (
              <button className="btn-edit" onClick={onStartEditing} type="button">
                Set Current Quest
              </button>
            )}
          </div>
        )}
      </section>

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

      <section className="campaign-section-panel">
        <div className="campaign-details-header">
          <span className="campaign-details-icon">✦</span>
          <span className="campaign-details-heading">NPCs</span>
          <span className="campaign-details-icon">✦</span>
        </div>
        {npcs.length > 0 ? (
          <div className="campaign-resource-list">
            {npcs.map((npc, idx) => (
              <article className="campaign-resource-item" key={`npc-${idx}`}>
                <div className="campaign-resource-title-row">
                  <h3 className="campaign-resource-title">{npc.name}</h3>
                  {npc.role && <span className="campaign-resource-meta">{npc.role}</span>}
                </div>
                {npc.notes && <p className="campaign-resource-notes">{npc.notes}</p>}
              </article>
            ))}
          </div>
        ) : (
          <span className="campaign-section-empty">No NPCs tracked yet.</span>
        )}
        <div className="campaign-section-actions">
          <span className="campaign-resource-count">{npcs.length} tracked NPCs</span>
          {isDM && (
            <button className="btn-ghost" onClick={onStartEditing} type="button">
              Manage NPCs
            </button>
          )}
        </div>
      </section>

      <section className="campaign-section-panel">
        <div className="campaign-details-header">
          <span className="campaign-details-icon">✦</span>
          <span className="campaign-details-heading">Enemies</span>
          <span className="campaign-details-icon">✦</span>
        </div>
        {enemies.length > 0 ? (
          <div className="campaign-resource-list">
            {enemies.map((enemy, idx) => (
              <article className="campaign-resource-item" key={`enemy-${idx}`}>
                <div className="campaign-resource-title-row">
                  <h3 className="campaign-resource-title">{enemy.name}</h3>
                  {enemy.role && <span className="campaign-resource-meta">{enemy.role}</span>}
                </div>
                {enemy.notes && <p className="campaign-resource-notes">{enemy.notes}</p>}
              </article>
            ))}
          </div>
        ) : (
          <span className="campaign-section-empty">No enemies tracked yet.</span>
        )}
        <div className="campaign-section-actions">
          <span className="campaign-resource-count">{enemies.length} tracked enemies</span>
          {isDM && (
            <button className="btn-ghost" onClick={onStartEditing} type="button">
              Manage Enemies
            </button>
          )}
        </div>
      </section>

      <section className="campaign-section-panel">
        <div className="campaign-details-header">
          <span className="campaign-details-icon">✦</span>
          <span className="campaign-details-heading">Loot</span>
          <span className="campaign-details-icon">✦</span>
        </div>
        {loot.length > 0 ? (
          <div className="campaign-resource-list">
            {loot.map((item, idx) => (
              <article className="campaign-resource-item" key={`loot-${idx}`}>
                <div className="campaign-resource-title-row">
                  <h3 className="campaign-resource-title">{item.name}</h3>
                  <span className="campaign-resource-meta">x{item.quantity || 1}</span>
                </div>
                {item.holder && <p className="campaign-resource-holder">Held by: {item.holder}</p>}
                {item.notes && <p className="campaign-resource-notes">{item.notes}</p>}
              </article>
            ))}
          </div>
        ) : (
          <span className="campaign-section-empty">No loot tracked yet.</span>
        )}
        <div className="campaign-section-actions">
          <span className="campaign-resource-count">{loot.length} loot entries</span>
          {isDM && (
            <button className="btn-ghost" onClick={onStartEditing} type="button">
              Manage Loot
            </button>
          )}
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
          <span className="campaign-details-heading">Sessions</span>
          <span className="campaign-details-icon">✦</span>
        </div>
        <p className="campaign-section-subtext">
          A record of all sessions held for this campaign.
        </p>
        {sortedSessions.length > 0 ? (
          <div className="campaign-resource-list">
            {sortedSessions.map((session) => (
              <article className="campaign-resource-item" key={session._id}>
                <div className="campaign-resource-title-row">
                  <h3 className="campaign-resource-title">{session.title || "Untitled Session"}</h3>
                  <span className="campaign-resource-meta">{session.status || "Planned"}</span>
                </div>
                <p className="campaign-resource-notes">
                  {session.startedAt
                    ? `Started ${new Date(session.startedAt).toLocaleString()}`
                    : "Start time not recorded"}
                  {session.endedAt ? ` • Ended ${new Date(session.endedAt).toLocaleString()}` : ""}
                </p>
                {session.summary && <p className="campaign-resource-notes">{session.summary}</p>}
              </article>
            ))}
          </div>
        ) : (
          <div className="campaign-timeline-item">
            <span className="campaign-section-empty">No sessions logged yet.</span>
          </div>
        )}
        <div className="campaign-section-actions">
          <span className="campaign-resource-count">{sortedSessions.length} timeline entries</span>
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
