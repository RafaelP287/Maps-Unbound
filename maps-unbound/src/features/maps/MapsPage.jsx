import { Link } from "react-router-dom";
import { Plus, ScrollText } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import Gate from "../../shared/Gate.jsx";
import LoadingPage from "../../shared/Loading.jsx";

function MapsPage() {
  const { isLoggedIn, loading: authLoading } = useAuth();

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

        <div className="maps-list-grid">
          <div className="maps-empty-state">
            <ScrollText aria-hidden="true" />
            <p>No saved maps are available yet.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MapsPage;
