import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import Button from "../../shared/Button.jsx";
import { useNavigate } from "react-router-dom";
import "./partyfinder.css";

function PartyFinder() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("browse"); // "browse" or "host"
  const [campaigns, setCampaigns] = useState([]);
  const [myHostableCampaigns, setMyHostableCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState({ message: "", type: "" });
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [accessCode, setAccessCode] = useState("");
  const [userCharacters, setUserCharacters] = useState([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [blockUserChecked, setBlockUserChecked] = useState({});

  // Fetch available campaigns (hosted ones)
  const fetchAvailableCampaigns = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("http://localhost:5001/api/campaigns/finder/available", {
        method: "GET"
      });

      if (!response.ok) throw new Error("Failed to fetch campaigns");
      const data = await response.json();
      setCampaigns(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user's campaigns to host
  const fetchMyHostableCampaigns = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("http://localhost:5001/api/campaigns", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error("Failed to fetch campaigns");
      const data = await response.json();
      const dmCampaigns = (data || []).filter((campaign) => {
        const createdById = campaign?.createdBy?._id?.toString?.() || campaign?.createdBy?.toString?.();
        return createdById === user?._id?.toString?.();
      });
      setMyHostableCampaigns(dmCampaigns);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user's characters for join modal
  const fetchUserCharacters = async () => {
    try {
      const response = await fetch("http://localhost:5001/api/characters", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUserCharacters(data);
        if (data.length > 0) {
          setSelectedCharacterId(data[0]._id);
        }
      }
    } catch (err) {
      console.error("Error fetching characters:", err);
    }
  };

  useEffect(() => {
    if (mode === "browse") {
      fetchAvailableCampaigns();
      if (userCharacters.length === 0) {
        fetchUserCharacters();
      }
    } else if (mode === "host") {
      fetchMyHostableCampaigns();
    }
  }, [mode, user?._id]);

  const handleJoinRequest = async (campaignId) => {
    if (!selectedCharacterId) {
      setError("Please select a character");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5001/api/campaigns/${campaignId}/join-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ 
          characterId: selectedCharacterId,
          accessCode 
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to send join request");
      }

      setError("");
      setNotification({ message: "Join request sent successfully!", type: "success" });
      setTimeout(() => setNotification({ message: "", type: "" }), 3000);
      setAccessCode("");
      setSelectedCampaign(null);
      setSelectedCharacterId("");
      fetchAvailableCampaigns();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleHosting = async (campaignId, isCurrentlyHosting) => {
    try {
      setLoading(true);
      const endpoint = isCurrentlyHosting ? 'stop-hosting' : 'start-hosting';
      const response = await fetch(`http://localhost:5001/api/campaigns/${campaignId}/${endpoint}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to update hosting status");
      }

      await fetchMyHostableCampaigns();
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const approveJoinRequest = async (campaignId, requestId) => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5001/api/campaigns/${campaignId}/join-request/${requestId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ action: "approve" })
      });

      if (!response.ok) throw new Error("Failed to approve request");
      await fetchMyHostableCampaigns();
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const rejectJoinRequest = async (campaignId, requestId) => {
    try {
      setLoading(true);
      const shouldBlock = blockUserChecked[`${campaignId}-${requestId}`] || false;
      const response = await fetch(`http://localhost:5001/api/campaigns/${campaignId}/join-request/${requestId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ action: "reject", blockUser: shouldBlock })
      });

      if (!response.ok) throw new Error("Failed to reject request");
      await fetchMyHostableCampaigns();
      setBlockUserChecked({});
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pf-page">
      <div className="pf-shell">
      <header className="section-page-header">
        <div className="section-header-divider" />
        <div className="section-header-row">
          <span className="section-header-rune">✦</span>
          <h1 className="section-page-title">Party Finder</h1>
          <span className="section-header-rune">✦</span>
        </div>
        <div className="section-header-divider" />
      </header>

      <div className="pf-mode-selector">
        <button
          onClick={() => setMode("browse")}
          className={mode === "browse" ? "pf-mode-btn is-active" : "pf-mode-btn"}
        >
          Browse Hosting Campaigns
        </button>
        <button
          onClick={() => setMode("host")}
          className={mode === "host" ? "pf-mode-btn is-active" : "pf-mode-btn"}
        >
          Host Your Campaigns
        </button>
      </div>

      {error && <div className="pf-alert pf-alert-error">{error}</div>}
      {notification.message && (
        <div className={`pf-alert ${notification.type === "success" ? "pf-alert-success" : "pf-alert-warn"}`}>
          {notification.message}
        </div>
      )}
      {loading && <p className="pf-loading">Loading campaigns...</p>}

      {mode === "browse" && !loading && (
        <div className="pf-campaign-list">
          <h2>Currently Hosting Campaigns</h2>
          {campaigns.length === 0 ? (
            <p className="pf-empty">No campaigns currently hosting</p>
          ) : (
            campaigns.map((campaign) => {
              // Find the current user's join request in this campaign (if any)
              // Handle both populated (userId._id) and unpopulated (userId) references
              const userRequest = campaign.joinRequests?.find(r => 
                r.userId?._id?.toString() === user?._id?.toString() || 
                r.userId?.toString() === user?._id?.toString()
              );
              const requestStatus = userRequest?.status; // 'pending', 'approved', or 'rejected'
              
              // Check if user is already a member of the campaign
              // Members array is populated when join request is approved
              // This handles cases where joinRequest may have been removed after approval
              const isMember = campaign.members?.some(m => 
                m.userId?._id?.toString() === user?._id?.toString() || 
                m.userId?.toString() === user?._id?.toString()
              );
              
              return (
                <div key={campaign._id} className="pf-campaign-card">
                  <h3>{campaign.title}</h3>
                  <p>{campaign.description}</p>
                  <div className="pf-campaign-info">
                    <span>Type: {campaign.campaignType}</span>
                    <span>Players: {campaign.members.length}/{campaign.maxPlayers}</span>
                    <span>DM: {campaign.createdBy?.username || "Unknown"}</span>
                  </div>
                  {/* Display status notification if user has made a join request */}
                  {requestStatus && (
                    <div className={`pf-request-status pf-request-status-${requestStatus}`}>
                      <span>
                        {requestStatus === 'approved' ? '✓ Approved' : requestStatus === 'pending' ? '⏳ Pending' : '❌ Rejected'}
                      </span>
                    </div>
                  )}
                  {/* Show "Enter Lobby" button if user is approved OR already a member */}
                  {/* isMember check is critical for users whose joinRequest was removed after approval */}
                  {(requestStatus === 'approved' || isMember) && (
                    <Button onClick={() => navigate(`/campaign/${campaign._id}/lobby`)}>
                      Enter Lobby
                    </Button>
                  )}
                  {/* Show "Request to Join" button if user is not a member and has no pending/approved request */}
                  {!isMember && requestStatus !== 'approved' && requestStatus !== 'pending' && (
                    <Button onClick={() => {
                      setSelectedCampaign(campaign._id);
                      if (userCharacters.length === 0) {
                        fetchUserCharacters();
                      }
                    }}>
                      {requestStatus === 'rejected' ? 'Send Another Request' : 'Request to Join'}
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {mode === "host" && !loading && (
        <div className="pf-campaign-list">
          <h2>Your Campaigns</h2>
          {myHostableCampaigns.length === 0 ? (
            <p className="pf-empty">No campaigns yet. Create one to get started!</p>
          ) : (
            myHostableCampaigns.map((campaign) => (
              <div key={campaign._id} className="pf-campaign-card">
                <h3>{campaign.title}</h3>
                <p>{campaign.description}</p>
                <div className="pf-campaign-info">
                  <span>Type: {campaign.campaignType}</span>
                  <span>Status: {campaign.isHosting ? "🟢 Hosting" : "⚪ Not Hosting"}</span>
                  <span>Players: {campaign.members.length}/{campaign.maxPlayers}</span>
                </div>
                <div className="pf-campaign-info">
                  <span>Min Level: {campaign.minLevel}</span>
                  <span>Visibility: {campaign.isPublic ? "Public" : "Private"}</span>
                  {!campaign.isPublic && campaign.accessCode && (
                    <span>Access Code: {campaign.accessCode}</span>
                  )}
                </div>
                {campaign.joinRequests && campaign.joinRequests.length > 0 && (
                  <div className="pf-join-requests">
                    <p><strong>Pending Requests: {campaign.joinRequests.filter(r => r.status === "pending").length}</strong></p>
                    {campaign.joinRequests.filter(r => r.status === "pending").map(req => (
                      <div key={req._id} className="pf-request-item">
                        <div>
                          <span><strong>{req.userId?.username || "Unknown User"}</strong> requested to join</span>
                          <div className="pf-request-checkbox-wrap">
                            <label className="pf-request-checkbox-label">
                              <input
                                type="checkbox"
                                checked={blockUserChecked[`${campaign._id}-${req._id}`] || false}
                                onChange={(e) => setBlockUserChecked({
                                  ...blockUserChecked,
                                  [`${campaign._id}-${req._id}`]: e.target.checked
                                })}
                              />
                              Block this user
                            </label>
                          </div>
                        </div>
                        <div className="pf-request-actions">
                          <button
                            onClick={() => approveJoinRequest(campaign._id, req._id)}
                            className="pf-approve-btn"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => rejectJoinRequest(campaign._id, req._id)}
                            className="pf-reject-btn"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => handleToggleHosting(campaign._id, campaign.isHosting)}
                  className={campaign.isHosting ? "pf-host-toggle-btn is-stop" : "pf-host-toggle-btn is-start"}
                  disabled={loading}
                >
                  {campaign.isHosting ? "Stop Hosting" : "Start Hosting"}
                </button>
                {campaign.isHosting && (
                  <div className="pf-enter-lobby-wrap">
                    <Button onClick={() => navigate(`/campaign/${campaign._id}/lobby`)}>
                    Enter Lobby
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {selectedCampaign && mode === "browse" && (
        <div className="pf-modal">
          <div className="pf-modal-content">
            <h3>Request to Join Campaign</h3>
            
            <label className="pf-label">
              Select Character:
              <select
                value={selectedCharacterId}
                onChange={(e) => setSelectedCharacterId(e.target.value)}
                className="pf-input"
              >
                <option value="">Choose a character...</option>
                {userCharacters.map(char => (
                  <option key={char._id} value={char._id}>
                    {char.name} (Level {char.level} {char.class})
                  </option>
                ))}
              </select>
            </label>

            {/* Show access code input for private campaigns */}
            {campaigns.find(c => c._id === selectedCampaign)?.accessCode && (
              <label className="pf-label">
                Access Code:
                <input
                  type="password"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="Enter access code"
                  className="pf-input"
                />
              </label>
            )}

            <div className="pf-modal-buttons">
              <Button
                onClick={() => handleJoinRequest(selectedCampaign)}
                disabled={loading || !selectedCharacterId}
              >
                {loading ? "Sending..." : "Send Request"}
              </Button>
              <button
                onClick={() => {
                  setSelectedCampaign(null);
                  setAccessCode("");
                  setSelectedCharacterId("");
                }}
                className="pf-cancel-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default PartyFinder;