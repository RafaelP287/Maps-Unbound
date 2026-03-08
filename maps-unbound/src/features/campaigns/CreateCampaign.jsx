import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";

import ImageDrop from "../../shared/ImageDrop.jsx";
import PlayerSearch from "../../shared/PlayerSearch.jsx";

function CreateCampaignPage() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [form, setForm] = useState({
    title: "",
    description: "",
    playStyle: "Online",
    maxPlayers: 5,
    startDate: "",
    status: "Planning",
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [players, setPlayers] = useState([]);

  const updateForm = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const addPlayer = (player) => setPlayers((p) => [...p, player]);
  const removePlayer = (userId) => setPlayers((p) => p.filter((x) => x.userId !== userId));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const title = form.title.trim();
    const description = form.description.trim();
    const maxPlayers = Number(form.maxPlayers);

    if (title.length < 3) {
      setError("Campaign title must be at least 3 characters.");
      return;
    }
    if (description.length < 10) {
      setError("Description must be at least 10 characters.");
      return;
    }
    if (!Number.isFinite(maxPlayers) || maxPlayers < 1 || maxPlayers > 12) {
      setError("Max players must be between 1 and 12.");
      return;
    }
    if (players.length > maxPlayers) {
      setError("Party exceeds max players. Increase max players or remove some players.");
      return;
    }

    setLoading(true);
    const members = [{ userId: user.id, role: "DM" }, ...players.map((p) => ({ userId: p.userId, role: "Player" }))];
    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title,
          description,
          playStyle: form.playStyle,
          maxPlayers,
          startDate: form.startDate || undefined,
          status: form.status,
          image: imagePreview ?? undefined,
          members,
        }),
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
              onChange={(e) => updateForm("title", e.target.value)}
              required
              maxLength={80}
              placeholder="e.g. Curse of the Crimson Throne"
            />
          </div>

          {/* Description */}
          <div className="campaign-field-group">
            <label className="campaign-field-label">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => updateForm("description", e.target.value)}
              required
              maxLength={500}
              placeholder="Set the scene — what awaits your adventurers?"
              style={{ minHeight: "110px", resize: "vertical" }}
            />
            <span className="campaign-helper-text">{form.description.length}/500</span>
          </div>

          <div className="campaign-section-divider">
            <div className="campaign-section-line" />
            <span className="campaign-section-label">Campaign Setup</span>
            <div className="campaign-section-line" />
          </div>

          <div className="campaign-field-grid">
            <div className="campaign-field-group">
              <label className="campaign-field-label">Play Style</label>
              <select
                className="campaign-select"
                value={form.playStyle}
                onChange={(e) => updateForm("playStyle", e.target.value)}
              >
                <option value="Online">Online</option>
                <option value="In Person">In Person</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>

            <div className="campaign-field-group">
              <label className="campaign-field-label">Status</label>
              <select
                className="campaign-select"
                value={form.status}
                onChange={(e) => updateForm("status", e.target.value)}
              >
                <option value="Planning">Planning</option>
                <option value="Active">Active</option>
                <option value="On Hold">On Hold</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div className="campaign-field-group">
              <label className="campaign-field-label">Max Players</label>
              <input
                type="number"
                min="1"
                max="12"
                value={form.maxPlayers}
                onChange={(e) => updateForm("maxPlayers", e.target.value)}
                required
              />
            </div>

            <div className="campaign-field-group">
              <label className="campaign-field-label">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => updateForm("startDate", e.target.value)}
              />
            </div>
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
          <span className="campaign-helper-text">
            Party slots used: {players.length}/{form.maxPlayers || 0} (DM not included)
          </span>

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? "Forging the chronicle…" : "⚔  Create Campaign"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateCampaignPage;
