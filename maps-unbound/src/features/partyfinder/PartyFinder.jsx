import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import Button from "../../shared/Button.jsx";
import { useNavigate } from "react-router-dom";

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
  const [requestStatuses, setRequestStatuses] = useState({});
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
      setMyHostableCampaigns(data);
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
  }, [mode]);

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
    <div style={styles.container}>
      <h1 style={styles.title}>Party Finder</h1>

      <div style={styles.modeSelector}>
        <button
          onClick={() => setMode("browse")}
          style={mode === "browse" ? styles.activeModeBtn : styles.modeBtn}
        >
          Browse Hosting Campaigns
        </button>
        <button
          onClick={() => setMode("host")}
          style={mode === "host" ? styles.activeModeBtn : styles.modeBtn}
        >
          Host Your Campaigns
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {notification.message && (
        <div style={{
          ...styles.notification,
          backgroundColor: notification.type === 'success' ? '#4CAF50' : '#FF9800'
        }}>
          {notification.message}
        </div>
      )}
      {loading && <p style={styles.loading}>Loading campaigns...</p>}

      {mode === "browse" && !loading && (
        <div style={styles.campaignList}>
          <h2>Currently Hosting Campaigns</h2>
          {campaigns.length === 0 ? (
            <p style={styles.empty}>No campaigns currently hosting</p>
          ) : (
            campaigns.map((campaign) => {
              const userRequest = campaign.joinRequests?.find(r => 
                r.userId?._id?.toString() === user?._id?.toString() || 
                r.userId?.toString() === user?._id?.toString()
              );
              const requestStatus = userRequest?.status;
              
              // Check if user is already a member of the campaign
              const isMember = campaign.members?.some(m => 
                m.userId?._id?.toString() === user?._id?.toString() || 
                m.userId?.toString() === user?._id?.toString()
              );
              
              return (
                <div key={campaign._id} style={styles.campaignCard}>
                  <h3>{campaign.title}</h3>
                  <p>{campaign.description}</p>
                  <div style={styles.campaignInfo}>
                    <span>Type: {campaign.campaignType}</span>
                    <span>Players: {campaign.members.length}/{campaign.maxPlayers}</span>
                    <span>DM: {campaign.createdBy?.username || "Unknown"}</span>
                  </div>
                  {requestStatus && (
                    <div style={{
                      ...styles.campaignInfo,
                      padding: '10px',
                      backgroundColor: requestStatus === 'approved' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 152, 0, 0.2)',
                      borderRadius: '4px',
                      marginBottom: '10px'
                    }}>
                      <span style={{ color: requestStatus === 'approved' ? '#4CAF50' : requestStatus === 'pending' ? '#FF9800' : '#FF6B6B', fontWeight: 'bold' }}>
                        {requestStatus === 'approved' ? '✓ Approved' : requestStatus === 'pending' ? '⏳ Pending' : '❌ Rejected'}
                      </span>
                    </div>
                  )}
                  {(requestStatus === 'approved' || isMember) && (
                    <Button onClick={() => navigate(`/campaign/${campaign._id}/lobby`)}>
                      Enter Lobby
                    </Button>
                  )}
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
        <div style={styles.campaignList}>
          <h2>Your Campaigns</h2>
          {myHostableCampaigns.length === 0 ? (
            <p style={styles.empty}>No campaigns yet. Create one to get started!</p>
          ) : (
            myHostableCampaigns.map((campaign) => (
              <div key={campaign._id} style={styles.campaignCard}>
                <h3>{campaign.title}</h3>
                <p>{campaign.description}</p>
                <div style={styles.campaignInfo}>
                  <span>Type: {campaign.campaignType}</span>
                  <span>Status: {campaign.isHosting ? "🟢 Hosting" : "⚪ Not Hosting"}</span>
                  <span>Players: {campaign.members.length}/{campaign.maxPlayers}</span>
                </div>
                <div style={styles.campaignInfo}>
                  <span>Min Level: {campaign.minLevel}</span>
                  <span>Visibility: {campaign.isPublic ? "Public" : "Private"}</span>
                  {!campaign.isPublic && campaign.accessCode && (
                    <span>Access Code: {campaign.accessCode}</span>
                  )}
                </div>
                {campaign.joinRequests && campaign.joinRequests.length > 0 && (
                  <div style={styles.joinRequestsSection}>
                    <p><strong>Pending Requests: {campaign.joinRequests.filter(r => r.status === "pending").length}</strong></p>
                    {campaign.joinRequests.filter(r => r.status === "pending").map(req => (
                      <div key={req._id} style={styles.requestItem}>
                        <div style={{ flex: 1 }}>
                          <span><strong>{req.userId?.username || "Unknown User"}</strong> requested to join</span>
                          <div style={{ marginTop: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '12px' }}>
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
                        <div style={{display: "flex", gap: "10px"}}>
                          <button
                            onClick={() => approveJoinRequest(campaign._id, req._id)}
                            style={styles.approveBtn}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => rejectJoinRequest(campaign._id, req._id)}
                            style={styles.rejectBtn}
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
                  style={campaign.isHosting ? styles.stopHostingBtn : styles.startHostingBtn}
                  disabled={loading}
                >
                  {campaign.isHosting ? "Stop Hosting" : "Start Hosting"}
                </button>
                {campaign.isHosting && (
                  <Button onClick={() => navigate(`/campaign/${campaign._id}/lobby`)} style={{ marginTop: '10px' }}>
                    Enter Lobby
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {selectedCampaign && mode === "browse" && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3>Request to Join Campaign</h3>
            
            <label style={styles.label}>
              Select Character:
              <select
                value={selectedCharacterId}
                onChange={(e) => setSelectedCharacterId(e.target.value)}
                style={styles.input}
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
              <label style={styles.label}>
                Access Code:
                <input
                  type="password"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="Enter access code"
                  style={styles.input}
                />
              </label>
            )}

            <div style={styles.modalButtons}>
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
                style={styles.cancelBtn}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "40px 20px"
  },
  title: {
    color: "#00FFFF",
    textAlign: "center",
    marginBottom: "40px"
  },
  modeSelector: {
    display: "flex",
    gap: "20px",
    justifyContent: "center",
    marginBottom: "30px",
    flexWrap: "wrap"
  },
  modeBtn: {
    padding: "12px 24px",
    fontSize: "16px",
    border: "2px solid #333",
    backgroundColor: "#222",
    color: "#fff",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.3s"
  },
  activeModeBtn: {
    padding: "12px 24px",
    fontSize: "16px",
    border: "2px solid #00FFFF",
    backgroundColor: "#00FFFF",
    color: "#111",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold"
  },
  campaignList: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "20px"
  },
  campaignCard: {
    background: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: "8px",
    padding: "20px",
    transition: "border-color 0.3s"
  },
  campaignInfo: {
    display: "flex",
    gap: "20px",
    flexWrap: "wrap",
    margin: "15px 0",
    color: "#999",
    fontSize: "14px"
  },
  joinRequestsSection: {
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    padding: "12px",
    borderRadius: "6px",
    margin: "15px 0",
    border: "1px solid #4CAF50"
  },
  requestItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px",
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: "4px",
    marginBottom: "8px",
    color: "#fff"
  },
  loading: {
    textAlign: "center",
    color: "#666",
    padding: "40px 20px"
  },
  error: {
    backgroundColor: "#ff4444",
    color: "#fff",
    padding: "12px",
    borderRadius: "6px",
    marginBottom: "20px",
    textAlign: "center"
  },
  notification: {
    color: "#fff",
    padding: "12px",
    borderRadius: "6px",
    marginBottom: "20px",
    textAlign: "center",
    fontWeight: "bold"
  },
  empty: {
    textAlign: "center",
    color: "#666",
    padding: "40px 20px"
  },
  startHostingBtn: {
    padding: "10px 20px",
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
    marginTop: "10px"
  },
  stopHostingBtn: {
    padding: "10px 20px",
    backgroundColor: "#ff9800",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
    marginTop: "10px"
  },
  approveBtn: {
    padding: "6px 12px",
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "12px"
  },
  rejectBtn: {
    padding: "6px 12px",
    backgroundColor: "#f44336",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "12px"
  },
  modal: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: "#1a1a1a",
    border: "2px solid #00FFFF",
    borderRadius: "8px",
    padding: "30px",
    maxWidth: "400px",
    width: "90%"
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    color: "#fff",
    marginBottom: "20px",
    fontWeight: "500"
  },
  input: {
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #333",
    backgroundColor: "#222",
    color: "#fff",
    fontSize: "14px"
  },
  modalButtons: {
    display: "flex",
    gap: "10px",
    justifyContent: "flex-end"
  },
  cancelBtn: {
    padding: "10px 20px",
    backgroundColor: "#333",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px"
  }
};

export default PartyFinder;