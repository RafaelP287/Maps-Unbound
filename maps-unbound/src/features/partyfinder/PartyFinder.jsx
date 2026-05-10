import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import Gate from "../../shared/Gate.jsx";
import placeholderImage from "../campaigns/images/DnD.jpg";
import "./partyfinder.css";

const formatStartDate = (value) => {
  if (!value) return "Start TBD";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Start TBD" : date.toLocaleDateString();
};

function PartyFinder() {
  const { token, isLoggedIn } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [requestingCampaignId, setRequestingCampaignId] = useState("");
  const [resolvingRequestId, setResolvingRequestId] = useState("");

  const fetchFindableCampaigns = useCallback(async () => {
    if (!isLoggedIn || !token) return;
    setIsLoading(true);
    setMessage({ type: "", text: "" });
    try {
      const response = await fetch("/api/campaigns/findable", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => []);
      if (!response.ok) {
        throw new Error(data.error || "Failed to load findable campaigns.");
      }
      setCampaigns(Array.isArray(data) ? data : []);
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Failed to load findable campaigns." });
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn, token]);

  const fetchJoinRequests = useCallback(async () => {
    if (!isLoggedIn || !token) return;
    setRequestsLoading(true);
    try {
      const response = await fetch("/api/campaigns/party-finder-requests", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => []);
      if (!response.ok) {
        throw new Error(data.error || "Failed to load join requests.");
      }
      setJoinRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Failed to load join requests." });
    } finally {
      setRequestsLoading(false);
    }
  }, [isLoggedIn, token]);

  useEffect(() => {
    fetchFindableCampaigns();
    fetchJoinRequests();
  }, [fetchFindableCampaigns, fetchJoinRequests]);

  const requestToJoin = async (campaignId) => {
    setRequestingCampaignId(campaignId);
    setMessage({ type: "", text: "" });
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/join-requests`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to send join request.");
      }
      setMessage({ type: "success", text: data.message || "Join request sent." });
      await fetchFindableCampaigns();
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Failed to send join request." });
    } finally {
      setRequestingCampaignId("");
    }
  };

  const resolveJoinRequest = async (request, status) => {
    setResolvingRequestId(request._id);
    setMessage({ type: "", text: "" });
    try {
      const response = await fetch(`/api/campaigns/${request.campaignId}/join-requests/${request._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to update join request.");
      }
      setMessage({ type: "success", text: `Request ${status.toLowerCase()}.` });
      await Promise.all([fetchJoinRequests(), fetchFindableCampaigns()]);
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Failed to update join request." });
    } finally {
      setResolvingRequestId("");
    }
  };

  if (!isLoggedIn) {
    return <Gate>Sign in to find adventuring parties.</Gate>;
  }

  return (
    <main className="pf-page">
      <div className="pf-shell">
        <header className="section-page-header">
          <div className="section-header-divider" />
          <div className="section-header-row">
            <span className="section-header-rune">✦</span>
            <h1 className="section-page-title">Party Finder</h1>
            <span className="section-header-rune">✦</span>
          </div>
          <p className="pf-subtitle">Browse campaigns looking for players and request a seat at the table.</p>
          <div className="section-header-divider" />
        </header>

        {message.text && (
          <div className={`pf-alert pf-alert-${message.type === "error" ? "error" : "success"}`}>
            {message.text}
          </div>
        )}

        <section className="pf-request-panel">
          <div className="pf-section-heading-row">
            <h2>Requests For Your Campaigns</h2>
            <span>{joinRequests.length} pending</span>
          </div>
          {requestsLoading ? (
            <p className="pf-loading">Checking your tables...</p>
          ) : joinRequests.length > 0 ? (
            <div className="pf-request-list">
              {joinRequests.map((request) => {
                const isResolving = resolvingRequestId === request._id;
                const isFull = request.playerCount >= request.maxPlayers;

                return (
                  <article className="pf-request-item" key={request._id}>
                    <div>
                      <h3>{request.user?.username || "Unknown player"}</h3>
                      <p>
                        {request.campaignTitle} · {request.playerCount}/{request.maxPlayers || 5} player slots
                      </p>
                      <p>
                        Requested {request.requestedAt ? new Date(request.requestedAt).toLocaleString() : "recently"}
                      </p>
                    </div>
                    <div className="pf-request-actions">
                      <button
                        type="button"
                        className="pf-approve-btn"
                        disabled={isResolving || isFull}
                        title={isFull ? "This campaign is full." : ""}
                        onClick={() => resolveJoinRequest(request, "Approved")}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="pf-reject-btn"
                        disabled={isResolving}
                        onClick={() => resolveJoinRequest(request, "Rejected")}
                      >
                        Reject
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="pf-empty">No pending requests for campaigns you run.</p>
          )}
        </section>

        {isLoading ? (
          <p className="pf-loading">Scrying for campaigns...</p>
        ) : campaigns.length > 0 ? (
          <div className="pf-campaign-list">
            {campaigns.map((campaign) => {
              const isFull = campaign.playerCount >= campaign.maxPlayers;
              const canRequest = !campaign.isMember && !campaign.requestStatus && !isFull;
              const isRequesting = requestingCampaignId === campaign._id;

              return (
                <article className="pf-campaign-card" key={campaign._id}>
                  <img
                    className="pf-campaign-image"
                    src={campaign.image || placeholderImage}
                    alt=""
                  />
                  <div className="pf-campaign-card-body">
                    <div className="pf-campaign-card-header">
                      <div>
                        <h2>{campaign.title}</h2>
                        <p>{campaign.description || "No campaign description yet."}</p>
                      </div>
                      <span className="pf-request-status pf-request-status-pending">
                        {campaign.status || "Planning"}
                      </span>
                    </div>

                    <div className="pf-campaign-info">
                      <span>DM: {campaign.dm?.username || "Unknown"}</span>
                      <span>{campaign.playStyle || "Online"}</span>
                      <span>{formatStartDate(campaign.startDate)}</span>
                      <span>{campaign.playerCount}/{campaign.maxPlayers || 5} player slots</span>
                    </div>

                    <div className="pf-campaign-actions">
                      {campaign.isMember ? (
                        <Link className="btn-primary campaign-btn-link" to={`/campaigns/${campaign._id}`}>
                          Open Campaign
                        </Link>
                      ) : campaign.requestStatus ? (
                        <span className={`pf-request-status pf-request-status-${campaign.requestStatus.toLowerCase()}`}>
                          Request {campaign.requestStatus}
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={!canRequest || isRequesting}
                          onClick={() => requestToJoin(campaign._id)}
                        >
                          {isFull ? "Campaign Full" : isRequesting ? "Sending..." : "Request to Join"}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="pf-empty">No campaigns are recruiting right now.</p>
        )}
      </div>
    </main>
  );
}

export default PartyFinder;
