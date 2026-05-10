import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  const { user, token, isLoggedIn } = useAuth();
  const [activeTab, setActiveTab] = useState("campaigns");
  const [campaigns, setCampaigns] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [dmCampaigns, setDmCampaigns] = useState([]);
  const [playerSearch, setPlayerSearch] = useState("");
  const [invitablePlayers, setInvitablePlayers] = useState([]);
  const [inviteTargetPlayer, setInviteTargetPlayer] = useState(null);
  const [validInviteCampaigns, setValidInviteCampaigns] = useState([]);
  const [inviteCampaignsLoading, setInviteCampaignsLoading] = useState(false);
  const [selectedInviteCampaignId, setSelectedInviteCampaignId] = useState("");
  const [inviteOverlayError, setInviteOverlayError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [invitationsLoading, setInvitationsLoading] = useState(true);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [requestingCampaignId, setRequestingCampaignId] = useState("");
  const [resolvingRequestId, setResolvingRequestId] = useState("");
  const [resolvingInvitationId, setResolvingInvitationId] = useState("");
  const [invitingPlayerId, setInvitingPlayerId] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joiningByCode, setJoiningByCode] = useState(false);

  const fetchFindableCampaigns = useCallback(async ({ silent = false } = {}) => {
    if (!isLoggedIn || !token) return;
    if (!silent) {
      setIsLoading(true);
      setMessage({ type: "", text: "" });
    }
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
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [isLoggedIn, token]);

  const fetchJoinRequests = useCallback(async ({ silent = false } = {}) => {
    if (!isLoggedIn || !token) return;
    if (!silent) {
      setRequestsLoading(true);
    }
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
      if (!silent) {
        setRequestsLoading(false);
      }
    }
  }, [isLoggedIn, token]);

  const fetchInvitations = useCallback(async ({ silent = false } = {}) => {
    if (!isLoggedIn || !token) return;
    if (!silent) {
      setInvitationsLoading(true);
    }
    try {
      const response = await fetch("/api/campaigns/my-invitations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => []);
      if (!response.ok) {
        throw new Error(data.error || "Failed to load invitations.");
      }
      setInvitations(Array.isArray(data) ? data : []);
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Failed to load invitations." });
    } finally {
      if (!silent) {
        setInvitationsLoading(false);
      }
    }
  }, [isLoggedIn, token]);

  const fetchDmCampaigns = useCallback(async () => {
    if (!isLoggedIn || !token) return;
    try {
      const response = await fetch("/api/campaigns/recruiting-campaigns", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => []);
      if (!response.ok) {
        throw new Error(data.error || "Failed to load your campaigns.");
      }
      setDmCampaigns(Array.isArray(data) ? data : []);
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Failed to load your campaigns." });
    }
  }, [isLoggedIn, token]);

  const fetchInvitablePlayers = useCallback(async ({ silent = false } = {}) => {
    if (!isLoggedIn || !token) {
      setInvitablePlayers([]);
      return;
    }

    if (!silent) {
      setPlayersLoading(true);
    }
    try {
      const query = new URLSearchParams();
      if (playerSearch.trim().length >= 2) {
        query.set("username", playerSearch.trim());
      }
      const queryString = query.toString();
      const response = await fetch(`/api/campaigns/invitable-players${queryString ? `?${queryString}` : ""}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => []);
      if (!response.ok) {
        throw new Error(data.error || "Failed to load available players.");
      }
      setInvitablePlayers(Array.isArray(data) ? data : []);
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Failed to load available players." });
    } finally {
      if (!silent) {
        setPlayersLoading(false);
      }
    }
  }, [isLoggedIn, playerSearch, token]);

  const refreshActiveTab = useCallback((options = {}) => {
    if (activeTab === "players") {
      return Promise.all([
        fetchInvitations(options),
        fetchDmCampaigns(),
        fetchInvitablePlayers(options),
      ]);
    }

    return Promise.all([
      fetchFindableCampaigns(options),
      fetchJoinRequests(options),
    ]);
  }, [
    activeTab,
    fetchDmCampaigns,
    fetchFindableCampaigns,
    fetchInvitablePlayers,
    fetchInvitations,
    fetchJoinRequests,
  ]);

  useEffect(() => {
    fetchFindableCampaigns();
    fetchJoinRequests();
    fetchInvitations();
    fetchDmCampaigns();
  }, [fetchDmCampaigns, fetchFindableCampaigns, fetchInvitations, fetchJoinRequests]);

  useEffect(() => {
    if (activeTab !== "players") return;
    fetchInvitablePlayers();
  }, [activeTab, fetchInvitablePlayers]);

  useEffect(() => {
    if (!isLoggedIn || !token) return undefined;

    const refreshSilently = () => {
      if (document.visibilityState === "visible") {
        refreshActiveTab({ silent: true });
      }
    };
    const intervalId = window.setInterval(refreshSilently, 5000);

    window.addEventListener("focus", refreshSilently);
    document.addEventListener("visibilitychange", refreshSilently);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshSilently);
      document.removeEventListener("visibilitychange", refreshSilently);
    };
  }, [isLoggedIn, refreshActiveTab, token]);

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

  const joinWithCode = async (event) => {
    event.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) return;

    setJoiningByCode(true);
    setMessage({ type: "", text: "" });
    try {
      const response = await fetch("/api/campaigns/join-code", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to join campaign.");
      }
      setJoinCode("");
      setMessage({ type: "success", text: data.message || "Campaign joined." });
      await fetchFindableCampaigns();
      if (data.campaignId) {
        navigate(`/campaigns/${data.campaignId}`);
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Failed to join campaign." });
    } finally {
      setJoiningByCode(false);
    }
  };

  const openInviteOverlay = async (player) => {
    setInviteTargetPlayer(player);
    setValidInviteCampaigns([]);
    setSelectedInviteCampaignId("");
    setInviteOverlayError("");
    setInviteCampaignsLoading(true);
    try {
      const query = new URLSearchParams({ userId: player._id });
      const response = await fetch(`/api/campaigns/invitable-campaigns?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => []);
      if (!response.ok) {
        throw new Error(data.error || "Failed to load eligible campaigns.");
      }
      const campaigns = Array.isArray(data) ? data : [];
      setValidInviteCampaigns(campaigns);
      setSelectedInviteCampaignId(campaigns[0]?._id || "");
    } catch (err) {
      setInviteOverlayError(err.message || "Failed to load eligible campaigns.");
    } finally {
      setInviteCampaignsLoading(false);
    }
  };

  const closeInviteOverlay = () => {
    if (invitingPlayerId) return;
    setInviteTargetPlayer(null);
    setValidInviteCampaigns([]);
    setSelectedInviteCampaignId("");
    setInviteOverlayError("");
  };

  const sendInvitation = async () => {
    if (!inviteTargetPlayer || !selectedInviteCampaignId) return;
    setInvitingPlayerId(inviteTargetPlayer._id);
    setMessage({ type: "", text: "" });
    setInviteOverlayError("");
    try {
      const response = await fetch(`/api/campaigns/${selectedInviteCampaignId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: inviteTargetPlayer._id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to send invitation.");
      }
      setMessage({ type: "success", text: data.message || "Invitation sent." });
      setInviteTargetPlayer(null);
      setValidInviteCampaigns([]);
      setSelectedInviteCampaignId("");
      await Promise.all([fetchInvitablePlayers(), fetchDmCampaigns()]);
    } catch (err) {
      setInviteOverlayError(err.message || "Failed to send invitation.");
    } finally {
      setInvitingPlayerId("");
    }
  };

  const respondToInvitation = async (invitation, status) => {
    setResolvingInvitationId(invitation._id);
    setMessage({ type: "", text: "" });
    try {
      const response = await fetch(`/api/campaigns/${invitation.campaignId}/invitations/${invitation._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to update invitation.");
      }
      setMessage({ type: "success", text: data.message || `Invitation ${status.toLowerCase()}.` });
      await Promise.all([fetchInvitations(), fetchFindableCampaigns()]);
      if (status === "Accepted" && data.campaignId) {
        navigate(`/campaigns/${data.campaignId}`);
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Failed to update invitation." });
    } finally {
      setResolvingInvitationId("");
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

        <div className="pf-mode-selector" role="tablist" aria-label="Party finder sections">
          <button
            type="button"
            className={`pf-mode-btn ${activeTab === "campaigns" ? "is-active" : ""}`}
            onClick={() => setActiveTab("campaigns")}
          >
            Find Campaigns
          </button>
          <button
            type="button"
            className={`pf-mode-btn ${activeTab === "players" ? "is-active" : ""}`}
            onClick={() => setActiveTab("players")}
          >
            Find Players
          </button>
        </div>

        {activeTab === "campaigns" && (
          <>
        <section className="pf-code-panel">
          <div>
            <h2>Have A Join Code?</h2>
            <p>Enter a private campaign code from your DM to join immediately if a seat is open.</p>
          </div>
          <form className="pf-code-form" onSubmit={joinWithCode}>
            <input
              aria-label="Campaign join code"
              className="pf-code-input"
              maxLength={12}
              placeholder="ENTER CODE"
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
            />
            <button type="submit" disabled={!joinCode.trim() || joiningByCode}>
              {joiningByCode ? "Joining..." : "Join"}
            </button>
          </form>
        </section>

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
          </>
        )}

        {activeTab === "players" && (
          <div className="pf-recruiting-stack">
            <section className="pf-request-panel">
              <div className="pf-section-heading-row">
                <h2>Your Campaign Invitations</h2>
                <span>{invitations.length} pending</span>
              </div>
              {invitationsLoading ? (
                <p className="pf-loading">Checking your invitations...</p>
              ) : invitations.length > 0 ? (
                <div className="pf-request-list">
                  {invitations.map((invitation) => {
                    const isResolving = resolvingInvitationId === invitation._id;
                    return (
                      <article className="pf-request-item" key={invitation._id}>
                        <div>
                          <h3>{invitation.campaignTitle}</h3>
                          <p>
                            DM: {invitation.dm?.username || invitation.invitedBy?.username || "Unknown"} · {invitation.playerCount}/{invitation.maxPlayers || 5} player slots
                          </p>
                          <p>
                            Invited {invitation.invitedAt ? new Date(invitation.invitedAt).toLocaleString() : "recently"}
                          </p>
                        </div>
                        <div className="pf-request-actions">
                          <button
                            type="button"
                            className="pf-approve-btn"
                            disabled={isResolving}
                            onClick={() => respondToInvitation(invitation, "Accepted")}
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            className="pf-reject-btn"
                            disabled={isResolving}
                            onClick={() => respondToInvitation(invitation, "Declined")}
                          >
                            Decline
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="pf-empty">No pending campaign invitations.</p>
              )}
            </section>

            <section className="pf-request-panel">
              <div className="pf-section-heading-row">
                <h2>Invite Players</h2>
                <span>{dmCampaigns.length} DM campaigns</span>
              </div>

              {!user?.openToCampaignInvites && (
                <div className="pf-alert pf-alert-warn">
                  Your profile is closed to campaign invites. Open it in Account Settings if you want DMs to find you too.
                </div>
              )}

              {dmCampaigns.length > 0 ? (
                <>
                  <p className="pf-helper-copy">
                    Search shows players who are open to invites. Choose the campaign after selecting a player.
                  </p>
                  <div className="pf-recruit-controls">
                    <label>
                      <span>Search Players</span>
                      <input
                        type="text"
                        placeholder="Search by username"
                        value={playerSearch}
                        onChange={(event) => setPlayerSearch(event.target.value)}
                      />
                    </label>
                  </div>

                  {playersLoading ? (
                    <p className="pf-loading">Searching for open adventurers...</p>
                  ) : invitablePlayers.length > 0 ? (
                    <div className="pf-player-list">
                      {invitablePlayers.map((player) => {
                        const isInviting = invitingPlayerId === player._id;
                        return (
                          <article className="pf-player-card" key={player._id}>
                            <span className="pf-player-avatar">
                              {player.profileImageUrl ? (
                                <img src={player.profileImageUrl} alt="" />
                              ) : (
                                player.username?.[0]?.toUpperCase() || "A"
                              )}
                            </span>
                            <div>
                              <h3>{player.username}</h3>
                              <p>Open to campaign invites</p>
                            </div>
                            <button
                              type="button"
                              disabled={isInviting}
                              onClick={() => openInviteOverlay(player)}
                            >
                              {isInviting ? "Sending..." : "Invite"}
                            </button>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="pf-empty">
                      No open players found. Try a different search term.
                    </p>
                  )}
                </>
              ) : (
                <p className="pf-empty">Create or open a campaign as DM before inviting players.</p>
              )}
            </section>
          </div>
        )}
      </div>
      {inviteTargetPlayer && (
        <div className="pf-modal" role="dialog" aria-modal="true" aria-labelledby="pf-invite-title">
          <div className="pf-modal-content pf-invite-modal">
            <div className="pf-section-heading-row">
              <div>
                <h2 id="pf-invite-title">Choose Campaign</h2>
                <p className="pf-helper-copy">Invite {inviteTargetPlayer.username} to one of your eligible campaigns.</p>
              </div>
            </div>

            {inviteOverlayError && <div className="pf-alert pf-alert-error">{inviteOverlayError}</div>}

            {inviteCampaignsLoading ? (
              <p className="pf-loading">Checking eligible campaigns...</p>
            ) : validInviteCampaigns.length > 0 ? (
              <div className="pf-invite-campaign-list">
                {validInviteCampaigns.map((campaign) => (
                  <label
                    className={`pf-invite-campaign-option${selectedInviteCampaignId === campaign._id ? " is-selected" : ""}`}
                    key={campaign._id}
                  >
                    <input
                      type="radio"
                      name="inviteCampaign"
                      value={campaign._id}
                      checked={selectedInviteCampaignId === campaign._id}
                      onChange={(event) => setSelectedInviteCampaignId(event.target.value)}
                    />
                    <span>
                      <strong>{campaign.title}</strong>
                      <small>{campaign.playerCount}/{campaign.maxPlayers || 5} players</small>
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="pf-empty">
                {inviteOverlayError ? "Resolve the issue above and try again." : "No eligible campaigns for this player right now."}
              </p>
            )}

            <div className="pf-modal-buttons">
              <button type="button" className="pf-cancel-btn" disabled={Boolean(invitingPlayerId)} onClick={closeInviteOverlay}>
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedInviteCampaignId || Boolean(invitingPlayerId) || inviteCampaignsLoading}
                onClick={sendInvitation}
              >
                {invitingPlayerId ? "Sending..." : "Send Invite"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default PartyFinder;
