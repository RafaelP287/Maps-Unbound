// Right sidebar event feed.
function SessionRightPanel({ isCollapsed, onToggle }) {
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
                    Events
                </div>
            ) : (
                <>
                    <div className="session-dm__panel-header">
                        <div>
                            <p className="session-dm__panel-title">Events</p>
                            <p className="session-dm__panel-subtitle">Dice Rolls & Abilities</p>
                        </div>
                    </div>
                    <div className="session-dm__events-list" aria-label="Event feed">
                        <div className="session-dm__event">
                            <span className="session-dm__event-time">--:--</span>
                            <p>Will be implemented later.</p>
                        </div>
                    </div>
                    <div className="session-dm__events-input">
                        <input type="text" placeholder="Add event note..." />
                        <button type="button" className="session-dm__ghost">Add</button>
                    </div>
                </>
            )}
        </aside>
    )
}

export default SessionRightPanel;
