import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

import placeholderImage from "./images/DnD.jpg";
import ImageDrop from "../../shared/ImageDrop.jsx";
import PlayerSearch from "../../shared/PlayerSearch.jsx";
import CampaignHero from "./CampaignHero.jsx";
import CampaignSections from "./CampaignSections.jsx";
import useCampaignSessions from "./use-campaign-sessions.js";

function CampaignDMView({ campaign, refetch }) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const id = campaign._id;
  const editFocusRef = useRef(null);

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
  const [editCurrentQuestTitle, setEditCurrentQuestTitle] = useState(campaign.currentQuest?.title || "");
  const [editCurrentQuestObjective, setEditCurrentQuestObjective] = useState(campaign.currentQuest?.objective || "");
  const [editCurrentQuestStatus, setEditCurrentQuestStatus] = useState(campaign.currentQuest?.status || "In Progress");
  const [editNpcs, setEditNpcs] = useState(
    (campaign.npcs || []).map((npc) => ({
      name: npc?.name || "",
      role: npc?.role || "",
      notes: npc?.notes || "",
    }))
  );
  const [editEnemies, setEditEnemies] = useState(
    (campaign.enemies || []).map((enemy) => ({
      name: enemy?.name || "",
      role: enemy?.role || "",
      notes: enemy?.notes || "",
    }))
  );
  const [editLoot, setEditLoot] = useState(
    (campaign.loot || []).map((item) => ({
      name: item?.name || "",
      quantity: item?.quantity || 1,
      holder: item?.holder || "",
      notes: item?.notes || "",
    }))
  );
  const [editPlayers, setEditPlayers] = useState(
    players.map((m) => ({ userId: m.userId._id, username: m.userId.username }))
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [startingSession, setStartingSession] = useState(false);
  const [pendingSessionDeleteIds, setPendingSessionDeleteIds] = useState([]);
  const [showSessionDeleteConfirmOnSave, setShowSessionDeleteConfirmOnSave] = useState(false);
  const [sessionActionError, setSessionActionError] = useState("");

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const { sessions, refetch: refetchSessions } = useCampaignSessions(campaign._id);

  const backgroundImage = campaign.image || placeholderImage;
  const activeBg = isEditing && editImage ? editImage : backgroundImage;
  const pendingSessionNames = sessions
    .filter((session) => pendingSessionDeleteIds.includes(session._id))
    .map((session) => session.title || "Untitled Session");

  const executeSave = async ({ applySessionDeletes = false } = {}) => {
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
      const questTitle = editCurrentQuestTitle.trim();
      const questObjective = editCurrentQuestObjective.trim();
      const npcs = editNpcs.map((npc) => ({
        name: npc.name.trim(),
        role: npc.role.trim(),
        notes: npc.notes.trim(),
      })).filter((npc) => npc.name);
      const enemies = editEnemies.map((enemy) => ({
        name: enemy.name.trim(),
        role: enemy.role.trim(),
        notes: enemy.notes.trim(),
      })).filter((enemy) => enemy.name);
      const loot = editLoot.map((item) => {
        const quantity = Number(item.quantity);
        return {
          name: item.name.trim(),
          quantity: Number.isFinite(quantity) ? Math.max(1, Math.min(999, Math.trunc(quantity))) : 1,
          holder: item.holder.trim(),
          notes: item.notes.trim(),
        };
      }).filter((item) => item.name);
      const currentQuest = (questTitle || questObjective)
        ? {
            title: questTitle,
            objective: questObjective,
            status: editCurrentQuestStatus,
            updatedAt: new Date().toISOString(),
          }
        : null;
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
          currentQuest,
          npcs,
          enemies,
          loot,
          members: memberPayload,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || `Status ${res.status}`); }
      if (applySessionDeletes && pendingSessionDeleteIds.length > 0) {
        const sessionsToDelete = sessions.filter((session) => pendingSessionDeleteIds.includes(session._id));
        for (const session of sessionsToDelete) {
          const deleteRes = await fetch(`/api/sessions/${session._id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!deleteRes.ok) {
            const data = await deleteRes.json().catch(() => ({}));
            const sessionName = session.title || "Untitled Session";
            throw new Error(data.error || `Failed to delete session: ${sessionName}`);
          }
        }
        await refetchSessions();
      }
      await refetch();
      setPendingSessionDeleteIds([]);
      setShowSessionDeleteConfirmOnSave(false);
      setIsEditing(false);
    } catch (err) { setSaveError(err.message || "Failed to save changes."); }
    finally { setSaving(false); }
  };

  const handleSave = async () => {
    if (pendingSessionDeleteIds.length > 0) {
      setShowSessionDeleteConfirmOnSave(true);
      return;
    }
    await executeSave();
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
    setEditCurrentQuestTitle(campaign.currentQuest?.title || "");
    setEditCurrentQuestObjective(campaign.currentQuest?.objective || "");
    setEditCurrentQuestStatus(campaign.currentQuest?.status || "In Progress");
    setEditNpcs(
      (campaign.npcs || []).map((npc) => ({
        name: npc?.name || "",
        role: npc?.role || "",
        notes: npc?.notes || "",
      }))
    );
    setEditEnemies(
      (campaign.enemies || []).map((enemy) => ({
        name: enemy?.name || "",
        role: enemy?.role || "",
        notes: enemy?.notes || "",
      }))
    );
    setEditLoot(
      (campaign.loot || []).map((item) => ({
        name: item?.name || "",
        quantity: item?.quantity || 1,
        holder: item?.holder || "",
        notes: item?.notes || "",
      }))
    );
    setEditPlayers(players.map((m) => ({ userId: m.userId._id, username: m.userId.username })));
    setSaveError(null);
    setPendingSessionDeleteIds([]);
    setShowSessionDeleteConfirmOnSave(false);
    setIsEditing(false);
  };

  const startEditing = () => {
    setIsEditing(true);
    requestAnimationFrame(() => {
      editFocusRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
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

  const handleStartSession = async () => {
    if (startingSession) return;
    setStartingSession(true);
    setSaveError(null);
    setSessionActionError("");
    try {
      const nextSessionNumber = (sessions?.length || 0) + 1;
      const title = `Session ${nextSessionNumber}`;
      const createdAt = new Date().toISOString();
      const payload = {
        campaignId: campaign._id,
        title,
        sessionNumber: nextSessionNumber,
        status: "In Progress",
        startedAt: createdAt,
        participants: campaign.members.map((member) => ({
          userId: member.userId?._id || member.userId,
          role: member.role,
        })),
      };

      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to start session");
      }

      const createdSession = await res.json();
      await refetchSessions();
      navigate(
        `/session?campaignId=${campaign._id}&sessionId=${createdSession._id}&sessionName=${encodeURIComponent(createdSession.title)}`
      );
    } catch (err) {
      setSaveError(err.message || "Failed to start session.");
    } finally {
      setStartingSession(false);
    }
  };

  const toggleSessionPendingDelete = (sessionId) => {
    setPendingSessionDeleteIds((prev) =>
      prev.includes(sessionId)
        ? prev.filter((id) => id !== sessionId)
        : [...prev, sessionId]
    );
  };

  return (
    <div className="campaign-page">
      {/* Hero background */}
      <div className="campaign-hero-bg-wrap">
        <div className="campaign-hero-bg-img" style={{ backgroundImage: `url(${activeBg})` }} />
        <div className="campaign-hero-bg-fade" />
      </div>

      <div className="campaign-content-wrap" ref={editFocusRef}>
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

          {isEditing && (
            <section className="campaign-section-panel campaign-quest-panel">
              <div className="campaign-details-header">
                <span className="campaign-details-icon">✦</span>
                <span className="campaign-details-heading">Current Quest Tracker</span>
                <span className="campaign-details-icon">✦</span>
              </div>
              <div className="campaign-field-group">
                <span className="campaign-field-label">Quest Title</span>
                <input
                  type="text"
                  maxLength="120"
                  value={editCurrentQuestTitle}
                  onChange={(e) => setEditCurrentQuestTitle(e.target.value)}
                  placeholder="Recover the Sunken Sigil"
                />
              </div>
              <div className="campaign-field-group">
                <span className="campaign-field-label">Objective</span>
                <textarea
                  className="campaign-quest-objective"
                  maxLength="500"
                  value={editCurrentQuestObjective}
                  onChange={(e) => setEditCurrentQuestObjective(e.target.value)}
                  placeholder="Track the sigil to the flooded catacombs beneath Thornwatch."
                />
              </div>
              <div className="campaign-field-group">
                <span className="campaign-field-label">Progress</span>
                <select className="campaign-select" value={editCurrentQuestStatus} onChange={(e) => setEditCurrentQuestStatus(e.target.value)}>
                  <option value="In Progress">In Progress</option>
                  <option value="Blocked">Blocked</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <p className="campaign-helper-text">
                Leave title and objective blank to clear the current quest.
              </p>
            </section>
          )}

          {isEditing && (
            <section className="campaign-section-panel">
              <div className="campaign-details-header">
                <span className="campaign-details-icon">✦</span>
                <span className="campaign-details-heading">Session Records</span>
                <span className="campaign-details-icon">✦</span>
              </div>
              <div className="campaign-edit-list">
                {sessions.length === 0 && <p className="campaign-helper-text">No sessions recorded yet.</p>}
                {sessions.map((session) => (
                  <div className="campaign-edit-item" key={session._id}>
                    <div className="campaign-resource-title-row">
                      <h3 className="campaign-resource-title">{session.title || "Untitled Session"}</h3>
                      <span className="campaign-resource-meta">{session.status || "Planned"}</span>
                    </div>
                    <p className="campaign-helper-text">
                      {session.startedAt
                        ? `Started ${new Date(session.startedAt).toLocaleString()}`
                        : "Start time not recorded"}
                      {session.endedAt ? ` • Ended ${new Date(session.endedAt).toLocaleString()}` : ""}
                    </p>
                    <button
                      type="button"
                      className={pendingSessionDeleteIds.includes(session._id) ? "btn-cancel" : "btn-delete"}
                      onClick={() => toggleSessionPendingDelete(session._id)}
                    >
                      {pendingSessionDeleteIds.includes(session._id) ? "Undo Delete" : "Mark Delete"}
                    </button>
                  </div>
                ))}
              </div>
              {pendingSessionDeleteIds.length > 0 && (
                <p className="campaign-helper-text">
                  {pendingSessionDeleteIds.length} session record(s) marked for deletion. They will be deleted when you save changes.
                </p>
              )}
              {sessionActionError && <p className="campaign-error-text">{sessionActionError}</p>}
            </section>
          )}

          {isEditing && (
            <section className="campaign-section-panel">
              <div className="campaign-details-header">
                <span className="campaign-details-icon">✦</span>
                <span className="campaign-details-heading">Enemy Tracker</span>
                <span className="campaign-details-icon">✦</span>
              </div>
              <div className="campaign-edit-list">
                {editEnemies.length === 0 && <p className="campaign-helper-text">No enemies added yet.</p>}
                {editEnemies.map((enemy, idx) => (
                  <div className="campaign-edit-item" key={`enemy-${idx}`}>
                    <input
                      type="text"
                      maxLength="80"
                      placeholder="Enemy name"
                      value={enemy.name}
                      onChange={(e) => setEditEnemies((prev) => prev.map((p, i) => i === idx ? { ...p, name: e.target.value } : p))}
                    />
                    <input
                      type="text"
                      maxLength="120"
                      placeholder="Role (Boss, Minion, Beast...)"
                      value={enemy.role}
                      onChange={(e) => setEditEnemies((prev) => prev.map((p, i) => i === idx ? { ...p, role: e.target.value } : p))}
                    />
                    <textarea
                      maxLength="400"
                      placeholder="Notes"
                      value={enemy.notes}
                      onChange={(e) => setEditEnemies((prev) => prev.map((p, i) => i === idx ? { ...p, notes: e.target.value } : p))}
                    />
                    <button
                      type="button"
                      className="btn-cancel"
                      onClick={() => setEditEnemies((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      Remove Enemy
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="btn-edit"
                onClick={() => setEditEnemies((prev) => [...prev, { name: "", role: "", notes: "" }])}
              >
                + Add Enemy
              </button>
            </section>
          )}

          {isEditing && (
            <section className="campaign-section-panel">
              <div className="campaign-details-header">
                <span className="campaign-details-icon">✦</span>
                <span className="campaign-details-heading">NPC Tracker</span>
                <span className="campaign-details-icon">✦</span>
              </div>
              <div className="campaign-edit-list">
                {editNpcs.length === 0 && <p className="campaign-helper-text">No NPCs added yet.</p>}
                {editNpcs.map((npc, idx) => (
                  <div className="campaign-edit-item" key={`npc-${idx}`}>
                    <input
                      type="text"
                      maxLength="80"
                      placeholder="NPC name"
                      value={npc.name}
                      onChange={(e) => setEditNpcs((prev) => prev.map((p, i) => i === idx ? { ...p, name: e.target.value } : p))}
                    />
                    <input
                      type="text"
                      maxLength="120"
                      placeholder="Role (Guide, Merchant, Rival...)"
                      value={npc.role}
                      onChange={(e) => setEditNpcs((prev) => prev.map((p, i) => i === idx ? { ...p, role: e.target.value } : p))}
                    />
                    <textarea
                      maxLength="400"
                      placeholder="Notes"
                      value={npc.notes}
                      onChange={(e) => setEditNpcs((prev) => prev.map((p, i) => i === idx ? { ...p, notes: e.target.value } : p))}
                    />
                    <button
                      type="button"
                      className="btn-cancel"
                      onClick={() => setEditNpcs((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      Remove NPC
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="btn-edit"
                onClick={() => setEditNpcs((prev) => [...prev, { name: "", role: "", notes: "" }])}
              >
                + Add NPC
              </button>
            </section>
          )}

          {isEditing && (
            <section className="campaign-section-panel">
              <div className="campaign-details-header">
                <span className="campaign-details-icon">✦</span>
                <span className="campaign-details-heading">Loot Tracker</span>
                <span className="campaign-details-icon">✦</span>
              </div>
              <div className="campaign-edit-list">
                {editLoot.length === 0 && <p className="campaign-helper-text">No loot added yet.</p>}
                {editLoot.map((item, idx) => (
                  <div className="campaign-edit-item" key={`loot-${idx}`}>
                    <input
                      type="text"
                      maxLength="120"
                      placeholder="Loot item"
                      value={item.name}
                      onChange={(e) => setEditLoot((prev) => prev.map((p, i) => i === idx ? { ...p, name: e.target.value } : p))}
                    />
                    <div className="campaign-field-grid">
                      <input
                        type="number"
                        min="1"
                        max="999"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => setEditLoot((prev) => prev.map((p, i) => i === idx ? { ...p, quantity: e.target.value } : p))}
                      />
                      <input
                        type="text"
                        maxLength="80"
                        placeholder="Held by"
                        value={item.holder}
                        onChange={(e) => setEditLoot((prev) => prev.map((p, i) => i === idx ? { ...p, holder: e.target.value } : p))}
                      />
                    </div>
                    <textarea
                      maxLength="300"
                      placeholder="Loot notes"
                      value={item.notes}
                      onChange={(e) => setEditLoot((prev) => prev.map((p, i) => i === idx ? { ...p, notes: e.target.value } : p))}
                    />
                    <button
                      type="button"
                      className="btn-cancel"
                      onClick={() => setEditLoot((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      Remove Loot
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="btn-edit"
                onClick={() => setEditLoot((prev) => [...prev, { name: "", quantity: 1, holder: "", notes: "" }])}
              >
                + Add Loot
              </button>
            </section>
          )}

          {!isEditing && (
            <CampaignSections
              campaign={campaign}
              dm={dm}
              players={players}
              sessions={sessions}
              isDM
              onStartEditing={startEditing}
            />
          )}

          {!isEditing && (
            <section className="campaign-session-cta">
              <button
                type="button"
                className="btn-start-session"
                onClick={handleStartSession}
                disabled={startingSession}
              >
                {startingSession ? "Starting Session..." : "▶ Start Session"}
              </button>
              <p className="campaign-helper-text">
                Open the map board and session tools for this campaign.
              </p>
            </section>
          )}

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
                  <button className="btn-edit" onClick={startEditing}>Edit Campaign</button>
                  <button className="btn-delete" onClick={() => setShowDeleteConfirm(true)}>Delete</button>
                </>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="campaign-footer">
            <Link to="/campaigns" className="btn-ghost campaign-btn-link">← Back to Campaigns</Link>
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
      {showSessionDeleteConfirmOnSave && (
        <div className="campaign-modal-overlay" onClick={() => setShowSessionDeleteConfirmOnSave(false)} role="presentation">
          <div className="campaign-modal-box" onClick={(event) => event.stopPropagation()}>
            <div className="campaign-modal-icon">⚠</div>
            <h3 className="campaign-modal-title">Delete Marked Sessions?</h3>
            <p className="campaign-modal-body">
              The following session record(s) are marked to be deleted on save:
            </p>
            <div className="campaign-session-delete-list">
              {pendingSessionNames.map((name) => (
                <p key={name} className="campaign-modal-body" style={{ margin: 0 }}>
                  • <strong style={{ color: "var(--gold-light)" }}>{name}</strong>
                </p>
              ))}
            </div>
            <p className="campaign-modal-body" style={{ color: "#ff9b93" }}>
              This action cannot be undone.
            </p>
            <div className="campaign-btn-row">
              <button
                className="btn-delete"
                onClick={() => executeSave({ applySessionDeletes: true })}
                disabled={saving}
              >
                {saving ? "Saving..." : "Yes, Save and Delete"}
              </button>
              <button
                className="btn-cancel"
                onClick={() => setShowSessionDeleteConfirmOnSave(false)}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CampaignDMView;
