import { Link } from "react-router-dom";
import { Map, Plus, RefreshCw, ScrollText, Trash2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import Gate from "../../shared/Gate.jsx";
import LoadingPage from "../../shared/Loading.jsx";
import { useMapsApi, useMyMaps } from "./use-maps.js";
import { useState } from "react";

function MapsPage() {
  const { isLoggedIn, loading: authLoading } = useAuth();
  const { maps, loading: mapsLoading, error, refetch } = useMyMaps();
  const { deleteMap } = useMapsApi();
  const [deletingIds, setDeletingIds] = useState({});
  const [confirmingId, setConfirmingId] = useState("");

  if (authLoading) {
    return (
      <div className="maps-page">
        <LoadingPage>Loading your map vault...</LoadingPage>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Gate>Sign in to access your maps.</Gate>;
  }

  const handleDelete = async (mapId) => {
    if (confirmingId !== mapId) {
      setConfirmingId(mapId);
      window.setTimeout(() => {
        setConfirmingId((current) => (current === mapId ? "" : current));
      }, 4000);
      return;
    }

    setConfirmingId("");
    setDeletingIds((prev) => ({ ...prev, [mapId]: true }));
    try {
      await deleteMap(mapId);
      await refetch();
    } catch (err) {
      window.alert(err.message || "Failed to delete map.");
    } finally {
      setDeletingIds((prev) => {
        const next = { ...prev };
        delete next[mapId];
        return next;
      });
    }
  };

  return (
    <div className="maps-page">
      <div className="maps-shell">
        <header className="maps-header">
          <div className="maps-header-copy">
            <p className="maps-eyebrow">Cartographer Vault</p>
            <h1 className="maps-title">My Maps</h1>
            <p className="maps-subtitle">
              Create tactical boards, sketch encounter spaces, and keep map tools ready for your sessions.
            </p>
          </div>

          <Link to="/maps/create" className="character-btn-link">
            <Plus aria-hidden="true" />
            Create Map
          </Link>
        </header>

        <div className="maps-divider" />

        {error && (
          <div className="maps-error-banner">
            <span>{error}</span>
            <button type="button" onClick={refetch}>
              <RefreshCw aria-hidden="true" />
              Retry
            </button>
          </div>
        )}

        <div className="maps-list-grid">
          {mapsLoading && (
            <div className="maps-empty-state">
              <RefreshCw aria-hidden="true" />
              <p>Loading saved maps...</p>
            </div>
          )}

          {!mapsLoading && !error && maps.length === 0 && (
            <div className="maps-empty-state">
              <ScrollText aria-hidden="true" />
              <p>No saved maps are available yet.</p>
            </div>
          )}

          {!mapsLoading && !error && maps.map((savedMap) => {
            const deleting = Boolean(deletingIds[savedMap._id]);
            const confirming = confirmingId === savedMap._id;

            return (
              <article className="maps-card" key={savedMap._id}>
                <Link
                  className="maps-card-preview"
                  to={`/maps/create?mapId=${savedMap._id}`}
                  aria-label={`Open ${savedMap.name}`}
                >
                  {savedMap.thumbnailUrl ? (
                    <img src={savedMap.thumbnailUrl} alt="" />
                  ) : (
                    <div className="maps-card-preview-empty">
                      <Map aria-hidden="true" />
                    </div>
                  )}
                </Link>

                <div className="maps-card-body">
                  <div>
                    <h2>{savedMap.name}</h2>
                    <p>
                      Updated {savedMap.updatedAt ? new Date(savedMap.updatedAt).toLocaleDateString() : "recently"}
                    </p>
                  </div>

                  <div className="maps-card-actions">
                    <Link className="maps-open-link" to={`/maps/create?mapId=${savedMap._id}`}>
                      Open
                    </Link>
                    <button
                      type="button"
                      className={confirming ? "maps-delete-link is-confirming" : "maps-delete-link"}
                      onClick={() => handleDelete(savedMap._id)}
                      disabled={deleting}
                    >
                      <Trash2 aria-hidden="true" />
                      {deleting ? "Deleting" : confirming ? "Confirm" : "Delete"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}

          {!mapsLoading && error && (
            <div className="maps-empty-state">
            <ScrollText aria-hidden="true" />
              <p>Saved maps could not be loaded.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MapsPage;
