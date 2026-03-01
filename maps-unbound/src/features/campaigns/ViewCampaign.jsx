import { useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import placeholderImage from "./images/DnD.jpg";
import { useAuth } from "../../context/AuthContext.jsx";

function ViewCampaignPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token, isLoggedIn, loading: authLoading } = useAuth();

  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editImage, setEditImage] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const [isDragging, setIsDragging] = useState(false);
  const [imageError, setImageError] = useState(null);
  const fileInputRef = useRef(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) { setError("No campaign ID provided."); setLoading(false); return; }
    if (!isLoggedIn) { setError("Please sign in to view campaign details."); setLoading(false); return; }

    const fetchCampaign = async () => {
      try {
        const res = await fetch(`/api/campaigns/${id}`, {
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Server returned status ${res.status}`);
        const data = await res.json();
        if (!data || !data._id) { setError("Campaign not found."); }
        else {
          setCampaign(data);
          setEditTitle(data.title || "");
          setEditDescription(data.description || "");
          setEditImage(data.image || "");
        }
      } catch (err) { console.error(err); setError("Failed to load campaign."); }
      finally { setLoading(false); }
    };

    fetchCampaign();
  }, [id, token, isLoggedIn]);

  const dmMember = campaign?.members?.find((m) => m.role === "DM");
  const isDM = dmMember?.userId?._id?.toString() === user?.id?.toString();
  const dm = dmMember?.userId?.username || "Unknown";
  const players = campaign?.members?.filter((m) => m.role === "Player") || [];
  const backgroundImage = campaign?.image || placeholderImage;
  const activeBg = isEditing && editImage ? editImage : backgroundImage;

  const processImageFile = (file) => {
    setImageError(null);
    if (!file.type.startsWith("image/")) { setImageError("Please upload an image file."); return; }
    if (file.size > 10 * 1024 * 1024) { setImageError("Image must be under 10MB."); return; }
    const reader = new FileReader();
    reader.onload = (e) => setEditImage(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) processImageFile(f); };
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleFileInput = (e) => { const f = e.target.files[0]; if (f) processImageFile(f); };
  const removeImage = () => { setEditImage(""); setImageError(null); if (fileInputRef.current) fileInputRef.current.value = ""; };

  const handleSave = async () => {
    setSaving(true); setSaveError(null);
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: editTitle, description: editDescription, image: editImage || undefined }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || `Status ${res.status}`); }
      const updated = await res.json();
      setCampaign(updated);
      setIsEditing(false);
    } catch (err) { setSaveError(err.message || "Failed to save changes."); }
    finally { setSaving(false); }
  };

  const handleCancelEdit = () => {
    setEditTitle(campaign.title || ""); setEditDescription(campaign.description || "");
    setEditImage(campaign.image || ""); setImageError(null); setSaveError(null);
    setIsEditing(false); if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || `Status ${res.status}`); }
      navigate("/campaigns");
    } catch (err) { setError(err.message || "Failed to delete campaign."); setDeleting(false); setShowDeleteConfirm(false); }
  };

  if (loading || authLoading) {
    return (
      <div style={loadingWrapStyle}>
        <div style={spinnerStyle}>✦</div>
        <p style={loadingTextStyle}>Unrolling the scroll…</p>
      </div>
    );
  }
  if (error) return <div style={fullCenterStyle}><p style={errorMsgStyle}>⚠ {error}</p><Link to="/campaigns"><button style={ghostBtnStyle}>← Back to Campaigns</button></Link></div>;
  if (!campaign) return <div style={fullCenterStyle}><p style={errorMsgStyle}>Campaign not found.</p></div>;

  return (
    <div style={pageStyle}>
      {/* ── Hero background image — fades into page bg at the bottom ── */}
      <div style={heroBgWrapStyle}>
        <div style={{ ...heroBgImgStyle, backgroundImage: `url(${activeBg})` }} />
        <div style={heroBgFadeStyle} />
      </div>

      <div style={contentWrapStyle}>
        {/* ── Hero header ── */}
        <section style={heroStyle}>
          {isEditing ? (
            <div style={editHeaderWrapStyle}>
              <input
                style={{ ...editInputStyle, fontSize: "1.5rem", fontFamily: "'Cinzel Decorative', serif" }}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Campaign title"
              />
              <textarea
                style={{ ...editInputStyle, minHeight: "80px", resize: "vertical" }}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Campaign description"
              />
            </div>
          ) : (
            <div style={heroTextStyle}>
              <div style={heroDividerStyle} />
              <h1 style={heroTitleStyle}>{campaign.title}</h1>
              <div style={heroDividerStyle} />
              <p style={heroDescStyle}>{campaign.description}</p>
            </div>
          )}
        </section>

        {/* ── Main card ── */}
        <div style={cardStyle}>

          {/* Image editor (only in edit mode) */}
          {isEditing && (
            <div style={fieldGroupStyle}>
              <span style={fieldLabelStyle}>Campaign Artwork</span>
              {editImage ? (
                <div style={previewWrapStyle}>
                  <img src={editImage} alt="Campaign preview" style={previewImgStyle} />
                  <div style={previewOverlayStyle}>
                    <button type="button" onClick={removeImage} style={removeImgBtnStyle}>✕ Remove</button>
                  </div>
                </div>
              ) : (
                <div style={dropZoneStyle(isDragging)} onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onClick={() => fileInputRef.current?.click()}>
                  <div style={{ fontSize: "1.8rem" }}>🖼️</div>
                  <p style={dropLabelStyle}>Drag & drop or <u>browse</u></p>
                  <p style={dropHintStyle}>PNG · JPG · WEBP — max 10 MB</p>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileInput} style={{ display: "none" }} />
              {imageError && <p style={imgErrorStyle}>{imageError}</p>}
            </div>
          )}

          {/* Details panel */}
          <div style={detailsPanelStyle}>
            <div style={detailsHeaderStyle}>
              <span style={detailsIconStyle}>⚜</span>
              <span style={detailsHeadingStyle}>Campaign Details</span>
              <span style={detailsIconStyle}>⚜</span>
            </div>

            <div style={detailsGridStyle}>
              <div style={detailRowStyle}>
                <span style={detailKeyStyle}>Dungeon Master</span>
                <span style={detailValStyle}>
                  {dm}
                  {isDM && <span style={dmBadgeStyle}>You</span>}
                </span>
              </div>
              <div style={detailDivStyle} />
              <div style={detailRowStyle}>
                <span style={detailKeyStyle}>Adventurers</span>
                <span style={detailValStyle}>
                  {players.length > 0
                    ? players.map((p) => p.userId?.username).join(" · ")
                    : <em style={{ color: "#7a6e5e" }}>No players yet</em>}
                </span>
              </div>
            </div>
          </div>

          {/* DM Controls */}
          {isDM && (
            <div style={dmPanelStyle}>
              <div style={dmHeaderStyle}>
                <span style={dmLabelStyle}>⚔ DM Controls</span>
              </div>
              {saveError && <p style={imgErrorStyle}>{saveError}</p>}
              <div style={btnRowStyle}>
                {isEditing ? (
                  <>
                    <button style={saveBtnStyle} onClick={handleSave} disabled={saving}>
                      {saving ? "Saving…" : "✓  Save Changes"}
                    </button>
                    <button style={cancelBtnStyle} onClick={handleCancelEdit} disabled={saving}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button style={editBtnStyle} onClick={() => setIsEditing(true)}>✏  Edit Campaign</button>
                    <button style={deleteBtnStyle} onClick={() => setShowDeleteConfirm(true)}>🗑  Delete</button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={footerStyle}>
            <Link to="/campaigns">
              <button style={ghostBtnStyle}>← Back to Campaigns</button>
            </Link>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div style={modalOverlayStyle}>
          <div style={modalBoxStyle}>
            <div style={modalIconStyle}>⚠</div>
            <h3 style={modalTitleStyle}>Burn the Chronicle?</h3>
            <p style={modalBodyStyle}>
              <strong style={{ color: "var(--gold-light)" }}>{campaign.title}</strong> will be permanently destroyed.
              This cannot be undone.
            </p>
            <div style={btnRowStyle}>
              <button style={deleteBtnStyle} onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting…" : "Yes, Delete"}
              </button>
              <button style={cancelBtnStyle} onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Styles ── */
const pageStyle = {
  position: "relative",
  minHeight: "100vh",
  background: "var(--bg-deep)",
  fontFamily: "'Crimson Text', Georgia, serif",
  color: "#d4c5a9",
};

/* Hero background — fixed height, fades out downward into darkBg */
const heroBgWrapStyle = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  height: "520px",       /* how tall the image zone is — adjust freely */
  zIndex: 0,
  pointerEvents: "none",
};

const heroBgImgStyle = {
  position: "absolute",
  inset: 0,
  backgroundSize: "cover",
  backgroundPosition: "center top",
};

/* Layered fade: dim the photo, then dissolve into darkBg at the bottom */
const heroBgFadeStyle = {
  position: "absolute",
  inset: 0,
  background: `linear-gradient(
    to bottom,
    rgba(10,8,4,0.45) 0%,
    rgba(10,8,4,0.55) 40%,
    rgba(10,8,4,0.85) 75%,
    var(--bg-deep) 100%
  )`,
};

const contentWrapStyle = {
  position: "relative",
  zIndex: 2,
  maxWidth: "780px",
  margin: "0 auto",
  padding: "0 1.5rem 5rem",
};

/* Hero */
const heroStyle = {
  padding: "5rem 0 2.5rem",
  textAlign: "center",
};

const heroTextStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "0.6rem",
};

const heroDividerStyle = {
  width: "260px",
  height: "1px",
  background: `linear-gradient(to right, transparent, var(--border), transparent)`,
};

const heroTitleStyle = {
  fontFamily: "'Cinzel Decorative', serif",
  fontSize: "clamp(1.8rem, 5vw, 3rem)",
  color: "var(--gold-light)",
  margin: 0,
  textShadow: `0 2px 30px rgba(201,168,76,0.3), 0 0 60px rgba(201,168,76,0.1)`,
};

const heroDescStyle = {
  maxWidth: "540px",
  color: "#c0ad90",
  fontSize: "1.1rem",
  fontStyle: "italic",
  lineHeight: 1.6,
  margin: 0,
};

/* Edit mode header inputs */
const editHeaderWrapStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
  width: "100%",
  maxWidth: "540px",
  margin: "0 auto",
};

const editInputStyle = {
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
};

/* Main card */
const cardStyle = {
  background: "var(--panel-bg)",
  border: `1px solid var(--border)`,
  borderRadius: "12px",
  padding: "2rem",
  backdropFilter: "blur(12px)",
  display: "flex",
  flexDirection: "column",
  gap: "1.5rem",
};

/* Field */
const fieldGroupStyle = { display: "flex", flexDirection: "column", gap: "0.5rem" };

const fieldLabelStyle = {
  fontFamily: "'Cinzel', serif",
  fontSize: "0.75rem",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--gold)",
};

/* Image */
const dropZoneStyle = (isDragging) => ({
  border: `2px dashed ${isDragging ? gold : "rgba(201,168,76,0.25)"}`,
  borderRadius: "8px",
  padding: "1.5rem 1rem",
  textAlign: "center",
  cursor: "pointer",
  background: isDragging ? "rgba(201,168,76,0.07)" : "rgba(0,0,0,0.25)",
  transition: "border-color 0.2s, background 0.2s",
});

const dropLabelStyle = { color: "#b0a08a", fontSize: "0.9rem", margin: "4px 0 2px" };
const dropHintStyle = { color: "#6a5e50", fontSize: "0.78rem", margin: 0 };

const previewWrapStyle = {
  position: "relative",
  borderRadius: "8px",
  WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
  maskImage: "linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
};
const previewImgStyle = { width: "100%", maxHeight: "200px", objectFit: "cover", display: "block" };
const previewOverlayStyle = { position: "absolute", bottom: 0, left: 0, right: 0, padding: "0.5rem", background: "linear-gradient(transparent, rgba(0,0,0,0.7))", display: "flex", justifyContent: "flex-end" };
const removeImgBtnStyle = { background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "4px", color: "#ddd", fontSize: "0.8rem", padding: "4px 10px", cursor: "pointer" };
const imgErrorStyle = { color: "#ff9089", fontSize: "0.85rem", margin: "4px 0 0" };

/* Details */
const detailsPanelStyle = {
  background: "rgba(0,0,0,0.3)",
  border: `1px solid rgba(201,168,76,0.15)`,
  borderRadius: "8px",
  padding: "1.25rem 1.5rem",
};

const detailsHeaderStyle = {
  display: "flex",
  alignItems: "center",
  gap: "0.6rem",
  marginBottom: "1rem",
};

const detailsIconStyle = { color: "var(--gold)", fontSize: "0.85rem", opacity: 0.6 };

const detailsHeadingStyle = {
  fontFamily: "'Cinzel', serif",
  fontSize: "0.78rem",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--gold)",
};

const detailsGridStyle = { display: "flex", flexDirection: "column", gap: "0.75rem" };

const detailRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "1rem",
  flexWrap: "wrap",
};

const detailKeyStyle = {
  fontFamily: "'Cinzel', serif",
  fontSize: "0.8rem",
  color: "#9a8a70",
  letterSpacing: "0.06em",
};

const detailValStyle = {
  color: "#e8dcca",
  fontSize: "1rem",
};

const detailDivStyle = {
  height: "1px",
  background: "rgba(201,168,76,0.1)",
};

const dmBadgeStyle = {
  marginLeft: "0.6rem",
  background: `linear-gradient(135deg, var(--gold), var(--gold-light))`,
  color: "var(--bg-deep)",
  fontSize: "0.65rem",
  fontWeight: "700",
  padding: "2px 8px",
  borderRadius: "999px",
  letterSpacing: "0.08em",
  fontFamily: "'Cinzel', serif",
  textTransform: "uppercase",
  verticalAlign: "middle",
};

/* DM panel */
const dmPanelStyle = {
  background: "rgba(201,168,76,0.07)",
  border: `1px solid rgba(201,168,76,0.35)`,
  borderRadius: "8px",
  padding: "1rem 1.25rem",
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
};

const dmHeaderStyle = {};

const dmLabelStyle = {
  fontFamily: "'Cinzel', serif",
  fontSize: "0.75rem",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--gold)",
};

const btnRowStyle = { display: "flex", gap: "0.6rem", flexWrap: "wrap" };

const baseBtnStyle = {
  fontFamily: "'Cinzel', serif",
  fontSize: "0.78rem",
  fontWeight: "600",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  border: "none",
  borderRadius: "6px",
  padding: "0.55rem 1.2rem",
  cursor: "pointer",
  transition: "opacity 0.2s",
};

const editBtnStyle = { ...baseBtnStyle, background: `linear-gradient(135deg, var(--gold), var(--gold-light))`, color: "var(--bg-deep)" };
const saveBtnStyle = { ...baseBtnStyle, background: "linear-gradient(135deg, #4caf82, #72d4a8)", color: "var(--bg-deep)" };
const cancelBtnStyle = { ...baseBtnStyle, background: "rgba(255,255,255,0.08)", color: "#d4c5a9", border: `1px solid rgba(255,255,255,0.15)` };
const deleteBtnStyle = { ...baseBtnStyle, background: "rgba(192,57,43,0.8)", color: "#fff", border: "1px solid rgba(192,57,43,0.6)" };

const ghostBtnStyle = {
  fontFamily: "'Cinzel', serif",
  fontSize: "0.78rem",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  background: "none",
  border: `1px solid var(--border)`,
  borderRadius: "6px",
  color: "#9a8a70",
  padding: "0.55rem 1.2rem",
  cursor: "pointer",
  transition: "color 0.2s, border-color 0.2s",
};

const footerStyle = { display: "flex", justifyContent: "center", paddingTop: "0.5rem" };

/* Modal */
const modalOverlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.8)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  backdropFilter: "blur(4px)",
};

const modalBoxStyle = {
  background: "#130f08",
  border: "1px solid rgba(192,57,43,0.5)",
  borderRadius: "12px",
  padding: "2.5rem",
  maxWidth: "420px",
  width: "90%",
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
};

const modalIconStyle = { fontSize: "2rem", color: "#e74c3c" };

const modalTitleStyle = {
  fontFamily: "'Cinzel', serif",
  color: "var(--gold-light)",
  margin: 0,
  fontSize: "1.3rem",
};

const modalBodyStyle = { color: "#9a8a70", margin: "0 0 0.5rem", lineHeight: 1.6 };

/* Loading / error */
const loadingWrapStyle = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--bg-deep)",
  gap: "1rem",
};

const spinnerStyle = { fontSize: "2rem", color: "var(--gold)", animation: "spin 2s linear infinite" };
const loadingTextStyle = { fontFamily: "'Crimson Text', serif", fontStyle: "italic", color: "#9a8a70" };

const fullCenterStyle = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--bg-deep)",
  gap: "1rem",
};

const errorMsgStyle = { color: "#ff9089", fontFamily: "'Crimson Text', serif", fontSize: "1.1rem" };

/* Spinner keyframe */
if (!document.head.querySelector("[data-view-spin]")) {
  const s = document.createElement("style");
  s.setAttribute("data-view-spin", "1");
  s.textContent = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
  document.head.appendChild(s);
}

export default ViewCampaignPage;