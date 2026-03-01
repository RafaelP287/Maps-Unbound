import { useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import placeholderImage from "./images/DnD.jpg";
import Button from "../../shared/Button.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

function ViewCampaignPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token, isLoggedIn, loading: authLoading } = useAuth();

  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editImage, setEditImage] = useState(""); // base64 or existing URL
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Image picker state
  const [isDragging, setIsDragging] = useState(false);
  const [imageError, setImageError] = useState(null);
  const fileInputRef = useRef(null);

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) {
      setError("No campaign ID provided.");
      setLoading(false);
      return;
    }

    if (!isLoggedIn) {
      setError("Please sign in to view campaign details.");
      setLoading(false);
      return;
    }

    const fetchCampaign = async () => {
      try {
        const res = await fetch(`/api/campaigns/${id}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error(`Server returned status ${res.status}`);

        const data = await res.json();

        if (!data || !data._id) {
          setError("Campaign not found.");
        } else {
          setCampaign(data);
          setEditTitle(data.title || "");
          setEditDescription(data.description || "");
          setEditImage(data.image || "");
        }
      } catch (err) {
        console.error("Error fetching campaign:", err);
        setError("Failed to load campaign.");
      } finally {
        setLoading(false);
      }
    };

    fetchCampaign();
  }, [id, token, isLoggedIn]);

  // Determine if current user is the DM
  const dmMember = campaign?.members?.find((m) => m.role === "DM");
  const isDM = dmMember?.userId?._id?.toString() === user?.id?.toString();

  const dm = dmMember?.userId?.username || "Unknown";
  const players = campaign?.members?.filter((m) => m.role === "Player") || [];
  const backgroundImage = campaign?.image || placeholderImage;

  // --- Image picker helpers ---
  const processImageFile = (file) => {
    setImageError(null);
    if (!file.type.startsWith("image/")) {
      setImageError("Please upload an image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setImageError("Image must be under 10MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setEditImage(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processImageFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) processImageFile(file);
  };

  const removeImage = () => {
    setEditImage("");
    setImageError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- Save edits ---
  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          image: editImage || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Server returned status ${res.status}`);
      }

      const updated = await res.json();
      setCampaign(updated);
      setIsEditing(false);
    } catch (err) {
      console.error("Error saving campaign:", err);
      setSaveError(err.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditTitle(campaign.title || "");
    setEditDescription(campaign.description || "");
    setEditImage(campaign.image || "");
    setImageError(null);
    setSaveError(null);
    setIsEditing(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- Delete ---
  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Server returned status ${res.status}`);
      }

      navigate("/campaigns");
    } catch (err) {
      console.error("Error deleting campaign:", err);
      setError(err.message || "Failed to delete campaign.");
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading || authLoading) return <p style={{ textAlign: "center" }}>Loading campaign...</p>;
  if (error) return <p style={{ textAlign: "center", color: "red" }}>{error}</p>;
  if (!campaign) return <p style={{ textAlign: "center" }}>Campaign not found.</p>;

  // Background: while editing, live-preview the new image if one is set
  const activeBg = isEditing && editImage ? editImage : backgroundImage;

  return (
    <div style={{ ...pageStyle, backgroundImage: `url(${activeBg})` }}>
      <div style={overlayStyle}>

        {/* Header — editable if DM and in edit mode */}
        <div style={headerStyle}>
          {isEditing ? (
            <>
              <input
                style={inputStyle}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Campaign title"
              />
              <textarea
                style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Campaign description"
              />

              {/* Image picker */}
              <div style={{ width: "100%", textAlign: "left" }}>
                <span style={imageLabelStyle}>Campaign Image:</span>

                {editImage ? (
                  <div style={previewWrapperStyle}>
                    <img src={editImage} alt="Campaign preview" style={previewImageStyle} />
                    <button type="button" onClick={removeImage} style={removeImageButtonStyle}>
                      ✕ Remove
                    </button>
                  </div>
                ) : (
                  <div
                    style={dropZoneStyle(isDragging)}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <span style={dropZoneIconStyle}>🖼️</span>
                    <p style={dropZoneLabelStyle}>
                      Drag & drop an image here, or <u>click to browse</u>
                    </p>
                    <p style={dropZoneHintStyle}>PNG, JPG, WEBP — max 10MB</p>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInput}
                  style={{ display: "none" }}
                />

                {imageError && <p style={imageErrorStyle}>{imageError}</p>}
              </div>

              {saveError && <p style={{ color: "#ff6b6b", margin: 0 }}>{saveError}</p>}
            </>
          ) : (
            <>
              <h1>{campaign.title}</h1>
              <p>{campaign.description}</p>
            </>
          )}
        </div>

        {/* Details */}
        <div style={detailsStyle}>
          <h2>Campaign Details</h2>
          <p>
            <strong>DM:</strong> {dm}
            {isDM && <span style={dmBadgeStyle}>You</span>}
          </p>
          <p>
            <strong>Players:</strong>{" "}
            {players.length > 0
              ? players.map((p) => p.userId?.username).join(", ")
              : "No players yet"}
          </p>
        </div>

        {/* DM Controls */}
        {isDM && (
          <div style={dmControlsStyle}>
            <div style={dmControlsHeaderStyle}>
              <span style={dmLabelStyle}>⚔ DM Controls</span>
            </div>

            {isEditing ? (
              <div style={buttonRowStyle}>
                <button
                  style={{ ...actionButtonStyle, ...saveButtonStyle }}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  style={{ ...actionButtonStyle, ...cancelButtonStyle }}
                  onClick={handleCancelEdit}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div style={buttonRowStyle}>
                <button
                  style={{ ...actionButtonStyle, ...editButtonStyle }}
                  onClick={() => setIsEditing(true)}
                >
                  ✏ Edit Campaign
                </button>
                <button
                  style={{ ...actionButtonStyle, ...deleteButtonStyle }}
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  🗑 Delete Campaign
                </button>
              </div>
            )}
          </div>
        )}

        {/* Delete confirmation modal */}
        {showDeleteConfirm && (
          <div style={confirmOverlayStyle}>
            <div style={confirmBoxStyle}>
              <h3 style={{ margin: "0 0 0.5rem" }}>Delete Campaign?</h3>
              <p style={{ margin: "0 0 1.5rem", color: "#ccc" }}>
                This will permanently delete <strong>{campaign.title}</strong>. This action cannot be undone.
              </p>
              <div style={buttonRowStyle}>
                <button
                  style={{ ...actionButtonStyle, ...deleteButtonStyle }}
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Yes, Delete"}
                </button>
                <button
                  style={{ ...actionButtonStyle, ...cancelButtonStyle }}
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={endStyle}>
          <Link to="/campaigns">
            <Button primary>Back to Campaigns</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── Styles ── */
const pageStyle = {
  position: "relative",
  width: "100%",
  minHeight: "100vh",
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "2rem",
  boxSizing: "border-box",
};

const overlayStyle = {
  backgroundColor: "rgba(0,0,0,0.6)",
  padding: "2rem",
  borderRadius: "12px",
  color: "#fff",
  maxWidth: "900px",
  width: "90%",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  gap: "1.5rem",
  textAlign: "center",
};

const headerStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "0.75rem",
  width: "100%",
};

const detailsStyle = {
  backgroundColor: "rgba(0,0,0,0.4)",
  padding: "1rem",
  borderRadius: "8px",
  textAlign: "left",
};

const dmBadgeStyle = {
  marginLeft: "0.5rem",
  backgroundColor: "#c9a84c",
  color: "#1a1a1a",
  fontSize: "0.7rem",
  fontWeight: "bold",
  padding: "2px 7px",
  borderRadius: "999px",
  letterSpacing: "0.05em",
  verticalAlign: "middle",
};

const dmControlsStyle = {
  backgroundColor: "rgba(201, 168, 76, 0.12)",
  border: "1px solid rgba(201, 168, 76, 0.4)",
  padding: "1rem",
  borderRadius: "8px",
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
};

const dmControlsHeaderStyle = {
  textAlign: "left",
};

const dmLabelStyle = {
  color: "#c9a84c",
  fontWeight: "bold",
  fontSize: "0.85rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const buttonRowStyle = {
  display: "flex",
  gap: "0.75rem",
  flexWrap: "wrap",
};

const actionButtonStyle = {
  padding: "0.5rem 1.2rem",
  borderRadius: "6px",
  border: "none",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "0.9rem",
  transition: "opacity 0.2s",
};

const editButtonStyle = {
  backgroundColor: "#c9a84c",
  color: "#1a1a1a",
};

const saveButtonStyle = {
  backgroundColor: "#4caf82",
  color: "#fff",
};

const cancelButtonStyle = {
  backgroundColor: "rgba(255,255,255,0.15)",
  color: "#fff",
};

const deleteButtonStyle = {
  backgroundColor: "#c0392b",
  color: "#fff",
};

const inputStyle = {
  width: "100%",
  padding: "0.6rem 0.8rem",
  borderRadius: "6px",
  border: "1px solid rgba(255,255,255,0.3)",
  backgroundColor: "rgba(0,0,0,0.5)",
  color: "#fff",
  fontSize: "1rem",
  boxSizing: "border-box",
  outline: "none",
};

const imageLabelStyle = {
  display: "block",
  fontWeight: "bold",
  marginBottom: "6px",
  fontSize: "0.95rem",
};

const dropZoneStyle = (isDragging) => ({
  border: `2px dashed ${isDragging ? "#c9a84c" : "rgba(255,255,255,0.35)"}`,
  borderRadius: "8px",
  padding: "24px 16px",
  textAlign: "center",
  cursor: "pointer",
  backgroundColor: isDragging ? "rgba(201,168,76,0.1)" : "rgba(0,0,0,0.3)",
  transition: "border-color 0.2s, background-color 0.2s",
});

const dropZoneIconStyle = {
  fontSize: "2rem",
};

const dropZoneLabelStyle = {
  margin: "8px 0 4px",
  fontSize: "0.9rem",
  color: "#ddd",
};

const dropZoneHintStyle = {
  margin: 0,
  fontSize: "0.78rem",
  color: "#aaa",
};

const previewWrapperStyle = {
  position: "relative",
  display: "inline-block",
  width: "100%",
};

const previewImageStyle = {
  width: "100%",
  maxHeight: "180px",
  objectFit: "cover",
  borderRadius: "8px",
  display: "block",
};

const removeImageButtonStyle = {
  marginTop: "6px",
  background: "none",
  border: "1px solid rgba(255,255,255,0.3)",
  borderRadius: "4px",
  padding: "4px 10px",
  cursor: "pointer",
  fontSize: "0.85rem",
  color: "#fff",
};

const imageErrorStyle = {
  color: "#ff6b6b",
  fontSize: "0.85rem",
  marginTop: "4px",
};

const confirmOverlayStyle = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0,0,0,0.75)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
};

const confirmBoxStyle = {
  backgroundColor: "#1e1e1e",
  border: "1px solid #c0392b",
  borderRadius: "10px",
  padding: "2rem",
  maxWidth: "420px",
  width: "90%",
  color: "#fff",
  textAlign: "center",
};

const endStyle = {
  display: "flex",
  justifyContent: "center",
  marginTop: "1rem",
};

export default ViewCampaignPage;