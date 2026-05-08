/**
 * CampaignsPage - User's Campaign List
 *
 * Displays all campaigns created by the current user.
 * Filters to creator-only campaigns (excludes campaigns user merely joined).
 *
 * DISPLAY:
 * - User can view, edit, delete own campaigns
 * - Forge new campaigns button
 * - Campaign cards show title, description, members, status
 *
 * AUTHORIZATION:
 * - Only shows campaigns where createdBy === currentUserId
 * - Links to campaign detail/edit pages
 */

/**
 * CampaignsPage - User's Campaign List
 *
 * Displays all campaigns created by the current user.
 * Filters to creator-only campaigns (excludes campaigns user merely joined).
 *
 * DISPLAY:
 * - User can view, edit, delete own campaigns
 * - Forge new campaigns button
 * - Campaign cards show title, description, members, status
 *
 * AUTHORIZATION:
 * - Only shows campaigns where createdBy === currentUserId
 * - Links to campaign detail/edit pages
 */

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
  const [error, setError] = useState("");
  const currentUserId = user?._id?.toString?.() || user?.id?.toString?.() || "";

  useEffect(() => {
    if (!isLoggedIn) { setLoading(false); return; }
    const fetchCampaigns = async () => {
      setError("");
      try {
        const res = await fetch("/api/campaigns", {
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || `Failed to fetch campaigns (${res.status})`);
        }

        const campaignsList = Array.isArray(data)
          ? data
          : Array.isArray(data.campaigns)
            ? data.campaigns
            : [];

        const mine = campaignsList.filter((campaign) => {
          const createdBy = campaign?.createdBy?._id?.toString?.() || campaign?.createdBy?.toString?.();
          // IMPORTANT: only show campaigns created by the current user in this tab.
          return createdBy === currentUserId;
        });
        setCampaigns(mine);
      } catch (err) {
        console.error("Error fetching campaigns:", err);
        setError(err.message || "Failed to fetch campaigns");
      } finally { setLoading(false); }
    };
    fetchCampaigns();
  }, [isLoggedIn, token, currentUserId]);

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

        {error && (
          <div className="campaign-error-banner">
            <span style={{ marginRight: "0.5rem" }}>⚠</span>
            {error}
          </div>
        )}

        {/* Campaign grid */}
        <div className="campaign-list">
          {campaigns.length > 0 ? (
            campaigns.map((c) => (
              <CampaignCard key={c._id} campaign={c} currentUser={currentUserId} />
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
