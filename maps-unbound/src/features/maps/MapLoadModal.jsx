import { useState, useEffect } from "react";
import { useMyMaps, useMapsApi } from "./use-maps.js";

// Gold-bordered "Choose Map" modal. Shows the user's saved maps with thumbnails,
// plus a "Create New" tile that opens a blank canvas.
//
// Usage:
//   <MapLoadModal
//     isOpen={showLoadModal}
//     onClose={() => setShowLoadModal(false)}
//     onPickMap={(map) => loadMapIntoEditor(map)}      // map = list metadata only
//     onCreateNew={() => startBlankMap()}              // optional
//   />
//
// The list response does NOT include the JSON body — that's intentional (faster).
// The parent should fetch the full map via useMapsApi().getMap(id) when the user picks one.
//
function MapLoadModal({ isOpen, onClose, onPickMap, onCreateNew }) {
  const { maps, loading, error, refetch } = useMyMaps();
  const { deleteMap } = useMapsApi();

  // Refetch the list every time the modal opens, so newly-saved maps appear.
  useEffect(() => {
    if (isOpen) {
      refetch();
    }
  }, [isOpen, refetch]);

  // Track per-card delete state so multiple deletes can run in parallel without
  // freezing the entire grid. Map of mapId → boolean.
  const [deletingIds, setDeletingIds] = useState({});
  // Confirmation step: clicking Delete once arms it; clicking again confirms.
  const [confirmingId, setConfirmingId] = useState("");

  if (!isOpen) {
    return null;
  }

  const handleDelete = async (mapId) => {
    // Two-click confirm pattern — first click arms, second click commits.
    if (confirmingId !== mapId) {
      setConfirmingId(mapId);
      // Auto-disarm after 4 seconds so the button doesn't stay armed forever.
      setTimeout(() => {
        setConfirmingId((prev) => (prev === mapId ? "" : prev));
      }, 4000);
      return;
    }
    setConfirmingId("");
    setDeletingIds((prev) => ({ ...prev, [mapId]: true }));
    try {
      await deleteMap(mapId);
      await refetch();
    } catch (err) {
      console.error("Failed to delete map:", err);
      // Surface as a soft error — could also pop a toast if you have one.
      alert(err.message || "Failed to delete map");
    } finally {
      setDeletingIds((prev) => {
        const next = { ...prev };
        delete next[mapId];
        return next;
      });
    }
  };

  return (
    <div
      className="campaign-modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="campaign-modal-box campaign-session-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="map-load-modal-title"
        style={{ maxWidth: "1080px", width: "min(95vw, 1080px)" }}
      >
        <div className="campaign-session-header">
          <div>
            <h3 id="map-load-modal-title" className="campaign-modal-title">
              Choose Map
            </h3>
            <p className="campaign-modal-body">
              Pick a saved map to load — or start a fresh one.
            </p>
          </div>
          <button
            type="button"
            className="btn-ghost campaign-session-close"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {loading && (
          <p className="campaign-modal-body" style={{ marginTop: "1rem" }}>
            Loading your maps…
          </p>
        )}

        {error && !loading && (
          <div className="campaign-error-banner" style={{ marginTop: "1rem" }}>
            <span style={{ marginRight: "0.5rem" }}>⚠</span>
            {error}
          </div>
        )}

        {!loading && !error && (
          <div style={gridStyle}>
            {/* Create New tile — always first */}
            {onCreateNew && (
              <button
                type="button"
                style={createTileStyle}
                onClick={() => {
                  onCreateNew();
                  onClose?.();
                }}
              >
                <span style={createTilePlusStyle}>+</span>
                <span style={createTileLabelStyle}>Create New</span>
              </button>
            )}

            {/* Saved maps */}
            {maps.map((map) => {
              const deleting = !!deletingIds[map._id];
              const armed = confirmingId === map._id;
              return (
                <div key={map._id} style={cardWrapStyle}>
                  <button
                    type="button"
                    style={cardStyle}
                    onClick={() => {
                      onPickMap?.(map);
                      onClose?.();
                    }}
                    disabled={deleting}
                    title={`Open ${map.name}`}
                  >
                    {map.thumbnailUrl ? (
                      <img
                        src={map.thumbnailUrl}
                        alt={`${map.name} thumbnail`}
                        style={thumbStyle}
                      />
                    ) : (
                      <div style={emptyThumbStyle}>
                        <span>No preview</span>
                      </div>
                    )}
                    <div style={cardLabelStyle}>{map.name}</div>
                  </button>
                  <button
                    type="button"
                    style={armed ? deleteBtnArmedStyle : deleteBtnStyle}
                    onClick={() => handleDelete(map._id)}
                    disabled={deleting}
                    aria-label={armed ? `Confirm delete ${map.name}` : `Delete ${map.name}`}
                    title={armed ? "Click again to confirm" : "Delete"}
                  >
                    {deleting ? "…" : armed ? "Confirm?" : "Delete"}
                  </button>
                </div>
              );
            })}

            {maps.length === 0 && !onCreateNew && (
              <p
                className="campaign-modal-body"
                style={{ gridColumn: "1 / -1", textAlign: "center" }}
              >
                You haven't saved any maps yet.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Styles ────────────────────────────────────────────────────────────── */

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
  gap: "1rem",
  marginTop: "1rem",
  maxHeight: "70vh",
  overflowY: "auto",
  padding: "4px",
};

const cardWrapStyle = {
  position: "relative",
  display: "flex",
  flexDirection: "column",
};

const cardStyle = {
  display: "flex",
  flexDirection: "column",
  width: "100%",
  background: "rgba(8,6,3,0.85)",
  border: "1px solid rgba(212,175,55,0.32)",
  borderRadius: "10px",
  padding: "0",
  cursor: "pointer",
  overflow: "hidden",
  transition: "border-color 0.15s ease, transform 0.1s ease",
  textAlign: "left",
};

const thumbStyle = {
  width: "100%",
  height: "140px",
  objectFit: "cover",
  display: "block",
  borderBottom: "1px solid rgba(212,175,55,0.2)",
};

const emptyThumbStyle = {
  width: "100%",
  height: "140px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "rgba(212,175,55,0.5)",
  background: "rgba(20,15,8,0.6)",
  fontFamily: "'Cinzel', serif",
  fontSize: "0.85rem",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  borderBottom: "1px solid rgba(212,175,55,0.2)",
};

const cardLabelStyle = {
  padding: "0.6rem 0.8rem",
  color: "#f0e0a0",
  fontFamily: "'Cinzel', serif",
  fontSize: "0.95rem",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

const deleteBtnStyle = {
  position: "absolute",
  top: "8px",
  right: "8px",
  background: "rgba(8,6,3,0.85)",
  color: "rgba(255,200,200,0.85)",
  border: "1px solid rgba(180,60,60,0.55)",
  borderRadius: "999px",
  padding: "3px 10px",
  fontSize: "0.7rem",
  fontFamily: "'Cinzel', serif",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  cursor: "pointer",
};

const deleteBtnArmedStyle = {
  ...deleteBtnStyle,
  background: "rgba(140,30,30,0.9)",
  color: "#ffe4e4",
  borderColor: "#e05c5c",
};

const createTileStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "200px",
  background: "rgba(20,15,8,0.6)",
  border: "2px dashed rgba(212,175,55,0.45)",
  borderRadius: "10px",
  cursor: "pointer",
  gap: "0.5rem",
  color: "var(--gold, #d4af37)",
  fontFamily: "'Cinzel', serif",
};

const createTilePlusStyle = {
  fontSize: "2.5rem",
  lineHeight: 1,
  color: "var(--gold, #d4af37)",
};

const createTileLabelStyle = {
  fontSize: "0.85rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

export default MapLoadModal;