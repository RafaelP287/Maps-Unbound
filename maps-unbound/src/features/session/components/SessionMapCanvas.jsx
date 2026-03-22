function SessionMapCanvas({ showTurnOrder = false, turns = [] }) {
    return (
        <main className="session-dm__map">
            <div className="session-dm__map-overlay">
                <div>
                    <h2>Map Canvas</h2>
                    <p>This section will display a chosen map from DM.</p>
                </div>
            </div>
            {showTurnOrder && (
                <aside className="session-dm__map-turns" aria-label="Turn order overlay">
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
                </aside>
            )}
        </main>
    )
}

export default SessionMapCanvas;
