import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext.jsx";

function CreateCampaignPage() {
  // Navigation and auth state
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [form, setForm] = useState({ title: "", description: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // State for image upload
  const [imagePreview, setImagePreview] = useState(null);
  const [imageError, setImageError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // State for player search and selection
  const [playerSearch, setPlayerSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [players, setPlayers] = useState([]);
  const searchTimeout = useRef(null);

  // Effect to handle player search
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

  // Function to process selected image file
  const processImageFile = (file) => {
    setImageError(null);
    if (!file.type.startsWith("image/")) { setImageError("Please upload an image file."); return; }
    if (file.size > 10 * 1024 * 1024) { setImageError("Image must be under 10MB."); return; }
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  // Handlers for drag-and-drop and file input
  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) processImageFile(f); };
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleFileInput = (e) => { const f = e.target.files[0]; if (f) processImageFile(f); };
  const removeImage = () => { setImagePreview(null); setImageError(null); if (fileInputRef.current) fileInputRef.current.value = ""; };
  const addPlayer = (u) => { setPlayers((p) => [...p, { userId: u._id, username: u.username }]); setPlayerSearch(""); setSearchResults([]); };
  const removePlayer = (userId) => setPlayers((p) => p.filter((x) => x.userId !== userId));

  // Handler for form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const members = [{ userId: user.id, role: "DM" }, ...players.map((p) => ({ userId: p.userId, role: "Player" }))];
    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: form.title, description: form.description, image: imagePreview ?? undefined, members }),
      });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || "Failed to create campaign"); }
      navigate("/campaigns");
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div style={pageWrapStyle}>
      <div style={noiseOverlayStyle} />

      <div style={contentStyle}>
        {/* Header */}
        <header style={headerStyle}>
          <div style={dividerStyle} />
          <div style={headerRowStyle}>
            <span style={runeStyle}>✦</span>
            <h1 style={titleStyle}>Forge a New Campaign</h1>
            <span style={runeStyle}>✦</span>
          </div>
          <p style={subtitleStyle}>Chronicle your legend — name it, describe it, assemble your party.</p>
          <div style={dividerStyle} />
        </header>

        {error && (
          <div style={errorBannerStyle}>
            <span style={{ marginRight: "0.5rem" }}>⚠</span>{error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={formStyle}>
          {/* Title */}
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Campaign Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              placeholder="e.g. Curse of the Crimson Throne"
              style={inputStyle}
            />
          </div>

          {/* Description */}
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
              placeholder="Set the scene — what awaits your adventurers?"
              style={{ ...inputStyle, minHeight: "110px", resize: "vertical" }}
            />
          </div>

          {/* Separator */}
          <div style={sectionDividerStyle}>
            <div style={sectionLineStyle} />
            <span style={sectionLabelStyle}>Campaign Artwork</span>
            <div style={sectionLineStyle} />
          </div>

          {/* Image upload */}
          <div style={fieldGroupStyle}>
            {imagePreview ? (
              <div style={previewWrapStyle}>
                <img src={imagePreview} alt="Campaign preview" style={previewImgStyle} />
                <div style={previewOverlayStyle}>
                  <button type="button" onClick={removeImage} style={removeImgBtnStyle}>✕ Remove</button>
                </div>
              </div>
            ) : (
              <div
                style={dropZoneStyle(isDragging)}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <div style={dropIconStyle}>🖼️</div>
                <p style={dropLabelStyle}>Drag & drop an image, or <u>browse</u></p>
                <p style={dropHintStyle}>PNG · JPG · WEBP — max 10 MB</p>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileInput} style={{ display: "none" }} />
            {imageError && <p style={imgErrorStyle}>{imageError}</p>}
          </div>

          {/* Separator */}
          <div style={sectionDividerStyle}>
            <div style={sectionLineStyle} />
            <span style={sectionLabelStyle}>Assemble Your Party</span>
            <div style={sectionLineStyle} />
          </div>

          {/* Player search */}
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
                    <li key={u._id} style={dropdownItemStyle} onClick={() => addPlayer(u)}>
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
                    <button type="button" onClick={() => removePlayer(p.userId)} style={removeTagBtnStyle} aria-label={`Remove ${p.username}`}>✕</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button type="submit" style={submitBtnStyle} disabled={loading}>
            {loading ? "Forging the chronicle…" : "⚔  Create Campaign"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Styles ── */
const pageWrapStyle = {
  position: "relative",
  minHeight: "100vh",
  background: `radial-gradient(ellipse at 20% 0%, #1a1006 0%, var(--bg-deep) 60%)`,
  fontFamily: "'Crimson Text', Georgia, serif",
  color: "#d4c5a9",
};

const noiseOverlayStyle = {
  position: "fixed",
  inset: 0,
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
  pointerEvents: "none",
  zIndex: 0,
};

const contentStyle = {
  position: "relative",
  zIndex: 1,
  maxWidth: "540px",
  margin: "0 auto",
  padding: "3rem 1.5rem 5rem",
};

const headerStyle = {
  textAlign: "center",
  marginBottom: "2.5rem",
};

const dividerStyle = {
  height: "1px",
  background: `linear-gradient(to right, transparent, var(--border), transparent)`,
  margin: "0.6rem 0",
};

const headerRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.8rem",
};

const runeStyle = { color: "var(--gold)", fontSize: "1rem", opacity: 0.7 };

const titleStyle = {
  fontFamily: "'Cinzel Decorative', serif",
  fontSize: "clamp(1.4rem, 4vw, 2.1rem)",
  color: "var(--gold-light)",
  margin: 0,
  textShadow: `0 0 30px rgba(201,168,76,0.2)`,
};

const subtitleStyle = {
  color: "#9a8a70",
  fontStyle: "italic",
  fontSize: "1rem",
  margin: "0.4rem 0 0",
};

const errorBannerStyle = {
  background: "rgba(192,57,43,0.15)",
  border: "1px solid rgba(192,57,43,0.45)",
  borderRadius: "6px",
  color: "#ff9089",
  padding: "0.7rem 1rem",
  marginBottom: "1.5rem",
  fontSize: "0.95rem",
};

const formStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "1.25rem",
};

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

const sectionDividerStyle = {
  display: "flex",
  alignItems: "center",
  gap: "0.8rem",
  margin: "0.25rem 0",
};

const sectionLineStyle = {
  flex: 1,
  height: "1px",
  background: `linear-gradient(to right, transparent, var(--border))`,
};

const sectionLabelStyle = {
  fontFamily: "'Cinzel', serif",
  fontSize: "0.72rem",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "#9a8a70",
  whiteSpace: "nowrap",
};

const dropZoneStyle = (isDragging) => ({
  border: `2px dashed ${isDragging ? gold : "rgba(201,168,76,0.25)"}`,
  borderRadius: "8px",
  padding: "2rem 1rem",
  textAlign: "center",
  cursor: "pointer",
  background: isDragging ? "rgba(201,168,76,0.07)" : "rgba(0,0,0,0.25)",
  transition: "border-color 0.2s, background 0.2s",
});

const dropIconStyle = { fontSize: "2rem", marginBottom: "0.5rem" };

const dropLabelStyle = {
  color: "#b0a08a",
  fontSize: "0.95rem",
  margin: "0 0 4px",
};

const dropHintStyle = {
  color: "#7a6e5e",
  fontSize: "0.8rem",
  margin: 0,
};

const previewWrapStyle = { position: "relative", borderRadius: "8px", overflow: "hidden" };

const previewImgStyle = {
  width: "100%",
  maxHeight: "200px",
  objectFit: "cover",
  display: "block",
};

const previewOverlayStyle = {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  padding: "0.5rem",
  background: "linear-gradient(transparent, rgba(0,0,0,0.75))",
  display: "flex",
  justifyContent: "flex-end",
};

const removeImgBtnStyle = {
  background: "rgba(0,0,0,0.5)",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: "4px",
  color: "#ddd",
  fontSize: "0.8rem",
  padding: "4px 10px",
  cursor: "pointer",
};

const imgErrorStyle = { color: "#ff9089", fontSize: "0.85rem", margin: "4px 0 0" };

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

const submitBtnStyle = {
  fontFamily: "'Cinzel', serif",
  fontSize: "0.9rem",
  fontWeight: "700",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--bg-deep)",
  background: `linear-gradient(135deg, var(--gold), var(--gold-light))`,
  border: "none",
  borderRadius: "6px",
  padding: "0.85rem 1.5rem",
  cursor: "pointer",
  boxShadow: `0 4px 20px rgba(201,168,76,0.25)`,
  transition: "opacity 0.2s, transform 0.15s",
  marginTop: "0.5rem",
};

export default CreateCampaignPage;