const abilityLabels = [
  ["str", "STR"],
  ["dex", "DEX"],
  ["con", "CON"],
  ["int", "INT"],
  ["wis", "WIS"],
  ["cha", "CHA"],
];

const formatModifier = (score) => {
  const value = Number(score) || 10;
  const modifier = Math.floor((value - 10) / 2);
  return `${modifier >= 0 ? "+" : ""}${modifier}`;
};

function SessionPlayerCharacterPanel({ character, loading = false, error = "", isCollapsed, onToggle }) {
  const attributes = character?.totalAttributes || character?.attributes || {};
  const hp = character?.hp || {};
  const characterClass = character?.class?.name || character?.characterClass || "Adventurer";
  const race = character?.race?.name || "Unknown";

  return (
    <aside
      className={[
        "session-dm__left",
        "session-dm__panel",
        "session-dm__panel--collapsible",
        "session-player-character",
        isCollapsed ? "is-collapsed" : "",
      ].filter(Boolean).join(" ")}
    >
      <button
        type="button"
        className="session-dm__collapse-btn session-dm__collapse-btn--panel"
        aria-pressed={isCollapsed}
        aria-label={isCollapsed ? "Expand character panel" : "Collapse character panel"}
        onClick={onToggle}
      >
        <span className="session-dm__collapse-icon" aria-hidden="true">
          {isCollapsed ? ">" : "<"}
        </span>
      </button>

      {isCollapsed ? (
        <div className="session-dm__collapsed-label" aria-hidden="true">
          Character
        </div>
      ) : (
        <>
          <div className="session-dm__panel-header">
            <div>
              <p className="session-dm__panel-title">Your Character</p>
              <p className="session-dm__panel-subtitle">Player reference</p>
            </div>
          </div>

          {loading && <p className="session-dm__panel-subtitle">Loading your character...</p>}
          {error && <p className="session-dm__notes-feedback is-error">{error}</p>}

          {!loading && !error && !character && (
            <div className="session-dm__empty-state">
              <p>No character sheet was found for this account.</p>
            </div>
          )}

          {!loading && !error && character && (
            <div className="session-player-character__sheet">
              <div>
                <h2 className="session-player-character__name">{character.name}</h2>
                <p className="session-player-character__meta">
                  Level {character.level || 1} {race} {characterClass}
                </p>
              </div>

              <div className="session-player-character__vitals">
                <div className="session-dm__detail-card">
                  <span className="session-dm__detail-label">HP</span>
                  <span className="session-dm__detail-value">{hp.current ?? "?"}/{hp.max ?? "?"}</span>
                </div>
                <div className="session-dm__detail-card">
                  <span className="session-dm__detail-label">AC</span>
                  <span className="session-dm__detail-value">{character.armorClass ?? 10}</span>
                </div>
                <div className="session-dm__detail-card">
                  <span className="session-dm__detail-label">Speed</span>
                  <span className="session-dm__detail-value">{character.speed ?? 30}</span>
                </div>
              </div>

              <div className="session-player-character__abilities">
                {abilityLabels.map(([key, label]) => (
                  <div key={key} className="session-player-character__ability">
                    <span>{label}</span>
                    <strong>{attributes[key] ?? 10}</strong>
                    <em>{formatModifier(attributes[key])}</em>
                  </div>
                ))}
              </div>

              {Array.isArray(character.attacks) && character.attacks.length > 0 && (
                <div className="session-dm__detail-block">
                  <span className="session-dm__section-title">Actions</span>
                  <div className="session-player-character__list">
                    {character.attacks.slice(0, 4).map((attack, index) => (
                      <div key={`${attack.name}-${index}`} className="session-player-character__row">
                        <strong>{attack.name}</strong>
                        <span>{[attack.attackBonus, attack.damageAndType].filter(Boolean).join(" · ")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </aside>
  );
}

export default SessionPlayerCharacterPanel;
