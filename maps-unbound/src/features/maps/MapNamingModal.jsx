import { useEffect, useRef, useState } from "react";

// Gold-bordered modal that prompts the user for a map name.
//
// Usage:
//   <MapNamingModal
//     isOpen={showNameModal}
//     mode="save-as"             // "save" (first-save) or "save-as" (always)
//     initialName=""             // pre-fill (used by Save As)
//     submitting={false}         // disable buttons while save is in flight
//     onCancel={() => setShowNameModal(false)}
//     onSubmit={(name) => doSaveWithName(name)}
//   />
//
// "save" mode (first-save):
//   - Title: "Name Your Map"
//   - Submit button: "Save"
//
// "save-as" mode:
//   - Title: "Save As"
//   - Submit button: "Save Copy"
//   - Pre-fills with initialName so the user can keep, tweak, or replace it.
//
function MapNamingModal({
  isOpen,
  mode = "save",
  initialName = "",
  submitting = false,
  onCancel,
  onSubmit,
}) {
  if (!isOpen) {
    return null;
  }
  return (
    <MapNamingModalInner
      key={`${mode}:${initialName}`}
      mode={mode}
      initialName={initialName}
      submitting={submitting}
      onCancel={onCancel}
      onSubmit={onSubmit}
    />
  );
}

// Inner component owns its own state. The `key` on the outer wrapper guarantees
// this remounts (and re-initializes useState) every time the modal opens with
// new inputs — no effect-driven state resets needed.
function MapNamingModalInner({
  mode,
  initialName,
  submitting,
  onCancel,
  onSubmit,
}) {
  const [name, setName] = useState(initialName || "");
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  // Focus + select on mount only — no state updates here, so no effect-cascade warning.
  useEffect(() => {
    const id = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const isSaveAs = mode === "save-as";
  const title = isSaveAs ? "Save As" : "Name Your Map";
  const submitLabel = isSaveAs ? "Save Copy" : "Save";
  const subtitle = isSaveAs
    ? "Pick a name for the new copy. Keep it the same to create a numbered duplicate."
    : "Give your map a name so you can find it again later.";

  const handleSubmit = (event) => {
    event.preventDefault();
    if (submitting) return;
    const trimmed = name.trim();
    if (trimmed.length < 1) {
      setError("Name is required.");
      return;
    }
    if (trimmed.length > 80) {
      setError("Name is too long (80 characters max).");
      return;
    }
    setError("");
    onSubmit?.(trimmed);
  };

  return (
    <div
      className="campaign-modal-overlay"
      onClick={() => !submitting && onCancel?.()}
      role="presentation"
    >
      <div
        className="campaign-modal-box"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="map-naming-modal-title"
      >
        <h3 id="map-naming-modal-title" className="campaign-modal-title">
          {title}
        </h3>
        <p className="campaign-modal-body">{subtitle}</p>

        <form onSubmit={handleSubmit} className="campaign-form">
          <div className="campaign-field-group">
            <label className="campaign-field-label" htmlFor="map-naming-modal-input">
              Map name
            </label>
            <input
              id="map-naming-modal-input"
              ref={inputRef}
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (error) setError("");
              }}
              maxLength={80}
              placeholder="e.g. Goblin Cave"
              disabled={submitting}
            />
            <span className="campaign-helper-text">{name.length}/80</span>
          </div>

          {error && (
            <div className="campaign-error-banner">
              <span style={{ marginRight: "0.5rem" }}>⚠</span>
              {error}
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              justifyContent: "flex-end",
              marginTop: "0.5rem",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              className="btn-ghost"
              onClick={onCancel}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting || name.trim().length < 1}
            >
              {submitting ? "Saving…" : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default MapNamingModal;