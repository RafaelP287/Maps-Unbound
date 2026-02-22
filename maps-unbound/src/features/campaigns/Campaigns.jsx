import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import CampaignCard from "./CampaignCard.jsx";
import Button from "../../shared/Button.jsx";

function CampaignsPage() {
  const { token } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Fetch campaigns from backend api
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:5001/api/campaigns', {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error("Failed to fetch campaigns");
        }

        const data = await response.json();
        setCampaigns(data);
        setError("");
      } catch (err) {
        console.error("Error fetching campaigns:", err);
        setError("Failed to load campaigns");
        setCampaigns([]);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchCampaigns();
    }
  }, [token]);

  if (loading) return <p style={{ textAlign: "center" }}>Loading campaigns...</p>;
  
  return (
    <>
      <div style={headerStyle}>
        <h1>Your Campaigns</h1>
        <Link to="/campaigns/new">
          <Button primary>Create New Campaign</Button>
        </Link>
      </div>

      {error && <div style={errorStyle}>{error}</div>}

      <div style={listStyle}>
        {campaigns.length > 0 ? (
          campaigns.map((c) => (
            <CampaignCard
              key={c._id}
              campaign={c}
            />
          ))
        ) : (
          <div style = {emptyListStyle}>
            <h2>No campaigns found</h2>
            <p>Start a new adventure by creating a campaign!</p>
            <Link to="/campaigns/new">
              <Button primary>Create Campaign</Button>
            </Link>
          </div>
        )}
      </div>
    </>
  );
}

/* Styles */
const headerStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "1rem",
  gap: "1rem"
};

const listStyle = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  gap: "16px",
  padding: "16px"
};

const errorStyle = {
  backgroundColor: "#ff4444",
  color: "#fff",
  padding: "12px",
  borderRadius: "6px",
  margin: "20px",
  textAlign: "center"
};

const emptyListStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "1rem",
  padding: "2rem",
  backgroundColor: "rgba(0,0,0,0.1)",
  borderRadius: "8px"
};

export default CampaignsPage;