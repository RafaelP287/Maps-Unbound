import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import LoadingPage from "../../shared/Loading.jsx";
import useGodotBridge from "../maps/use-godot-bridge.js";
// Pulls the right label out of D&D's nested race/class objects which can be
// either a string, an {index, name} object, or null.
const labelOf = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.name || value.index || "";
};

const apiServer = import.meta.env.VITE_API_SERVER;

function PlayerDashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("sessionId");

  const [party, setParty] = useState(null);
  const [session, setSession] = useState(null);
  const [viewer, setViewer] = useState(null);
  const [character, setCharacter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [leaving, setLeaving] = useState(false);

  // Godot iframe + bridge for the map view.
  const iframeRef = useRef(null);
  const bridge = useGodotBridge(iframeRef, {
    onRequestSave: () => {},
    onRequestSaveAs: () => {},
    onRequestLoad: () => {},
    onAutoSave: () => {},
    onReady: () => {},
  });
  const lastLoadedMapIdRef = useRef("");

  // Fetch party + session info, then the viewer's character if they have one.
  const fetchPartyInfo = async () => {
    if (!sessionId) {
      setError("No session ID in URL.");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/sessions/${sessionId}/party`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not load session info.");
      }
      setParty(data.party);
      setSession(data.session);
      setViewer(data.viewer);

      if (data.viewer?.activeCharacterId) {
        try {
          const charRes = await fetch(
            `/api/characters/${data.viewer.activeCharacterId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (charRes.ok) {
            const data = await charRes.json();
            setCharacter(data.character || data);
          }
        } catch {
          // Non-fatal — lobby still works without the character sheet.
        }
      }
    } catch (err) {
      setError(err.message || "Failed to load session.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartyInfo();
    // Poll every 5s so the player sees others joining/leaving and map changes.
    const interval = setInterval(fetchPartyInfo, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, token]);

  // When the DM loads a new map (currentMapId changes), fetch its saved JSON
  // and feed it to Godot. Live edits in between come through the socket below.
  useEffect(() => {
    if (!session?.currentMapId) return;
    if (!bridge.isReady) return;
    const mapId = String(session.currentMapId);
    if (lastLoadedMapIdRef.current === mapId) return;
    lastLoadedMapIdRef.current = mapId;

    fetch(`/api/sessions/${sessionId}/map`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.json) return;
        bridge.loadMap(data._id, data.name || "Map", data.json);
      })
      .catch((err) => console.warn("[player-map] fetch failed:", err));
  }, [session?.currentMapId, bridge.isReady, bridge, sessionId, token]);

  // ─── Live map state via WebSocket (incoming + outgoing in one connection) ──
  // - Incoming: listens for mapState events from server (DM or other players)
  //   and applies via bridge.loadMap.
  // - Outgoing: listens on the local BroadcastChannel for the player's own
  //   Godot iframe state changes (token drags) and forwards over the socket
  //   so the DM and other players see the move.
  // - On (re)connect, fetches the latest persisted snapshot once.
  useEffect(() => {
    if (!sessionId || !token || !bridge?.isReady) return;
    let cancelled = false;
    let socket = null;
    const channel = new BroadcastChannel("maps_unbound");

    const applyState = (state) => {
      if (cancelled || !state) return;
      bridge.loadMap(
        bridge.currentMapId || "",
        bridge.currentMapName || "",
        state
      );
    };

    const fetchLatestSnapshot = async () => {
      try {
        const res = await fetch(
          `${apiServer}/api/sessions/${sessionId}/live-map-state`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data?.state) applyState(data.state);
      } catch (err) {
        console.warn("[live-map-state] fetch failed:", err.message);
      }
    };

    import("socket.io-client").then(({ io }) => {
      if (cancelled) return;
      socket = io(apiServer, { auth: { token } });

      socket.on("connect", () => {
        socket.emit("joinSession", { sessionId }, (resp) => {
          if (!resp?.ok) {
            console.warn("[socket player] joinSession failed:", resp?.error);
            return;
          }
          // On every (re)connect, grab the latest persisted snapshot.
          fetchLatestSnapshot();
        });
      });

      // Incoming state from DM / other players.
      socket.on("mapState", ({ state }) => applyState(state));

      socket.on("disconnect", () => {
        // socket.io will auto-reconnect; we'll re-snapshot on reconnect above.
      });
    }).catch((err) => {
      console.warn("[socket player] socket.io-client load failed:", err.message);
    });

    // Outgoing — the player's own Godot iframe just edited something
    // (most commonly: dragged a token). Forward over the socket.
    channel.onmessage = (event) => {
      const msg = event.data;
      if (!msg || msg.kind !== "state" || !msg.payload) return;
      if (socket && socket.connected) {
        socket.emit("mapState", { state: msg.payload });
      }
    };

    return () => {
      cancelled = true;
      channel.close();
      if (socket) socket.disconnect();
    };
  }, [sessionId, token, bridge?.isReady, bridge?.loadMap, bridge?.currentMapId, bridge?.currentMapName]);

  const handleLeave = async () => {
    if (leaving) return;
    if (!window.confirm("Leave this session?")) return;
    setLeaving(true);
    try {
      await fetch(`${apiServer}/api/parties/leave`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: user.username }),
      });
      navigate("/party-finder");
    } catch {
      setLeaving(false);
    }
  };

  if (loading) {
    return <LoadingPage>Joining the table...</LoadingPage>;
  }

  if (error) {
    return (
      <div style={pageStyle}>
        <h2 style={{ color: "#ff6b6b" }}>Couldn't open this session</h2>
        <p>{error}</p>
        <button style={buttonStyle} onClick={() => navigate("/party-finder")}>
          Back to Party Finder
        </button>
      </div>
    );
  }

  if (!party) {
    return (
      <div style={pageStyle}>
        <h2>This session has ended</h2>
        <p>The DM has closed the lobby.</p>
        <button style={buttonStyle} onClick={() => navigate("/party-finder")}>
          Back to Party Finder
        </button>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <h1 style={titleStyle}>{session?.title || party.partyName}</h1>
        <p style={subtitleStyle}>Status: {session?.status || "In Progress"}</p>
      </header>

      <section style={panelStyle}>
        <h2 style={sectionHeading}>Lobby</h2>
        <p>
          Code: <strong style={{ letterSpacing: "0.2em" }}>{party.lobbyCode}</strong>
        </p>
        <p>
          Players ({party.players?.length || 0} / {party.maxPlayers}):
        </p>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {(party.players || []).map((p) => (
            <li key={p} style={{ padding: "0.25rem 0" }}>
              {p === party.owner ? "👑 " : "• "}
              {p}
              {p === user.username ? " (you)" : ""}
            </li>
          ))}
        </ul>
      </section>

      {character ? (
        <section style={panelStyle}>
          <h2 style={sectionHeading}>Your Character</h2>
          <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
            {character.portrait?.url && (
              <img
                src={character.portrait.url}
                alt={character.name}
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "2px solid rgba(217, 166, 55, 0.5)",
                }}
              />
            )}
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, color: "var(--gold-light, #d9a637)" }}>
                {character.name}
              </h3>
              <p style={{ margin: "0.25rem 0", color: "#aaa" }}>
                Level {character.level || 1} {labelOf(character.race)}{" "}
                {labelOf(character.class)}
              </p>
              <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.5rem" }}>
                <span>
                  <strong>HP:</strong>{" "}
                  {character.hp?.current ?? character.hp ?? "?"} /{" "}
                  {character.hp?.max ?? "?"}
                </span>
                <span>
                  <strong>AC:</strong> {character.armorClass ?? character.ac ?? "?"}
                </span>
              </div>
            </div>
          </div>
        </section>
      ) : viewer?.isMember ? (
        <section style={panelStyle}>
          <h2 style={sectionHeading}>Your Character</h2>
          <p style={{ color: "#aaa" }}>
            No active character selected for this campaign yet.
          </p>
          <button
            type="button"
            onClick={() => navigate(`/campaigns/${session?.campaignId || ""}`)}
            style={{
              marginTop: "0.5rem",
              padding: "0.5rem 1rem",
              background: "transparent",
              border: "1px solid rgba(217, 166, 55, 0.5)",
              color: "var(--gold-light, #d9a637)",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Pick a Character →
          </button>
        </section>
      ) : (
        <section style={panelStyle}>
          <h2 style={sectionHeading}>Guest Player</h2>
          <p style={{ color: "#aaa" }}>
            You joined via lobby code. The DM can invite you to the campaign to
            assign a character.
          </p>
        </section>
      )}

      <section style={panelStyle}>
        <h2 style={sectionHeading}>Map</h2>
        <div style={mapFrameWrapStyle}>
          <iframe
            ref={iframeRef}
            src="/maps-unbound-godot.html?mode=projector"
            title="Session Map"
            style={mapFrameStyle}
            allow="fullscreen"
          />
        </div>
        <p style={{ color: "#888", fontSize: "0.85rem", marginTop: "0.5rem" }}>
          {session?.currentMapId
            ? "Mirroring the DM's map. Drag your tokens to move them."
            : "Waiting for the DM to load a map."}
        </p>
      </section>

      <button
        type="button"
        onClick={handleLeave}
        disabled={leaving}
        style={{ ...buttonStyle, background: "rgba(180, 60, 60, 0.85)" }}
      >
        {leaving ? "Leaving..." : "Leave Session"}
      </button>
    </div>
  );
}

