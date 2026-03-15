import { Link } from "react-router-dom";

function SessionTopBar() {
    return (
        <header className="session-dm__top session-dm__panel">
            <div className="session-dm__top-group">
                <div className="session-dm__top-block">
                    <span className="session-dm__top-label">Campaign</span>
                    <span className="session-dm__top-value">Campaign Name</span>
                </div>
                <div className="session-dm__top-block">
                    <span className="session-dm__top-label">Session</span>
                    <span className="session-dm__top-value">Session Name</span>
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
                    <span className="session-dm__player-dot" />
                    <span className="session-dm__player-dot" />
                    <span className="session-dm__player-dot" />
                    <span className="session-dm__player-dot" />
                </div>
                <Link to="/session" className="session-dm__exit">
                    Exit Session
                </Link>
            </div>
        </header>
    )
}

export default SessionTopBar;
