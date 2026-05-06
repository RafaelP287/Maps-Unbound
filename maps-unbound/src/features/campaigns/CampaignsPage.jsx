import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Play, Plus, ScrollText } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";

import CampaignCard from "./CampaignCard.jsx";
import Gate from "../../shared/Gate.jsx";
import LoadingPage from "../../shared/Loading.jsx";
import { clearCachePrefix, removeCachedValue, setCachedValue, getCachedValue } from "../../shared/dataCache.js";

function CampaignsPage() {
  const { user, token, isLoggedIn, loading: authLoading } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [activeCampaigns, setActiveCampaigns] = useState([]);
  const [activeCampaignsLoading, setActiveCampaignsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showStartSession, setShowStartSession] = useState(false);
  const [startingCampaignId, setStartingCampaignId] = useState("");
  const [startSessionError, setStartSessionError] = useState("");
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

  const fetchActiveCampaigns = useCallback(async ({ showLoading = true } = {}) => {
    if (!token) {
      setActiveCampaigns([]);
      return;
    }

    if (showLoading) setActiveCampaignsLoading(true);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch("/api/campaigns/active-sessions", {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load active campaigns");
      }
      const data = await res.json();
      setActiveCampaigns(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Error fetching active campaigns:", err);
      }
      setActiveCampaigns([]);
    } finally {
      window.clearTimeout(timeoutId);
      if (showLoading) setActiveCampaignsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isLoggedIn) { setLoading(false); return; }
    const cacheKey = `campaigns:list:${user?.id || "current"}`;
    const cachedCampaigns = getCachedValue(cacheKey);
    const hasCachedCampaigns = Boolean(cachedCampaigns);
    if (cachedCampaigns) {
      setCampaigns(cachedCampaigns);
      setLoading(false);
    } else {
      setLoading(true);
    }

    const fetchCampaigns = async () => {
      try {
        const res = await fetch("/api/campaigns", {
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        });
        
        const data = await res.json();
        
        // Ensure we only set an array to state
        let nextCampaigns = [];
        if (Array.isArray(data)) {
          nextCampaigns = data;
        } else if (data && Array.isArray(data.campaigns)) {
          // Fallback just in case your backend wraps it like { campaigns: [...] }
          nextCampaigns = data.campaigns;
        } else {
          console.warn("Expected an array of campaigns, but got:", data);
        }
        setCampaigns(nextCampaigns);
        setCachedValue(cacheKey, nextCampaigns);
        void fetchActiveCampaigns();

      } catch (err) {
        console.error("Error fetching campaigns:", err);
        if (!hasCachedCampaigns) setCampaigns([]); // Reset to empty array on cold network error
        void fetchActiveCampaigns();
      } finally { setLoading(false); }
    };
    fetchCampaigns();
  }, [fetchActiveCampaigns, isLoggedIn, token, user?.id]);

  useEffect(() => {
    if (!isLoggedIn || campaigns.length === 0) return;

    const refreshActiveCampaigns = () => {
      fetchActiveCampaigns({ showLoading: false });
    };
    const intervalId = window.setInterval(refreshActiveCampaigns, 5000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshActiveCampaigns();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [campaigns, fetchActiveCampaigns, isLoggedIn]);

  if (loading || authLoading) {
    return <LoadingPage>Searching the archives...</LoadingPage>;
  }

  if (!isLoggedIn) {
    return <Gate>Sign in to access your campaigns.</Gate>;
  }

  const handleStartCampaignSession = async (campaign) => {
    if (!campaign?._id || startingCampaignId) return;
    setStartSessionError("");
    setStartingCampaignId(campaign._id);
    try {
      const createRes = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          campaignId: campaign._id,
          title: "Session",
          status: "In Progress",
          participants: (campaign.members || []).filter((member) => member.role === "DM").map((member) => ({
            userId: member.userId?._id || member.userId,
            role: member.role,
          })),
        }),
      });
      if (!createRes.ok) {
        const createData = await createRes.json().catch(() => ({}));
        throw new Error(createData.error || "Failed to start session");
      }

      const createdSession = await createRes.json();
      clearCachePrefix(`campaign:sessions:${user?.id || "current"}:${campaign._id}`);
      removeCachedValue(`campaign:journal:${user?.id || "current"}:${campaign._id}`);
      setShowStartSession(false);
      navigate(
        `/session?campaignId=${campaign._id}&sessionId=${createdSession._id}&sessionName=${encodeURIComponent(createdSession.title)}`,
        { replace: true }
      );
    } catch (err) {
      setStartSessionError(err.message || "Failed to start session");
    } finally {
      setStartingCampaignId("");
    }
  };

  return (
    <div className="campaign-page-padded">
      <div className="campaign-content-wide">
        <header className="campaign-index-header">
          <div className="campaign-index-header-copy">
            <p className="campaign-index-eyebrow">Campaign Library</p>
            <h1 className="campaign-index-title">Your Campaigns</h1>
            <p className="campaign-index-subtitle">
              Manage the adventures you run, join the parties you play in, and start a table session when the group is ready.
            </p>
          </div>

          <div className="campaign-index-actions">
            <Link to="/campaigns/new" className="character-btn-link">
              <Plus aria-hidden="true" />
              Create Campaign
            </Link>
            <button
              type="button"
              className="campaign-index-start"
              onClick={() => setShowStartSession(true)}
            >
              <Play aria-hidden="true" />
              Start Session
            </button>
          </div>
        </header>

        {(activeCampaignsLoading || activeCampaigns.length > 0) && (
          <section className="campaign-active-panel">
            <div className="campaign-active-panel-copy">
              <p className="campaign-index-eyebrow">Active Campaigns</p>
              <h2>Tables Open Now</h2>
            </div>
            <div className="campaign-active-list">
              {activeCampaignsLoading ? (
                <div className="campaign-active-empty">Checking open tables...</div>
              ) : (
                activeCampaigns.map(({ campaign, session }) => (
                  <button
                    key={`${campaign._id}-${session._id}`}
                    type="button"
                    className="campaign-active-item"
                    onClick={() => navigate(
                      `/session?campaignId=${campaign._id}&sessionId=${session._id}&sessionName=${encodeURIComponent(session.title || "Session")}`
                    )}
                  >
                    <span>
                      <strong>{campaign.title}</strong>
                      <small>{session.title || "Active Session"} • {session.status}</small>
                    </span>
                    <span className="campaign-active-action">Enter Lobby</span>
                  </button>
                ))
              )}
            </div>
          </section>
        )}

        <div className="campaign-index-divider" />

        <div className="campaign-list">
          {campaigns.length > 0 ? (
            campaigns.map((c) => (
              <CampaignCard key={c._id} campaign={c} currentUser={user.id} />
            ))
          ) : (
            <div className="campaign-empty">
              <ScrollText aria-hidden="true" className="campaign-empty-svg" />
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
                  onClick={() => handleStartCampaignSession(campaign)}
                  disabled={Boolean(startingCampaignId)}
                >
                  <div>
                    <div className="campaign-session-title">{campaign.title}</div>
                    <div className="campaign-session-meta">
                      {campaign.members?.length || 0} members • {campaign.status}
                    </div>
                  </div>
                  <span className="campaign-session-action">
                    {startingCampaignId === campaign._id ? "Starting..." : "Start"}
                  </span>
                </button>
              ))}
              {dmCampaigns.length === 0 && (
                <div className="campaign-session-empty">
                  You are not the DM of any campaigns yet.
                </div>
              )}
              {startSessionError && (
                <div className="campaign-session-empty">{startSessionError}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CampaignsPage;
