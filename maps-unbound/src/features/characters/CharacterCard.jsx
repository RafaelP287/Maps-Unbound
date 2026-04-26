import { Edit3 } from "lucide-react";
import { Link } from "react-router-dom";
import { getCharacterImage, optionName, CLASS_OPTIONS, RACE_OPTIONS } from "./characterFormData.js";

function CharacterCard({ character }) {
  const characterId = character.characterId || character._id;
  const classIndex = character.class?.index || "fighter";
  const className = character.class?.name || optionName(CLASS_OPTIONS, classIndex);
  const raceName = character.race?.name || optionName(RACE_OPTIONS, character.race?.index || "human");
  const hpMax = character.hp?.max ?? 10;
  const armorClass = character.armorClass ?? 10;
  const passivePerception = character.passivePerception ?? 10;

  return (
    <Link className="character-card-link" to={`/characters/${characterId}/edit`} aria-label={`Edit ${character.name}`}>
      <article className="character-card-sheet">
        <div className="character-card-art">
          <img className="character-card-art-img" src={getCharacterImage(classIndex)} alt="" />
        </div>
        <div className="character-card-fade" />
        <div className="character-card-content">
          <div className="character-card-name-row">
            <div>
              <h2 className="character-card-name">{character.name}</h2>
              <p className="character-card-meta">
                Level {character.level || 1} {raceName} {className}
              </p>
            </div>
            <span className="character-card-edit">
              <Edit3 aria-hidden="true" />
            </span>
          </div>

          <div className="character-card-stats">
            <div className="character-card-stat">
              <span>AC</span>
              <strong>{armorClass}</strong>
            </div>
            <div className="character-card-stat">
              <span>HP</span>
              <strong>{hpMax}</strong>
            </div>
            <div className="character-card-stat">
              <span>PP</span>
              <strong>{passivePerception}</strong>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

export default CharacterCard;
