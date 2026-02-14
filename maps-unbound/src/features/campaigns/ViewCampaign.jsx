import { useParams } from "react-router-dom";
import { mockCampaigns } from "./data/mockCampaigns.js";
import placeholderImage from "./images/DnD.jpg";

function ViewCampaignPage() {
  const { id } = useParams();
  const campaign = mockCampaigns.find(c => String(c._id) === id);

  if (!campaign) return <p>Campaign not found.</p>;

  const backgroundImage = campaign.image || placeholderImage;

  return (
    <div
      style={{
        ...pageStyle,
        backgroundImage: `url(${backgroundImage})`,
      }}
    >
      <div style={overlayStyle}>
        <div style={headerStyle}>
          <h1>{campaign.title}</h1>
          <p>{campaign.description}</p>
        </div>

        <div style={detailsStyle}>
          <h2>Campaign Details</h2>
          <p>
            <strong>DM:</strong>{" "}
            {campaign.members.find((m) => m.role === "DM")?.userId || "Unknown"}
          </p>
          <p>
            <strong>Players:</strong>{" "}
            {campaign.members.filter((m) => m.role === "Player").length}
          </p>
        </div>
      </div>
    </div>
  );
}

/* Styles */
const pageStyle = {
    position: "relative",
    width: "100%",
    minHeight: "100vh",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundReapeat: "no-repeat",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "2rem",
    boxSizing: "border-box",
};

const overlayStyle = {
  backgroundColor: "rgba(0,0,0,0.5)",
  padding: "2rem",
  borderRadius: "12px",
  color: "#fff",
  maxWidth: "900px",
  width: "90%",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  gap: "1.5rem",
  textAlign: "center",
};

const headerStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "0.5rem",
};

const detailsStyle = {
  backgroundColor: "rgba(0,0,0,0.4)",
  padding: "1rem",
  borderRadius: "8px",
};

export default ViewCampaignPage;