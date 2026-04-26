import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";

import LoadingPage from "../../shared/Loading.jsx";
import useCampaign from "../campaigns/use-campaign.js";
import useCampaignSessions from "../campaigns/use-campaign-sessions.js";
import placeholderImage from "../campaigns/images/DnD.jpg";
import "./campaignjournal.css";

const formatTimelineDate = (value) => {
  if (!value) return "Date not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date not recorded"
    : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
};

const getPrimarySessionDate = (session) =>
  session?.startedAt || session?.scheduledFor || session?.createdAt || null;

const getPrimaryEncounterDate = (encounter) =>
  encounter?.startedAt || encounter?.endedAt || encounter?.createdAt || null;

function CampaignJournalPage() {
  const { id } = useParams();
  const { user, token, loading: authLoading } = useAuth();
  const { campaign, loading, error } = useCampaign(id);
  const {
    sessions,
    loading: sessionsLoading,
    error: sessionsError,
  } = useCampaignSessions(id);
  const [encountersBySession, setEncountersBySession] = useState({});
  const [encountersLoading, setEncountersLoading] = useState(false);
  const [encountersError, setEncountersError] = useState("");
  const [encountersResolved, setEncountersResolved] = useState(false);
  const [expandedSessionIds, setExpandedSessionIds] = useState({});
  const [expandedEncounterSessionIds, setExpandedEncounterSessionIds] = useState({});
  const [expandedEncounterIds, setExpandedEncounterIds] = useState({});
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editingSessionNameId, setEditingSessionNameId] = useState(null);
  const [sessionNameDraft, setSessionNameDraft] = useState("");
  const [sessionNameSaving, setSessionNameSaving] = useState(false);
  const [sessionNameError, setSessionNameError] = useState("");
  const [summaryDraft, setSummaryDraft] = useState("");
  const [summarySaving, setSummarySaving] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [sessionTitleOverrides, setSessionTitleOverrides] = useState({});
  const [sessionSummaryOverrides, setSessionSummaryOverrides] = useState({});
  const [noteVisibilityOverrides, setNoteVisibilityOverrides] = useState({});
  const [noteVisibilitySavingKey, setNoteVisibilitySavingKey] = useState("");
  const [noteVisibilityErrorKey, setNoteVisibilityErrorKey] = useState("");
  const [noteVisibilityError, setNoteVisibilityError] = useState("");

  useEffect(() => {
    if (sessionsLoading) {
      setEncountersResolved(false);
      return;
    }

    if (!token || !Array.isArray(sessions) || sessions.length === 0) {
      setEncountersBySession({});
      setEncountersLoading(false);
      setEncountersError("");
      setEncountersResolved(true);
      return;
    }

    let cancelled = false;

    const fetchEncounters = async () => {
      setEncountersResolved(false);
      setEncountersLoading(true);
      setEncountersError("");
      try {
        const results = await Promise.all(
          sessions.map(async (session) => {
            const res = await fetch(`/api/encounters?sessionId=${session._id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(data.error || `Failed to load encounters for ${session.title || "session"}`);
            }
            const data = await res.json();
            return [session._id, Array.isArray(data) ? data : []];
          })
        );

        if (!cancelled) {
          setEncountersBySession(Object.fromEntries(results));
        }
      } catch (err) {
        if (!cancelled) {
          setEncountersBySession({});
          setEncountersError(err.message || "Failed to load encounters");
        }
      } finally {
        if (!cancelled) {
          setEncountersLoading(false);
          setEncountersResolved(true);
        }
      }
    };

    fetchEncounters();

    return () => {
      cancelled = true;
    };
  }, [sessions, sessionsLoading, token]);

  const timelineItems = useMemo(() => {
    const sessionItems = (sessions || []).map((session) => ({
      id: `session-${session._id}`,
      sessionId: session._id,
      type: "Session",
      title: Object.prototype.hasOwnProperty.call(sessionTitleOverrides, session._id)
        ? sessionTitleOverrides[session._id]
        : session.title || "Untitled Session",
      status: session.status || "Planned",
      date: getPrimarySessionDate(session),
      summary: Object.prototype.hasOwnProperty.call(sessionSummaryOverrides, session._id)
        ? sessionSummaryOverrides[session._id]
        : session.summary?.trim() || "",
      notes: Array.isArray(session.notes)
        ? session.notes.map((note, noteIndex) => {
            const overrideKey = `${session._id}:${noteIndex}`;
            return {
              ...note,
              visibleToPlayers: Object.prototype.hasOwnProperty.call(noteVisibilityOverrides, overrideKey)
                ? noteVisibilityOverrides[overrideKey]
                : Boolean(note?.visibleToPlayers),
            };
          })
        : [],
      meta: [
        session.sessionNumber ? `Session ${session.sessionNumber}` : null,
        session.notes?.length ? `${session.notes.length} notes` : null,
        session.participants?.length ? `${session.participants.length} participants` : null,
      ].filter(Boolean),
    }));

    return sessionItems.sort((a, b) => {
      const aTime = a.date ? new Date(a.date).getTime() : 0;
      const bTime = b.date ? new Date(b.date).getTime() : 0;
      return bTime - aTime;
    });
  }, [encountersBySession, noteVisibilityOverrides, sessionSummaryOverrides, sessionTitleOverrides, sessions]);

  if (loading || authLoading || sessionsLoading || !encountersResolved) {
    return <LoadingPage>Opening the campaign journal...</LoadingPage>;
  }

  if (error || !campaign) {
    return (
      <div className="campaign-full-center">
        <p className="campaign-error-msg">{error || "Campaign not found."}</p>
        <div className="campaign-btn-row">
          <Link to="/campaigns" className="btn-ghost campaign-btn-link">Back to Campaigns</Link>
        </div>
      </div>
    );
  }

  const backgroundImage = campaign.image || placeholderImage;
  const dmMember = campaign.members?.find((member) => member.role === "DM");
  const isDM = dmMember?.userId?._id?.toString() === user?.id?.toString();
  const toggleSessionExpanded = (sessionId) => {
    setExpandedSessionIds((prev) => ({
      ...prev,
      [sessionId]: !prev[sessionId],
    }));
  };
  const toggleEncounterExpanded = (sessionId) => {
    setExpandedEncounterSessionIds((prev) => ({
      ...prev,
      [sessionId]: !prev[sessionId],
    }));
  };
  const toggleEncounterCardExpanded = (encounterId) => {
    setExpandedEncounterIds((prev) => ({
      ...prev,
      [encounterId]: !prev[encounterId],
    }));
  };
  const startEditingSummary = (sessionId, currentSummary = "") => {
    setEditingSessionId(sessionId);
    setSummaryDraft(currentSummary);
    setSummaryError("");
  };
  const startEditingSessionName = (sessionId, currentTitle = "") => {
    setEditingSessionNameId(sessionId);
    setSessionNameDraft(currentTitle);
    setSessionNameError("");
  };
  const cancelEditingSummary = () => {
    setEditingSessionId(null);
    setSummaryDraft("");
    setSummaryError("");
  };
  const cancelEditingSessionName = () => {
    setEditingSessionNameId(null);
    setSessionNameDraft("");
    setSessionNameError("");
  };
  const saveSessionName = async (sessionId) => {
    if (!sessionId || !token || sessionNameSaving) return;

    setSessionNameSaving(true);
    setSessionNameError("");
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: sessionNameDraft.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update session name");
      }

      setSessionTitleOverrides((prev) => ({
        ...prev,
        [sessionId]: sessionNameDraft.trim(),
      }));
      setEditingSessionNameId(null);
      setSessionNameDraft("");
    } catch (err) {
      setSessionNameError(err.message || "Failed to update session name");
    } finally {
      setSessionNameSaving(false);
    }
  };
  const saveSessionSummary = async (sessionId) => {
    if (!sessionId || !token || summarySaving) return;

    setSummarySaving(true);
    setSummaryError("");
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          summary: summaryDraft.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update session summary");
      }

      setSessionSummaryOverrides((prev) => ({
        ...prev,
        [sessionId]: summaryDraft.trim(),
      }));
      setEditingSessionId(null);
      setSummaryDraft("");
    } catch (err) {
      setSummaryError(err.message || "Failed to update session summary");
    } finally {
      setSummarySaving(false);
    }
  };
  const updateNoteVisibility = async (sessionId, noteIndex, visibleToPlayers) => {
    if (!sessionId || !token) return;

    const noteKey = `${sessionId}:${noteIndex}`;
    setNoteVisibilitySavingKey(noteKey);
    setNoteVisibilityErrorKey("");
    setNoteVisibilityError("");
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          noteVisibilityIndex: noteIndex,
          noteVisibleToPlayers: visibleToPlayers,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update note visibility");
      }

      setNoteVisibilityOverrides((prev) => ({
        ...prev,
        [noteKey]: visibleToPlayers,
      }));
    } catch (err) {
      setNoteVisibilityErrorKey(noteKey);
      setNoteVisibilityError(err.message || "Failed to update note visibility");
    } finally {
      setNoteVisibilitySavingKey("");
    }
  };

  return (
    <div className="campaign-page">
      <div className="campaign-hero-bg-wrap">
        <div className="campaign-hero-bg-img" style={{ backgroundImage: `url(${backgroundImage})` }} />
        <div className="campaign-hero-bg-fade" />
      </div>

      <div className="campaign-content-wrap campaign-journal-content">
        <div className="campaign-page-header-wide campaign-journal-header">
          <p className="campaign-journal-subheader">{campaign.title}</p>
          <div className="campaign-header-divider" />
          <h1 className="campaign-page-title-lg">Campaign Journal</h1>
        </div>

        <section className="campaign-card-panel">
          {(sessionsError || encountersError) && (
            <div className="campaign-error-banner">
              {sessionsError || encountersError}
            </div>
          )}

          <div className="campaign-journal-overview">
            <div className="campaign-journal-stat">
              <span className="campaign-journal-stat-label">Sessions</span>
              <strong className="campaign-journal-stat-value">{sessions.length}</strong>
            </div>
            <div className="campaign-journal-stat">
              <span className="campaign-journal-stat-label">Encounters</span>
              <strong className="campaign-journal-stat-value">
                {Object.values(encountersBySession).reduce((sum, items) => sum + items.length, 0)}
              </strong>
            </div>
            <div className="campaign-journal-stat">
              <span className="campaign-journal-stat-label">Timeline</span>
              <strong className="campaign-journal-stat-value">
                {sessionsLoading || encountersLoading ? "Updating..." : `${timelineItems.length} entries`}
              </strong>
            </div>
          </div>

          {sessionsLoading || encountersLoading ? (
            <div className="campaign-journal-placeholder">
              <p className="campaign-section-empty">Loading campaign activity…</p>
            </div>
          ) : timelineItems.length > 0 ? (
            <div className="campaign-journal-list">
              {timelineItems.map((item) => (
                <article key={item.id} className="campaign-journal-entry">
                  <div className="campaign-journal-entry-top">
                    <div>
                      <span className="campaign-journal-entry-type">{item.type}</span>
                      <h2 className="campaign-journal-entry-title">{item.title}</h2>
                    </div>
                    <span className="campaign-journal-entry-status">{item.status}</span>
                  </div>
                  <p className="campaign-journal-entry-date">{formatTimelineDate(item.date)}</p>
                  {item.meta.length > 0 && (
                    <p className="campaign-journal-entry-meta">{item.meta.join(" • ")}</p>
                  )}
                  {item.type === "Session" && editingSessionNameId === item.sessionId && (
                    <div className="campaign-journal-summary-editor">
                      <label className="campaign-journal-editor-label" htmlFor={`title-${item.sessionId}`}>
                        Edit Session Name
                      </label>
                      <input
                        id={`title-${item.sessionId}`}
                        className="campaign-journal-editor-input campaign-journal-editor-input--single-line"
                        value={sessionNameDraft}
                        onChange={(event) => setSessionNameDraft(event.target.value)}
                        maxLength="120"
                        placeholder="Enter a session name..."
                      />
                      {sessionNameError && (
                        <p className="campaign-error-text campaign-journal-editor-error">{sessionNameError}</p>
                      )}
                      <div className="campaign-journal-entry-actions">
                        <button
                          type="button"
                          className="campaign-journal-expand"
                          onClick={() => saveSessionName(item.sessionId)}
                          disabled={sessionNameSaving}
                        >
                          {sessionNameSaving ? "Saving..." : "Save Name"}
                        </button>
                        <button
                          type="button"
                          className="btn-ghost campaign-btn-link"
                          onClick={cancelEditingSessionName}
                          disabled={sessionNameSaving}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  <p className="campaign-journal-entry-summary">
                    {item.summary || "No summary has been recorded for this entry yet."}
                  </p>
                  {item.type === "Session" && (
                    <>
                      {editingSessionId === item.sessionId ? (
                        <div className="campaign-journal-summary-editor">
                          <label className="campaign-journal-editor-label" htmlFor={`summary-${item.sessionId}`}>
                            Edit Session Summary
                          </label>
                          <textarea
                            id={`summary-${item.sessionId}`}
                            className="campaign-journal-editor-input"
                            value={summaryDraft}
                            onChange={(event) => setSummaryDraft(event.target.value)}
                            maxLength="2000"
                            placeholder="Write a session summary..."
                          />
                          {summaryError && (
                            <p className="campaign-error-text campaign-journal-editor-error">{summaryError}</p>
                          )}
                          <div className="campaign-journal-entry-actions">
                            <button
                              type="button"
                              className="campaign-journal-expand"
                              onClick={() => saveSessionSummary(item.sessionId)}
                              disabled={summarySaving}
                            >
                              {summarySaving ? "Saving..." : "Save Summary"}
                            </button>
                            <button
                              type="button"
                              className="btn-ghost campaign-btn-link"
                              onClick={cancelEditingSummary}
                              disabled={summarySaving}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="campaign-journal-entry-actions">
                          {isDM && (
                            <button
                              type="button"
                              className="campaign-journal-expand"
                              onClick={() => startEditingSessionName(item.sessionId, item.title)}
                            >
                              Edit Session Name
                            </button>
                          )}
                          {isDM && (
                            <button
                              type="button"
                              className="campaign-journal-expand"
                              onClick={() => startEditingSummary(item.sessionId, item.summary)}
                            >
                              Edit Session Summary
                            </button>
                          )}
                          <button
                            type="button"
                            className="campaign-journal-expand"
                            onClick={() => toggleSessionExpanded(item.sessionId)}
                          >
                            {expandedSessionIds[item.sessionId] ? "Hide Notes" : "View Notes"}
                          </button>
                          <button
                            type="button"
                            className="campaign-journal-expand"
                            onClick={() => toggleEncounterExpanded(item.sessionId)}
                          >
                            {expandedEncounterSessionIds[item.sessionId] ? "Hide Encounters" : "View Encounters"}
                          </button>
                        </div>
                      )}
                      {expandedSessionIds[item.sessionId] && (
                        item.notes.length > 0 ? (
                          <div className="campaign-journal-notes">
                            {item.notes.map((note, index) => (
                              <article
                                key={`${item.sessionId}-note-${index}`}
                                className="campaign-journal-note"
                              >
                                <div className="campaign-journal-note-top">
                                  <div className="campaign-journal-note-meta">
                                    <span className="campaign-journal-note-role">
                                      {note.authorRole || "Player"}
                                    </span>
                                    {isDM && note.authorRole === "DM" && (
                                      <label className="campaign-journal-note-visibility-toggle">
                                        <input
                                          type="checkbox"
                                          checked={Boolean(note.visibleToPlayers)}
                                          onChange={(event) =>
                                            updateNoteVisibility(item.sessionId, index, event.target.checked)
                                          }
                                          disabled={noteVisibilitySavingKey === `${item.sessionId}:${index}`}
                                        />
                                        <span>
                                          {noteVisibilitySavingKey === `${item.sessionId}:${index}`
                                            ? "Saving"
                                            : "Player View"}
                                        </span>
                                      </label>
                                    )}
                                  </div>
                                  <span className="campaign-journal-note-date">
                                    {formatTimelineDate(note.createdAt)}
                                  </span>
                                </div>
                                {noteVisibilityErrorKey === `${item.sessionId}:${index}` && (
                                  <p className="campaign-error-text campaign-journal-note-visibility-error">
                                    {noteVisibilityError}
                                  </p>
                                )}
                                <p className="campaign-journal-note-content">{note.content}</p>
                              </article>
                            ))}
                          </div>
                        ) : (
                          <div className="campaign-journal-notes">
                            <p className="campaign-section-empty">No notes were recorded for this session.</p>
                          </div>
                        )
                      )}
                      {expandedEncounterSessionIds[item.sessionId] && (
                        (encountersBySession[item.sessionId] || []).length > 0 ? (
                          <div className="campaign-journal-notes">
                            {(encountersBySession[item.sessionId] || []).map((encounter) => (
                              <button
                                type="button"
                                key={`${item.sessionId}-encounter-${encounter._id}`}
                                className={[
                                  "campaign-journal-note",
                                  "campaign-journal-encounter-card",
                                  expandedEncounterIds[encounter._id] ? "is-expanded" : "",
                                ].join(" ")}
                                onClick={() => toggleEncounterCardExpanded(encounter._id)}
                              >
                                <div className="campaign-journal-note-top">
                                  <div className="campaign-journal-note-meta">
                                    <span className="campaign-journal-note-role">Encounter</span>
                                  </div>
                                  <span className="campaign-journal-note-date">
                                    {formatTimelineDate(getPrimaryEncounterDate(encounter))}
                                  </span>
                                </div>
                                <p className="campaign-journal-note-content">
                                  <strong>{encounter.name || "Untitled Encounter"}</strong>
                                </p>
                                {expandedEncounterIds[encounter._id] && (
                                  <div className="campaign-journal-encounter-detail">
                                    <p className="campaign-journal-entry-meta">
                                      {[
                                        encounter.status || "Planned",
                                        Number.isFinite(encounter.rounds) ? `${encounter.rounds} rounds` : null,
                                        encounter.relatedMap ? `Map: ${encounter.relatedMap}` : null,
                                        encounter.initiative?.length ? `${encounter.initiative.length} combatants` : null,
                                      ].filter(Boolean).join(" • ")}
                                    </p>
                                    {(encounter.summary?.trim() || encounter.notes?.trim()) && (
                                      <p className="campaign-journal-note-content">
                                        {encounter.summary?.trim() || encounter.notes?.trim()}
                                      </p>
                                    )}
                                    {encounter.initiative?.length > 0 && (
                                      <div className="campaign-journal-encounter-list">
                                        {encounter.initiative.map((combatant, combatantIndex) => (
                                          <div
                                            key={`${encounter._id}-combatant-${combatantIndex}`}
                                            className="campaign-journal-encounter-combatant"
                                          >
                                            <span>{combatant.name || `Combatant ${combatantIndex + 1}`}</span>
                                            <span>
                                              {[
                                                combatant.kind || null,
                                                combatant.initiative !== undefined && combatant.initiative !== null
                                                  ? `Init ${combatant.initiative}`
                                                  : null,
                                                combatant.hp ? `HP ${combatant.hp}` : null,
                                              ].filter(Boolean).join(" • ")}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="campaign-journal-notes">
                            <p className="campaign-section-empty">No encounters were recorded for this session.</p>
                          </div>
                        )
                      )}
                    </>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="campaign-journal-placeholder">
              <p className="campaign-section-empty">
                No session or encounter history has been recorded for this campaign yet.
              </p>
            </div>
          )}

          <div className="campaign-footer campaign-footer-split">
            <Link to={`/campaigns/${campaign._id}`} className="btn-ghost campaign-btn-link">
              Back to Campaign
            </Link>
            <Link to="/campaigns" className="btn-ghost campaign-btn-link">
              Back to Campaigns
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export default CampaignJournalPage;
