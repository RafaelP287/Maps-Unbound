function SessionBottomPanel({ isCollapsed, onToggle }) {
    return (
        <footer className="session-dm__bottom session-dm__panel session-dm__panel--collapsible">
            <button
                type="button"
                className="session-dm__collapse-btn session-dm__collapse-btn--panel"
                aria-pressed={isCollapsed}
                aria-label={isCollapsed ? "Expand bottom panel" : "Collapse bottom panel"}
                onClick={onToggle}
            >
                <span className="session-dm__collapse-icon" aria-hidden="true">
                    {isCollapsed ? "^" : "v"}
                </span>
            </button>
        </footer>
    )
}

export default SessionBottomPanel;
