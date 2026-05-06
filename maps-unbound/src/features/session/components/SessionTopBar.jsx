// Top command bar for DM view (campaign/session labels, players, pause/end actions).
function SessionTopBar({
    campaignName = "Campaign Name",
    sessionName = "Session Name",
    players = [],
    sceneName = "SCENE",
    isCombatState = false,
    onPauseSession,
    onEndSession,
}) {
    const renderedPlayers = players.length > 0 ? players : [];
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
                    {renderedPlayers.length > 0 ? (
                        renderedPlayers.map((player, idx) => (
                            <span
                                key={`${player.userId || player.username}-${idx}`}
                                className={[
                                    "session-dm__player-avatar",
                                    player.role === "DM" ? "is-dm" : "is-player",
                                ].join(" ")}
                                data-username={player.username || "Unknown"}
                            >
                                {player.profileImageUrl ? (
                                    <img src={player.profileImageUrl} alt="" />
                                ) : (
                                    player.initial
                                )}
                            </span>
                        ))
                    ) : (
                        <span className="session-dm__player-empty">No one joined</span>
                    )}
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
