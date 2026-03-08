import { Link } from "react-router-dom";
import placeholderImage from "./images/DnD.jpg";

const CampaignCard = ({ campaign, currentUser }) => {
  // Determine user's role in the campaign and total members
  const member = campaign.members.find((m) => m.userId === currentUser);
  const isDM = member && member.role === "DM";
  const totalPlayers = campaign.members.length;
  const status = campaign.status || "Planning";

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
        <div style={metaRowStyle}>
          <span style={statusStyle}>{status}</span>
        </div>
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
  background: "transparent",
  padding: "1rem",
  display: "flex",
  flexDirection: "column",
  gap: "5px",
  transition: "background 0.25s",
  position: "relative",
  zIndex: 2,
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
  zIndex: 2,
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
  textShadow: "0 2px 8px rgba(0,0,0,0.8)",
};

const metaRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "0.6rem",
};

const statusStyle = {
  fontFamily: "'Cinzel', serif",
  fontSize: "0.56rem",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  border: "1px solid rgba(201,168,76,0.72)",
  borderRadius: "999px",
  padding: "2px 8px",
  color: "#f2deab",
  background: "rgba(8,6,3,0.72)",
  textShadow: "0 1px 6px rgba(0,0,0,0.85)",
  boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
};

const descStyle = {
  margin: 0,
  fontFamily: "'Crimson Text', serif",
  fontSize: "0.88rem",
  color: "#d0bda0",
  fontStyle: "italic",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  lineHeight: 1.4,
  textShadow: "0 2px 8px rgba(0,0,0,0.8)",
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
  color: "#b09a79",
  textShadow: "0 1px 6px rgba(0,0,0,0.7)",
};

const viewLinkStyle = {
  fontFamily: "'Cinzel', serif",
  fontSize: "0.62rem",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--gold)",
  opacity: 0.9,
  textShadow: "0 1px 6px rgba(0,0,0,0.7)",
};

export default CampaignCard;
