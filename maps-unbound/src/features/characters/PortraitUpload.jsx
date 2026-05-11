import { useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";

const API_SERVER = import.meta.env.VITE_API_SERVER || "";

// ─── PortraitUpload ────────────────────────────────────────────────────────
// Drops into the character editor's preview panel. Shows the current portrait
// (or a fallback image if none), with hover-to-reveal "Upload" / "Remove"
// buttons. Handles all the API plumbing internally and calls onChange when
// the portrait is updated/cleared.
//
// Props:
//   characterId   — Mongo _id of the character (required to upload)
//   currentUrl    — current portrait URL (or empty string)
//   fallbackImage — image to show when there's no portrait (e.g., class image)
//   token         — JWT for the API call
//   onChange(updatedCharacter) — called after successful upload/delete
//
function PortraitUpload({ characterId, currentUrl, fallbackImage, token, onChange }) {
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  const hasPortrait = Boolean(currentUrl);

  const handleFilePicked = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    // Reset the input so picking the same file twice still triggers onChange.
    event.target.value = "";

    // Quick validation — must be an image, ≤ 5 MB.
    if (!file.type.startsWith("image/")) {
      setError("Please pick an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image is too large (max 5 MB).");
      return;
    }

    setError("");
    setIsUploading(true);
    try {
      // Read as base64 data URL.
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      // Upload to backend.
      const response = await fetch(
        `${API_SERVER}/api/characters/${characterId}/portrait`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ imageDataUrl: dataUrl }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || "Upload failed.");
      }
      onChange?.(data);
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!hasPortrait) return;
    setError("");
    setIsUploading(true);
    try {
      const response = await fetch(
        `${API_SERVER}/api/characters/${characterId}/portrait`,
        {
          method: "DELETE",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || "Could not remove portrait.");
      }
      onChange?.(data);
    } catch (err) {
      setError(err.message || "Could not remove portrait.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="character-portrait-uploader">
      <div className="character-portrait-frame">
        <img
          className="character-portrait-img"
          src={currentUrl || fallbackImage}
          alt="Character portrait"
        />
        {isUploading && (
          <div className="character-portrait-overlay">
            <span>Uploading…</span>
          </div>
        )}
        <div className="character-portrait-actions">
          <button
            type="button"
            className="character-portrait-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            title={hasPortrait ? "Replace portrait" : "Upload portrait"}
          >
            <Camera aria-hidden="true" />
            <span>{hasPortrait ? "Replace" : "Upload"}</span>
          </button>
          {hasPortrait && (
            <button
              type="button"
              className="character-portrait-btn character-portrait-btn-danger"
              onClick={handleRemove}
              disabled={isUploading}
              title="Remove portrait"
            >
              <Trash2 aria-hidden="true" />
              <span>Remove</span>
            </button>
          )}
        </div>
      </div>
      {error && <p className="character-portrait-error">{error}</p>}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFilePicked}
        style={{ display: "none" }}
      />
    </div>
  );
}

export default PortraitUpload;