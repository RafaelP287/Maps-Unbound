// Gold-bordered confirmation modal for "Discard unsaved changes?" flows.
// Used when the user clicks New while the current map has unsaved edits.
//
// Usage:
//   <ConfirmDiscardModal
//     isOpen={confirmingDiscard}
//     mapName="Goblin Cave"   // shown in body — pass current_map_name
//     onCancel={() => setConfirmingDiscard(false)}
//     onConfirm={() => actuallyClearTheMap()}
//   />
//
// Generic enough that it could be reused for "delete this map" or other destructive
// actions later, but right now it's specifically the New-while-dirty prompt.
//
function ConfirmDiscardModal({ isOpen, mapName = "", onCancel, onConfirm }) {
  if (!isOpen) {
    return null;
  }

  // Slight wording change depending on whether the current map has a name.
  // Unnamed maps are scarier to discard because the work isn't backed up anywhere.
  const displayName = mapName?.trim();
  const body = displayName
    ? `"${displayName}" has unsaved changes. Discard them and start a new map?`
    : "This map hasn't been saved yet. Discard your work and start a new one?";

  return (
    <div
      className="campaign-modal-overlay"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="campaign-modal-box"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="discard-modal-title"
        style={{ maxWidth: "440px" }}
      >
        <h3 id="discard-modal-title" className="campaign-modal-title">
          Discard Unsaved Changes?
        </h3>
        <p className="campaign-modal-body">{body}</p>

        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            justifyContent: "flex-end",
            marginTop: "1rem",
            flexWrap: "wrap",
          }}
        >
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Keep Editing
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={onConfirm}
            style={{
              background: "linear-gradient(135deg, #b04848, #d65c5c)",
              borderColor: "rgba(220,90,90,0.6)",
              color: "#fff",
            }}
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDiscardModal;