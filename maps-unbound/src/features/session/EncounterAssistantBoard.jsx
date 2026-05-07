import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { io } from "socket.io-client";
import { useAuth } from "../../context/AuthContext.jsx";

const fallbackEncounter = {
  tokens: [],
  initiativeOrder: [],
  activeTokenId: "",
  round: 1,
  log: ["Demo encounter loaded (no campaign connected)."],
};

const defaultDraft = {
  hp: 0,
  maxHp: 0,
  status: "",
  movementSpeed: 30,
  movementRemaining: 30,
  distanceFeet: 0,
  initiative: 0,
  initiativeBonus: 0,
};

const defaultNewToken = {
  name: "",
  type: "Token",
  role: "Unit",
  hp: 10,
  maxHp: 10,
  status: "Ready",
  color: "#c9a84c",
  movementSpeed: 30,
  initiativeBonus: 0,
};

const parseDiceExpression = (expression, d20Mode = "normal") => {
  const match = expression.trim().match(/^(\d{1,2})d(\d{1,3})(?:\s*([+-])\s*(\d{1,3}))?$/i);
  if (!match) {
    return { ok: false, error: "Use format like 1d20, 2d6+3, 4d8-1" };
  }

  const count = Number(match[1]);
  const sides = Number(match[2]);
  const sign = match[3] || "+";
  const modifierValue = Number(match[4] || 0);
  const modifier = sign === "-" ? -modifierValue : modifierValue;

  if (count < 1 || count > 20 || sides < 2 || sides > 1000) {
    return { ok: false, error: "Dice out of range (max 20 dice, max d1000)." };
  }

  if (count === 1 && sides === 20 && d20Mode !== "normal") {
    const rollA = Math.floor(Math.random() * 20) + 1;
    const rollB = Math.floor(Math.random() * 20) + 1;
    const chosen = d20Mode === "advantage" ? Math.max(rollA, rollB) : Math.min(rollA, rollB);
    const total = chosen + modifier;
    return {
      ok: true,
      total,
      rolls: [rollA, rollB],
      mode: d20Mode,
      breakdown: `${d20Mode === "advantage" ? "adv" : "dis"} ${rollA}/${rollB} -> ${chosen}${modifier ? ` ${modifier > 0 ? "+" : "-"} ${Math.abs(modifier)}` : ""}`,
    };
  }

  const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
  const base = rolls.reduce((sum, value) => sum + value, 0);
  const total = base + modifier;
  return {
    ok: true,
    total,
    rolls,
    mode: "normal",
    breakdown: `${rolls.join(" + ")}${modifier ? ` ${modifier > 0 ? "+" : "-"} ${Math.abs(modifier)}` : ""}`,
  };
};

