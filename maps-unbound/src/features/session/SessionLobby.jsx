// Session lobby:
// shared waiting room layout for campaign members before the DM opens the live table.
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import useCampaign from "../campaigns/use-campaign";
import { useAuth } from "../../context/AuthContext.jsx";
import { clearCachePrefix, removeCachedValue } from "../../shared/dataCache.js";
import "./session.css";
import LoadingPage from "../../shared/Loading.jsx";

const getUserId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value._id) return getUserId(value._id);
  if (value.id) return getUserId(value.id);
  if (value.$oid) return value.$oid;
  const stringValue = value.toString?.();
  return stringValue && stringValue !== "[object Object]" ? stringValue : "";
};

const formatLobbyTime = (value) => {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not scheduled" : date.toLocaleString();
};

function SessionLobby() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [searchParams] = useSearchParams();
  const campaignId = searchParams.get("campaignId");
  const sessionId = searchParams.get("sessionId");
  const sessionNameParam = searchParams.get("sessionName");
  const { campaign, loading: campaignLoading, error: campaignError } = useCampaign(campaignId);
  const [session, setSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(Boolean(sessionId));
  const [sessionName, setSessionName] = useState(sessionNameParam || "Session Name");
  const [actionPending, setActionPending] = useState("");
  const [lobbyError, setLobbyError] = useState("");
  const [lobbyNotice, setLobbyNotice] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const autoJoinAttemptedRef = useRef(false);
  const bootTimeoutRef = useRef(null);
  const allowLobbyExitRef = useRef(false);
  const lobbyExitCleanupSentRef = useRef(false);
  const lobbyExitCleanupRef = useRef(null);

  const membership = useMemo(() => {
    if (!campaign?.members || !user?.id) return null;
    return campaign.members.find((member) => getUserId(member.userId) === getUserId(user.id)) || null;
  }, [campaign?.members, user?.id]);

  const isDM = membership?.role === "DM";
  const participants = Array.isArray(session?.participants) ? session.participants : [];
  const joinedUserIds = new Set(participants.map((participant) => getUserId(participant.userId || participant)));
  const currentUserJoined = user?.id ? joinedUserIds.has(getUserId(user.id)) : false;
  const playerMembers = (campaign?.members || []).filter((member) => member.role === "Player");
  const dmMember = (campaign?.members || []).find((member) => member.role === "DM");
  const rosterMembers = [dmMember, ...playerMembers].filter(Boolean);
  const status = session?.status || "In Progress";
  const isClosed = ["Completed", "Archived"].includes(status);

  useEffect(() => {
    lobbyExitCleanupRef.current = {
      campaignId,
      isDM,
      sessionId,
      shouldCancelOnExit: Boolean(isDM && sessionId && token && session && !session.startedAt && !isClosed),
      token,
      userId: user?.id || "current",
    };
  }, [campaignId, isClosed, isDM, session, sessionId, token, user?.id]);

  useEffect(() => {
    return () => {
      const cleanup = lobbyExitCleanupRef.current;
      if (!cleanup?.shouldCancelOnExit || allowLobbyExitRef.current) return;
      if (lobbyExitCleanupSentRef.current) return;
      lobbyExitCleanupSentRef.current = true;

      fetch(`/api/sessions/${cleanup.sessionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${cleanup.token}` },
        keepalive: true,
      }).catch(() => {});

      if (cleanup.campaignId) {
        clearCachePrefix(`campaign:sessions:${cleanup.userId}:${cleanup.campaignId}`);
        removeCachedValue(`campaign:journal:${cleanup.userId}:${cleanup.campaignId}`);
      }
    };
  }, []);

  useEffect(() => {
    const cancelOpenLobbyOnPageExit = () => {
      const cleanup = lobbyExitCleanupRef.current;
      if (!cleanup?.shouldCancelOnExit || allowLobbyExitRef.current) return;
      if (lobbyExitCleanupSentRef.current) return;
      lobbyExitCleanupSentRef.current = true;

      fetch(`/api/sessions/${cleanup.sessionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${cleanup.token}` },
        keepalive: true,
      }).catch(() => {});
    };

    window.addEventListener("pagehide", cancelOpenLobbyOnPageExit);
    return () => window.removeEventListener("pagehide", cancelOpenLobbyOnPageExit);
  }, []);

  const bootToCampaign = (message) => {
    if (bootTimeoutRef.current) return;
    setLobbyNotice(message);
    setLobbyError("");
    bootTimeoutRef.current = window.setTimeout(() => {
      navigate(campaignId ? `/campaigns/${campaignId}` : "/campaigns", { replace: true });
    }, 3000);
  };

  const fetchSession = async ({ showLoading = true } = {}) => {
    if (!sessionId || !token) {
      setSessionLoading(false);
      return;
    }
    if (showLoading) setSessionLoading(true);
    setLobbyError("");
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 404) {
          bootToCampaign("The DM canceled this session. Returning you to the campaign...");
          return;
        }
        throw new Error(data.error || "Failed to load session");
      }
      const data = await res.json();
      setSession(data);
      setSessionName(data.title || sessionNameParam || "Session Name");
    } catch (err) {
      setLobbyError(err.message || "Failed to load session.");
    } finally {
      setSessionLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, token]);

  useEffect(() => {
    if (!sessionId || !token || isDM || lobbyNotice) return;

    const intervalId = window.setInterval(() => {
      fetchSession({ showLoading: false });
    }, 4000);

    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, token, isDM, lobbyNotice]);

  useEffect(() => {
    if (!session?.startedAt || isDM || lobbyNotice) return;

    const query = new URLSearchParams();
    if (campaignId) query.set("campaignId", campaignId);
    if (sessionId) query.set("sessionId", sessionId);
    query.set("sessionName", session.title || sessionName);
    navigate(`/session/player?${query.toString()}`, { replace: true });
  }, [campaignId, isDM, lobbyNotice, navigate, session, sessionId, sessionName]);

  useEffect(() => {
    return () => {
      if (bootTimeoutRef.current) window.clearTimeout(bootTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    autoJoinAttemptedRef.current = false;
  }, [sessionId, user?.id]);

  const runSessionAction = async (actionName, request) => {
    if (actionPending) return null;
    setActionPending(actionName);
    setLobbyError("");
    try {
      const res = await request();
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Session action failed");
      }
      setSession(data);
      return data;
    } catch (err) {
      setLobbyError(err.message || "Session action failed.");
      return null;
    } finally {
      setActionPending("");
    }
  };

  const handleStartSession = async () => {
    if (!sessionId || !token) return;
    const nextSessionName = sessionName.trim() || "Session Name";
    const data = await runSessionAction("dm", () =>
      fetch(`/api/sessions/${sessionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: nextSessionName,
          startedAt: session?.startedAt || new Date().toISOString(),
        }),
      })
    );
    if (!data) return;

    const query = new URLSearchParams();
    if (campaignId) query.set("campaignId", campaignId);
    if (sessionId) query.set("sessionId", sessionId);
    query.set("sessionName", data.title || nextSessionName);
    allowLobbyExitRef.current = true;
    navigate(`/session/dm?${query.toString()}`, { replace: true });
  };

  const handleJoinLobby = () => {
    if (!sessionId || !token) return;
    runSessionAction("join", () =>
      fetch(`/api/sessions/${sessionId}/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
    );
  };

  useEffect(() => {
    if (
      !session ||
      !campaign ||
      lobbyNotice ||
      isDM ||
      currentUserJoined ||
      isClosed ||
      !sessionId ||
      !token ||
      autoJoinAttemptedRef.current
    ) {
      return;
    }

    autoJoinAttemptedRef.current = true;
    handleJoinLobby();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, campaign, lobbyNotice, isDM, currentUserJoined, isClosed, sessionId, token]);

  const cancelSession = async ({ requireConfirmation = true } = {}) => {
    if (!sessionId || !token || !campaignId || actionPending) return;
    if (requireConfirmation && !confirmCancel) {
      setConfirmCancel(true);
      return;
    }

    setActionPending("cancel");
    setLobbyError("");
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel session");
      }
      clearCachePrefix(`campaign:sessions:${user?.id || "current"}:${campaignId}`);
      removeCachedValue(`campaign:journal:${user?.id || "current"}:${campaignId}`);
      allowLobbyExitRef.current = true;
      navigate(`/campaigns/${campaignId}`, { replace: true });
    } catch (err) {
      setLobbyError(err.message || "Failed to cancel session.");
      setActionPending("");
    }
  };

  const handleCancelSession = () => {
    cancelSession();
  };

  const handleLeaveLobby = () => {
    if (!isDM || isClosed || session?.startedAt) {
      allowLobbyExitRef.current = true;
      navigate(`/campaigns/${campaign._id}`, { replace: true });
      return;
    }

    cancelSession({ requireConfirmation: false });
  };

  if (campaignLoading || sessionLoading) {
    return <LoadingPage>Preparing the session lobby...</LoadingPage>;
  }

  if (campaignError || !campaign || !sessionId) {
    return (
      <div className="session-page">
        <div className="session-lobby">
          <p className="session-lobby__eyebrow">Session Lobby</p>
          <h1>Lobby Unavailable</h1>
          <p>{campaignError || "This lobby needs a campaign and session link."}</p>
          <Link to="/campaigns" className="session-lobby__button session-lobby__button--ghost">
            Back to Campaigns
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="session-page">
      <main className="session-lobby">
        <header className="session-lobby__header">
          <div>
            <p className="session-lobby__eyebrow">Session Lobby</p>
            <h1>{sessionName}</h1>
            <p>{campaign.title}</p>
          </div>
          <span className={`session-lobby__status is-${status.toLowerCase().replace(/\s+/g, "-")}`}>
            {status}
          </span>
        </header>

        {lobbyNotice && (
          <div className="session-boot-overlay" role="status" aria-live="assertive">
            <div className="session-boot-overlay__card">
              <p className="session-lobby__eyebrow">Session Closed</p>
              <h2>Returning to Campaign</h2>
              <p>{lobbyNotice}</p>
            </div>
          </div>
        )}

        <section className="session-lobby__grid">
          <div className="session-lobby__panel session-lobby__panel--main">
            <div className="session-lobby__panel-header">
              <div>
                <h2>Table Roster</h2>
                <p>{participants.length} of {rosterMembers.length || campaign.members?.length || 0} campaign members joined</p>
              </div>
              <button
                type="button"
                className="session-lobby__button session-lobby__button--ghost"
                onClick={fetchSession}
                disabled={Boolean(actionPending)}
              >
                Refresh
              </button>
            </div>

            <div className="session-lobby__roster">
              {rosterMembers.map((member) => {
                const memberUser = member.userId || {};
                const memberId = getUserId(memberUser);
                const isJoined = joinedUserIds.has(memberId);
                return (
                  <article className="session-lobby__player" key={`${member.role}-${memberId}`}>
                    <div className="session-lobby__avatar" aria-hidden="true">
                      {(memberUser.username || member.role || "?").slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <h3>
                        {memberUser.username || "Unknown Player"}
                        {memberId === getUserId(user?.id) && <span>You</span>}
                      </h3>
                      <p>{member.role}</p>
                    </div>
                    <strong className={isJoined ? "is-ready" : ""}>
                      {isJoined ? "Joined" : "Invited"}
                    </strong>
                  </article>
                );
              })}
            </div>
          </div>

          <aside className="session-lobby__panel">
            <div className="session-lobby__meta">
              <span>Campaign</span>
              <strong>{campaign.title}</strong>
            </div>
            <div className="session-lobby__meta">
              <span>Session</span>
              {isDM ? (
                <input
                  className="session-lobby__input"
                  type="text"
                  value={sessionName}
                  onChange={(event) => setSessionName(event.target.value)}
                  maxLength={120}
                />
              ) : (
                <strong>{session?.title || sessionName}</strong>
              )}
            </div>
            <div className="session-lobby__meta">
              <span>Scheduled</span>
              <strong>{formatLobbyTime(session?.scheduledFor)}</strong>
            </div>
            <div className="session-lobby__meta">
              <span>Your Role</span>
              <strong>{membership?.role || "Member"}</strong>
            </div>

            <div className="session-lobby__actions">
              {isDM ? (
                <>
                  <button
                    type="button"
                    className="session-lobby__button"
                    onClick={handleStartSession}
                    disabled={Boolean(actionPending) || isClosed}
                  >
                    {actionPending === "dm" ? "Starting..." : "Start Session"}
                  </button>
                  <button
                    type="button"
                    className="session-lobby__button session-lobby__button--danger"
                    onClick={handleCancelSession}
                    disabled={Boolean(actionPending)}
                  >
                    {actionPending === "cancel"
                      ? "Canceling..."
                      : confirmCancel
                        ? "Confirm Cancel Session"
                        : "Cancel Session"}
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="session-lobby__button" disabled>
                    {currentUserJoined ? "Waiting for DM" : "Joining Lobby..."}
                  </button>
                </>
              )}

              <button
                type="button"
                className="session-lobby__button session-lobby__button--ghost"
                onClick={handleLeaveLobby}
                disabled={Boolean(actionPending)}
              >
                Back to Campaign
              </button>
            </div>

            {lobbyError && <p className="session-lobby__error">{lobbyError}</p>}
          </aside>
        </section>
      </main>
    </div>
  );
}

export default SessionLobby;
