// Right sidebar event feed.
import { useEffect, useRef } from "react";

function SessionRightPanel({
    isCollapsed,
    onToggle,
    events = [],
}) {
    const eventsScrollRef = useRef(null);

    const formatEventTime = (value) => {
        if (!value) {
            return "--:--";
        }
        const date = new Date(value);
        return Number.isNaN(date.getTime())
            ? "--:--"
            : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    };

    useEffect(() => {
        if (isCollapsed) {
            return;
        }
        const node = eventsScrollRef.current;
        if (!node) {
            return;
        }
        node.scrollTop = node.scrollHeight;
    }, [events, isCollapsed]);

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
                            <p className="session-dm__panel-subtitle">Encounter flow & turn tracking</p>
                        </div>
                    </div>
                    <div className="session-dm__events-scroll" ref={eventsScrollRef}>
                        <div className="session-dm__events-list" aria-label="Event feed">
                            {events.length === 0 ? (
                                <div className="session-dm__event session-dm__event-card is-muted">
                                    <span className="session-dm__event-time">--:--</span>
                                    <strong className="session-dm__event-title">No Events Yet</strong>
                                    <p className="session-dm__event-copy">Combat events will appear here once they happen.</p>
                                </div>
                            ) : events.map((event) => (
                                <article
                                    key={event.id}
                                    className={[
                                        "session-dm__event",
                                        event.kind === "turn" ? "session-dm__event-turn" : "session-dm__event-card",
                                        event.kind === "encounter-start" ? "session-dm__event-marker" : "",
                                        event.kind === "encounter-end" ? "session-dm__event-marker" : "",
                                        event.kind === "round" ? "session-dm__event-round" : "",
                                        event.tone === "alert" ? "is-alert" : "",
                                        event.tone === "highlight" ? "is-highlight" : "",
                                        event.tone === "muted" ? "is-muted" : "",
                                    ].filter(Boolean).join(" ")}
                                >
                                    {event.kind === "turn" ? (
                                        <>
                                            <strong className="session-dm__event-turn-name">{event.title}</strong>
                                            {event.detail && <p className="session-dm__event-copy">{event.detail}</p>}
                                        </>
                                    ) : (
                                        <>
                                            <span className="session-dm__event-time">{formatEventTime(event.createdAt)}</span>
                                            <strong className="session-dm__event-title">{event.title}</strong>
                                            {event.detail && <p className="session-dm__event-copy">{event.detail}</p>}
                                        </>
                                    )}
                                </article>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </aside>
    )
}

export default SessionRightPanel;
