import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import Gate from "../../shared/Gate.jsx";

const apiServer = import.meta.env.VITE_API_SERVER;

const LobbyTimer = ({ createdAt }) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const expiresAt = new Date(createdAt).getTime() + 7200 * 1000;

    const updateTimer = () => {
      const now = Date.now();
      const distance = expiresAt - now;

      if (distance <= 0) {
        setTimeLeft("Expired");
        return;
      }

      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft(
        `${hours > 0 ? hours + "h " : ""}${minutes}m ${seconds < 10 ? "0" : ""}${seconds}s`
      );
    };

    updateTimer(); 
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [createdAt]);

  return <span style={styles.timerText}>Disbands in: {timeLeft}</span>;
};

function PartyFinder() {
  const { user, token, isLoggedIn } = useAuth();
  const [parties, setParties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [toast, setToast] = useState({ message: "", type: "", visible: false, isExiting: false });
  const [isLeaving, setIsLeaving] = useState(false);
  
  const toastTimerRef = useRef(null);
  const toastExitTimerRef = useRef(null);

  const [lobbyCodeInput, setLobbyCodeInput] = useState("");
  const [newPartyConfig, setNewPartyConfig] = useState({
    partyName: "",
    isPublic: true,
    maxPlayers: 4,
  });

  const showToast = useCallback((message, type = "success") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (toastExitTimerRef.current) clearTimeout(toastExitTimerRef.current);

    setToast({ message, type, visible: true, isExiting: false });

    toastTimerRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, isExiting: true })); 
      
      toastExitTimerRef.current = setTimeout(() => {
        setToast((prev) => ({ ...prev, visible: false, isExiting: false })); 
      }, 300); 
    }, 4000);
  }, []);

  const fetchParties = useCallback(async () => {
    try {
      const response = await fetch(`${apiServer}/api/parties/public`);
      if (!response.ok) throw new Error("Failed to fetch parties.");
      const data = await response.json();
      setParties(data);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchParties();
    }
  }, [isLoggedIn, fetchParties]);

  useEffect(() => {
    const handleUnload = () => {
      if (user?.username) {
        const payload = JSON.stringify({ username: user.username });
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon(`${apiServer}/api/parties/leave`, blob);
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [user]);

  const handleCreateParty = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${apiServer}/api/parties/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          owner: user.username,
          partyName: newPartyConfig.partyName.trim() || `${user.username}'s Party`,
          isPublic: newPartyConfig.isPublic,
          maxPlayers: newPartyConfig.maxPlayers,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to create party");
      
      showToast(`Party created! Lobby Code: ${data.lobbyCode}`, "success");
      
      setNewPartyConfig(prev => ({ ...prev, partyName: "" }));
      fetchParties();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const joinLobby = async (codeToJoin) => {
    if (!codeToJoin || codeToJoin.length !== 6) return;

    try {
      const response = await fetch(`${apiServer}/api/parties/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          lobbyCode: codeToJoin,
          username: user.username,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to join party");

      showToast(`Successfully joined!`, "success");
      setLobbyCodeInput(""); 
      fetchParties();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    joinLobby(lobbyCodeInput);
  };

  const handleLeaveParty = async () => {
    setIsLeaving(true); 
    try {
      const response = await fetch(`${apiServer}/api/parties/leave`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: user.username }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to leave party");
      }

      showToast("You have left the party.", "success");
      // Use async/await to guarantee the fresh data arrives BEFORE resetting the animation
      setTimeout(async () => {
        await fetchParties();
        setIsLeaving(false);
      }, 600); 
    } catch (err) {
      setIsLeaving(false); 
      showToast(err.message, "error");
    }
  };

  const handleDeleteParty = async (partyId) => {
    setIsLeaving(true); 
    try {
      const response = await fetch(`${apiServer}/api/parties/${partyId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: user.username }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete party");
      }
      
      showToast("Party disbanded.", "success");
      // Use async/await to guarantee the fresh data arrives before resetting the animation
      setTimeout(async () => {
        await fetchParties();
        setIsLeaving(false);
      }, 600);
    } catch (err) {
      setIsLeaving(false);
      showToast(err.message, "error");
    }
  };

  if (!isLoggedIn) {
    return <Gate>Sign in to find adventuring parties.</Gate>;
  }

  const ownedParty = parties.find((p) => p.owner === user.username);
  const otherParties = parties.filter((p) => p.owner !== user.username);
  const joinedParty = otherParties.find((p) => p.players.includes(user.username));

  const isCurrentlyInParty = !!(ownedParty || joinedParty);
  const isExpanded = isCurrentlyInParty && !isLeaving;

  return (
    <div style={styles.container}>
      <style>
        {`
          @keyframes toastFadeIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes toastFadeOut {
            from { opacity: 1; transform: translateY(0); }
            to { opacity: 0; transform: translateY(-20px); }
          }
        `}
      </style>

      <h1 style={styles.pageTitle}>Party Finder</h1>

      {/* PINNED CURRENT LOBBY SECTION */}
      <div style={{
        ...styles.animatedWrapper,
        gridTemplateRows: isExpanded ? "1fr" : "0fr",
        opacity: isExpanded ? 1 : 0,
      }}>
        <div style={styles.animatedInner}>
          <div>
            <div style={styles.partyList}>
              {ownedParty && (
                <div style={{ ...styles.partyCard, ...styles.highlightedCard }}>
                  <div style={styles.cardHeader}>
                    <div>
                      <h3 style={{ margin: 0 }}>
                        {ownedParty.partyName || `${ownedParty.owner}'s Party`} (Code: {ownedParty.lobbyCode})
                      </h3>
                      <LobbyTimer createdAt={ownedParty.createdAt} />
                    </div>
                    <span style={styles.badge}>Owner</span>
                  </div>
                  <p>Players: {ownedParty.players.length} / {ownedParty.maxPlayers}</p>
                  <p style={styles.playerList}>Roster: {ownedParty.players.join(", ")}</p>
                  <button onClick={() => handleDeleteParty(ownedParty._id)} style={styles.dangerBtn}>
                    Disband Party
                  </button>
                </div>
              )}

              {joinedParty && !ownedParty && (
                <div style={{ ...styles.partyCard, ...styles.highlightedCard }}>
                  <div style={styles.cardHeader}>
                    <div>
                      <h3 style={{ margin: 0 }}>
                        {joinedParty.partyName || `${joinedParty.owner}'s Party`}
                      </h3>
                      <LobbyTimer createdAt={joinedParty.createdAt} />
                    </div>
                    <span style={styles.badge}>Joined</span>
                  </div>
                  <p>Players: {joinedParty.players.length} / {joinedParty.maxPlayers}</p>
                  <p style={styles.playerList}>Roster: {joinedParty.players.join(", ")}</p>
                  <button onClick={handleLeaveParty} style={styles.dangerBtn}>
                    Leave Party
                  </button>
                </div>
              )}
            </div>
            <hr style={{...styles.divider, marginTop: "2rem", marginBottom: "2rem"}} />
          </div>
        </div>
      </div>

      {/* CREATE & JOIN CONTROLS */}
      <div style={styles.controlsGrid}>
        <div style={styles.panel}>
          <h3>Create a Party</h3>
          <form onSubmit={handleCreateParty} style={styles.formGroup}>
            <label style={styles.label}>
              Party Name:
              <input
                type="text"
                placeholder={`${user.username}'s Party`}
                maxLength={40}
                value={newPartyConfig.partyName}
                onChange={(e) =>
                  setNewPartyConfig({ ...newPartyConfig, partyName: e.target.value })
                }
                style={{ marginTop: "5px" }}
              />
            </label>
            <label style={styles.label}>
              Max Players:
              <input
                type="number"
                min="1"
                max="12"
                value={newPartyConfig.maxPlayers}
                onChange={(e) =>
                  setNewPartyConfig({ ...newPartyConfig, maxPlayers: parseInt(e.target.value) })
                }
                style={{ marginTop: "5px" }}
              />
            </label>
            <label style={styles.label}>
              Visibility:
              <select
                value={newPartyConfig.isPublic}
                onChange={(e) =>
                  setNewPartyConfig({ ...newPartyConfig, isPublic: e.target.value === "true" })
                }
                style={{ ...styles.selectInput, marginTop: "5px" }}
              >
                <option value="true" style={styles.option}>Public</option>
                <option value="false" style={styles.option}>Private</option>
              </select>
            </label>
            <div 
              title={isCurrentlyInParty ? "You must leave your current party first." : ""}
              style={{ display: "flex", cursor: isCurrentlyInParty ? "not-allowed" : "default", marginTop: "10px" }}
            >
              <button 
                type="submit" 
                disabled={isCurrentlyInParty}
                style={{ flex: 1, pointerEvents: isCurrentlyInParty ? "none" : "auto" }}
              >
                Open Lobby
              </button>
            </div>
          </form>
        </div>

        <div style={styles.panel}>
          <h3>Join via Code</h3>
          <form onSubmit={handleJoinSubmit} style={styles.formGroup}>
            <input
              type="text"
              placeholder="Enter 6-character code"
              value={lobbyCodeInput}
              onChange={(e) => setLobbyCodeInput(e.target.value.toUpperCase())}
              maxLength={6}
            />
            <div 
              title={isCurrentlyInParty ? "You are already in a party." : ""}
              style={{ display: "flex", cursor: isCurrentlyInParty ? "not-allowed" : "default" }}
            >
              <button 
                type="submit" 
                disabled={!lobbyCodeInput || lobbyCodeInput.length !== 6 || isCurrentlyInParty}
                style={{ flex: 1, pointerEvents: isCurrentlyInParty ? "none" : "auto" }}
              >
                Join Party
              </button>
            </div>
          </form>
        </div>
      </div>

      <hr style={styles.divider} />

      {/* ACTIVE PUBLIC LOBBIES */}
      <h2>Active Lobbies</h2>
      {isLoading ? (
        <p>Scrying for active parties...</p>
      ) : (
        <div style={styles.partyList}>
          {otherParties.length > 0 ? (
            otherParties.map((party) => {
              const isFull = party.players.length >= party.maxPlayers;
              const tooltipText = isCurrentlyInParty 
                ? "You are already in a party." 
                : isFull 
                  ? "This party is full." 
                  : "";

              return (
                <div key={party._id} style={styles.partyCard}>
                  <div style={styles.cardHeader}>
                    <div>
                      <h3 style={{ margin: 0 }}>
                        {party.partyName || `${party.owner}'s Party`}
                      </h3>
                      <LobbyTimer createdAt={party.createdAt} />
                    </div>
                  </div>
                  <p>Players: {party.players.length} / {party.maxPlayers}</p>
                  <p style={styles.playerList}>Roster: {party.players.join(", ")}</p>
                  
                  <div 
                    title={tooltipText}
                    style={{ cursor: (isCurrentlyInParty || isFull) ? "not-allowed" : "default", display: "flex", marginTop: "10px" }}
                  >
                    <button 
                      onClick={() => joinLobby(party.lobbyCode)}
                      disabled={isFull || isCurrentlyInParty}
                      style={{ flex: 1, pointerEvents: (isFull || isCurrentlyInParty) ? "none" : "auto" }}
                    >
                      Join
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <p style={styles.emptyText}>The tavern is quiet. Consider starting your own party!</p>
          )}
        </div>
      )}

      {/* FLOATING TOAST NOTIFICATION */}
      {toast.visible && (
        <div style={styles.toastWrapper}>
          <div style={{
            ...styles.toastContent,
            ...(toast.type === "error" ? styles.toastError : styles.toastSuccess),
            animation: toast.isExiting 
              ? "toastFadeOut 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards" 
              : "toastFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards"
          }}>
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { maxWidth: "900px", margin: "0 auto", padding: "2rem", position: "relative" },
  pageTitle: { textAlign: "center", marginBottom: "2rem" },
  animatedWrapper: { display: "grid", transition: "grid-template-rows 0.6s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)" },
  animatedInner: { overflow: "hidden", minHeight: 0 },
  controlsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem", marginBottom: "2rem" },
  panel: { backgroundColor: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.5rem" },
  formGroup: { display: "flex", flexDirection: "column", gap: "1rem" },
  label: { display: "flex", flexDirection: "column", color: "var(--text-base)", fontSize: "0.9rem" },
  selectInput: {
    appearance: "none",
    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23c9a84c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat", backgroundPosition: "right 0.7rem top 50%", backgroundSize: "1.2rem auto", paddingRight: "2.5rem",
    backgroundColor: "rgba(0, 0, 0, 0.45)", border: "1px solid var(--border)", color: "#e8dcca", padding: "0.65rem 0.9rem", borderRadius: "var(--radius)", fontFamily: "var(--font-body)", fontSize: "1rem"
  },
  option: { backgroundColor: "var(--bg-deep)", color: "var(--text-base)" },
  divider: { border: "none", height: "1px", backgroundColor: "var(--border)", margin: "2rem 0" },
  partyList: { display: "grid", gridTemplateColumns: "1fr", gap: "1rem" },
  partyCard: { backgroundColor: "var(--panel-bg)", border: "1px solid rgba(201, 168, 76, 0.2)", borderRadius: "var(--radius)", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem", transition: "border-color 0.2s" },
  highlightedCard: { borderColor: "var(--gold)", boxShadow: "0 0 15px rgba(201, 168, 76, 0.15)" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  badge: { backgroundColor: "var(--gold)", color: "var(--bg-deep)", padding: "0.2rem 0.6rem", borderRadius: "var(--radius-sm)", fontSize: "0.75rem", fontWeight: "bold", textTransform: "uppercase", marginTop: "0.25rem" },
  playerList: { color: "var(--text-muted)", fontSize: "0.9rem", fontStyle: "italic", marginBottom: "0.5rem" },
  dangerBtn: { background: "var(--danger)", color: "#fff", alignSelf: "flex-start" },
  emptyText: { color: "var(--text-faint)", textAlign: "center", fontStyle: "italic", marginTop: "2rem" },
  toastWrapper: { position: "fixed", top: "40px", left: "50%", transform: "translateX(-50%)", zIndex: 9999 },
  toastContent: { padding: "1rem 2rem", borderRadius: "var(--radius)", boxShadow: "0 8px 32px rgba(0, 0, 0, 0.6)", fontFamily: "var(--font-heading)", fontSize: "1rem", letterSpacing: "0.05em", textAlign: "center", minWidth: "300px" },
  toastSuccess: { backgroundColor: "rgba(20, 15, 8, 0.95)", borderBottom: "3px solid var(--success)", color: "var(--gold-light)" },
  toastError: { backgroundColor: "rgba(20, 15, 8, 0.95)", borderBottom: "3px solid var(--danger)", color: "#fca5a5" },
  timerText: { fontSize: "0.85rem", color: "var(--text-faint)", fontStyle: "italic", display: "block", marginTop: "0.2rem" }
};

export default PartyFinder;
