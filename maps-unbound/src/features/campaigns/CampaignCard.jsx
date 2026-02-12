import React from "react";

const CampaignCard = ({ campaign, currentUser }) => {
  const isDM = campaign.dm === currentUser;
  const totalPlayers = campaign.players.length + 1;

  return (
    <div style={{ ...cardStyle, backgroundImage: `url(${campaign.image})` }}>
      {isDM && <span style={dmBadgeStyle}>DM</span>}
      <div style={overlayStyle}>
        <h3 style={titleStyle}>{campaign.title}</h3>
        <p style={descriptionStyle}>{campaign.description}</p>
        <p style={playersStyle}>Players: {totalPlayers}</p>
      </div>
    </div>
  );
};

// Styles
const cardStyle = {
  width: "250px",
  height: "300px",
  borderRadius: "12px",
  overflow: "hidden",
  boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
  margin: "8px",
  backgroundSize: "cover",
  backgroundPosition: "center",
  position: "relative",
  color: "#fff",
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-end",
  cursor: "pointer"
};

// Dark overlay so text is readable
const overlayStyle = {
  backgroundColor: "rgba(0,0,0,0.5)",
  padding: "12px",
  display: "flex",
  flexDirection: "column",
  gap: "4px"
};

// DM Badge
const dmBadgeStyle = {
  position: "absolute",
  top: "10px",
  right: "10px",
  backgroundColor: "rgba(255, 0, 0, 0.8)",
  color: "#fff",
  padding: "4px 8px",
  borderRadius: "4px",
  fontSize: "12px",
  fontWeight: "bold"
};

// Text styles
const titleStyle = {
  margin: 0,
  fontSize: "18px",
  fontWeight: "bold"
};

const descriptionStyle = {
  margin: 0,
  fontSize: "14px",
  height: "40px",
  overflow: "hidden",
  textOverflow: "ellipsis"
};

const playersStyle = {
  margin: 0,
  fontSize: "14px",
  fontWeight: "500"
};

export default CampaignCard;