function SessionBottomPanel({ isCollapsed, onToggle }) {
    const chatMessages = [
        {
            name: "Astra",
            text: "I’ll scout ahead and mark the trap.",
            time: "6:42 PM",
        },
        {
            name: "Lyra",
            text: "Hold. I can cast guidance on Korrin.",
            time: "6:43 PM",
        },
        {
            name: "DM",
            text: "The corridor hums with arcane energy.",
            time: "6:44 PM",
        },
    ];

    return (
        <footer
            className={[
                "session-dm__bottom",
                "session-dm__panel",
                "session-dm__panel--collapsible",
                isCollapsed ? "is-collapsed" : "",
            ].filter(Boolean).join(" ")}
        >
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
            {isCollapsed && (
                <div className="session-dm__collapsed-label" aria-hidden="true">
                    Chat &amp; Tools
                </div>
            )}
            {!isCollapsed && (
                <div className="session-dm__bottom-split">
                    <section className="session-dm__chat">
                        <div className="session-dm__panel-header">
                            <div>
                                <p className="session-dm__panel-title">Table Chat</p>
                                <p className="session-dm__panel-subtitle">Session chatter & whispers</p>
                            </div>
                            <div className="session-dm__tabs">
                                <button className="session-dm__tab is-active" type="button">All</button>
                                <button className="session-dm__tab" type="button">Whisper</button>
                            </div>
                        </div>
                        <div className="session-dm__chat-log">
                            {chatMessages.map((message, index) => (
                                <div key={`${message.name}-${index}`} className="session-dm__chat-item">
                                    <div className="session-dm__chat-meta">
                                        <span className="session-dm__chat-name">{message.name}</span>
                                        <span className="session-dm__chat-time">{message.time}</span>
                                    </div>
                                    <p className="session-dm__chat-text">{message.text}</p>
                                </div>
                            ))}
                        </div>
                        <div className="session-dm__chat-input">
                            <input type="text" placeholder="Send a message to the table..." />
                            <button className="session-dm__ghost" type="button">Send</button>
                        </div>
                    </section>
                    <aside className="session-dm__quick-tools">
                        <div className="session-dm__panel-header">
                            <div>
                                <p className="session-dm__panel-title">Quick Tools</p>
                                <p className="session-dm__panel-subtitle">Dice, timers, and cues</p>
                            </div>
                        </div>
                        <div className="session-dm__pill-row">
                            <button className="session-dm__pill">Roll D20</button>
                            <button className="session-dm__pill">Roll Damage</button>
                            <button className="session-dm__pill is-warning">Start Timer</button>
                            <button className="session-dm__pill is-muted">Fog Toggle</button>
                            <button className="session-dm__pill">Ping Map</button>
                            <button className="session-dm__pill is-alert">End Turn</button>
                        </div>
                    </aside>
                </div>
            )}
        </footer>
    )
}

export default SessionBottomPanel;
