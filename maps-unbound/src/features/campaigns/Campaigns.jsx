import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CampaignCard from "./CampaignCard.jsx";
import Button from "../../shared/Button.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

function CampaignsPage() {
  const { user, token, isLoggedIn, loading: authLoading } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return; // Don't fetch campaigns if not logged in
    }

    const fetchCampaigns = async () => {
      try {
        const res = await fetch("http://localhost:5001/api/campaigns", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, // if backend requires auth
          },
        });
        const data = await res.json();
        setCampaigns(data || []);
      } catch (err) {
        console.error("Error fetching campaigns:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, [isLoggedIn, token]);

  if (loading || authLoading) {
    return <p style={{ textAlign: "center" }}>Loading campaigns...</p>;
  }

  if (!isLoggedIn) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <h2>Please sign in to view your campaigns.</h2>
        <Link to="/login">
          <Button primary>Sign In</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div style={headerStyle}>
        <h1>Your Campaigns</h1>
        <Link to="/campaigns/new">
          <Button primary>Create New Campaign</Button>
        </Link>
      </div>

      <div style={listStyle}>
        {campaigns.length > 0 ? (
          campaigns.map((c) => (
            <CampaignCard
              key={c._id}
              campaign={c}
              currentUser={user.id} // now uses AuthContext
            />
          ))
        ) : (
          <div style={emptyListStyle}>
            <h2>No campaigns found</h2>
            <p>Start a new adventure by creating a campaign!</p>
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
  gap: "1rem",
};

const listStyle = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  gap: "16px",
  padding: "16px",
};

const emptyListStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "1rem",
  padding: "2rem",
  backgroundColor: "rgba(0,0,0,0.1)",
  borderRadius: "8px",
};

export default CampaignsPage;