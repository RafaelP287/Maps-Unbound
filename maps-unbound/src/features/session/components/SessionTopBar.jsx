import { Link } from "react-router-dom";

function SessionTopBar({ campaignName = "Campaign Name", sessionName = "Session Name", players = [], campaignId }) {
    const fallbackPlayers = ["?", "?", "?", "?"].map((initial) => ({ initial, username: "Unknown" }));
    const renderedPlayers = players.length > 0 ? players : fallbackPlayers;
    const exitLink = campaignId ? `/campaigns/${campaignId}` : "/session";

    return (
        <header className="session-dm__top session-dm__panel">
            <div className="session-dm__top-group">
                <div className="session-dm__top-block">
                    <span className="session-dm__top-label">Campaign</span>
                    <span className="session-dm__top-value">{campaignName}</span>
                </div>
                <div className="session-dm__top-block">
                    <span className="session-dm__top-label">Session</span>
                    <span className="session-dm__top-value">{sessionName}</span>
                </div>
            </div>
            <div className="session-dm__top-center">
                <span className="session-dm__top-label">Scene</span>
                <span className="session-dm__top-value">Scene Name</span>
                <span className="session-dm__top-divider">•</span>
                <span className="session-dm__top-label">Encounter</span>
                <span className="session-dm__top-value">Encounter Name</span>
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
                <Link to={exitLink} className="session-dm__exit">
                    Exit Session
                </Link>
            </div>
        </header>
    )
}

export default SessionTopBar;