function EncounterAssistantBoard({ isDM = false, campaignIdOverride = "", embedded = false, hideEncounterChat = false }) {
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
  const [tokenDraft, setTokenDraft] = useState(defaultDraft);
  const [newToken, setNewToken] = useState(defaultNewToken);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [diceExpression, setDiceExpression] = useState("1d20");
  const [diceLabel, setDiceLabel] = useState("Check");
  const [d20Mode, setD20Mode] = useState("normal");
  const [diceResults, setDiceResults] = useState([]);
  const [rollingError, setRollingError] = useState("");
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [levelUpData, setLevelUpData] = useState(null);
  const [playerActionSection, setPlayerActionSection] = useState("action");
  const chatEndRef = useRef(null);

  const isDevBuild = Boolean(import.meta.env.DEV);
  const effectiveIsDM = isDM;

  const selectedToken = useMemo(
    () => encounter.tokens.find((token) => token.tokenId === selectedTokenId) || encounter.tokens[0] || null,
    [encounter.tokens, selectedTokenId]
  );

  const playerControlledToken = useMemo(() => {
    if (!userId) return null;
    return encounter.tokens.find((token) => {
      const ownerId = token.ownerUserId?.toString?.() || token.ownerUserId;
      return ownerId === userId;
    }) || null;
  }, [encounter.tokens, userId]);

  const activeTurn = useMemo(
    () => encounter.tokens.find((token) => token.tokenId === encounter.activeTokenId) || null,
    [encounter.tokens, encounter.activeTokenId]
  );

  const activeTurnOwnerId = activeTurn?.ownerUserId?.toString?.() || activeTurn?.ownerUserId || "";

  useEffect(() => {
    if (selectedToken) {
      setTokenDraft({
        hp: selectedToken.hp,
        maxHp: selectedToken.maxHp,
        status: selectedToken.status || "",
        movementSpeed: selectedToken.movementSpeed ?? 30,
        movementRemaining: selectedToken.movementRemaining ?? selectedToken.movementSpeed ?? 30,
        distanceFeet: selectedToken.distanceFeet ?? 0,
        initiative: selectedToken.initiative ?? 0,
        initiativeBonus: selectedToken.initiativeBonus ?? 0,
      });
    }
  }, [selectedToken]);

  useEffect(() => {
    setPlayerActionSection("action");
  }, [playerControlledToken?.tokenId]);

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
        setSelectedTokenId((prev) => prev || payload.encounter.activeTokenId);
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

    socket.on("encounter:level-up-prompt", (payload) => {
      // Player receives level-up notification from DM
      console.log("Level-up prompt received:", payload);
      setLevelUpData(payload);
      setShowLevelUpModal(true);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("encounter:error");
      socket.off("encounter:state");
      socket.off("chat-message");
      socket.off("encounter:level-up-prompt");
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

  const saveSelectedToken = () => {
    if (!selectedToken) return;

    emitEncounterEvent("encounter:update-token", {
      tokenId: selectedToken.tokenId,
      updates: {
        hp: Number(tokenDraft.hp),
        maxHp: Number(tokenDraft.maxHp),
        status: tokenDraft.status,
        movementSpeed: Number(tokenDraft.movementSpeed),
        movementRemaining: Number(tokenDraft.movementRemaining),
        distanceFeet: Number(tokenDraft.distanceFeet ?? selectedToken.distanceFeet ?? 0),
        ...(effectiveIsDM ? { initiativeBonus: Number(tokenDraft.initiativeBonus) } : null),
      },
    });

    if (effectiveIsDM) {
      emitEncounterEvent("encounter:update-initiative", {
        tokenId: selectedToken.tokenId,
        initiative: Number(tokenDraft.initiative),
      });
    }
  };

  const setEconomyField = (token, field, value) => {
    if (!token) return;
    emitEncounterEvent("encounter:update-token", {
      tokenId: token.tokenId,
      updates: {
        [field]: value,
      },
    });
  };

  const getStrengthModifier = (token) => Math.floor(((Number(token?.characterStats?.abilityScores?.strength) || 10) - 10) / 2);

  const selectedTargetDistance = selectedToken && selectedToken.tokenId !== playerControlledToken?.tokenId
    ? (selectedToken.distanceFeet ?? 30)
    : null;

  const canUseUnarmedAttack = Boolean(
    playerControlledToken &&
    selectedToken &&
    selectedToken.tokenId !== playerControlledToken.tokenId &&
    (selectedTargetDistance ?? 9999) <= 5 &&
    playerControlledToken.actionAvailable
  );

  const canUseOpportunityAttack = Boolean(
    playerControlledToken &&
    selectedToken &&
    selectedToken.tokenId !== playerControlledToken.tokenId &&
    (selectedTargetDistance ?? 9999) <= 5 &&
    playerControlledToken.reactionAvailable
  );

  const canUseTurnActions = Boolean(
    activeTurn && (
      (!activeTurnOwnerId && effectiveIsDM) ||
      activeTurnOwnerId === userId
    )
  );

  const spendMovement = (feetSpent = 5) => {
    if (!canUseTurnActions || !playerControlledToken || !selectedToken || selectedToken.tokenId === playerControlledToken.tokenId) return;
    emitEncounterEvent("encounter:approach-target", {
      targetTokenId: selectedToken.tokenId,
      feet: feetSpent,
    });
  };

  const useAction = (actionType) => {
    if (!canUseTurnActions || !playerControlledToken) return;
    emitEncounterEvent("encounter:use-action", {
      actionType,
      targetTokenId: selectedToken?.tokenId,
    });
  };

  const useUnarmedAttack = (resourceType = "action") => {
    if (!canUseTurnActions || !playerControlledToken || !selectedToken || selectedToken.tokenId === playerControlledToken.tokenId) return;
    emitEncounterEvent("encounter:unarmed-attack", {
      targetTokenId: selectedToken.tokenId,
      resourceType,
    });
  };

  const removeSelectedToken = () => {
    if (!selectedToken) return;
    emitEncounterEvent("encounter:remove-token", { tokenId: selectedToken.tokenId });
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
        movementSpeed: Number(newToken.movementSpeed),
        initiativeBonus: Number(newToken.initiativeBonus),
      },
    });

    setNewToken((prev) => ({ ...prev, name: "" }));
  };

  const addDefaultEnemies = () => {
    emitEncounterEvent("encounter:add-default-enemies");
  };

  const endTurn = () => {
    if (!canControlTurn) return;
    emitEncounterEvent("encounter:end-turn");
  };

  const resetEncounter = () => {
    if (window.confirm("Reset encounter to beginning? (Round 1, new initiative)")) {
      emitEncounterEvent("encounter:reset");
    }
  };

  const levelUpAll = () => {
    if (window.confirm("Level up all players? This will increase everyone's level by 1.")) {
      emitEncounterEvent("encounter:level-up-all");
    }
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

  const rollDice = () => {
    const result = parseDiceExpression(diceExpression, d20Mode);
    if (!result.ok) {
      setRollingError(result.error);
      return;
    }

    setRollingError("");
    const row = {
      id: `${Date.now()}-${Math.random()}`,
      label: diceLabel.trim() || "Roll",
      expression: diceExpression.trim(),
      total: result.total,
      breakdown: result.breakdown,
      timestamp: new Date().toLocaleTimeString(),
    };

    setDiceResults((prev) => [row, ...prev].slice(0, 12));

    if (canUseLive) {
      emitEncounterEvent("encounter:log-roll", {
        label: row.label,
        expression: row.expression,
        total: row.total,
        breakdown: row.breakdown,
      });
    }
  };

  const canControlTurn = Boolean(activeTurn && (effectiveIsDM || activeTurnOwnerId === userId));

  return (
    <div style={{ ...styles.pageShell, ...(embedded ? styles.pageShellEmbedded : null) }}>
      {!embedded && (
        <header style={styles.heroCard}>
          <div>
            <p style={styles.kicker}>{effectiveIsDM ? "DM Session Control" : "Player Session"}</p>
            <h1 style={styles.title}>Encounter Assistant</h1>
            <p style={styles.subtitle}>Gridless combat helper for initiative, dice, and action economy at a physical table.</p>
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
        <div style={styles.mainColumn}>
          <div style={styles.panelCard}>
            <div style={styles.panelHeaderSplit}>
              <div>
                <h2 style={styles.sectionTitle}>Turn Tracker</h2>
                <p style={styles.sectionText}>Auto initiative ordering, quick end-turn flow, and distance-based engagement.</p>
              </div>
              <div style={styles.controlRow}>
                <button type="button" style={styles.secondaryButton} onClick={endTurn} disabled={!canControlTurn}>End Turn</button>
              </div>
            </div>

            <ul style={styles.initiativeList}>
              {(encounter.initiativeOrder || []).map((tokenId, index) => {
                const token = encounter.tokens.find((entry) => entry.tokenId === tokenId);
                if (!token) return null;
                const isActive = encounter.activeTokenId === tokenId;
                return (
                  <li key={tokenId} style={{ ...styles.initiativeItem, ...(isActive ? styles.initiativeItemActive : null) }}>
                    <button type="button" style={styles.initiativeSelectButton} onClick={() => setSelectedTokenId(tokenId)}>
                      <span style={styles.initiativeRank}>{index + 1}</span>
                      <span>
                        <strong>{token.name}</strong>
                        <span style={styles.initiativeMeta}> {token.initiative ?? 0} (d20 {token.lastInitiativeRoll ?? 0}{(token.initiativeBonus ?? 0) ? ` ${token.initiativeBonus > 0 ? "+" : "-"} ${Math.abs(token.initiativeBonus)}` : ""})</span>
                      </span>
                      {isActive && <span style={styles.activeTurnBadge}>Current Turn</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div style={styles.panelCard}>
            <h3 style={styles.panelTitle}>Participants</h3>
            <div style={styles.participantGrid}>
              {encounter.tokens.map((participant) => {
                const isSelected = participant.tokenId === selectedToken?.tokenId;
                const isActive = participant.tokenId === encounter.activeTokenId;
                return (
                  <button
                    key={participant.tokenId}
                    type="button"
                    onClick={() => setSelectedTokenId(participant.tokenId)}
                    style={{
                      ...styles.participantCard,
                      ...(isSelected ? styles.participantCardSelected : null),
                      ...(isActive ? styles.participantCardActive : null),
                    }}
                  >
                    {isActive && <span style={styles.participantActiveBadge}>Current Turn</span>}
                    <div style={styles.participantTopRow}>
                      <span style={{ ...styles.participantDot, background: participant.color || "#c9a84c" }} />
                      <div>
                        <strong style={styles.participantName}>{participant.name}</strong>
                        <p style={styles.participantRole}>{participant.type} · {participant.role}</p>
                      </div>
                    </div>
                    <div style={styles.participantMetaRow}>
                      <span>{participant.hp}/{participant.maxHp} HP</span>
                      <span>{participant.distanceFeet ?? 30} ft away</span>
                    </div>
                    <div style={styles.turnEconomyChips}>
                      <span style={{ ...styles.economyChip, ...(participant.actionAvailable ? styles.chipReady : styles.chipUsed) }}>Action</span>
                      <span style={{ ...styles.economyChip, ...(participant.bonusActionAvailable ? styles.chipReady : styles.chipUsed) }}>Bonus</span>
                      <span style={{ ...styles.economyChip, ...(participant.reactionAvailable ? styles.chipReady : styles.chipUsed) }}>Reaction</span>
                      <span style={{ ...styles.economyChip, ...(participant.objectInteractionAvailable ? styles.chipReady : styles.chipUsed) }}>Object</span>
                    </div>
                    <p style={styles.participantStatus}>{participant.status}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <aside style={styles.sideColumn}>
          {effectiveIsDM && (
            <div style={styles.panelCard}>
              <h3 style={styles.panelTitle}>Selected Participant</h3>
              {selectedToken ? (
                <>
                  <p style={styles.panelBody}>{selectedToken.name} — {selectedToken.role}</p>
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
                    <label style={styles.fieldLabel}>Move Speed
                      <input style={styles.fieldInput} type="number" value={tokenDraft.movementSpeed} onChange={(e) => setTokenDraft((prev) => ({ ...prev, movementSpeed: e.target.value }))} />
                    </label>
                    <label style={styles.fieldLabel}>Move Left
                      <input style={styles.fieldInput} type="number" value={tokenDraft.movementRemaining} onChange={(e) => setTokenDraft((prev) => ({ ...prev, movementRemaining: e.target.value }))} />
                    </label>
                    <label style={styles.fieldLabel}>Distance Ft
                      <input style={styles.fieldInput} type="number" value={tokenDraft.distanceFeet ?? selectedToken.distanceFeet ?? 0} onChange={(e) => setTokenDraft((prev) => ({ ...prev, distanceFeet: e.target.value }))} />
                    </label>
                    {effectiveIsDM && (
                      <label style={styles.fieldLabel}>Init Bonus
                        <input style={styles.fieldInput} type="number" value={tokenDraft.initiativeBonus} onChange={(e) => setTokenDraft((prev) => ({ ...prev, initiativeBonus: e.target.value }))} />
                      </label>
                    )}
                    {effectiveIsDM && (
                      <label style={styles.fieldLabel}>Init Score
                        <input style={styles.fieldInput} type="number" value={tokenDraft.initiative} onChange={(e) => setTokenDraft((prev) => ({ ...prev, initiative: e.target.value }))} />
                      </label>
                    )}
                  </div>

                  <div style={styles.controlRow}>
                    <button type="button" style={styles.secondaryButton} onClick={saveSelectedToken}>Save</button>
                    <button type="button" style={styles.secondaryButton} disabled={!selectedToken.actionAvailable} onClick={() => setEconomyField(selectedToken, "actionAvailable", false)}>Use Action</button>
                    <button type="button" style={styles.secondaryButton} disabled={!selectedToken.bonusActionAvailable} onClick={() => setEconomyField(selectedToken, "bonusActionAvailable", false)}>Use Bonus</button>
                    <button type="button" style={styles.secondaryButton} disabled={!selectedToken.reactionAvailable} onClick={() => setEconomyField(selectedToken, "reactionAvailable", false)}>Use Reaction</button>
                    <button type="button" style={styles.secondaryButton} disabled={!selectedToken.objectInteractionAvailable} onClick={() => setEconomyField(selectedToken, "objectInteractionAvailable", false)}>Use Object</button>
                    <button type="button" style={styles.secondaryButton} onClick={() => spendMovement(5)}>Approach 5 ft</button>
                    {effectiveIsDM && <button type="button" style={styles.secondaryButton} onClick={removeSelectedToken}>Remove</button>}
                  </div>
                </>
              ) : (
                <p style={styles.panelMeta}>Select a participant from the list.</p>
              )}
            </div>
          )}

          {!effectiveIsDM && embedded && playerControlledToken && (
            <>
              <div style={styles.panelCard}>
                <h3 style={styles.panelTitle}>Character</h3>
                <div style={styles.characterCardContent}>
                  <p style={styles.characterName}>{playerControlledToken.name}</p>
                  <p style={styles.characterRole}>{playerControlledToken.role}</p>
                  <div style={styles.hpBar}>
                    <div style={{...styles.hpBarFill, width: `${Math.max(0, Math.min(100, (playerControlledToken.hp / playerControlledToken.maxHp) * 100))}%`}}></div>
                  </div>
                  <p style={styles.hpText}>{playerControlledToken.hp} / {playerControlledToken.maxHp} HP</p>
                  {/* Ability Scores Grid */}
                  {playerControlledToken.characterStats?.abilityScores && (
                    <div style={styles.encounterAbilityGrid}>
                      {[
                        { name: 'STR', value: playerControlledToken.characterStats.abilityScores.strength },
                        { name: 'DEX', value: playerControlledToken.characterStats.abilityScores.dexterity },
                        { name: 'CON', value: playerControlledToken.characterStats.abilityScores.constitution },
                        { name: 'INT', value: playerControlledToken.characterStats.abilityScores.intelligence },
                        { name: 'WIS', value: playerControlledToken.characterStats.abilityScores.wisdom },
                        { name: 'CHA', value: playerControlledToken.characterStats.abilityScores.charisma },
                      ].map((ability) => (
                        <div key={ability.name} style={styles.encounterAbilityBox}>
                          <span style={styles.encounterAbilityLabel}>{ability.name}</span>
                          <span style={styles.encounterAbilityScore}>{ability.value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Inspiration Counter */}
                  {playerControlledToken.characterStats?.inspiration !== undefined && (
                    <div style={styles.inspirationDisplay}>
                      <span>Inspiration: <strong>{playerControlledToken.characterStats.inspiration}</strong></span>
                    </div>
                  )}
                </div>
              </div>

              <div style={styles.panelCard}>
              <h3 style={styles.panelTitle}>Your Turn Actions</h3>
              <p style={styles.panelBody}>{playerControlledToken.name} — {playerControlledToken.role}</p>
              
              {/* Turn Sections */}
              <div style={styles.turnSectionTabs}>
                {[
                  {
                    key: "action",
                    label: "Action",
                    meta: playerControlledToken.actionAvailable ? "Ready" : "Used",
                  },
                  {
                    key: "bonus",
                    label: "Bonus Action",
                    meta: playerControlledToken.bonusActionAvailable ? "Ready" : "Unavailable",
                  },
                  {
                    key: "reaction",
                    label: "Reaction",
                    meta: playerControlledToken.reactionAvailable ? "Ready" : "Used",
                  },
                  {
                    key: "movement",
                    label: "Movement",
                    meta: `${playerControlledToken.movementRemaining ?? 30} ft`,
                  },
                ].map((section) => (
                  <button
                    key={section.key}
                    type="button"
                    style={playerActionSection === section.key ? styles.turnSectionTabActive : styles.turnSectionTab}
                    onClick={() => setPlayerActionSection(section.key)}
                  >
                    <span style={styles.turnSectionTabLabel}>{section.label}</span>
                    <span style={styles.turnSectionTabMeta}>{section.meta}</span>
                  </button>
                ))}
              </div>

              {playerActionSection === "action" && (
                <div style={styles.actionGrid}>
                  <button
                    type="button"
                    style={{ ...styles.actionButton, ...(!canUseTurnActions || !canUseUnarmedAttack ? styles.actionButtonDisabled : {}) }}
                    disabled={!canUseTurnActions || !canUseUnarmedAttack}
                    onClick={() => useUnarmedAttack("action")}
                    title="Unarmed attack for 1 + Strength modifier damage if the selected target is within 5 feet"
                  >
                    <div style={styles.actionButtonLabel}>🖐️ Unarmed Attack</div>
                    <div style={styles.actionButtonCost}>1 Action</div>
                  </button>

                  <button
                    type="button"
                    style={{ ...styles.actionButton, ...(!canUseTurnActions || !playerControlledToken.actionAvailable ? styles.actionButtonDisabled : {}) }}
                    disabled={!canUseTurnActions || !playerControlledToken.actionAvailable}
                    onClick={() => useAction("dash")}
                    title="Dash to refresh your movement for this turn"
                  >
                    <div style={styles.actionButtonLabel}>🏃 Dash</div>
                    <div style={styles.actionButtonCost}>1 Action</div>
                  </button>

                  <button
                    type="button"
                    style={{ ...styles.actionButton, ...(!canUseTurnActions || !playerControlledToken.actionAvailable ? styles.actionButtonDisabled : {}) }}
                    disabled={!canUseTurnActions || !playerControlledToken.actionAvailable}
                    onClick={() => useAction("disengage")}
                    title="Disengage from enemies"
                  >
                    <div style={styles.actionButtonLabel}>💨 Disengage</div>
                    <div style={styles.actionButtonCost}>1 Action</div>
                  </button>

                  <button
                    type="button"
                    style={{ ...styles.actionButton, ...(!canUseTurnActions || !playerControlledToken.actionAvailable ? styles.actionButtonDisabled : {}) }}
                    disabled={!canUseTurnActions || !playerControlledToken.actionAvailable}
                    onClick={() => useAction("hide")}
                    title="Hide"
                  >
                    <div style={styles.actionButtonLabel}>🫥 Hide</div>
                    <div style={styles.actionButtonCost}>1 Action</div>
                  </button>

                  <button
                    type="button"
                    style={{ ...styles.actionButton, ...(!canUseTurnActions || !playerControlledToken.actionAvailable ? styles.actionButtonDisabled : {}) }}
                    disabled={!canUseTurnActions || !playerControlledToken.actionAvailable}
                    onClick={() => useAction("help")}
                    title="Help"
                  >
                    <div style={styles.actionButtonLabel}>🤝 Help</div>
                    <div style={styles.actionButtonCost}>1 Action</div>
                  </button>
                </div>
              )}

              {playerActionSection === "bonus" && (
                <div style={styles.actionGrid}>
                  <div style={styles.actionHintBox}>Bonus actions stay locked unless a class feature grants one.</div>
                </div>
              )}

              {playerActionSection === "reaction" && (
                <div style={styles.actionGrid}>
                  <button
                    type="button"
                    style={{ ...styles.actionButton, ...(!canUseTurnActions || !canUseOpportunityAttack ? styles.actionButtonDisabled : {}) }}
                    disabled={!canUseTurnActions || !canUseOpportunityAttack}
                    onClick={() => useUnarmedAttack("reaction")}
                    title="Opportunity attack with an unarmed strike"
                  >
                    <div style={styles.actionButtonLabel}>⚡ Opportunity Attack</div>
                    <div style={styles.actionButtonCost}>1 Reaction</div>
                  </button>
                </div>
              )}

              {playerActionSection === "movement" && (
                <div style={styles.movementPanel}>
                  <div style={styles.movementSummary}>
                    <span style={styles.economyLabel}>Selected Target Distance:</span>
                    <span style={{ ...styles.economyValue, color: playerControlledToken.movementRemaining > 0 ? '#4cb582' : '#888' }}>
                      {selectedTargetDistance ?? '--'} ft
                    </span>
                  </div>
                  <p style={styles.movementHint}>Pick a nearby target, then spend movement to close the gap in 5-foot steps.</p>
                  <div style={styles.controlRow}>
                    <button type="button" style={styles.secondaryButton} onClick={() => spendMovement(5)} disabled={!canUseTurnActions || !selectedTargetDistance || selectedTargetDistance <= 0}>Approach 5 ft</button>
                  </div>
                </div>
              )}
            </div>
            </>
          )}

          {effectiveIsDM && (
            <div style={styles.panelCard}>
              <h3 style={styles.panelTitle}>DM Controls</h3>
              <div style={styles.controlRow}>
                <button type="button" style={styles.secondaryButton} onClick={resetEncounter}>Reset Encounter</button>
                <button type="button" style={styles.secondaryButton} onClick={levelUpAll}>Level Up All</button>
                <button type="button" style={styles.secondaryButton} onClick={addDefaultEnemies} disabled={encounter.isReady}>Add Default Enemies</button>
              </div>
            </div>
          )}

          {effectiveIsDM && (
            <div style={styles.panelCard}>
              <h3 style={styles.panelTitle}>Add Participant</h3>
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
                <label style={styles.fieldLabel}>Move Speed<input style={styles.fieldInput} type="number" value={newToken.movementSpeed} onChange={(e) => setNewToken((prev) => ({ ...prev, movementSpeed: e.target.value }))} /></label>
                <label style={styles.fieldLabel}>Init Bonus<input style={styles.fieldInput} type="number" value={newToken.initiativeBonus} onChange={(e) => setNewToken((prev) => ({ ...prev, initiativeBonus: e.target.value }))} /></label>
                <label style={styles.fieldLabel}>Color<input style={styles.fieldInput} type="color" value={newToken.color} onChange={(e) => setNewToken((prev) => ({ ...prev, color: e.target.value }))} /></label>
              </div>
              <button type="button" style={styles.secondaryButton} onClick={placeNewToken}>Add to Encounter</button>
            </div>
          )}

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

          <div style={styles.panelCard}>
            <h3 style={styles.panelTitle}>Encounter Log</h3>
            <ul style={styles.logList}>
              {(encounter.log || []).map((entry, index) => (
                <li key={`${index}-${entry}`} style={styles.logItem}>{entry}</li>
              ))}
            </ul>
          </div>
        </aside>
      </section>

      {/* Level-Up Modal */}
      {showLevelUpModal && levelUpData && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h2 style={styles.modalTitle}>🎉 Level Up!</h2>
            <div style={styles.modalBody}>
              <p style={styles.modalText}>
                Congratulations! You've reached <strong>Level {levelUpData.newLevel}</strong>!
              </p>
              
              {levelUpData.newStats && (
                <div style={styles.statsGrid}>
                  <div style={styles.statBox}>
                    <span style={styles.statBoxLabel}>AC</span>
                    <span style={styles.statBoxValue}>{levelUpData.newStats.armorClass}</span>
                  </div>
                  <div style={styles.statBox}>
                    <span style={styles.statBoxLabel}>Attack</span>
                    <span style={styles.statBoxValue}>+{levelUpData.newStats.attackBonus}</span>
                  </div>
                  <div style={styles.statBox}>
                    <span style={styles.statBoxLabel}>Prof</span>
                    <span style={styles.statBoxValue}>+{levelUpData.newStats.proficiencyBonus}</span>
                  </div>
                </div>
              )}

              {levelUpData.newSpells && levelUpData.newSpells.length > 0 && (
                <div style={styles.newSpellsBox}>
                  <strong>New Spells Unlocked:</strong>
                  <ul style={styles.spellsList}>
                    {levelUpData.newSpells.map((spell) => (
                      <li key={spell}>{spell}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <button
              type="button"
              style={styles.modalButton}
              onClick={() => {
                setShowLevelUpModal(false);
                setLevelUpData(null);
              }}
            >
              Continue
            </button>
          </div>
        </div>
      )}
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
    gridTemplateColumns: "minmax(0, 1.6fr) minmax(330px, 1fr)",
    gap: "20px",
    alignItems: "start",
  },
  encounterLayoutEmbedded: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    gap: "12px",
    alignItems: "start",
  },
  devRoleBar: {
    marginBottom: "12px",
    padding: "10px 12px",
    borderRadius: "12px",
    border: "1px solid rgba(148, 163, 184, 0.24)",
    background: "rgba(15, 23, 42, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    flexWrap: "wrap",
  },
  devRoleLabel: {
    color: "#cbd5e1",
    fontSize: "0.85rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  devRoleButtons: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  devRoleButton: {
    border: "1px solid rgba(148, 163, 184, 0.24)",
    borderRadius: "10px",
    padding: "8px 12px",
    cursor: "pointer",
    background: "rgba(30, 41, 59, 0.9)",
    color: "#e2e8f0",
    fontWeight: 700,
    fontSize: "0.8rem",
  },
  devRoleButtonActive: {
    borderColor: "rgba(201, 168, 76, 0.7)",
    boxShadow: "0 0 0 2px rgba(201, 168, 76, 0.18)",
  },
  mainColumn: {
    display: "grid",
    gap: "20px",
  },
  sideColumn: {
    display: "grid",
    gap: "20px",
  },
  panelCard: {
    padding: "18px",
    borderRadius: "18px",
    background: "rgba(17, 12, 7, 0.88)",
    border: "1px solid rgba(201, 168, 76, 0.22)",
  },
  characterCardContent: {
    textAlign: "center",
    marginTop: "12px",
  },
  characterName: {
    margin: "0 0 4px 0",
    fontSize: "1.3rem",
    fontWeight: 700,
    color: "var(--gold-light)",
  },
  characterRole: {
    margin: 0,
    fontSize: "0.9rem",
    color: "var(--text-muted)",
  },
  hpBar: {
    height: "24px",
    background: "rgba(0, 0, 0, 0.5)",
    borderRadius: "6px",
    marginTop: "12px",
    overflow: "hidden",
    border: "1px solid rgba(201, 168, 76, 0.15)",
  },
  hpBarFill: {
    height: "100%",
    background: "linear-gradient(90deg, #4cb582, #6dd89e)",
    transition: "width 0.3s ease",
  },
  hpText: {
    margin: "8px 0 0 0",
    fontSize: "0.85rem",
    color: "var(--text-muted)",
  },
  panelHeaderSplit: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
  },
  sectionTitle: { margin: 0, fontSize: "1.35rem" },
  sectionText: { margin: "6px 0 0", color: "var(--text-muted)", lineHeight: 1.5 },
  panelTitle: { margin: 0, fontSize: "1.1rem" },
  panelBody: { margin: "10px 0", color: "var(--text-base)", lineHeight: 1.55 },
  panelMeta: { margin: "10px 0 0", color: "#94a3b8" },
  initiativeList: {
    margin: "14px 0 0",
    padding: 0,
    listStyle: "none",
    display: "grid",
    gap: "10px",
  },
  initiativeItem: {
    border: "1px solid rgba(148, 163, 184, 0.2)",
    borderRadius: "12px",
    background: "rgba(15, 23, 42, 0.38)",
  },
  initiativeItemActive: {
    borderColor: "rgba(201, 168, 76, 0.55)",
    boxShadow: "0 0 0 2px rgba(201, 168, 76, 0.2)",
    background: "rgba(201, 168, 76, 0.08)",
  },
  initiativeSelectButton: {
    width: "100%",
    border: "none",
    borderRadius: "12px",
    background: "transparent",
    color: "inherit",
    padding: "10px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    cursor: "pointer",
    textAlign: "left",
  },
  initiativeRank: {
    minWidth: "28px",
    height: "28px",
    borderRadius: "999px",
    background: "rgba(201, 168, 76, 0.2)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
  },
  initiativeMeta: {
    color: "#94a3b8",
    fontSize: "0.85rem",
  },
  activeTurnBadge: {
    marginLeft: "auto",
    padding: "4px 8px",
    borderRadius: "999px",
    background: "rgba(201, 168, 76, 0.18)",
    color: "#f5e1a6",
    fontSize: "0.72rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  controlRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "12px",
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
  participantGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "14px",
    marginTop: "14px",
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
  participantCardActive: {
    borderColor: "rgba(201, 168, 76, 0.5)",
    boxShadow: "0 0 0 2px rgba(201, 168, 76, 0.16)",
  },
  participantActiveBadge: {
    display: "inline-flex",
    alignSelf: "flex-end",
    marginBottom: "10px",
    padding: "4px 8px",
    borderRadius: "999px",
    background: "rgba(201, 168, 76, 0.18)",
    color: "#f5e1a6",
    fontSize: "0.72rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
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
  turnEconomyChips: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    marginTop: "10px",
  },
  economyChip: {
    borderRadius: "999px",
    padding: "2px 8px",
    fontSize: "0.75rem",
    border: "1px solid rgba(148, 163, 184, 0.3)",
  },
  chipReady: {
    color: "#86efac",
    borderColor: "rgba(34, 197, 94, 0.35)",
  },
  chipUsed: {
    color: "#fca5a5",
    borderColor: "rgba(239, 68, 68, 0.35)",
  },
  fieldGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "8px",
    marginTop: "12px",
    marginBottom: "10px",
  },
  fieldGridSingle: {
    display: "grid",
    gap: "8px",
    marginTop: "12px",
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
  actionEconomyStatus: {
    padding: "14px",
    borderRadius: "12px",
    background: "rgba(0, 0, 0, 0.4)",
    border: "1px solid rgba(201, 168, 76, 0.15)",
    marginBottom: "12px",
    display: "grid",
    gap: "8px",
  },
  economyRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "13px",
    color: "#d4c5a9",
  },
  economyLabel: {
    fontWeight: "600",
    color: "#a0917a",
    textTransform: "uppercase",
    fontSize: "11px",
    letterSpacing: "0.05em",
  },
  economyValue: {
    fontWeight: "600",
    fontSize: "13px",
  },
  turnSectionTabs: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "8px",
    marginBottom: "12px",
  },
  turnSectionTab: {
    padding: "10px 12px",
    borderRadius: "12px",
    border: "1px solid rgba(201, 168, 76, 0.16)",
    background: "rgba(0, 0, 0, 0.22)",
    color: "#d4c5a9",
    textAlign: "left",
    cursor: "pointer",
    display: "grid",
    gap: "3px",
  },
  turnSectionTabActive: {
    padding: "10px 12px",
    borderRadius: "12px",
    border: "1px solid rgba(201, 168, 76, 0.45)",
    background: "rgba(201, 168, 76, 0.14)",
    color: "#fff",
    textAlign: "left",
    cursor: "pointer",
    display: "grid",
    gap: "3px",
  },
  turnSectionTabLabel: {
    fontSize: "13px",
    fontWeight: "700",
    letterSpacing: "0.02em",
  },
  turnSectionTabMeta: {
    fontSize: "11px",
    color: "#a0917a",
  },
  movementPanel: {
    padding: "14px",
    borderRadius: "12px",
    background: "rgba(0, 0, 0, 0.28)",
    border: "1px solid rgba(201, 168, 76, 0.15)",
    marginBottom: "12px",
    display: "grid",
    gap: "12px",
  },
  movementSummary: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
  },
  movementHint: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "0.9rem",
    lineHeight: 1.5,
  },
  actionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "8px",
    marginBottom: "12px",
  },
  actionHintBox: {
    gridColumn: "1 / -1",
    padding: "12px",
    borderRadius: "10px",
    border: "1px dashed rgba(148, 163, 184, 0.35)",
    color: "#94a3b8",
    background: "rgba(15, 23, 42, 0.45)",
    lineHeight: 1.5,
  },
  actionButton: {
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid rgba(201, 168, 76, 0.4)",
    background: "linear-gradient(135deg, rgba(201, 168, 76, 0.15) 0%, rgba(201, 168, 76, 0.08) 100%)",
    color: "#d4c5a9",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "12px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    minHeight: "60px",
  },
  actionButtonLabel: {
    fontSize: "14px",
    fontWeight: "700",
    lineHeight: 1.2,
  },
  actionButtonCost: {
    fontSize: "11px",
    color: "rgba(201, 168, 76, 0.6)",
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  actionButtonDisabled: {
    opacity: "0.4",
    cursor: "not-allowed",
    borderColor: "rgba(128, 128, 128, 0.2)",
    background: "rgba(128, 128, 128, 0.05)",
    color: "#666",
  },
  resetButton: {
    width: "100%",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid rgba(156, 163, 175, 0.4)",
    background: "rgba(100, 116, 139, 0.2)",
    color: "#cbd5e1",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
    transition: "all 0.2s ease",
  },
  characterStatsBar: {
    display: "flex",
    gap: "16px",
    padding: "10px 12px",
    borderRadius: "8px",
    background: "rgba(0, 0, 0, 0.3)",
    border: "1px solid rgba(201, 168, 76, 0.15)",
    marginBottom: "10px",
    fontSize: "13px",
  },
  statLine: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  statLabel: {
    color: "#a0917a",
    fontWeight: "600",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  statValue: {
    color: "var(--gold-light)",
    fontWeight: "700",
    fontSize: "14px",
  },
  spellsPanelInline: {
    padding: "10px 12px",
    borderRadius: "8px",
    background: "rgba(100, 116, 139, 0.15)",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    marginBottom: "12px",
  },
  spellsTitle: {
    display: "block",
    color: "#cbd5e1",
    fontSize: "12px",
    marginBottom: "6px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    fontWeight: "600",
  },
  spellsListInline: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
  },
  spellTag: {
    padding: "4px 8px",
    borderRadius: "4px",
    background: "rgba(148, 163, 184, 0.2)",
    color: "#e2e8f0",
    fontSize: "11px",
    fontWeight: "500",
    border: "1px solid rgba(148, 163, 184, 0.3)",
  },
  logList: {
    margin: "12px 0 0",
    paddingLeft: "18px",
    display: "grid",
    gap: "10px",
    color: "#cbd5e1",
  },
  logItem: { lineHeight: 1.45 },
  rollBreakdown: { color: "#94a3b8", fontSize: "0.85rem" },
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
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.85)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  modalContent: {
    background: "linear-gradient(135deg, rgba(30, 20, 10, 0.95) 0%, rgba(40, 25, 15, 0.95) 100%)",
    border: "2px solid rgba(201, 168, 76, 0.5)",
    borderRadius: "20px",
    padding: "40px",
    maxWidth: "500px",
    width: "90%",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(201, 168, 76, 0.2)",
    textAlign: "center",
  },
  modalTitle: {
    fontSize: "2.2rem",
    color: "var(--gold-light)",
    margin: "0 0 20px",
    textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)",
  },
  modalBody: {
    marginBottom: "30px",
  },
  modalText: {
    color: "#d4c5a9",
    fontSize: "16px",
    lineHeight: 1.6,
    marginBottom: "20px",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "12px",
    marginBottom: "20px",
  },
  statBox: {
    padding: "16px",
    borderRadius: "12px",
    border: "1px solid rgba(201, 168, 76, 0.3)",
    background: "rgba(201, 168, 76, 0.1)",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  statBoxLabel: {
    fontSize: "12px",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    fontWeight: "600",
    letterSpacing: "0.05em",
  },
  statBoxValue: {
    fontSize: "20px",
    color: "var(--gold-light)",
    fontWeight: "700",
  },
  newSpellsBox: {
    padding: "16px",
    borderRadius: "12px",
    border: "1px solid rgba(147, 112, 219, 0.3)",
    background: "rgba(147, 112, 219, 0.1)",
    textAlign: "left",
    color: "#d4c5a9",
  },
  spellsList: {
    listStyle: "none",
    padding: "10px 0",
    margin: "10px 0 0",
    color: "#c9a84c",
    fontSize: "14px",
  },
  modalButton: {
    padding: "14px 32px",
    borderRadius: "10px",
    border: "1px solid rgba(201, 168, 76, 0.6)",
    background: "linear-gradient(135deg, rgba(201, 168, 76, 0.3) 0%, rgba(201, 168, 76, 0.15) 100%)",
    color: "var(--gold-light)",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "16px",
    transition: "all 0.3s ease",
  },
  encounterAbilityGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #444',
  },
  encounterAbilityBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '8px',
    backgroundColor: '#2a2a2a',
    borderRadius: '4px',
    border: '1px solid #444',
  },
  encounterAbilityLabel: {
    fontSize: '10px',
    color: '#aaa',
    marginBottom: '4px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  encounterAbilityScore: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#fff',
  },
  inspirationDisplay: {
    marginTop: '8px',
    padding: '8px',
    backgroundColor: '#2a2a2a',
    borderRadius: '4px',
    border: '1px solid #ffd700',
    fontSize: '12px',
    color: '#fff',
    textAlign: 'center',
  },
};

export default EncounterAssistantBoard;
