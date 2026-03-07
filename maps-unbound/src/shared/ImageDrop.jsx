import { useState, useRef } from "react";

// imagePreview  – current image data URL (or null/empty)
// onImageChange – called with new data URL, or null when removed
// compact       – tighter padding + fade-mask preview; used in ViewCampaign
function ImageDrop({ imagePreview, onImageChange, compact = false }) {
  const [imageError, setImageError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const processImageFile = (file) => {
    setImageError(null);
    if (!file.type.startsWith("image/")) { setImageError("Please upload an image file."); return; }
    if (file.size > 10 * 1024 * 1024) { setImageError("Image must be under 10MB."); return; }
    const reader = new FileReader();
    reader.onload = (e) => onImageChange(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) processImageFile(f); };
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleFileInput = (e) => { const f = e.target.files[0]; if (f) processImageFile(f); };
  const removeImage = () => {
    onImageChange(null);
    setImageError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const previewStyle = compact ? previewWrapMaskedStyle : previewWrapStyle;

  return (
    <div style={fieldGroupStyle}>
      {imagePreview ? (
        <div style={previewStyle}>
          <img src={imagePreview} alt="Campaign preview" style={previewImgStyle} />
          <div style={previewOverlayStyle}>
            <button type="button" onClick={removeImage} style={removeImgBtnStyle}>✕ Remove</button>
          </div>
        </div>
      ) : (
        <div
          style={dropZoneStyle(isDragging, compact)}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <div style={{ fontSize: compact ? "1.8rem" : "2rem", marginBottom: "0.5rem" }}>🖼️</div>
          <p style={{ ...dropLabelStyle, fontSize: compact ? "0.9rem" : "0.95rem" }}>
            Drag & drop {compact ? "or" : "an image, or"} <u>browse</u>
          </p>
          <p style={dropHintStyle}>PNG · JPG · WEBP — max 10 MB</p>
        </div>
      )}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileInput} style={{ display: "none" }} />
      {imageError && <p style={imgErrorStyle}>{imageError}</p>}
    </div>
  );
}

/* ── Styles ── */
const fieldGroupStyle = { display: "flex", flexDirection: "column", gap: "0.4rem" };

const dropZoneStyle = (isDragging, compact) => ({
  border: `2px dashed ${isDragging ? "var(--gold)" : "rgba(201,168,76,0.25)"}`,
  borderRadius: "8px",
  padding: compact ? "1.5rem 1rem" : "2rem 1rem",
  textAlign: "center",
  cursor: "pointer",
  background: isDragging ? "rgba(201,168,76,0.07)" : "rgba(0,0,0,0.25)",
  transition: "border-color 0.2s, background 0.2s",
});

const dropLabelStyle = { color: "#b0a08a", margin: "0 0 4px" };
const dropHintStyle = { color: "#7a6e5e", fontSize: "0.78rem", margin: 0 };

/* Default preview: hard clip */
const previewWrapStyle = { position: "relative", borderRadius: "8px", overflow: "hidden" };

/* Compact preview: fade-mask top & bottom (used in ViewCampaign) */
const previewWrapMaskedStyle = {
  position: "relative",
  borderRadius: "8px",
  WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
  maskImage: "linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
};

const previewImgStyle = { width: "100%", maxHeight: "200px", objectFit: "cover", display: "block" };

const previewOverlayStyle = {
  position: "absolute",
  bottom: 0, left: 0, right: 0,
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

export default ImageDrop;