import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { io } from "socket.io-client";
import { useAuth } from "../../context/AuthContext.jsx";
import useCampaign from "../campaigns/use-campaign.js";
import useCampaignSessions from "../campaigns/use-campaign-sessions.js";
import LoadingPage from "../../shared/Loading.jsx";
import SessionTopBar from "./components/SessionTopBar.jsx";
import SessionPlayerCharacterPanel from "./components/SessionPlayerCharacterPanel.jsx";
import SessionMapCanvas from "./components/SessionMapCanvas.jsx";
import SessionRightPanel from "./components/SessionRightPanel.jsx";
import SessionBottomPanel from "./components/SessionBottomPanel.jsx";
import "./session.css";

const API_SERVER = import.meta.env.VITE_API_SERVER || "";
const SOCKET_SERVER = import.meta.env.VITE_API_URL || "http://localhost:5002";

const getUserId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value._id) return getUserId(value._id);
  if (value.id) return getUserId(value.id);
  if (value.$oid) return value.$oid;
  const stringValue = value.toString?.();
  return stringValue && stringValue !== "[object Object]" ? stringValue : "";
};

function SessionPlayerView() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [searchParams] = useSearchParams();
  const campaignId = searchParams.get("campaignId");
  const sessionId = searchParams.get("sessionId");
  const sessionNameParam = searchParams.get("sessionName") || "Session";
  const { campaign, loading: campaignLoading } = useCampaign(campaignId);
  const { sessions, loading: sessionsLoading, refetch: refetchSessions } = useCampaignSessions(campaignId, { includeNotes: true });
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(Boolean(sessionId));
  const [character, setCharacter] = useState(null);
  const [loadingCharacter, setLoadingCharacter] = useState(false);
  const [characterError, setCharacterError] = useState("");
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  const [isBottomCollapsed, setIsBottomCollapsed] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [socketError, setSocketError] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [liveEvents, setLiveEvents] = useState([]);
  const [liveEncounter, setLiveEncounter] = useState(null);
  const [liveSessionState, setLiveSessionState] = useState(null);
  const [playerNotesDraft, setPlayerNotesDraft] = useState("");
  const [playerNotesSaving, setPlayerNotesSaving] = useState(false);
  const [playerNotesError, setPlayerNotesError] = useState("");
  const [playerNotesStatus, setPlayerNotesStatus] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const socketRef = useRef(null);
  const bootTimeoutRef = useRef(null);
  const exitLink = campaignId ? `/campaigns/${campaignId}` : "/campaigns";
  const userId = user?._id || user?.id || "";
  const currentUserMembership = (campaign?.members || []).find((member) => getUserId(member.userId) === getUserId(userId)) || null;
  const isCurrentUserDM = currentUserMembership?.role === "DM";

  const liveTurns = (() => {
    if (Array.isArray(liveSessionState?.turns) && liveSessionState.turns.length > 0) {
      return liveSessionState.turns;
    }

    const tokens = Array.isArray(liveEncounter?.tokens) ? liveEncounter.tokens : [];
    const order = Array.isArray(liveEncounter?.initiativeOrder) && liveEncounter.initiativeOrder.length > 0
      ? liveEncounter.initiativeOrder
      : tokens.map((token) => token.tokenId);

    return order.map((tokenId, index) => {
      const token = tokens.find((entry) => entry.tokenId === tokenId);
      if (!token) return null;
      return {
        order: index + 1,
        name: token.name || "Unknown",
        kind: token.type || token.kind || "Player",
        hp: token.hp,
        initiative: token.initiative,
        isActive: liveEncounter.activeTokenId === tokenId,
        isNext: order[(order.findIndex((entry) => entry === liveEncounter.activeTokenId) + 1) % order.length] === tokenId,
      };
    }).filter(Boolean);
  })();
  const displayedEvents = Array.isArray(liveSessionState?.events) && liveSessionState.events.length > 0
    ? liveSessionState.events
    : liveEvents;
  const displayedRound = Array.isArray(liveSessionState?.turns) && liveSessionState.turns.length > 0
    ? liveSessionState.combatRound || 0
    : Math.max(0, Number(liveEncounter?.round || 1) - 1);
  const orderedSessions = [...sessions].sort((a, b) => {
    const aNumber = Number.isFinite(a?.sessionNumber) ? a.sessionNumber : Number.POSITIVE_INFINITY;
    const bNumber = Number.isFinite(b?.sessionNumber) ? b.sessionNumber : Number.POSITIVE_INFINITY;
    if (aNumber !== bNumber) return aNumber - bNumber;
    return new Date(a?.createdAt || 0).getTime() - new Date(b?.createdAt || 0).getTime();
  });
  const currentSession = sessionId
    ? orderedSessions.find((entry) => entry?._id === sessionId) || session
    : session;
  const currentSessionNotes = (Array.isArray(currentSession?.notes) ? currentSession.notes : [])
    .map((note, noteIndex) => ({
      id: `${currentSession?._id || "session"}-current-${note.createdAt || noteIndex}`,
      sessionTitle: currentSession?.title || `Session ${currentSession?.sessionNumber || "?"}`,
      content: note.content || "",
      createdAt: note.createdAt || currentSession?.createdAt,
      authorRole: note.authorRole || "DM",
    }))
    .filter((note) => note.content)
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  const previousSessionNotes = orderedSessions
    .filter((entry) => entry?._id !== sessionId)
    .flatMap((entry) =>
      (Array.isArray(entry?.notes) ? entry.notes : []).map((note, noteIndex) => ({
        id: `${entry._id || "session"}-${note.createdAt || noteIndex}`,
        sessionId: entry._id || "",
        sessionNumber: entry.sessionNumber,
        sessionTitle: entry.title || `Session ${entry.sessionNumber || "?"}`,
        content: note.content || "",
        createdAt: note.createdAt || entry.createdAt,
        authorRole: note.authorRole || "DM",
      }))
    )
    .filter((note) => note.content)
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const sessionParticipants = (Array.isArray(session?.participants) ? session.participants : []).map((participant) => {
    const userId = getUserId(participant.userId || participant);
    const campaignMember = (campaign?.members || []).find((member) => getUserId(member.userId) === userId);
    const username = campaignMember?.userId?.username || participant.userId?.username || "";
    const profileImageUrl = campaignMember?.userId?.profileImageUrl || participant.userId?.profileImageUrl || "";
    const role = participant.role || campaignMember?.role || "Player";
    return {
      userId,
      username,
      profileImageUrl,
      role,
      initial: username.slice(0, 1).toUpperCase() || (role === "DM" ? "D" : "?"),
    };
  }).filter((participant) => participant.userId);

  const bootToCampaign = (message) => {
    if (bootTimeoutRef.current) return;
    setNotice(message);
    setError("");
    bootTimeoutRef.current = window.setTimeout(() => {
      navigate(campaignId ? `/campaigns/${campaignId}` : "/campaigns", { replace: true });
    }, 3000);
  };

  const fetchSession = async ({ showLoading = true } = {}) => {
    if (!sessionId || !token) {
      setLoadingSession(false);
      return;
    }

    if (showLoading) setLoadingSession(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 404) {
          bootToCampaign("The session is no longer available. Returning you to the campaign...");
          return;
        }
        throw new Error(data.error || "Failed to load session");
      }

      const data = await res.json();
      if (["Completed", "Archived"].includes(data.status)) {
        bootToCampaign("The DM ended this session. Returning you to the campaign...");
        return;
      }
      setSession(data);
    } catch (err) {
      setError(err.message || "Failed to load session.");
    } finally {
      setLoadingSession(false);
    }
  };

  useEffect(() => {
    fetchSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, token]);

  useEffect(() => {
    if (!campaignId || !userId) {
      setSocketConnected(false);
      return;
    }

    const socket = io(SOCKET_SERVER, {
      transports: ["websocket"],
      withCredentials: true,
      auth: { token },
    });
    socketRef.current = socket;

    const appendEvent = (title, detail = "", tone = "neutral", kind = "note") => {
      setLiveEvents((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random()}`,
          title,
          detail,
          tone,
          kind,
          createdAt: new Date().toISOString(),
        },
      ].slice(-80));
    };

    socket.on("connect", () => {
      setSocketConnected(true);
      setSocketError("");
      socket.emit("join-room", { campaignId, userId });
      if (sessionId) {
        socket.emit("session:state-load", { campaignId, sessionId, userId });
      }
    });

    socket.on("room-joined", () => {
      appendEvent("Connected", "Joined the live session room.", "highlight", "note");
    });

    socket.on("player-joined", (payload) => {
      if (payload?.userId === userId) return;
      appendEvent("Player Joined", "A player connected to the session.", "neutral", "note");
    });

    socket.on("chat-message", (payload) => {
      const createdAt = payload?.timestamp || new Date().toISOString();
      setChatMessages((prev) => [
        ...prev,
        {
          id: `${createdAt}-${payload?.userId || "system"}-${Math.random()}`,
          userId: payload?.userId || "",
          username: payload?.username || "Table",
          message: payload?.message || "",
          timestamp: new Date(createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
        },
      ].slice(-120));
    });

    socket.on("encounter:state", (payload) => {
      const encounter = payload?.encounter;
      if (!encounter) return;
      setLiveEncounter(encounter);
      const logEvents = (encounter.log || []).slice(0, 12).reverse().map((entry, index) => ({
        id: `encounter-log-${index}-${entry}`,
        title: "Encounter",
        detail: entry,
        tone: "neutral",
        kind: "note",
        createdAt: encounter.updatedAt || new Date().toISOString(),
      }));
      if (logEvents.length > 0) {
        setLiveEvents(logEvents);
      }
    });

    socket.on("session:state", (payload) => {
      if (payload?.sessionId && sessionId && payload.sessionId !== sessionId) return;
      setLiveSessionState(payload || null);
    });

    socket.on("session:notes-updated", (payload) => {
      if (payload?.sessionId && sessionId && payload.sessionId !== sessionId) return;
      refetchSessions();
    });

    socket.on("room-error", (payload) => {
      setSocketError(payload?.message || "Unable to join live session room.");
    });

    socket.on("connect_error", (err) => {
      setSocketError(err.message || "Unable to connect to live session.");
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
    });

    return () => {
      socket.off("connect");
      socket.off("room-joined");
      socket.off("player-joined");
      socket.off("chat-message");
      socket.off("encounter:state");
      socket.off("session:state");
      socket.off("session:notes-updated");
      socket.off("room-error");
      socket.off("connect_error");
      socket.off("disconnect");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [campaignId, refetchSessions, sessionId, token, userId]);

  useEffect(() => {
    if (campaignLoading || !campaign || !userId || !isCurrentUserDM) {
      return;
    }

    const query = new URLSearchParams();
    if (campaignId) query.set("campaignId", campaignId);
    if (sessionId) query.set("sessionId", sessionId);
    query.set("sessionName", session?.title || sessionNameParam);
    navigate(`/session/dm?${query.toString()}`, { replace: true });
  }, [campaign, campaignId, campaignLoading, isCurrentUserDM, navigate, session, sessionId, sessionNameParam, userId]);

  useEffect(() => {
    if (!user?.username) {
      setCharacter(null);
      setLoadingCharacter(false);
      return;
    }

    const fetchCharacter = async () => {
      setLoadingCharacter(true);
      setCharacterError("");
      try {
        const res = await fetch(`${API_SERVER}/api/users/${user.username}/characters`);
        if (!res.ok) {
          throw new Error("Failed to load your character.");
        }
        const data = await res.json();
        const characters = Array.isArray(data.characters) ? data.characters : [];
        setCharacter(characters[0] || null);
      } catch (err) {
        setCharacter(null);
        setCharacterError(err.message || "Failed to load your character.");
      } finally {
        setLoadingCharacter(false);
      }
    };

    fetchCharacter();
  }, [user?.username]);

  useEffect(() => {
    if (!sessionId || !token || notice) return;

    const intervalId = window.setInterval(() => {
      fetchSession({ showLoading: false });
    }, 4000);

    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, token, notice]);

  useEffect(() => {
    return () => {
      if (bootTimeoutRef.current) window.clearTimeout(bootTimeoutRef.current);
    };
  }, []);

  if (campaignLoading || loadingSession || (sessionsLoading && sessions.length === 0)) {
    return <LoadingPage>Joining the session...</LoadingPage>;
  }

  if (campaign && userId && isCurrentUserDM) {
    return <LoadingPage>Redirecting to DM session...</LoadingPage>;
  }

  return (
    <div
      className={[
        "session-dm",
        "session-player-runtime",
        isLeftCollapsed ? "is-left-collapsed" : "",
        isRightCollapsed ? "is-right-collapsed" : "",
        isBottomCollapsed ? "is-bottom-collapsed" : "",
      ].filter(Boolean).join(" ")}
    >
      <SessionTopBar
        campaignName={campaign?.title || "Campaign"}
        sessionName={session?.title || sessionNameParam}
        sceneName={liveSessionState?.sceneName || (socketConnected ? "Live" : "Offline")}
        players={sessionParticipants}
        role="player"
        onLeaveSession={() => navigate(exitLink)}
      />

      <SessionPlayerCharacterPanel
        character={character}
        loading={loadingCharacter}
        error={characterError}
        isCollapsed={isLeftCollapsed}
        onToggle={() => setIsLeftCollapsed((prev) => !prev)}
      />

      <SessionMapCanvas readOnly turns={liveTurns} round={displayedRound} />

      <SessionRightPanel
        isCollapsed={isRightCollapsed}
        onToggle={() => setIsRightCollapsed((prev) => !prev)}
        events={socketError ? [
          {
            id: "socket-error",
            title: "Live Sync",
            detail: socketError,
            tone: "muted",
            kind: "note",
            createdAt: new Date().toISOString(),
          },
          ...displayedEvents,
        ] : displayedEvents}
      />

      <SessionBottomPanel
        mode="player"
        isCollapsed={isBottomCollapsed}
        onToggle={() => setIsBottomCollapsed((prev) => !prev)}
        chatMessages={chatMessages}
        chatInput={chatInput}
        onChatInputChange={setChatInput}
        onSendChat={(event) => {
          event.preventDefault();
          const message = chatInput.trim();
          if (!message || !socketRef.current || !campaignId || !userId) return;
          socketRef.current.emit("send-message", {
            campaignId,
            userId,
            username: user?.username || "Player",
            message,
          });
          setChatInput("");
        }}
        chatConnected={socketConnected}
        notesDraft={playerNotesDraft}
        onNotesDraftChange={(value) => {
          setPlayerNotesDraft(value);
          if (playerNotesError) setPlayerNotesError("");
          if (playerNotesStatus) setPlayerNotesStatus("");
        }}
        onSaveNotes={async () => {
          const content = playerNotesDraft.trim();
          if (!content) {
            setPlayerNotesError("Write a note before saving.");
            setPlayerNotesStatus("");
            return;
          }
          if (!sessionId || !token) {
            setPlayerNotesError("Missing session context. Reopen the session and try again.");
            setPlayerNotesStatus("");
            return;
          }

          setPlayerNotesSaving(true);
          setPlayerNotesError("");
          setPlayerNotesStatus("");
          try {
            const res = await fetch(`/api/sessions/${sessionId}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ sessionNoteContent: content }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              throw new Error(data.error || "Failed to save note.");
            }
            setPlayerNotesDraft("");
            setPlayerNotesStatus("Player note saved.");
            await refetchSessions();
            if (socketRef.current && campaignId) {
              socketRef.current.emit("session:notes-updated", {
                campaignId,
                sessionId,
                userId,
              });
            }
          } catch (err) {
            setPlayerNotesError(err.message || "Failed to save note.");
          } finally {
            setPlayerNotesSaving(false);
          }
        }}
        notesSaving={playerNotesSaving}
        notesError={playerNotesError}
        notesStatus={playerNotesStatus}
        currentNotes={currentSessionNotes}
        previousNotes={previousSessionNotes}
        previousNotesLoading={sessionsLoading}
      />

      {error && <p className="session-player-runtime__error">{error}</p>}

      {notice && (
        <div className="session-boot-overlay" role="status" aria-live="assertive">
          <div className="session-boot-overlay__card">
            <p className="session-lobby__eyebrow">Session Closed</p>
            <h2>Returning to Campaign</h2>
            <p>{notice}</p>
          </div>
        </div>
      )}

      {liveSessionState?.isSessionPaused && !notice && (
        <div className="session-dm__pause-overlay" role="status" aria-live="assertive">
          <div className="session-dm__pause-overlay-card">
            <h2>Session Is Currently Paused</h2>
            <p>Gameplay is paused by the DM.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default SessionPlayerView;
