import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

import CampaignCard from "./CampaignCard.jsx";
import Gate from "../../shared/Gate.jsx";
import LoadingPage from "../../shared/Loading.jsx";

function CampaignsPage() {
  const { user, token, isLoggedIn, loading: authLoading } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) { setLoading(false); return; }
    const fetchCampaigns = async () => {
      try {
        const res = await fetch("http://localhost:5001/api/campaigns", {
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setCampaigns(data || []);
      } catch (err) {
        console.error("Error fetching campaigns:", err);
      } finally { setLoading(false); }
    };
    fetchCampaigns();
  }, [isLoggedIn, token]);

  if (loading || authLoading) {
    return <LoadingPage>Searching the archives...</LoadingPage>;
  }

  if (!isLoggedIn) {
    return <Gate>Sign in to access your campaigns.</Gate>;
  }

  return (
    <div className="campaign-page-padded">
      <div className="campaign-content-wide">
        {/* Header */}
        <header className="campaign-page-header-wide">
          <div className="campaign-header-divider" />
          <div className="campaign-header-row">
            <span className="campaign-header-rune-lg">✦</span>
            <h1 className="campaign-page-title-lg">Your Campaigns</h1>
            <span className="campaign-header-rune-lg">✦</span>
          </div>
          <div className="campaign-header-divider" />
          <Link to="/campaigns/new" style={{ marginTop: "1.5rem" }}>
            <button className="btn-primary">+ Forge New Campaign</button>
          </Link>
        </header>

        {/* Campaign grid */}
        <div className="campaign-list">
          {campaigns.length > 0 ? (
            campaigns.map((c) => (
              <CampaignCard key={c._id} campaign={c} currentUser={user.id} />
            ))
          ) : (
            <div className="campaign-empty">
              <span className="campaign-empty-icon">📜</span>
              <h2 className="campaign-empty-title">No campaigns found</h2>
              <p className="campaign-empty-subtext">The chronicles are blank. Begin a new adventure.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CampaignsPage;