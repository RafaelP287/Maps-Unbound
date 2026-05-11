// Top command bar for DM view (campaign/session labels, players, pause/end actions).
// During combat, the InitiativeStrip is injected via the `combatStrip` prop and
// shown in the center, replacing the "IN COMBAT" pill.
function SessionTopBar({
    campaignName = "Campaign Name",
    sessionName = "Session Name",
    players = [],
    sceneName = "SCENE",
    isCombatState = false,
    role = "dm",
    onLeaveSession,
    onPauseSession,
    onEndSession,
    combatStrip = null,
}) {
    const renderedPlayers = players.length > 0 ? players : [];
    const isDM = role === "dm";
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
                {isDM ? (
                    <>
                        <button type="button" className="session-dm__exit session-dm__pause" onClick={onPauseSession}>
                            Pause Session
                        </button>
                        <button type="button" className="session-dm__exit" onClick={onEndSession}>
                            End Session
                        </button>
                    </>
                ) : (
                    <button type="button" className="session-dm__exit session-dm__pause" onClick={onLeaveSession}>
                        Leave Session
                    </button>
                )}
            </div>
        </header>
    );
}

export default SessionTopBar;
