// Bottom workspace for chat, notes, and quick tools.
function SessionBottomPanel({ isCollapsed, onToggle }) {
    const chatMessages = [];

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
                    Chat, Notes &amp; Tools
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
                    <section className="session-dm__notes">
                        <div className="session-dm__panel-header">
                            <div>
                                <p className="session-dm__panel-title">Session Notes</p>
                                <p className="session-dm__panel-subtitle">Track key moments and reminders</p>
                            </div>
                            <button className="session-dm__ghost" type="button">Save</button>
                        </div>
                        <textarea
                            className="session-dm__notes-input"
                            placeholder="Jot down NPCs, clues, or session beats..."
                        />
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
