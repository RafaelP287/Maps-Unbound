import { useState } from "react";
import CampaignCard from "../components/CampaignCard";
import { Link } from "react-router-dom";
import placeholderImage from "../images/placeholder.jpg";

const Campaigns = () => {
  const currentUser = "Alice"; // Example logged-in user

  const [campaigns] = useState([
    {
      id: 1,
      title: "Dragon Quest",
      dm: "Alice",
      players: ["Bob", "Charlie", "Dave"],
      description: "An epic journey through the mountains.",
      image: placeholderImage,
    },
    {
      id: 2,
      title: "Mystic Lands",
      dm: "Eve",
      players: ["Mallory", "Trent"],
      description: "Explore mysterious lands full of magic.",
      image: placeholderImage,
    }
  ]);

  return (
    <div style={{ padding: "20px" }}>
      <h1>My Campaigns</h1>
      <Link to="/create-campaign">
        <button style={createButtonStyle}>+ Create Campaign</button>
      </Link>
      <div style={containerStyle}>
        {campaigns.map((c) => (
          <CampaignCard key={c.id} campaign={c} currentUser={currentUser} />
        ))}
      </div>
    </div>
  );
};

const containerStyle = {
  display: "flex",
  overflowX: "auto",
  padding: "10px 0"
};

const createButtonStyle = {
  margin: "12px 0",
  padding: "8px 16px",
  cursor: "pointer"
};

export default Campaigns;