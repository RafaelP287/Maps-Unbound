import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import Gate from "../../shared/Gate.jsx";

const apiServer = import.meta.env.VITE_API_SERVER;

function PartyFinder() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [joinedParty, setJoinedParty] = useState(null);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (joining) return;
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      setError("Lobby code must be exactly 6 characters.");
      return;
    }
    setJoining(true);
    setError("");
    try {
      const res = await fetch(`${apiServer}/api/parties/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          lobbyCode: trimmed,
          username: user.username,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to join lobby.");
      }
      setJoinedParty(data.party);
    } catch (err) {
      setError(err.message || "Failed to join lobby.");
    } finally {
      setJoining(false);
    }
  };

  const handleEnterSession = () => {
    if (!joinedParty?.sessionId) return;
    navigate(`/session/player?sessionId=${joinedParty.sessionId}`);
  };

  const handleReset = () => {
    setJoinedParty(null);
    setCode("");
    setError("");
  };

  return (
    <Gate>
      <div className="party-finder-page" style={pageStyle}>
        <header style={headerStyle}>
          <h1 style={titleStyle}>Join a Session</h1>
          <p style={subtitleStyle}>
            Have a 6-character lobby code from your DM? Drop it in below.
          </p>
        </header>

        {!joinedParty ? (
          <form onSubmit={handleJoin} style={formStyle}>
            <label htmlFor="lobby-code" style={labelStyle}>
              Lobby Code
            </label>
            <input
              id="lobby-code"
              type="text"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
              }
              maxLength={6}
              placeholder="ABCD12"
              autoFocus
              style={inputStyle}
            />
            {error && <p style={errorStyle}>{error}</p>}
            <button
              type="submit"
              disabled={joining || code.length !== 6}
              style={buttonStyle}
            >
              {joining ? "Joining..." : "Join Session"}
            </button>
          </form>
        ) : (
          <div style={successStyle}>
            <h2 style={{ color: "var(--gold-light, #d9a637)" }}>
              ✓ Joined {joinedParty.partyName}
            </h2>
            <p>
              Code: <strong>{joinedParty.lobbyCode}</strong>
            </p>
            <p>
              Players: {joinedParty.players?.length || 0} / {joinedParty.maxPlayers}
            </p>
            {joinedParty.sessionId ? (
              <button
                type="button"
                onClick={handleEnterSession}
                style={buttonStyle}
              >
                Enter Session →
              </button>
            ) : (
              <p style={{ color: "#aaa", marginTop: "1rem" }}>
                This is a legacy standalone party (no session linked). Ask the DM
                to start a campaign session for the live experience.
              </p>
            )}
            <button
              type="button"
              onClick={handleReset}
              style={{ ...buttonStyle, background: "transparent", border: "1px solid #555", marginTop: "1rem" }}
            >
              Join a different code
            </button>
          </div>
        )}
      </div>
    </Gate>
  );
}

// Lightweight inline styles. Refine into a CSS file when you want to.
const pageStyle = {
  maxWidth: "520px",
  margin: "4rem auto",
  padding: "2rem",
  textAlign: "center",
};
const headerStyle = { marginBottom: "2rem" };
const titleStyle = {
  fontSize: "2.5rem",
  color: "var(--gold-light, #d9a637)",
  letterSpacing: "0.04em",
};
const subtitleStyle = { color: "#aaa", marginTop: "0.5rem" };
const formStyle = { display: "flex", flexDirection: "column", gap: "1rem" };
const labelStyle = {
  textAlign: "left",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontSize: "0.85rem",
  color: "#999",
};
const inputStyle = {
  padding: "0.85rem 1rem",
  fontSize: "1.6rem",
  textAlign: "center",
  letterSpacing: "0.4em",
  border: "1px solid rgba(217, 166, 55, 0.3)",
  borderRadius: "8px",
  background: "rgba(0, 0, 0, 0.5)",
  color: "var(--gold-light, #d9a637)",
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
const errorStyle = { color: "#ff6b6b", fontSize: "0.9rem" };
const successStyle = {
  border: "1px solid rgba(217, 166, 55, 0.36)",
  borderRadius: "8px",
  padding: "2rem",
  background: "rgba(0, 0, 0, 0.4)",
};

export default PartyFinder;
