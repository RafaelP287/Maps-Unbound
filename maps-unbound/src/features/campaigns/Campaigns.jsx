import CampaignCard from "./CampaignCard.jsx";
import { mockCampaigns } from "./data/mockCampaigns.js";
import { Link } from "react-router-dom";
import Button from "../../shared/Button.jsx";

function CampaignsPage() {
  return (
    <>
      <div style={headerStyle}>
        <h1>Your Campaigns</h1>
        <Link to="/campaigns/new">
          <Button primary>Create New Campaign</Button>
        </Link>
      </div>

      <div style={listStyle}>
        {mockCampaigns.map(c => (
          <CampaignCard
            key={c._id}
            campaign={c}
            currentUser="me"
          />
        ))}
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

export default CampaignsPage;