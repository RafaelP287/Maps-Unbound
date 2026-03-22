import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

import CampaignCard from "./CampaignCard.jsx";
import Gate from "../../shared/Gate.jsx";
import LoadingPage from "../../shared/Loading.jsx";

function CampaignsPage() {
  const { user, token, isLoggedIn, loading: authLoading } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showStartSession, setShowStartSession] = useState(false);
  const navigate = useNavigate();
  const dmCampaigns = useMemo(() => {
    return campaigns.filter((campaign) => {
      const dmMember = campaign.members?.find((member) => member.role === "DM");
      if (!dmMember) return false;
      const dmUserId =
        typeof dmMember.userId === "object"
          ? dmMember.userId?._id || dmMember.userId?.id
          : dmMember.userId;
      return String(dmUserId) === String(user?.id);
    });
  }, [campaigns, user?.id]);

  useEffect(() => {
    if (!isLoggedIn) { setLoading(false); return; }
    const fetchCampaigns = async () => {
      try {
        // Fetch only campaigns the current user can access.
        const res = await fetch("http://localhost:5001/api/campaigns", {
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        // Backend returns [] when empty; keep UI mapping logic stable with array fallback.
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
          <div
            style={{
              marginTop: "1.5rem",
              display: "flex",
              gap: "0.75rem",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Link to="/campaigns/new">
              <button className="btn-primary">+ Forge New Campaign</button>
            </Link>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setShowStartSession(true)}
            >
              ▶ Start Session
            </button>
          </div>
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
      {showStartSession && (
        <div
          className="campaign-modal-overlay"
          onClick={() => setShowStartSession(false)}
          role="presentation"
        >
          <div
            className="campaign-modal-box campaign-session-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="campaign-session-header">
              <div>
                <h3 className="campaign-modal-title">Start a Session</h3>
                <p className="campaign-modal-body">Choose a campaign you DM.</p>
              </div>
              <button
                type="button"
                className="btn-ghost campaign-session-close"
                onClick={() => setShowStartSession(false)}
              >
                Close
              </button>
            </div>
            <div className="campaign-session-list">
              {dmCampaigns.map((campaign) => (
                <button
                  key={campaign._id}
                  type="button"
                  className="campaign-session-item"
                  onClick={() => {
                    setShowStartSession(false);
                    navigate(`/session/dm?campaignId=${campaign._id}`);
                  }}
                >
                  <div>
                    <div className="campaign-session-title">{campaign.title}</div>
                    <div className="campaign-session-meta">
                      {campaign.members?.length || 0} members • {campaign.status}
                    </div>
                  </div>
                  <span className="campaign-session-action">Start</span>
                </button>
              ))}
              {dmCampaigns.length === 0 && (
                <div className="campaign-session-empty">
                  You are not the DM of any campaigns yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CampaignsPage;
