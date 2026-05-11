import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import Gate from "../../shared/Gate.jsx";
import CampaignsTab from "./CampaignsTab.jsx";
import InviteCampaignModal from "./InviteCampaignModal.jsx";
import PlayersTab from "./PlayersTab.jsx";
import "./partyfinder.css";

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
          <CampaignsTab
            campaigns={campaigns}
            isLoading={isLoading}
            joinCode={joinCode}
            joinRequests={joinRequests}
            joiningByCode={joiningByCode}
            requestingCampaignId={requestingCampaignId}
            requestsLoading={requestsLoading}
            resolvingRequestId={resolvingRequestId}
            onJoinCodeChange={setJoinCode}
            onJoinWithCode={joinWithCode}
            onRequestToJoin={requestToJoin}
            onResolveJoinRequest={resolveJoinRequest}
          />
        )}

        {activeTab === "players" && (
          <PlayersTab
            dmCampaigns={dmCampaigns}
            invitations={invitations}
            invitationsLoading={invitationsLoading}
            invitablePlayers={invitablePlayers}
            invitingPlayerId={invitingPlayerId}
            playerSearch={playerSearch}
            playersLoading={playersLoading}
            resolvingInvitationId={resolvingInvitationId}
            user={user}
            onOpenInviteOverlay={openInviteOverlay}
            onPlayerSearchChange={setPlayerSearch}
            onRespondToInvitation={respondToInvitation}
          />
        )}
      </div>
      <InviteCampaignModal
        inviteCampaignsLoading={inviteCampaignsLoading}
        inviteOverlayError={inviteOverlayError}
        inviteTargetPlayer={inviteTargetPlayer}
        invitingPlayerId={invitingPlayerId}
        selectedInviteCampaignId={selectedInviteCampaignId}
        validInviteCampaigns={validInviteCampaigns}
        onClose={closeInviteOverlay}
        onSelectedInviteCampaignIdChange={setSelectedInviteCampaignId}
        onSendInvitation={sendInvitation}
      />
    </main>
  );
}

export default PartyFinder;
