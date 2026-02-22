import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import placeholderImage from "./images/DnD.jpg";
import Button from "../../shared/Button.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

function ViewCampaignPage() {
  const { id } = useParams();
  const { user, token, isLoggedIn, loading: authLoading } = useAuth();

  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) {
      setError("No campaign ID provided.");
      setLoading(false);
      return;
    }

    if (!isLoggedIn) {
      setError("Please sign in to view campaign details.");
      setLoading(false);
      return;
    }

    const fetchCampaign = async () => {
      try {
        const res = await fetch(`http://localhost:5001/api/campaigns/${id}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error(`Server returned status ${res.status}`);

        const data = await res.json();

        if (!data || !data._id) {
          setError("Campaign not found.");
        } else {
          setCampaign(data);
        }
      } catch (err) {
        console.error("Error fetching campaign:", err);
        setError("Failed to load campaign.");
      } finally {
        setLoading(false);
      }
    };

    fetchCampaign();
  }, [id, token, isLoggedIn]);

  if (loading || authLoading) return <p style={{ textAlign: "center" }}>Loading campaign...</p>;
  if (error) return <p style={{ textAlign: "center", color: "red" }}>{error}</p>;
  if (!campaign) return <p style={{ textAlign: "center" }}>Campaign not found.</p>;

  // Get DM and players
  const dm = campaign.members?.find((m) => m.role === "DM")?.userId.username || "Unknown";
  const players = campaign.members?.filter((m) => m.role === "Player") || [];
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
            <strong>DM:</strong> {dm}
          </p>
          <p>
            <strong>Players ({players.length}):</strong>{" "}
            {players.length > 0
              ? players.map((p) => p.userId.username).join(", ")
              : "None"}
          </p>
        </div>

        <div style={endStyle}>
          <Link to="/campaigns">
            <Button primary>Back to Campaigns</Button>
          </Link>
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
  backgroundRepeat: "no-repeat",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "2rem",
  boxSizing: "border-box",
};

const overlayStyle = {
  backgroundColor: "rgba(0,0,0,0.6)",
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
  textAlign: "left",
};

const endStyle = {
  display: "flex",
  justifyContent: "center",
  marginTop: "1rem",
};

export default ViewCampaignPage;