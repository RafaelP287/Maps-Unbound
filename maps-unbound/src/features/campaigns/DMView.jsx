import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

import placeholderImage from "./images/DnD.jpg";
import ImageDrop from "../../shared/ImageDrop.jsx";
import PlayerSearch from "../../shared/PlayerSearch.jsx";
import CampaignHero from "./CampaignHero.jsx";

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
      const dmEntry = { userId: dmMember.userId._id, role: "DM" };
      const memberPayload = [dmEntry, ...editPlayers.map((p) => ({ userId: p.userId, role: "Player" }))];
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: editTitle, description: editDescription, image: editImage || undefined, members: memberPayload }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || `Status ${res.status}`); }
      await refetch();
      setIsEditing(false);
    } catch (err) { setSaveError(err.message || "Failed to save changes."); }
    finally { setSaving(false); }
  };

  const handleCancelEdit = () => {
    setEditTitle(campaign.title || "");
    setEditDescription(campaign.description || "");
    setEditImage(campaign.image || "");
    setEditPlayers(players.map((m) => ({ userId: m.userId._id, username: m.userId.username })));
    setSaveError(null);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
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

          {/* Details panel */}
          <div className="campaign-details-panel">
            <div className="campaign-details-header">
              <span className="campaign-details-icon">⚜</span>
              <span className="campaign-details-heading">Campaign Details</span>
              <span className="campaign-details-icon">⚜</span>
            </div>
            <div className="campaign-details-grid">
              <div className="campaign-detail-row">
                <span className="campaign-detail-key">Dungeon Master</span>
                <span className="campaign-detail-val">
                  {dm}
                  <span className="badge-dm">You</span>
                </span>
              </div>
              <div className="campaign-detail-divider" />
              <div className="campaign-detail-row">
                <span className="campaign-detail-key">Adventurers</span>
                <span className="campaign-detail-val">
                  {players.length > 0
                    ? players.map((p) => p.userId?.username).join(" · ")
                    : <em style={{ color: "#7a6e5e" }}>No players yet</em>}
                </span>
              </div>
            </div>
          </div>

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
                  <button className="btn-edit" onClick={() => setIsEditing(true)}>✏  Edit Campaign</button>
                  <button className="btn-delete" onClick={() => setShowDeleteConfirm(true)}>🗑  Delete</button>
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