// Top command bar for DM view (campaign/session labels, players, pause/end actions).
// During combat, the InitiativeStrip is injected via the `combatStrip` prop and
// shown in the center, replacing the "IN COMBAT" pill.
function SessionTopBar({
    campaignName = "Campaign Name",
    sessionName = "Session Name",
    players = [],
    sceneName = "SCENE",
    isCombatState = false,
    onPauseSession,
    onEndSession,
    combatStrip = null,
}) {
    const fallbackPlayers = ["?", "?", "?", "?"].map((initial) => ({ initial, username: "Unknown" }));
    const renderedPlayers = players.length > 0 ? players : fallbackPlayers;
    return (
        <header className="session-dm__top">
            <div className="session-dm__top-group">
                <div className="session-dm__top-block">
                    <span className="session-dm__top-label">Campaign</span>
                    <span className="session-dm__top-value">{campaignName}</span>
                </div>
                <div className="session-dm__top-block">
                    <span className="session-dm__top-label">Session</span>
                    <span className="session-dm__top-value">{sessionName}</span>
                </div>
                <div className="session-dm__top-block">
                    <span className="session-dm__top-label">SCENE</span>
                    <span className="session-dm__top-value">{sceneName || "SCENE"}</span>
                </div>
            </div>

            {/* Center: combat strip when combat is live, otherwise just a small label */}
            <div className="session-dm__top-center">
                {isCombatState ? (
                    combatStrip || <div className="session-dm__combat-indicator">IN COMBAT</div>
                ) : null}
            </div>

            <div className="session-dm__top-group">
                <div className="session-dm__top-players" aria-label="Players">
                    {renderedPlayers.map((player, idx) => (
                        <span
                            key={`${player.username}-${idx}`}
                            className="session-dm__player-avatar"
                            data-username={player.username}
                        >
                            {player.initial}
                        </span>
                    ))}
                </div>
                <button type="button" className="session-dm__exit session-dm__pause" onClick={onPauseSession}>
                    Pause Session
                </button>
                <button type="button" className="session-dm__exit" onClick={onEndSession}>
                    End Session
                </button>
            </div>
        </header>
    );
}

export default SessionTopBar;
