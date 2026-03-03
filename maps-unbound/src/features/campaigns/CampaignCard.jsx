import { Link } from "react-router-dom";
import placeholderImage from "./images/DnD.jpg";

const CampaignCard = ({ campaign, currentUser }) => {
  // Determine user's role in the campaign and total members
  const member = campaign.members.find((m) => m.userId === currentUser);
  const isDM = member && member.role === "DM";
  const totalPlayers = campaign.members.length;

  return (
    <Link
      to={`/campaigns/${campaign._id}`}
      className="campaign-card"
      style={{ backgroundImage: `url(${campaign.image || placeholderImage})` }}
    >
      {/* Role badge */}
      {member && (
        <div style={isDM ? dmBadgeStyle : playerBadgeStyle}>
          {isDM ? "DM" : "Player"}
        </div>
      )}

      {/* Bottom overlay */}
      <div className="card-overlay" style={overlayStyle}>
        <h3 style={titleStyle}>{campaign.title}</h3>
        <p style={descStyle}>{campaign.description}</p>
        <div style={footerRowStyle}>
          <span style={playerCountStyle}>
            {totalPlayers} {totalPlayers === 1 ? "member" : "members"}
          </span>
          <span style={viewLinkStyle}>View →</span>
        </div>
      </div>
    </Link>
  );
};

/* Styles */
const overlayStyle = {
  background: "linear-gradient(to top, rgba(8,6,3,0.95) 0%, rgba(8,6,3,0.5) 55%, transparent 100%)",
  padding: "1rem",
  display: "flex",
  flexDirection: "column",
  gap: "5px",
  transition: "background 0.25s",
};

const dmBadgeStyle = {
  position: "absolute",
  top: "10px",
  right: "10px",
  background: `linear-gradient(135deg, var(--gold), #e8c96a)`,
  color: "#0d0b08",
  padding: "3px 9px",
  borderRadius: "999px",
  fontSize: "0.65rem",
  fontFamily: "'Cinzel', serif",
  fontWeight: "700",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const playerBadgeStyle = {
  ...dmBadgeStyle,
  background: "rgba(20,15,8,0.85)",
  color: "var(--gold)",
  border: `1px solid var(--border)`,
};

const titleStyle = {
  margin: 0,
  fontFamily: "'Cinzel', serif",
  fontSize: "0.95rem",
  fontWeight: "700",
  color: "#e8c96a",
  letterSpacing: "0.04em",
  lineHeight: 1.3,
};

const descStyle = {
  margin: 0,
  fontFamily: "'Crimson Text', serif",
  fontSize: "0.88rem",
  color: "#b0a08a",
  fontStyle: "italic",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  lineHeight: 1.4,
};

const footerRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: "4px",
};

const playerCountStyle = {
  display: "flex",
  alignItems: "center",
  gap: "5px",
  fontFamily: "'Cinzel', serif",
  fontSize: "0.62rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#7a6e5e",
};

const viewLinkStyle = {
  fontFamily: "'Cinzel', serif",
  fontSize: "0.62rem",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--gold)",
  opacity: 0.7,
};

export default CampaignCard;