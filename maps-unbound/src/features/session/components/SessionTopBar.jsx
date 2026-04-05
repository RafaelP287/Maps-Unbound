function SessionTopBar({
    campaignName = "Campaign Name",
    sessionName = "Session Name",
    players = [],
    sceneName = "SCENE",
    isCombatState = false,
    onPauseSession,
    onEndSession,
}) {
    const fallbackPlayers = ["?", "?", "?", "?"].map((initial) => ({ initial, username: "Unknown" }));
    const renderedPlayers = players.length > 0 ? players : fallbackPlayers;
    return (
        <header className="session-dm__top session-dm__panel">
            {isCombatState && <div className="session-dm__combat-indicator">IN COMBAT</div>}
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
    )
}

export default SessionTopBar;
