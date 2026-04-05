import React from "react";

const CharacterCard = ({ character }) => {
  return (
    <article className="character-card">
      <div className="character-card-head">
        <span className="character-card-rune">✦</span>
        <span className="character-card-rune">✦</span>
      </div>
      <h3 className="character-card-title">{character.name}</h3>
      <p className="character-card-meta">{character.class} · Level {character.level}</p>
      <p className="character-card-race">{character.race}</p>
    </article>
  );
};

export default CharacterCard;
