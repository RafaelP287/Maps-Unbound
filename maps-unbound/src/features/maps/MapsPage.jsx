import { Link } from "react-router-dom";
import { Plus, ScrollText } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import Gate from "../../shared/Gate.jsx";
import LoadingPage from "../../shared/Loading.jsx";
import { useMyMaps } from "./use-maps.js";

function MapsPage() {
  const { isLoggedIn, loading: authLoading } = useAuth();
  const { maps, loading, error } = useMyMaps();

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

  // Click a card → store the id and send the user to the editor.
  // The editor's auto-load reads this on mount and opens that specific map.
  const openMap = (id) => {
    sessionStorage.setItem("maps-unbound-open", id);
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

        <div className="maps-list-grid" style={gridStyle}>
          {loading && (
            <div className="maps-empty-state">
              <p>Loading your maps…</p>
            </div>
          )}

          {error && !loading && (
            <div className="maps-empty-state" style={{ color: "#ff9b93" }}>
              <p>⚠ {error}</p>
            </div>
          )}

          {!loading && !error && maps.length === 0 && (
            <div className="maps-empty-state">
              <ScrollText aria-hidden="true" />
              <p>No saved maps are available yet.</p>
            </div>
          )}

          {!loading && !error && maps.map((map) => (
            <Link
              key={map._id}
              to="/maps/create"
              onClick={() => openMap(map._id)}
              style={cardStyle}
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
              <div style={cardLabelStyle}>
                <div style={cardNameStyle}>{map.name}</div>
                {map.updatedAt && (
                  <div style={cardDateStyle}>
                    {new Date(map.updatedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
  gap: "1rem",
};

const cardStyle = {
  display: "flex",
  flexDirection: "column",
  background: "rgba(8,6,3,0.85)",
  border: "1px solid rgba(212,175,55,0.32)",
  borderRadius: "10px",
  overflow: "hidden",
  textDecoration: "none",
  color: "inherit",
  transition: "border-color 0.15s ease, transform 0.1s ease",
};

const thumbStyle = {
  width: "100%",
  height: "160px",
  objectFit: "cover",
  display: "block",
  borderBottom: "1px solid rgba(212,175,55,0.2)",
};

const emptyThumbStyle = {
  width: "100%",
  height: "160px",
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
  padding: "0.7rem 0.9rem",
};

const cardNameStyle = {
  color: "#f0e0a0",
  fontFamily: "'Cinzel', serif",
  fontSize: "1rem",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

const cardDateStyle = {
  color: "rgba(212,175,55,0.55)",
  fontFamily: "'Cinzel', serif",
  fontSize: "0.7rem",
  letterSpacing: "0.08em",
  marginTop: "0.25rem",
};

export default MapsPage;
