import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { io } from "socket.io-client";
import { useAuth } from "../../context/AuthContext.jsx";
import useCampaign from "../campaigns/use-campaign.js";
import LoadingPage from "../../shared/Loading.jsx";
import SessionTopBar from "./components/SessionTopBar.jsx";
import SessionPlayerCharacterPanel from "./components/SessionPlayerCharacterPanel.jsx";
import SessionMapCanvas from "./components/SessionMapCanvas.jsx";
import SessionRightPanel from "./components/SessionRightPanel.jsx";
import SessionBottomPanel from "./components/SessionBottomPanel.jsx";
import "./session.css";

const API_SERVER = import.meta.env.VITE_API_SERVER || "";
const SOCKET_SERVER = import.meta.env.VITE_API_URL || "http://localhost:5001";

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
  const [playerNotesStatus, setPlayerNotesStatus] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const socketRef = useRef(null);
  const bootTimeoutRef = useRef(null);
  const exitLink = campaignId ? `/campaigns/${campaignId}` : "/campaigns";
  const playerNotesKey = `session:player-notes:${sessionId || campaignId || "draft"}`;
  const userId = user?._id || user?.id || "";

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
    setPlayerNotesDraft(window.localStorage.getItem(playerNotesKey) || "");
    setPlayerNotesStatus("");
  }, [playerNotesKey]);

  useEffect(() => {
    if (!campaignId || !userId) {
      setSocketConnected(false);
      return;
    }

    const socket = io(SOCKET_SERVER, {
      transports: ["websocket"],
      withCredentials: true,
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
      socket.off("room-error");
      socket.off("connect_error");
      socket.off("disconnect");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [campaignId, sessionId, userId]);

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

  if (campaignLoading || loadingSession) {
    return <LoadingPage>Joining the session...</LoadingPage>;
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
          if (playerNotesStatus) setPlayerNotesStatus("");
        }}
        onSaveNotes={() => {
          window.localStorage.setItem(playerNotesKey, playerNotesDraft);
          setPlayerNotesStatus("Notes saved on this device.");
        }}
        notesStatus={playerNotesStatus}
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
    </div>
  );
}

export default SessionPlayerView;
