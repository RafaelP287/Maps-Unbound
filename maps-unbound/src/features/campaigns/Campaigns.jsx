import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CampaignCard from "./CampaignCard.jsx";
import Button from "../../shared/Button.jsx";

function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5001/api/campaigns')
      .then((res) => res.json())
      .then((data) => {
        setCampaigns(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching campaigns:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <p style={{ textAlign: "center" }}>Loading campaigns...</p>;
  
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
              currentUser = "me" // Replace with actual user ID from auth context
            />
          ))
        ) : (
          <div style = {emptyListStyle}>
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
  gap: "1rem"
};

const listStyle = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  gap: "16px",
  padding: "16px"
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