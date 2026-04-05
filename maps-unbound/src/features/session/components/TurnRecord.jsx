function TurnRecord({ turns = [], round = 0, onAdvanceTurn }) {
    const displayRound = turns.length > 0 ? round + 1 : "-";

    return (
        <>
            <div className="session-dm__panel-header">
                <div>
                    <p className="session-dm__panel-title">Turn Record</p>
                    <p className="session-dm__panel-subtitle">Round {displayRound}</p>
                </div>
                <button className="session-dm__ghost" type="button" onClick={onAdvanceTurn} disabled={turns.length === 0}>
                    Advance
                </button>
            </div>
            <div className="session-dm__turns" aria-label="Turn order">
                {turns.map((turn) => (
                    <div
                        key={`${turn.order}-${turn.name}`}
                        className={[
                            "session-dm__turn",
                            turn.isActive ? "is-active" : "",
                            turn.isNext ? "is-next" : "",
                        ].filter(Boolean).join(" ")}
                    >
                        <div className="session-dm__turn-main">
                            <span className="session-dm__turn-order">{turn.order}</span>
                            <div className="session-dm__turn-meta">
                                <span className="session-dm__turn-name">{turn.name}</span>
                                {turn.kind === "Player" && (
                                    <span className="session-dm__turn-detail">
                                        {turn.className} · L{turn.level}
                                    </span>
                                )}
                                {turn.kind === "NPC" && (
                                    <span className="session-dm__turn-detail">
                                        {turn.className} · L{turn.level}
                                    </span>
                                )}
                                {turn.kind === "Enemy" && (
                                    <span className="session-dm__turn-detail">
                                        {turn.creatureType} · {turn.cr}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="session-dm__turn-stats">
                            <span className="session-dm__turn-hp">{turn.hp}</span>
                            <span className={`session-dm__turn-flag is-${turn.kind.toLowerCase()}`}>
                                {turn.kind}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}

export default TurnRecord;
