import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";

import ImageDrop from "../../shared/ImageDrop.jsx";
import PlayerSearch from "../../shared/PlayerSearch.jsx";

function CreateCampaignPage() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [form, setForm] = useState({ title: "", description: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [players, setPlayers] = useState([]);

  const addPlayer = (player) => setPlayers((p) => [...p, player]);
  const removePlayer = (userId) => setPlayers((p) => p.filter((x) => x.userId !== userId));

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

          <ImageDrop imagePreview={imagePreview} onImageChange={setImagePreview} />

          {/* Separator */}
          <div style={sectionDividerStyle}>
            <div style={sectionLineStyle} />
            <span style={sectionLabelStyle}>Assemble Your Party</span>
            <div style={sectionLineStyle} />
          </div>

          <PlayerSearch players={players} onAddPlayer={addPlayer} onRemovePlayer={removePlayer} />

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

const headerStyle = { textAlign: "center", marginBottom: "2.5rem" };

const dividerStyle = {
  height: "1px",
  background: `linear-gradient(to right, transparent, var(--border), transparent)`,
  margin: "0.75rem 0",
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

const formStyle = { display: "flex", flexDirection: "column", gap: "1.25rem" };

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