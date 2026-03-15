function SessionLeftPanel({ isCollapsed, onToggle }) {
    return (
        <aside className="session-dm__left session-dm__panel session-dm__panel--collapsible">
            <button
                type="button"
                className="session-dm__collapse-btn session-dm__collapse-btn--panel"
                aria-pressed={isCollapsed}
                aria-label={isCollapsed ? "Expand left panel" : "Collapse left panel"}
                onClick={onToggle}
            >
                <span className="session-dm__collapse-icon" aria-hidden="true">
                    {isCollapsed ? ">" : "<"}
                </span>
            </button>
        </aside>
    )
}

export default SessionLeftPanel;
