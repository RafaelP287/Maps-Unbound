import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext.jsx";

function PlayerSearch({ players, onAddPlayer, onRemovePlayer }) {
  const { token } = useAuth();
  const [playerSearch, setPlayerSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeout = useRef(null);

  useEffect(() => {
    if (playerSearch.trim().length < 2) { setSearchResults([]); return; }
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(
          `/api/campaigns/users/search?username=${encodeURIComponent(playerSearch)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (res.ok) {
          const addedIds = players.map((p) => p.userId);
          setSearchResults(data.filter((u) => !addedIds.includes(u._id)));
        }
      } catch { /* silently fail */ } finally { setSearchLoading(false); }
    }, 300);
    return () => clearTimeout(searchTimeout.current);
  }, [playerSearch, players, token]);

  const handleAdd = (u) => {
    onAddPlayer({ userId: u._id, username: u.username });
    setPlayerSearch("");
    setSearchResults([]);
  };

  return (
    <div style={fieldGroupStyle}>
      <label style={labelStyle}>Add Players</label>
      <div style={searchWrapStyle}>
        <input
          type="text"
          placeholder="Search by username…"
          value={playerSearch}
          onChange={(e) => setPlayerSearch(e.target.value)}
          style={inputStyle}
          autoComplete="off"
        />
        {searchLoading && <p style={searchHintStyle}>Searching the guild rolls…</p>}
        {!searchLoading && searchResults.length > 0 && (
          <ul style={dropdownStyle}>
            {searchResults.map((u) => (
              <li key={u._id} style={dropdownItemStyle} onClick={() => handleAdd(u)}>
                <span style={dropdownAvatarStyle}>{u.username[0].toUpperCase()}</span>
                {u.username}
              </li>
            ))}
          </ul>
        )}
        {!searchLoading && playerSearch.trim().length >= 2 && searchResults.length === 0 && (
          <p style={searchHintStyle}>No adventurers found by that name.</p>
        )}
      </div>

      {players.length > 0 && (
        <ul style={partyListStyle}>
          {players.map((p) => (
            <li key={p.userId} style={partyTagStyle}>
              <span style={partyAvatarStyle}>{p.username[0].toUpperCase()}</span>
              <span>{p.username}</span>
              <button type="button" onClick={() => onRemovePlayer(p.userId)} style={removeTagBtnStyle} aria-label={`Remove ${p.username}`}>✕</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Styles ── */
const fieldGroupStyle = { display: "flex", flexDirection: "column", gap: "0.4rem" };

const labelStyle = {
  fontFamily: "'Cinzel', serif",
  fontSize: "0.78rem",
  fontWeight: "600",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--gold)",
};

const inputStyle = {
  padding: "0.65rem 0.9rem",
  borderRadius: "6px",
  border: `1px solid var(--border)`,
  background: "var(--input-bg)",
  color: "#e8dcca",
  fontSize: "1rem",
  fontFamily: "'Crimson Text', serif",
  width: "100%",
  boxSizing: "border-box",
  outline: "none",
  transition: "border-color 0.2s",
};

const searchWrapStyle = { position: "relative" };

const dropdownStyle = {
  listStyle: "none",
  margin: "4px 0 0",
  padding: "0",
  border: `1px solid var(--border)`,
  borderRadius: "6px",
  background: "#1a1306",
  position: "absolute",
  width: "100%",
  zIndex: 20,
  boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
  overflow: "hidden",
};

const dropdownItemStyle = {
  display: "flex",
  alignItems: "center",
  gap: "0.6rem",
  padding: "0.6rem 0.9rem",
  cursor: "pointer",
  color: "#d4c5a9",
  fontSize: "0.95rem",
  borderBottom: `1px solid rgba(201,168,76,0.1)`,
  transition: "background 0.15s",
};

const dropdownAvatarStyle = {
  width: "26px",
  height: "26px",
  borderRadius: "50%",
  background: `rgba(201,168,76,0.2)`,
  border: `1px solid var(--border)`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "0.75rem",
  fontFamily: "'Cinzel', serif",
  color: "var(--gold)",
  flexShrink: 0,
};

const searchHintStyle = {
  fontSize: "0.85rem",
  color: "#7a6e5e",
  fontStyle: "italic",
  margin: "6px 0 0",
};

const partyListStyle = {
  listStyle: "none",
  padding: 0,
  margin: "0.6rem 0 0",
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
};

const partyTagStyle = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  background: "rgba(201,168,76,0.1)",
  border: `1px solid var(--border)`,
  borderRadius: "999px",
  padding: "4px 12px 4px 6px",
  fontSize: "0.9rem",
  color: "#e8dcca",
};

const partyAvatarStyle = {
  width: "22px",
  height: "22px",
  borderRadius: "50%",
  background: `rgba(201,168,76,0.2)`,
  border: `1px solid var(--border)`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "0.7rem",
  fontFamily: "'Cinzel', serif",
  color: "var(--gold)",
  flexShrink: 0,
};

const removeTagBtnStyle = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "#9a8a70",
  fontSize: "0.8rem",
  padding: 0,
  lineHeight: 1,
  marginLeft: "2px",
};

export default PlayerSearch;