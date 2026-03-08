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
    <div className="campaign-page-padded">
      <div className="campaign-content-narrow">
        {/* Header */}
        <header className="campaign-page-header">
          <div className="campaign-header-divider" />
          <div className="campaign-header-row">
            <span className="campaign-header-rune">✦</span>
            <h1 className="campaign-page-title">Forge a New Campaign</h1>
            <span className="campaign-header-rune">✦</span>
          </div>
          <p className="campaign-page-subtitle">Chronicle your legend — name it, describe it, assemble your party.</p>
          <div className="campaign-header-divider" />
        </header>

        {error && (
          <div className="campaign-error-banner">
            <span style={{ marginRight: "0.5rem" }}>⚠</span>{error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="campaign-form">
          {/* Title */}
          <div className="campaign-field-group">
            <label className="campaign-field-label">Campaign Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              placeholder="e.g. Curse of the Crimson Throne"
            />
          </div>

          {/* Description */}
          <div className="campaign-field-group">
            <label className="campaign-field-label">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
              placeholder="Set the scene — what awaits your adventurers?"
              style={{ minHeight: "110px", resize: "vertical" }}
            />
          </div>

          {/* Separator */}
          <div className="campaign-section-divider">
            <div className="campaign-section-line" />
            <span className="campaign-section-label">Campaign Artwork</span>
            <div className="campaign-section-line" />
          </div>

          <ImageDrop imagePreview={imagePreview} onImageChange={setImagePreview} />

          {/* Separator */}
          <div className="campaign-section-divider">
            <div className="campaign-section-line" />
            <span className="campaign-section-label">Assemble Your Party</span>
            <div className="campaign-section-line" />
          </div>

          <PlayerSearch players={players} onAddPlayer={addPlayer} onRemovePlayer={removePlayer} />

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? "Forging the chronicle…" : "⚔  Create Campaign"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateCampaignPage;