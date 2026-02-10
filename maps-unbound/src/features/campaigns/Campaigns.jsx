import { useState } from "react";
import { Link } from "react-router-dom";
import CampaignCard from "../campaigns/CampaignCard";
import Button from "../../shared/Button.jsx";
import placeholderImage from "../campaigns/images/DnD.jpg";

const Campaigns = () => {

  const [campaigns] = useState([
    {
      title: "The Lost Mines",
      description: "A classic adventure in the world of D&D.",
      image: placeholderImage,
      dm: "Alice",
      players: ["Bob", "Charlie"]
    },
    {
      title: "Curse of Strahd",
      description: "A gothic horror campaign set in Barovia.",
      image: placeholderImage,
      dm: "Bob",
      players: ["Alice", "Charlie"]
    }
  ]);

  return (
    <>
      <div style={styles.header}>
        <h1>My Campaigns</h1>
        <Link to="/create-campaign">
          <Button>Create New Campaign</Button>
        </Link>
      </div>
      <div style={styles.list}>
        {campaigns.map((campaign, index) => (
          <CampaignCard key={index} campaign={campaign} currentUser="Bob" />
        ))}
      </div>
    </>
  );
};

const styles = {
  header: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "16px"
  },
  list: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "16px",
    padding: "16px"
  }
};

export default Campaigns;