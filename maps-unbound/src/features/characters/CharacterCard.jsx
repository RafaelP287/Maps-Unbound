import React from "react";

const CharacterCard = ({ character, currentUser }) => {
  const isOwner = character.owner === currentUser;

  return (
    <div style={{ ...cardStyle, backgroundImage: `url(${character.image})` }}>
      {isOwner && <span style={ownerBadgeStyle}>Your Character</span>}
      <div style={overlayStyle}>
        <h3 style={titleStyle}>{character.name}</h3>
        <p style={classLevelStyle}>{character.class} - Level {character.level}</p>
        <p style={raceStyle}>{character.race}</p>
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

// Owner Badge
const ownerBadgeStyle = {
  position: "absolute",
  top: "10px",
  right: "10px",
  backgroundColor: "rgba(0, 255, 255, 0.8)",
  color: "#000",
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

const classLevelStyle = {
  margin: 0,
  fontSize: "14px",
  fontWeight: "500"
};

const raceStyle = {
  margin: 0,
  fontSize: "14px"
};

export default CharacterCard;
