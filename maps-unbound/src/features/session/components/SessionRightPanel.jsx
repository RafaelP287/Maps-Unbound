function SessionRightPanel({ isCollapsed, onToggle, turns = [] }) {
    return (
        <aside
            className={[
                "session-dm__right",
                "session-dm__panel",
                "session-dm__panel--collapsible",
                isCollapsed ? "is-collapsed" : "",
            ].filter(Boolean).join(" ")}
        >
            <button
                type="button"
                className="session-dm__collapse-btn session-dm__collapse-btn--panel session-dm__collapse-btn--left"
                aria-pressed={isCollapsed}
                aria-label={isCollapsed ? "Expand right panel" : "Collapse right panel"}
                onClick={onToggle}
            >
                <span className="session-dm__collapse-icon" aria-hidden="true">
                    {isCollapsed ? "<" : ">"}
                </span>
            </button>
            {isCollapsed ? (
                <div className="session-dm__collapsed-label" aria-hidden="true">
                    Turn Record
                </div>
            ) : (
                <>
                    <div className="session-dm__panel-header">
                        <div>
                            <p className="session-dm__panel-title">Turn Record</p>
                            <p className="session-dm__panel-subtitle">Round 4 · Initiative</p>
                        </div>
                        <button className="session-dm__ghost" type="button">
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
            )}
        </aside>
    )
}

export default SessionRightPanel;
