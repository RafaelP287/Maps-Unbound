import TurnRecord from "./TurnRecord";

function SessionRightPanel({ isCollapsed, onToggle, turns = [], round = 0, onAdvanceTurn }) {
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
                <TurnRecord turns={turns} round={round} onAdvanceTurn={onAdvanceTurn} />
            )}
        </aside>
    )
}

export default SessionRightPanel;
