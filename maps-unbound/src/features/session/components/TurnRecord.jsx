// Map-overlay turn record used by the DM canvas.
function TurnRecord({ turns = [], round = 0, onAdvanceTurn }) {
    const displayRound = turns.length > 0 ? round + 1 : "-";

    if (turns.length === 0) {
        return null;
    }

    return (
        <aside className="session-dm__map-turns-wrap" aria-label="Turn order overlay">
            <div className="session-dm__map-turns">
                <div className="session-dm__map-turns-list">
                    {turns.map((turn) => (
                        <div
                            key={`${turn.order}-${turn.name}`}
                            className={[
                                "session-dm__map-turn",
                                turn.isActive ? "is-active" : "",
                            ].filter(Boolean).join(" ")}
                        >
                            <span className="session-dm__map-turn-name">{turn.name}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="session-dm__map-turn-controls">
                <span className="session-dm__map-round">Round {displayRound}</span>
                <button
                    type="button"
                    className="session-dm__ghost session-dm__ghost--small"
                    onClick={onAdvanceTurn}
                    disabled={!onAdvanceTurn}
                >
                    Advance
                </button>
            </div>
        </aside>
    );
}

export default TurnRecord;