const pageStyle = {
  maxWidth: "1200px",
  margin: "3rem auto",
  padding: "2rem",
  textAlign: "center",
};
const headerStyle = { marginBottom: "2rem" };
const titleStyle = {
  fontSize: "2rem",
  color: "var(--gold-light, #d9a637)",
  letterSpacing: "0.04em",
};
const subtitleStyle = { color: "#888", marginTop: "0.5rem" };
const panelStyle = {
  border: "1px solid rgba(217, 166, 55, 0.3)",
  borderRadius: "8px",
  padding: "1.5rem",
  background: "rgba(0, 0, 0, 0.4)",
  marginBottom: "1.5rem",
  textAlign: "left",
};
const sectionHeading = { color: "var(--gold-light, #d9a637)", marginTop: 0 };
const mapFrameWrapStyle = {
  width: "100%",
  height: 480,
  background: "#000",
  borderRadius: "6px",
  overflow: "hidden",
  border: "1px solid rgba(217, 166, 55, 0.3)",
};
const mapFrameStyle = {
  width: "100%",
  height: "100%",
  border: "none",
  display: "block",
};
const buttonStyle = {
  padding: "0.85rem 1.5rem",
  fontSize: "1rem",
  background: "rgba(217, 166, 55, 0.85)",
  color: "#0a0703",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

export default PlayerDashboard;