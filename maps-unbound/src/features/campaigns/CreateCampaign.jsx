import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { CalendarDays, ImagePlus, Settings2, Shield, UsersRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";

import ImageDrop from "../../shared/ImageDrop.jsx";
import PlayerSearch from "../../shared/PlayerSearch.jsx";
import { clearCachePrefix } from "../../shared/dataCache.js";
import "./campaign.css";

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
    isHosting: false,
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

    // Normalize user input once so all validation and payload fields use consistent values.
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
    // maxPlayers is for player slots only; DM is not counted in this cap.
    if (players.length > maxPlayers) {
      setError("Party exceeds max players. Increase max players or remove some players.");
      return;
    }

    setLoading(true);
    // API expects a unified members array; include creator first as canonical DM entry.
    const currentUserId = user?._id || user?.id;
    const members = [{ userId: currentUserId, role: "DM" }, ...players.map((p) => ({ userId: p.userId, role: "Player" }))];
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
          isHosting: form.isHosting,
          isPublic: true,
          image: imagePreview ?? undefined,
          members,
        }),
      });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || "Failed to create campaign"); }
      clearCachePrefix("campaigns:list:");
      navigate("/campaigns", { replace: true });
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="campaign-page-padded create-campaign-page">
      <div className="create-campaign-shell">
        <header className="create-campaign-header">
          <div className="create-campaign-header-copy">
            <p className="campaign-index-eyebrow">Campaign Builder</p>
            <h1 className="create-campaign-title">Forge a New Campaign</h1>
            <p className="create-campaign-subtitle">
              Set the premise, table details, artwork, and first invites from one clean desktop workspace.
            </p>
          </div>
          <div className="create-campaign-header-card" aria-label="Campaign creation checklist">
            <span><Shield size={16} /> You are the DM</span>
            <span><UsersRound size={16} /> {players.length}/{form.maxPlayers || 0} player slots</span>
          </div>
        </header>

        {error && (
          <div className="campaign-error-banner">
            <span style={{ marginRight: "0.5rem" }}>⚠</span>{error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="campaign-form">
          <div className="create-campaign-layout">
            <main className="create-campaign-main">
              <section className="create-campaign-panel">
                <div className="create-campaign-panel-heading">
                  <Shield size={18} aria-hidden="true" />
                  <div>
                    <h2>Campaign Identity</h2>
                    <p>Name the table and give players the hook.</p>
                  </div>
                </div>

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

                <div className="campaign-field-group">
                  <label className="campaign-field-label">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => updateForm("description", e.target.value)}
                    required
                    maxLength={500}
                    placeholder="Set the scene - what awaits your adventurers?"
                    className="create-campaign-description"
                  />
                  <span className="campaign-helper-text">{form.description.length}/500</span>
                </div>
              </section>

              <section className="create-campaign-panel">
                <div className="create-campaign-panel-heading">
                  <Settings2 size={18} aria-hidden="true" />
                  <div>
                    <h2>Table Setup</h2>
                    <p>Define availability, party size, and where this campaign appears.</p>
                  </div>
                </div>

                <div className="campaign-field-grid create-campaign-field-grid">
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

                  <div className="campaign-field-group create-campaign-field-wide">
                    <label className="campaign-field-label">Party Finder</label>
                    <select
                      className="campaign-select"
                      value={form.isHosting ? "true" : "false"}
                      onChange={(e) => updateForm("isHosting", e.target.value === "true")}
                    >
                      <option value="false">Hidden</option>
                      <option value="true">Findable</option>
                    </select>
                    <span className="campaign-helper-text">Findable campaigns can receive DM-approved join requests.</span>
                  </div>
                </div>
              </section>
            </main>

            <aside className="create-campaign-aside">
              <section className="create-campaign-panel create-campaign-side-panel">
                <div className="create-campaign-panel-heading">
                  <ImagePlus size={18} aria-hidden="true" />
                  <div>
                    <h2>Artwork</h2>
                    <p>Upload a banner image for campaign cards and details.</p>
                  </div>
                </div>
                <ImageDrop imagePreview={imagePreview} onImageChange={setImagePreview} />
              </section>

              <section className="create-campaign-panel create-campaign-side-panel">
                <div className="create-campaign-panel-heading">
                  <UsersRound size={18} aria-hidden="true" />
                  <div>
                    <h2>Party</h2>
                    <p>Invite players now, or leave slots open for later.</p>
                  </div>
                </div>
                <PlayerSearch players={players} onAddPlayer={addPlayer} onRemovePlayer={removePlayer} />
                <span className="campaign-helper-text">
                  Party slots used: {players.length}/{form.maxPlayers || 0} (DM not included)
                </span>
              </section>

              <section className="create-campaign-summary" aria-label="Campaign summary">
                <div>
                  <span>Play Style</span>
                  <strong>{form.playStyle}</strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong>{form.status}</strong>
                </div>
                <div>
                  <span>Start</span>
                  <strong><CalendarDays size={15} /> {form.startDate || "Unscheduled"}</strong>
                </div>
              </section>
            </aside>
          </div>

          <footer className="create-campaign-actions">
            <button type="button" className="btn-ghost" onClick={() => navigate("/campaigns")}>
              Cancel
            </button>
            <button type="submit" className="btn-submit create-campaign-submit" disabled={loading}>
              {loading ? "Forging the Chronicle..." : "Create Campaign"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

export default CreateCampaignPage;
