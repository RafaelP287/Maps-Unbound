import { useMemo, useState } from "react";

// Bottom workspace for chat and notes.
function SessionBottomPanel({
    isCollapsed,
    onToggle,
    notesDraft = "",
    onNotesDraftChange,
    onSaveNotes,
    notesSaving = false,
    notesError = "",
    notesStatus = "",
    currentNotes = [],
    previousNotes = [],
    previousNotesLoading = false,
    canSaveNotes = true,
}) {
    const chatMessages = [];
    const [activeNotesTab, setActiveNotesTab] = useState("write");
    const [collapsedPastSessions, setCollapsedPastSessions] = useState({});
    const groupedPastNotes = useMemo(() => {
        const groups = [];
        const indexByKey = new Map();

        previousNotes.forEach((note) => {
            const key = note.sessionId || note.sessionTitle || "Unknown Session";
            const existingIndex = indexByKey.get(key);

            if (typeof existingIndex === "number") {
                groups[existingIndex].notes.push(note);
                return;
            }

            indexByKey.set(key, groups.length);
            groups.push({
                key,
                sessionTitle: note.sessionTitle || "Unknown Session",
                sessionNumber: note.sessionNumber,
                notes: [note],
            });
        });

        return groups;
    }, [previousNotes]);
    const formatNoteTimestamp = (value) => {
        if (!value) {
            return "";
        }
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return "";
        }
        return parsed.toLocaleString();
    };
    const togglePastSessionCollapse = (key) => {
        setCollapsedPastSessions((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

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
                    Chat &amp; Notes
                </div>
            )}
            {!isCollapsed && (
                <div className="session-dm__bottom-split">
                    <section className="session-dm__bottom-pane session-dm__chat">
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
                            {chatMessages.length === 0 && (
                                <div className="session-dm__empty-state">
                                    Chat messages will appear here when table chat is enabled.
                                </div>
                            )}
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
                    <section className="session-dm__bottom-pane session-dm__notes">
                        <div className="session-dm__panel-header">
                            <div>
                                <p className="session-dm__panel-title">Session Notes</p>
                                <p className="session-dm__panel-subtitle">Track key moments and save to this session</p>
                            </div>
                            {activeNotesTab === "write" && (
                                <button
                                    className="session-dm__ghost"
                                    type="button"
                                    onClick={onSaveNotes}
                                    disabled={notesSaving || !canSaveNotes}
                                >
                                    {notesSaving ? "Saving..." : "Save"}
                                </button>
                            )}
                        </div>
                        <div className="session-dm__tabs session-dm__tabs--full session-dm__notes-tabs">
                            <button
                                type="button"
                                className={[
                                    "session-dm__tab",
                                    activeNotesTab === "write" ? "is-active" : "",
                                ].filter(Boolean).join(" ")}
                                onClick={() => setActiveNotesTab("write")}
                            >
                                Write
                            </button>
                            <button
                                type="button"
                                className={[
                                    "session-dm__tab",
                                    activeNotesTab === "current" ? "is-active" : "",
                                ].filter(Boolean).join(" ")}
                                onClick={() => setActiveNotesTab("current")}
                            >
                                Current Notes
                            </button>
                            <button
                                type="button"
                                className={[
                                    "session-dm__tab",
                                    activeNotesTab === "past" ? "is-active" : "",
                                ].filter(Boolean).join(" ")}
                                onClick={() => setActiveNotesTab("past")}
                            >
                                Past Notes
                            </button>
                        </div>
                        {activeNotesTab === "write" && (
                            <>
                                <textarea
                                    className="session-dm__notes-input"
                                    placeholder="Jot down NPCs, clues, or session beats..."
                                    value={notesDraft}
                                    onChange={(event) => onNotesDraftChange?.(event.target.value)}
                                />
                                {notesError && <p className="session-dm__notes-feedback is-error">{notesError}</p>}
                                {notesStatus && <p className="session-dm__notes-feedback is-success">{notesStatus}</p>}
                                {!canSaveNotes && (
                                    <p className="session-dm__notes-feedback">
                                        Opened without a session ID. Notes cannot be saved yet.
                                    </p>
                                )}
                            </>
                        )}
                        {activeNotesTab === "current" && (
                            <div className="session-dm__notes-history">
                                <div className="session-dm__notes-history-head">
                                    <p className="session-dm__section-title">Saved In This Session</p>
                                    <span className="session-dm__notes-count">{currentNotes.length}</span>
                                </div>
                                <div className="session-dm__notes-history-list">
                                    {previousNotesLoading && (
                                        <p className="session-dm__panel-subtitle">Loading current notes...</p>
                                    )}
                                    {!previousNotesLoading && currentNotes.length === 0 && (
                                        <p className="session-dm__panel-subtitle">No saved notes in this session yet.</p>
                                    )}
                                    {!previousNotesLoading && currentNotes.map((note) => (
                                        <article key={note.id} className="session-dm__note-card">
                                            <p className="session-dm__note-card-meta">
                                                {note.sessionTitle}
                                                {formatNoteTimestamp(note.createdAt)
                                                    ? ` · ${formatNoteTimestamp(note.createdAt)}`
                                                    : ""}
                                            </p>
                                            <p className="session-dm__note-card-text">{note.content}</p>
                                        </article>
                                    ))}
                                </div>
                            </div>
                        )}
                        {activeNotesTab === "past" && (
                            <div className="session-dm__notes-history">
                                <div className="session-dm__notes-history-head">
                                    <p className="session-dm__section-title">Previous Session Notes</p>
                                    <span className="session-dm__notes-count">{groupedPastNotes.length}</span>
                                </div>
                                <div className="session-dm__notes-history-list">
                                    {previousNotesLoading && (
                                        <p className="session-dm__panel-subtitle">Loading previous notes...</p>
                                    )}
                                    {!previousNotesLoading && previousNotes.length === 0 && (
                                        <p className="session-dm__panel-subtitle">No previous session notes yet.</p>
                                    )}
                                    {!previousNotesLoading && groupedPastNotes.map((group) => (
                                        <section key={group.key} className="session-dm__notes-session-group">
                                            <div className="session-dm__notes-session-head">
                                                <button
                                                    type="button"
                                                    className="session-dm__notes-session-toggle"
                                                    onClick={() => togglePastSessionCollapse(group.key)}
                                                    aria-expanded={!collapsedPastSessions[group.key]}
                                                >
                                                    <span className="session-dm__section-title">{group.sessionTitle}</span>
                                                    <span className="session-dm__notes-session-toggle-icon" aria-hidden="true">
                                                        {collapsedPastSessions[group.key] ? "+" : "-"}
                                                    </span>
                                                </button>
                                                <span className="session-dm__notes-count">{group.notes.length}</span>
                                            </div>
                                            {!collapsedPastSessions[group.key] && group.notes.map((note) => (
                                                <article key={note.id} className="session-dm__note-card">
                                                    <p className="session-dm__note-card-meta">
                                                        {formatNoteTimestamp(note.createdAt) || "Unknown time"}
                                                    </p>
                                                    <p className="session-dm__note-card-text">{note.content}</p>
                                                </article>
                                            ))}
                                        </section>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            )}
        </footer>
    )
}

export default SessionBottomPanel;
