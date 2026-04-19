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
  const { token, loading: authLoading } = useAuth();
  const { campaign, loading, error } = useCampaign(id);
  const {
    sessions,
    loading: sessionsLoading,
    error: sessionsError,
  } = useCampaignSessions(id);
  const [encountersBySession, setEncountersBySession] = useState({});
  const [encountersLoading, setEncountersLoading] = useState(false);
  const [encountersError, setEncountersError] = useState("");
  const [expandedSessionIds, setExpandedSessionIds] = useState({});

  useEffect(() => {
    if (!token || !Array.isArray(sessions) || sessions.length === 0) {
      setEncountersBySession({});
      setEncountersLoading(false);
      setEncountersError("");
      return;
    }

    let cancelled = false;

    const fetchEncounters = async () => {
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
        }
      }
    };

    fetchEncounters();

    return () => {
      cancelled = true;
    };
  }, [sessions, token]);

  const timelineItems = useMemo(() => {
    const sessionItems = (sessions || []).map((session) => ({
      id: `session-${session._id}`,
      sessionId: session._id,
      type: "Session",
      title: session.title || "Untitled Session",
      status: session.status || "Planned",
      date: getPrimarySessionDate(session),
      summary: session.summary?.trim() || "",
      notes: Array.isArray(session.notes) ? session.notes : [],
      meta: [
        session.sessionNumber ? `Session ${session.sessionNumber}` : null,
        session.notes?.length ? `${session.notes.length} notes` : null,
        session.participants?.length ? `${session.participants.length} participants` : null,
      ].filter(Boolean),
    }));

    const encounterItems = (sessions || []).flatMap((session) =>
      (encountersBySession[session._id] || []).map((encounter) => ({
        id: `encounter-${encounter._id}`,
        type: "Encounter",
        title: encounter.name || "Untitled Encounter",
        status: encounter.status || "Planned",
        date: getPrimaryEncounterDate(encounter),
        summary: encounter.summary?.trim() || encounter.notes?.trim() || "",
        meta: [
          session.title ? `From ${session.title}` : null,
          Number.isFinite(encounter.rounds) ? `${encounter.rounds} rounds` : null,
          encounter.initiative?.length ? `${encounter.initiative.length} combatants` : null,
        ].filter(Boolean),
      }))
    );

    return [...sessionItems, ...encounterItems].sort((a, b) => {
      const aTime = a.date ? new Date(a.date).getTime() : 0;
      const bTime = b.date ? new Date(b.date).getTime() : 0;
      return bTime - aTime;
    });
  }, [encountersBySession, sessions]);

  if (loading || authLoading) {
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
  const toggleSessionExpanded = (sessionId) => {
    setExpandedSessionIds((prev) => ({
      ...prev,
      [sessionId]: !prev[sessionId],
    }));
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
                  <p className="campaign-journal-entry-summary">
                    {item.summary || "No summary has been recorded for this entry yet."}
                  </p>
                  {item.type === "Session" && (
                    <>
                      <button
                        type="button"
                        className="campaign-journal-expand"
                        onClick={() => toggleSessionExpanded(item.sessionId)}
                      >
                        {expandedSessionIds[item.sessionId] ? "Hide Notes" : "View Notes"}
                      </button>
                      {expandedSessionIds[item.sessionId] && (
                        item.notes.length > 0 ? (
                          <div className="campaign-journal-notes">
                            {item.notes.map((note, index) => (
                              <article
                                key={`${item.sessionId}-note-${index}`}
                                className="campaign-journal-note"
                              >
                                <div className="campaign-journal-note-top">
                                  <span className="campaign-journal-note-role">
                                    {note.authorRole || "Player"}
                                  </span>
                                  <span className="campaign-journal-note-date">
                                    {formatTimelineDate(note.createdAt)}
                                  </span>
                                </div>
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
