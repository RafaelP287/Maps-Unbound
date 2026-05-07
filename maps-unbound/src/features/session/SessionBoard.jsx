import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { io } from "socket.io-client";
import { useAuth } from "../../context/AuthContext.jsx";

const fallbackEncounter = {
  grid: { cols: 6, rows: 4 },
  tokens: [
    {
      tokenId: "demo-player-1",
      name: "Demo Player",
      type: "Player",
      role: "Fighter",
      hp: 20,
      maxHp: 20,
      status: "Ready",
      position: { x: 2, y: 3 },
      color: "#c9a84c",
      ownerUserId: null,
      initiative: 12,
    },
    {
      tokenId: "demo-enemy-1",
      name: "Demo Enemy",
      type: "Enemy",
      role: "Enemy",
      hp: 18,
      maxHp: 18,
      status: "Watching",
      position: { x: 5, y: 2 },
      color: "#b13d30",
      ownerUserId: null,
      initiative: 8,
    },
  ],
  initiativeOrder: ["demo-player-1", "demo-enemy-1"],
  activeTokenId: "demo-player-1",
  round: 1,
  log: ["Demo encounter loaded (no campaign connected)."],
};

function SessionBoard({ isDM = false, campaignIdOverride = "", embedded = false, hideEncounterChat = false }) {
  const { user } = useAuth();
  const location = useLocation();
  const socketRef = useRef(null);

  const campaignId = campaignIdOverride || location.state?.campaign?._id || new URLSearchParams(location.search).get("campaignId") || "";
  const userId = user?._id || user?.id || "";
  const canUseLive = Boolean(campaignId && userId);

  const [connected, setConnected] = useState(false);
  const [socketError, setSocketError] = useState("");
  const [encounter, setEncounter] = useState(fallbackEncounter);
  const [selectedTokenId, setSelectedTokenId] = useState(fallbackEncounter.activeTokenId);
  const [tokenDraft, setTokenDraft] = useState({ hp: 0, maxHp: 0, status: "", initiative: 0 });
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [newToken, setNewToken] = useState({
    name: "",
    type: "Token",
    role: "Unit",
    hp: 10,
    maxHp: 10,
    status: "Ready",
    color: "#c9a84c",
    x: 1,
    y: 1,
  });
  const chatEndRef = useRef(null);

  const selectedToken = useMemo(
    () => encounter.tokens.find((token) => token.tokenId === selectedTokenId) || encounter.tokens[0] || null,
    [encounter.tokens, selectedTokenId]
  );

  const playerControlledToken = useMemo(() => {
    if (!userId) return null;
    // IMPORTANT: in lobby embedded mode, quick controls target the user's owned token.
    return encounter.tokens.find((token) => {
      const ownerId = token.ownerUserId?.toString?.() || token.ownerUserId;
      return ownerId === userId;
    }) || null;
  }, [encounter.tokens, userId]);

  useEffect(() => {
    if (selectedToken) {
      setTokenDraft({
        hp: selectedToken.hp,
        maxHp: selectedToken.maxHp,
        status: selectedToken.status || "",
        initiative: selectedToken.initiative ?? 0,
      });
    }
  }, [selectedToken]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    if (!canUseLive) {
      setEncounter(fallbackEncounter);
      return;
    }

    const socket = io(import.meta.env.VITE_API_URL || "http://localhost:5001", {
      transports: ["websocket"],
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      setSocketError("");
      socket.emit("join-room", { campaignId, userId });
      socket.emit("encounter:load", { campaignId, userId });
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on("encounter:error", (payload) => {
      setSocketError(payload?.message || "Encounter sync error");
    });

    socket.on("encounter:state", (payload) => {
      if (!payload?.encounter) return;
      setEncounter(payload.encounter);
      if (payload.encounter.activeTokenId) {
        setSelectedTokenId(payload.encounter.activeTokenId);
      }
    });

    socket.on("chat-message", (payload) => {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random()}`,
          userId: payload.userId,
          username: payload.username,
          message: payload.message,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("encounter:error");
      socket.off("encounter:state");
      socket.off("chat-message");
      socket.disconnect();
    };
  }, [campaignId, userId, canUseLive]);

  const emitEncounterEvent = (eventName, payload = {}) => {
    if (!socketRef.current || !canUseLive) return;
    socketRef.current.emit(eventName, {
      campaignId,
      userId,
      ...payload,
    });
  };

  const encounterCells = useMemo(() => {
    const cols = encounter.grid?.cols || 6;
    const rows = encounter.grid?.rows || 4;
    return Array.from({ length: cols * rows }, (_, index) => {
      const x = (index % cols) + 1;
      const y = Math.floor(index / cols) + 1;
      const token = encounter.tokens.find((participant) => participant.position.x === x && participant.position.y === y);
      return { id: `${x}-${y}`, x, y, token };
    });
  }, [encounter]);

  const moveTokenBy = (token, deltaX, deltaY) => {
    if (!token) return;
    emitEncounterEvent("encounter:move-token", {
      tokenId: token.tokenId,
      position: {
        x: token.position.x + deltaX,
        y: token.position.y + deltaY,
      },
    });
  };

  const moveSelectedToken = (deltaX, deltaY) => moveTokenBy(selectedToken, deltaX, deltaY);

  const saveSelectedToken = () => {
    if (!selectedToken) return;
    emitEncounterEvent("encounter:update-token", {
      tokenId: selectedToken.tokenId,
      updates: {
        hp: Number(tokenDraft.hp),
        maxHp: Number(tokenDraft.maxHp),
        status: tokenDraft.status,
      },
    });

    if (isDM) {
      emitEncounterEvent("encounter:update-initiative", {
        tokenId: selectedToken.tokenId,
        initiative: Number(tokenDraft.initiative),
      });
    }
  };

  const placeNewToken = () => {
    if (!newToken.name.trim()) return;
    emitEncounterEvent("encounter:place-token", {
      token: {
        name: newToken.name,
        type: newToken.type,
        role: newToken.role,
        hp: Number(newToken.hp),
        maxHp: Number(newToken.maxHp),
        status: newToken.status,
        color: newToken.color,
        position: { x: Number(newToken.x), y: Number(newToken.y) },
      },
    });

    setNewToken((prev) => ({ ...prev, name: "" }));
  };

  const removeSelectedToken = () => {
    if (!selectedToken) return;
    emitEncounterEvent("encounter:remove-token", { tokenId: selectedToken.tokenId });
  };

  const spendActionFor = (token = selectedToken) => {
    if (!token) return;
    emitEncounterEvent("encounter:update-token", {
      tokenId: token.tokenId,
      updates: { actionAvailable: false },
    });
  };

  const spendBonusActionFor = (token = selectedToken) => {
    if (!token) return;
    emitEncounterEvent("encounter:update-token", {
      tokenId: token.tokenId,
      updates: { bonusActionAvailable: false },
    });
  };

  const sendEncounterChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socketRef.current || !canUseLive) return;

    socketRef.current.emit("send-message", {
      campaignId,
      userId,
      username: user?.username || "Player",
      message: chatInput,
    });

    setChatInput("");
  };

  const activeTurn = encounter.tokens.find((token) => token.tokenId === encounter.activeTokenId);

  return (
    <div style={{ ...styles.pageShell, ...(embedded ? styles.pageShellEmbedded : null) }}>
      {!embedded && (
      <header style={styles.heroCard}>
        <div>
          <p style={styles.kicker}>{isDM ? "DM Session Control" : "Player Session"}</p>
          <h1 style={styles.title}>Encounter Room</h1>
          <p style={styles.subtitle}>Grid combat with live token sync, initiative, and participant controls.</p>
          {!canUseLive && <p style={styles.warning}>No campaign context detected. Showing local demo state.</p>}
          {socketError && <p style={styles.warning}>{socketError}</p>}
        </div>

        <div style={styles.statusPanel}>
          <span style={styles.statusLabel}>Connection</span>
          <strong style={styles.statusValue}>{connected ? "Live" : "Offline"}</strong>
          <span style={styles.statusMeta}>Round {encounter.round || 1}</span>
          <span style={styles.statusMeta}>Active: {activeTurn?.name || "None"}</span>
        </div>
      </header>
      )}

      <section style={{ ...styles.encounterLayout, ...(embedded ? styles.encounterLayoutEmbedded : null) }}>
          <div style={styles.boardCard}>
            <div style={styles.boardHeader}>
              <div>
                <h2 style={styles.sectionTitle}>Battle Grid</h2>
                <p style={styles.sectionText}>Map is always live. Each square is 5 ft. Standard turn defaults: 30 ft movement, 1 action, 1 bonus action.</p>
              </div>
              <div style={styles.boardLegend}>
                <span style={styles.legendItem}><span style={{ ...styles.legendDot, background: "#c9a84c" }} />Player</span>
                {/* IMPORTANT: NPC removed from legend per latest UX request. */}
                <span style={styles.legendItem}><span style={{ ...styles.legendDot, background: "#b13d30" }} />Enemy</span>
              </div>
            </div>

            <div style={{ ...styles.gridBoard, gridTemplateColumns: `repeat(${encounter.grid?.cols || 6}, minmax(0, 1fr))` }}>
              {encounterCells.map((cell) => {
                const isOccupied = Boolean(cell.token);
                const isSelected = cell.token?.tokenId === selectedToken?.tokenId;

                return (
                  <button
                    key={cell.id}
                    type="button"
                    onClick={() => cell.token && setSelectedTokenId(cell.token.tokenId)}
                    style={{
                      ...styles.gridCell,
                      ...(isOccupied ? styles.gridCellOccupied : null),
                      ...(isSelected ? styles.gridCellSelected : null),
                    }}
                  >
                    <span style={styles.gridCellLabel}>{cell.x},{cell.y}</span>
                    {cell.token ? (
                      <div style={{ ...styles.tokenBadge, background: cell.token.color || "#c9a84c" }}>
                        <strong>{cell.token.name}</strong>
                        <span>{cell.token.role}</span>
                      </div>
                    ) : (
                      <span style={styles.emptyCell}>Open</span>
                    )}
                  </button>
                );
              })}
            </div>

            {!isDM && embedded && (
              // IMPORTANT: player controls moved directly under the grid for lobby flow.
              <div style={styles.playerControlsUnderGrid}>
                <h3 style={styles.panelTitle}>Your Character Controls</h3>
                {playerControlledToken ? (
                  <>
                    <p style={styles.panelBody}>{playerControlledToken.name} — {playerControlledToken.role}</p>
                    <div style={styles.turnEconomyRow}>
                      <span>Move: {playerControlledToken.movementRemaining ?? 30}/{playerControlledToken.movementSpeed ?? 30} ft</span>
                      <span>Action: {playerControlledToken.actionAvailable ? "Ready" : "Used"}</span>
                      <span>Bonus: {playerControlledToken.bonusActionAvailable ? "Ready" : "Used"}</span>
                    </div>
                    <div style={styles.compassWrap}>
                      <button type="button" style={styles.actionButton} onClick={() => moveTokenBy(playerControlledToken, 0, -1)}>N</button>
                      <div style={styles.compassMiddle}>
                        <button type="button" style={styles.actionButton} onClick={() => moveTokenBy(playerControlledToken, -1, 0)}>W</button>
                        <span style={styles.compassCenter}>5 ft</span>
                        <button type="button" style={styles.actionButton} onClick={() => moveTokenBy(playerControlledToken, 1, 0)}>E</button>
                      </div>
                      <button type="button" style={styles.actionButton} onClick={() => moveTokenBy(playerControlledToken, 0, 1)}>S</button>
                    </div>
                    <div style={styles.controlRow}>
                      <button
                        type="button"
                        style={styles.secondaryButton}
                        disabled={!playerControlledToken.actionAvailable}
                        onClick={() => spendActionFor(playerControlledToken)}
                      >
                        Use Action
                      </button>
                      <button
                        type="button"
                        style={styles.secondaryButton}
                        disabled={!playerControlledToken.bonusActionAvailable}
                        onClick={() => spendBonusActionFor(playerControlledToken)}
                      >
                        Use Bonus
                      </button>
                    </div>
                  </>
                ) : (
                  <p style={styles.panelMeta}>No character token is assigned to your user yet.</p>
                )}
              </div>
            )}
          </div>

          {(!embedded || isDM) && (
          <aside style={styles.sideColumn}>
            <div style={styles.panelCard}>
              <h3 style={styles.panelTitle}>Selected Token</h3>
              {selectedToken ? (
                <>
                  <p style={styles.panelBody}>{selectedToken.name} — {selectedToken.role}</p>
                  <div style={styles.turnEconomyRow}>
                    <span>Move: {selectedToken.movementRemaining ?? 30}/{selectedToken.movementSpeed ?? 30} ft</span>
                    <span>Action: {selectedToken.actionAvailable ? "Ready" : "Used"}</span>
                    <span>Bonus: {selectedToken.bonusActionAvailable ? "Ready" : "Used"}</span>
                  </div>
                  <div style={styles.compassWrap}>
                    <button type="button" style={styles.actionButton} onClick={() => moveSelectedToken(0, -1)}>N</button>
                    <div style={styles.compassMiddle}>
                      <button type="button" style={styles.actionButton} onClick={() => moveSelectedToken(-1, 0)}>W</button>
                      <span style={styles.compassCenter}>5 ft</span>
                      <button type="button" style={styles.actionButton} onClick={() => moveSelectedToken(1, 0)}>E</button>
                    </div>
                    <button type="button" style={styles.actionButton} onClick={() => moveSelectedToken(0, 1)}>S</button>
                  </div>

                  <div style={styles.fieldGrid}>
                    <label style={styles.fieldLabel}>HP
                      <input style={styles.fieldInput} type="number" value={tokenDraft.hp} onChange={(e) => setTokenDraft((prev) => ({ ...prev, hp: e.target.value }))} />
                    </label>
                    <label style={styles.fieldLabel}>Max HP
                      <input style={styles.fieldInput} type="number" value={tokenDraft.maxHp} onChange={(e) => setTokenDraft((prev) => ({ ...prev, maxHp: e.target.value }))} />
                    </label>
                    <label style={styles.fieldLabel}>Status
                      <input style={styles.fieldInput} value={tokenDraft.status} onChange={(e) => setTokenDraft((prev) => ({ ...prev, status: e.target.value }))} />
                    </label>
                    {isDM && (
                      <label style={styles.fieldLabel}>Initiative
                        <input style={styles.fieldInput} type="number" value={tokenDraft.initiative} onChange={(e) => setTokenDraft((prev) => ({ ...prev, initiative: e.target.value }))} />
                      </label>
                    )}
                  </div>

                  <div style={styles.controlRow}>
                    <button type="button" style={styles.secondaryButton} onClick={saveSelectedToken}>Save</button>
                    <button type="button" style={styles.secondaryButton} disabled={!selectedToken.actionAvailable} onClick={() => spendActionFor(selectedToken)}>Use Action</button>
                    <button type="button" style={styles.secondaryButton} disabled={!selectedToken.bonusActionAvailable} onClick={() => spendBonusActionFor(selectedToken)}>Use Bonus</button>
                    {isDM && <button type="button" style={styles.secondaryButton} onClick={removeSelectedToken}>Remove Token</button>}
                  </div>
                </>
              ) : (
                <p style={styles.panelMeta}>Select a token on the grid.</p>
              )}
            </div>

            <div style={styles.panelCard}>
              <h3 style={styles.panelTitle}>Initiative</h3>
              <ul style={styles.logList}>
                {(encounter.initiativeOrder || []).map((tokenId) => {
                  const token = encounter.tokens.find((t) => t.tokenId === tokenId);
                  if (!token) return null;
                  return (
                    <li key={tokenId} style={styles.logItem}>
                      {encounter.activeTokenId === tokenId ? "▶ " : ""}
                      {token.name} ({token.initiative ?? 0})
                    </li>
                  );
                })}
              </ul>
              {isDM && <button type="button" style={styles.secondaryButton} onClick={() => emitEncounterEvent("encounter:next-turn")}>Next Turn</button>}
            </div>

            <div style={styles.panelCard}>
              <h3 style={styles.panelTitle}>Participants</h3>
              <div style={styles.participantGrid}>
                {encounter.tokens.map((participant) => (
                  <button
                    key={participant.tokenId}
                    type="button"
                    onClick={() => setSelectedTokenId(participant.tokenId)}
                    style={{
                      ...styles.participantCard,
                      ...(participant.tokenId === selectedToken?.tokenId ? styles.participantCardSelected : null),
                    }}
                  >
                    <div style={styles.participantTopRow}>
                      <span style={{ ...styles.participantDot, background: participant.color || "#c9a84c" }} />
                      <div>
                        <strong style={styles.participantName}>{participant.name}</strong>
                        <p style={styles.participantRole}>{participant.type} · {participant.role}</p>
                      </div>
                    </div>
                    <div style={styles.participantMetaRow}>
                      <span>{participant.hp}/{participant.maxHp} HP</span>
                      <span>{participant.movementRemaining ?? 30}/{participant.movementSpeed ?? 30} ft</span>
                    </div>
                    <p style={styles.participantStatus}>{participant.status}</p>
                  </button>
                ))}
              </div>
            </div>

            {isDM && (
              <div style={styles.panelCard}>
                <h3 style={styles.panelTitle}>Place Token</h3>
                <div style={styles.fieldGrid}>
                  <label style={styles.fieldLabel}>Name<input style={styles.fieldInput} value={newToken.name} onChange={(e) => setNewToken((prev) => ({ ...prev, name: e.target.value }))} /></label>
                  <label style={styles.fieldLabel}>Type
                    <select style={styles.fieldInput} value={newToken.type} onChange={(e) => setNewToken((prev) => ({ ...prev, type: e.target.value }))}>
                      <option value="Token">Token</option>
                      <option value="NPC">NPC</option>
                      <option value="Enemy">Enemy</option>
                      <option value="Player">Player</option>
                    </select>
                  </label>
                  <label style={styles.fieldLabel}>Role<input style={styles.fieldInput} value={newToken.role} onChange={(e) => setNewToken((prev) => ({ ...prev, role: e.target.value }))} /></label>
                  <label style={styles.fieldLabel}>HP<input style={styles.fieldInput} type="number" value={newToken.hp} onChange={(e) => setNewToken((prev) => ({ ...prev, hp: e.target.value }))} /></label>
                  <label style={styles.fieldLabel}>Max HP<input style={styles.fieldInput} type="number" value={newToken.maxHp} onChange={(e) => setNewToken((prev) => ({ ...prev, maxHp: e.target.value }))} /></label>
                  <label style={styles.fieldLabel}>Color<input style={styles.fieldInput} type="color" value={newToken.color} onChange={(e) => setNewToken((prev) => ({ ...prev, color: e.target.value }))} /></label>
                  <label style={styles.fieldLabel}>X<input style={styles.fieldInput} type="number" value={newToken.x} onChange={(e) => setNewToken((prev) => ({ ...prev, x: e.target.value }))} /></label>
                  <label style={styles.fieldLabel}>Y<input style={styles.fieldInput} type="number" value={newToken.y} onChange={(e) => setNewToken((prev) => ({ ...prev, y: e.target.value }))} /></label>
                </div>
                <button type="button" style={styles.secondaryButton} onClick={placeNewToken}>Place Token</button>
              </div>
            )}

            <div style={styles.panelCard}>
              <h3 style={styles.panelTitle}>Encounter Log</h3>
              <ul style={styles.logList}>
                {(encounter.log || []).map((entry, index) => (
                  <li key={`${index}-${entry}`} style={styles.logItem}>{entry}</li>
                ))}
              </ul>
            </div>

            {!hideEncounterChat && (
            <div style={styles.panelCard}>
              <h3 style={styles.panelTitle}>Encounter Chat</h3>
              <div style={styles.chatList}>
                {chatMessages.length === 0 ? (
                  <p style={styles.panelMeta}>No chat yet.</p>
                ) : (
                  chatMessages.map((chat) => (
                    <div key={chat.id} style={{ ...styles.chatItem, ...(chat.userId === userId ? styles.chatItemSelf : null) }}>
                      <strong style={styles.chatAuthor}>{chat.username}</strong>
                      <p style={styles.chatText}>{chat.message}</p>
                      <small style={styles.chatTime}>{chat.timestamp}</small>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={sendEncounterChat} style={styles.chatForm}>
                <input
                  style={styles.fieldInput}
                  placeholder={canUseLive ? "Message the table..." : "Chat unavailable in demo mode"}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={!canUseLive}
                />
                <button type="submit" style={styles.secondaryButton} disabled={!canUseLive}>Send</button>
              </form>
            </div>
            )}
          </aside>
          )}
        </section>
    </div>
  );
}

const styles = {
  pageShell: {
    minHeight: "100vh",
    padding: "32px",
    background: "radial-gradient(ellipse at 20% 0%, var(--bg-warm) 0%, var(--bg-deep) 62%)",
    color: "var(--text-base)",
  },
  pageShellEmbedded: {
    minHeight: "auto",
    padding: 0,
    background: "transparent",
  },
  heroCard: {
    display: "flex",
    justifyContent: "space-between",
    gap: "24px",
    alignItems: "stretch",
    padding: "24px",
    borderRadius: "20px",
    background: "var(--panel-bg)",
    border: "1px solid var(--border)",
    boxShadow: "0 24px 60px rgba(8, 6, 3, 0.35)",
    marginBottom: "20px",
  },
  kicker: {
    margin: 0,
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color: "var(--gold)",
    fontSize: "0.75rem",
    fontWeight: 700,
  },
  title: {
    margin: "6px 0 8px",
    fontSize: "2rem",
  },
  subtitle: {
    margin: 0,
    maxWidth: "700px",
    color: "var(--text-muted)",
    lineHeight: 1.6,
  },
  warning: {
    marginTop: "10px",
    color: "#f1c0b8",
  },
  statusPanel: {
    minWidth: "220px",
    padding: "18px",
    borderRadius: "16px",
    background: "rgba(0, 0, 0, 0.35)",
    border: "1px solid rgba(201, 168, 76, 0.25)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: "4px",
  },
  statusLabel: { fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" },
  statusValue: { fontSize: "1.15rem", color: "var(--gold-light)" },
  statusMeta: { color: "var(--text-base)" },
  encounterLayout: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 2fr) minmax(330px, 1fr)",
    gap: "20px",
    alignItems: "start",
  },
  encounterLayoutEmbedded: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    gap: "12px",
    alignItems: "start",
  },
  boardCard: {
    padding: "20px",
    borderRadius: "20px",
    background: "rgba(13, 10, 6, 0.88)",
    border: "1px solid rgba(201, 168, 76, 0.24)",
  },
  playerControlsUnderGrid: {
    marginTop: "14px",
    padding: "14px",
    borderRadius: "14px",
    border: "1px solid rgba(201, 168, 76, 0.25)",
    background: "rgba(0, 0, 0, 0.28)",
  },
  boardHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    marginBottom: "16px",
  },
  boardLegend: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  legendItem: { display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--text-base)", fontSize: "0.9rem" },
  legendDot: { width: "10px", height: "10px", borderRadius: "999px", display: "inline-block" },
  sectionTitle: { margin: 0, fontSize: "1.35rem" },
  sectionText: { margin: "6px 0 0", color: "var(--text-muted)", lineHeight: 1.5 },
  gridBoard: {
    display: "grid",
    gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
    gap: "10px",
  },
  gridCell: {
    minHeight: "130px",
    borderRadius: "16px",
    border: "1px solid rgba(201, 168, 76, 0.24)",
    background:
      "repeating-linear-gradient(0deg, rgba(201,168,76,0.06) 0 1px, rgba(20,15,8,0.78) 1px 24px), repeating-linear-gradient(90deg, rgba(201,168,76,0.06) 0 1px, rgba(20,15,8,0.78) 1px 24px)",
    color: "inherit",
    padding: "12px",
    textAlign: "left",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: "10px",
  },
  gridCellOccupied: { background: "rgba(201, 168, 76, 0.14)" },
  gridCellSelected: { outline: "2px solid var(--gold-light)", boxShadow: "0 0 0 4px rgba(201, 168, 76, 0.15)" },
  gridCellLabel: { fontSize: "0.75rem", color: "var(--text-muted)" },
  emptyCell: { color: "var(--text-faint)", fontSize: "0.9rem" },
  tokenBadge: {
    borderRadius: "14px",
    padding: "10px",
    color: "#140f08",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    minHeight: "76px",
    boxShadow: "0 12px 24px rgba(15, 23, 42, 0.15)",
  },
  sideColumn: { display: "grid", gap: "20px" },
  panelCard: {
    padding: "18px",
    borderRadius: "18px",
    background: "rgba(17, 12, 7, 0.88)",
    border: "1px solid rgba(201, 168, 76, 0.22)",
  },
  panelTitle: { margin: 0, fontSize: "1.1rem" },
  panelBody: { margin: "10px 0", color: "var(--text-base)", lineHeight: 1.55 },
  healthBarOuter: {
    width: "100%",
    height: "10px",
    borderRadius: "999px",
    background: "rgba(51, 65, 85, 0.9)",
    overflow: "hidden",
  },
  healthBarInner: {
    height: "100%",
    borderRadius: "999px",
    background: "linear-gradient(90deg, #34d399, #22c55e)",
  },
  panelMeta: { margin: "10px 0 0", color: "#94a3b8" },
  turnEconomyRow: {
    display: "grid",
    gap: "4px",
    color: "#cbd5e1",
    fontSize: "0.85rem",
  },
  compassWrap: {
    marginTop: "12px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
  },
  compassMiddle: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  compassCenter: {
    minWidth: "48px",
    textAlign: "center",
    color: "#94a3b8",
    fontSize: "0.8rem",
  },
  fieldGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "8px",
    marginTop: "12px",
    marginBottom: "10px",
  },
  fieldLabel: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    color: "#cbd5e1",
    fontSize: "0.85rem",
  },
  fieldInput: {
    width: "100%",
    borderRadius: "8px",
    border: "1px solid rgba(148, 163, 184, 0.3)",
    background: "rgba(30, 41, 59, 0.9)",
    color: "#e2e8f0",
    padding: "8px",
  },
  controlRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "14px",
  },
  actionButton: {
    border: "none",
    borderRadius: "12px",
    padding: "10px 14px",
    cursor: "pointer",
    background: "#2563eb",
    color: "white",
    fontWeight: 700,
  },
  secondaryButton: {
    border: "1px solid rgba(148, 163, 184, 0.24)",
    borderRadius: "12px",
    padding: "10px 14px",
    cursor: "pointer",
    background: "rgba(30, 41, 59, 0.9)",
    color: "#e2e8f0",
    fontWeight: 700,
  },
  logList: {
    margin: "12px 0 0",
    paddingLeft: "18px",
    display: "grid",
    gap: "10px",
    color: "#cbd5e1",
  },
  logItem: { lineHeight: 1.45 },
  chatList: {
    marginTop: "10px",
    maxHeight: "220px",
    overflowY: "auto",
    display: "grid",
    gap: "8px",
  },
  chatItem: {
    border: "1px solid rgba(148, 163, 184, 0.2)",
    borderRadius: "10px",
    padding: "8px",
    background: "rgba(30, 41, 59, 0.6)",
  },
  chatItemSelf: {
    background: "rgba(201, 168, 76, 0.2)",
  },
  chatAuthor: {
    fontSize: "0.82rem",
    color: "#f8fafc",
  },
  chatText: {
    margin: "4px 0",
    color: "#e2e8f0",
  },
  chatTime: {
    color: "#94a3b8",
    fontSize: "0.72rem",
  },
  chatForm: {
    marginTop: "10px",
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "8px",
  },
  participantGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "14px",
    marginTop: "16px",
  },
  participantCard: {
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: "18px",
    background: "rgba(30, 41, 59, 0.7)",
    color: "inherit",
    textAlign: "left",
    padding: "16px",
    cursor: "pointer",
  },
  participantCardSelected: {
    outline: "2px solid #38bdf8",
    boxShadow: "0 0 0 4px rgba(56, 189, 248, 0.12)",
  },
  participantTopRow: { display: "flex", alignItems: "flex-start", gap: "12px" },
  participantDot: { width: "14px", height: "14px", borderRadius: "999px", marginTop: "4px", flexShrink: 0 },
  participantName: { display: "block", marginBottom: "4px" },
  participantRole: { margin: 0, color: "var(--text-muted)" },
  participantMetaRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    marginTop: "14px",
    color: "#cbd5e1",
    fontSize: "0.95rem",
  },
  participantStatus: { margin: "10px 0 0", color: "var(--text-muted)", lineHeight: 1.45 },
};

export default SessionBoard;