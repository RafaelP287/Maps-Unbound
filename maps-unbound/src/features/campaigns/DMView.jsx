import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

import placeholderImage from "./images/DnD.jpg";
import ImageDrop from "../../shared/ImageDrop.jsx";
import PlayerSearch from "../../shared/PlayerSearch.jsx";
import CampaignHero from "./CampaignHero.jsx";
import CampaignSections from "./CampaignSections.jsx";

function DMView({ campaign, refetch }) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const id = campaign._id;

  // Derived campaign data
  const dmMember = campaign.members.find((m) => m.role === "DM");
  const dm = dmMember?.userId?.username || "Unknown";
  const players = campaign.members.filter((m) => m.role === "Player");

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(campaign.title || "");
  const [editDescription, setEditDescription] = useState(campaign.description || "");
  const [editImage, setEditImage] = useState(campaign.image || "");
  const [editPlayStyle, setEditPlayStyle] = useState(campaign.playStyle || "Online");
  const [editMaxPlayers, setEditMaxPlayers] = useState(campaign.maxPlayers || 5);
  const [editStartDate, setEditStartDate] = useState(
    campaign.startDate ? new Date(campaign.startDate).toISOString().split("T")[0] : ""
  );
  const [editStatus, setEditStatus] = useState(campaign.status || "Planning");
  const [editPlayers, setEditPlayers] = useState(
    players.map((m) => ({ userId: m.userId._id, username: m.userId.username }))
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const backgroundImage = campaign.image || placeholderImage;
  const activeBg = isEditing && editImage ? editImage : backgroundImage;

  const handleSave = async () => {
    setSaving(true); setSaveError(null);
    try {
      // Keep front-end guardrails aligned with backend limits for faster feedback.
      const maxPlayers = Number(editMaxPlayers);
      if (!Number.isFinite(maxPlayers) || maxPlayers < 1 || maxPlayers > 12) {
        throw new Error("Max players must be between 1 and 12.");
      }
      if (editPlayers.length > maxPlayers) {
        throw new Error("Party exceeds max players. Increase max players or remove players.");
      }
      // Preserve DM membership while applying player edits; backend authorizes updates by DM role.
      const dmEntry = { userId: dmMember.userId._id, role: "DM" };
      const memberPayload = [dmEntry, ...editPlayers.map((p) => ({ userId: p.userId, role: "Player" }))];
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          image: editImage || undefined,
          playStyle: editPlayStyle,
          maxPlayers,
          startDate: editStartDate || undefined,
          status: editStatus,
          members: memberPayload,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || `Status ${res.status}`); }
      await refetch();
      setIsEditing(false);
    } catch (err) { setSaveError(err.message || "Failed to save changes."); }
    finally { setSaving(false); }
  };

  const handleCancelEdit = () => {
    // Reset edit state back to server values.
    setEditTitle(campaign.title || "");
    setEditDescription(campaign.description || "");
    setEditImage(campaign.image || "");
    setEditPlayStyle(campaign.playStyle || "Online");
    setEditMaxPlayers(campaign.maxPlayers || 5);
    setEditStartDate(campaign.startDate ? new Date(campaign.startDate).toISOString().split("T")[0] : "");
    setEditStatus(campaign.status || "Planning");
    setEditPlayers(players.map((m) => ({ userId: m.userId._id, username: m.userId.username })));
    setSaveError(null);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      // Hard delete campaign and return to list after successful API confirmation.
      const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || `Status ${res.status}`); }
      navigate("/campaigns");
    } catch (err) { setDeleteError(err.message || "Failed to delete campaign."); setDeleting(false); setShowDeleteConfirm(false); }
  };

  return (
    <div className="campaign-page">
      {/* Hero background */}
      <div className="campaign-hero-bg-wrap">
        <div className="campaign-hero-bg-img" style={{ backgroundImage: `url(${activeBg})` }} />
        <div className="campaign-hero-bg-fade" />
      </div>

      <div className="campaign-content-wrap">
        <CampaignHero
          campaign={campaign}
          isEditing={isEditing}
          editTitle={editTitle}
          editDescription={editDescription}
          onTitleChange={setEditTitle}
          onDescriptionChange={setEditDescription}
        />

        <div className="campaign-card-panel">
          {/* Image editor */}
          {isEditing && (
            <div className="campaign-field-group">
              <span className="campaign-field-label">Campaign Artwork</span>
              <ImageDrop
                imagePreview={editImage || null}
                onImageChange={(val) => setEditImage(val || "")}
                compact
              />
            </div>
          )}

          {/* Player editor */}
          {isEditing && (
            <PlayerSearch
              players={editPlayers}
              onAddPlayer={(p) => setEditPlayers((prev) => [...prev, p])}
              onRemovePlayer={(userId) => setEditPlayers((prev) => prev.filter((p) => p.userId !== userId))}
            />
          )}

          {isEditing && (
            <div className="campaign-field-grid">
              <div className="campaign-field-group">
                <span className="campaign-field-label">Play Style</span>
                <select className="campaign-select" value={editPlayStyle} onChange={(e) => setEditPlayStyle(e.target.value)}>
                  <option value="Online">Online</option>
                  <option value="In Person">In Person</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>
              <div className="campaign-field-group">
                <span className="campaign-field-label">Status</span>
                <select className="campaign-select" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                  <option value="Planning">Planning</option>
                  <option value="Active">Active</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div className="campaign-field-group">
                <span className="campaign-field-label">Max Players</span>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={editMaxPlayers}
                  onChange={(e) => setEditMaxPlayers(e.target.value)}
                />
              </div>
              <div className="campaign-field-group">
                <span className="campaign-field-label">Start Date</span>
                <input
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                />
              </div>
            </div>
          )}

          <CampaignSections campaign={campaign} dm={dm} players={players} isDM />

          {/* DM Controls */}
          <div className="campaign-dm-panel">
            <span className="campaign-dm-label">⚔ DM Controls</span>
            {saveError && <p className="campaign-error-text">{saveError}</p>}
            {deleteError && <p className="campaign-error-text">{deleteError}</p>}
            <div className="campaign-btn-row">
              {isEditing ? (
                <>
                  <button className="btn-save" onClick={handleSave} disabled={saving}>
                    {saving ? "Saving…" : "✓  Save Changes"}
                  </button>
                  <button className="btn-cancel" onClick={handleCancelEdit} disabled={saving}>Cancel</button>
                </>
              ) : (
                <>
                  <button className="btn-edit" onClick={() => setIsEditing(true)}>Edit Campaign</button>
                  <button className="btn-delete" onClick={() => setShowDeleteConfirm(true)}>Delete</button>
                </>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="campaign-footer">
            <Link to="/campaigns"><button className="btn-ghost">← Back to Campaigns</button></Link>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="campaign-modal-overlay">
          <div className="campaign-modal-box">
            <div className="campaign-modal-icon">⚠</div>
            <h3 className="campaign-modal-title">Burn the Chronicle?</h3>
            <p className="campaign-modal-body">
              <strong style={{ color: "var(--gold-light)" }}>{campaign.title}</strong> will be permanently destroyed. This cannot be undone.
            </p>
            <div className="campaign-btn-row">
              <button className="btn-delete" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting…" : "Yes, Delete"}
              </button>
              <button className="btn-cancel" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DMView;
