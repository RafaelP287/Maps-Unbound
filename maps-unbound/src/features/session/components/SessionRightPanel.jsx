function SessionRightPanel({ isCollapsed, onToggle }) {
    return (
        <aside className="session-dm__right session-dm__panel session-dm__panel--collapsible">
            <button
                type="button"
                className="session-dm__collapse-btn session-dm__collapse-btn--panel"
                aria-pressed={isCollapsed}
                aria-label={isCollapsed ? "Expand right panel" : "Collapse right panel"}
                onClick={onToggle}
            >
                <span className="session-dm__collapse-icon" aria-hidden="true">
                    {isCollapsed ? "<" : ">"}
                </span>
            </button>
        </aside>
    )
}

export default SessionRightPanel;
