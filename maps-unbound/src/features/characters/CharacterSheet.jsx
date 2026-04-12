import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";

const CharacterSheet = ({ characterId, onClose, embedded = false }) => {
  const { token } = useAuth();
  const [character, setCharacter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCharacter = async () => {
      if (!characterId || !token) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(
          `http://localhost:5001/api/characters/${characterId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to load character");
        }

        const data = await response.json();
        setCharacter(data);
      } catch (err) {
        setError(err.message || "Failed to load character");
      } finally {
        setLoading(false);
      }
    };

    fetchCharacter();
  }, [characterId, token]);

  if (loading) {
    return <div style={styles.container}>Loading character...</div>;
  }

  if (error) {
    return <div style={styles.error}>{error}</div>;
  }

  if (!character) {
    return <div style={styles.container}>Character not found</div>;
  }

  const getAbilityModifier = (score) => {
    return Math.floor((score - 10) / 2);
  };

  const abilityScores = character.abilityScores || {
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
  };

  const abilities = [
    { name: "Strength", abbr: "STR", score: abilityScores.strength },
    { name: "Dexterity", abbr: "DEX", score: abilityScores.dexterity },
    { name: "Constitution", abbr: "CON", score: abilityScores.constitution },
    { name: "Intelligence", abbr: "INT", score: abilityScores.intelligence },
    { name: "Wisdom", abbr: "WIS", score: abilityScores.wisdom },
    { name: "Charisma", abbr: "CHA", score: abilityScores.charisma },
  ];

  const skills = character.skills || {};

  const content = (
    <div style={embedded ? styles.embeddedContent : styles.content}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>{character.name}</h1>
            <p style={styles.subtitle}>
              Level {character.level} {character.class} ({character.race})
            </p>
          </div>
          {onClose && (
            <button style={styles.closeButton} onClick={onClose}>
              ✕
            </button>
          )}
        </div>

        {/* Top Stats */}
        <div style={styles.topStats}>
          <div style={styles.statCard}>
            <span style={styles.statLabel}>Armor Class</span>
            <span style={styles.statValue}>
              {character.armorClass || 10}
            </span>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statLabel}>Attack Bonus</span>
            <span style={styles.statValue}>
              +{character.attackBonus || 0}
            </span>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statLabel}>Proficiency Bonus</span>
            <span style={styles.statValue}>
              +{character.proficiencyBonus || 2}
            </span>
          </div>
        </div>

        {/* Abilities */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Ability Scores</h2>
          <div style={styles.abilitiesGrid}>
            {abilities.map((ability) => (
              <div key={ability.abbr} style={styles.abilityCard}>
                <div style={styles.abilityName}>{ability.abbr}</div>
                <div style={styles.abilityScore}>{ability.score}</div>
                <div style={styles.abilityModifier}>
                  {getAbilityModifier(ability.score) > 0 ? "+" : ""}
                  {getAbilityModifier(ability.score)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Skills */}
        {Object.keys(skills).length > 0 && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Skills</h2>
            <div style={styles.skillsList}>
              {Object.entries(skills)
                .filter(([_, hasSkill]) => hasSkill)
                .map(([skillKey]) => {
                  const skillName = skillKey
                    .replace(/([A-Z])/g, " $1")
                    .replace(/^./, (str) => str.toUpperCase());
                  return (
                    <div key={skillKey} style={styles.skillItem}>
                      <span>✓ {skillName}</span>
                      <span style={styles.skillBonus}>
                        +{character.proficiencyBonus || 2}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Spellcasting */}
        {character.spellcasting?.canCastSpells && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Spellcasting</h2>
            <div style={styles.spellInfo}>
              <p>
                <strong>Ability:</strong>{" "}
                {(character.spellcasting.spellcastingAbility || "wisdom")
                  .charAt(0)
                  .toUpperCase() +
                  (character.spellcasting.spellcastingAbility || "wisdom").slice(
                    1
                  )}
              </p>
              {character.spellcasting.spellsKnown &&
                character.spellcasting.spellsKnown.length > 0 && (
                  <div>
                    <strong>Spells Known:</strong>
                    <ul style={styles.spellsList}>
                      {character.spellcasting.spellsKnown.map((spell) => (
                        <li key={spell}>{spell}</li>
                      ))}
                    </ul>
                  </div>
                )}
              {character.spellcasting.spellSlots && (
                <div style={styles.spellSlots}>
                  <strong>Spell Slots:</strong>
                  <div style={styles.slotsGrid}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9]
                      .filter(
                        (level) =>
                          character.spellcasting.spellSlots[`level${level}`] > 0
                      )
                      .map((level) => (
                        <div key={level} style={styles.slotBox}>
                          <span style={styles.slotLevel}>
                            {level === 1 ? "1st" : level === 2 ? "2nd" : level === 3 ? "3rd" : level + "th"}
                          </span>
                          <span style={styles.slotCount}>
                            {character.spellcasting.spellSlots[`level${level}`]}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Equipment */}
        {character.equipment && character.equipment.length > 0 && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Equipment</h2>
            <ul style={styles.equipmentList}>
              {character.equipment.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Class Features */}
        {character.classFeatures && character.classFeatures.length > 0 && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Class Features</h2>
            <ul style={styles.featuresList}>
              {character.classFeatures.map((feature, idx) => (
                <li key={idx}>{feature}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Inspiration */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Inspiration</h2>
          <p style={styles.inspirationBox}>
            <strong>{character.inspiration || 0}</strong> point{(character.inspiration || 0) !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Personality & Roleplay */}
        {(character.personalityTraits || character.ideals || character.bonds || character.flaws) && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Personality & Roleplay</h2>
            
            {character.personalityTraits && (
              <div style={styles.traitBox}>
                <h3 style={styles.traitTitle}>Personality Traits</h3>
                <p style={styles.traitText}>{character.personalityTraits}</p>
              </div>
            )}
            
            {character.ideals && (
              <div style={styles.traitBox}>
                <h3 style={styles.traitTitle}>Ideals</h3>
                <p style={styles.traitText}>{character.ideals}</p>
              </div>
            )}
            
            {character.bonds && (
              <div style={styles.traitBox}>
                <h3 style={styles.traitTitle}>Bonds</h3>
                <p style={styles.traitText}>{character.bonds}</p>
              </div>
            )}
            
            {character.flaws && (
              <div style={styles.traitBox}>
                <h3 style={styles.traitTitle}>Flaws</h3>
                <p style={styles.traitText}>{character.flaws}</p>
              </div>
            )}
          </div>
        )}
    </div>
  );

  if (embedded) {
    return <div style={styles.embeddedWrap}>{content}</div>;
  }

  return (
    <div style={styles.modal}>
      {content}
    </div>
  );
};

const styles = {
  modal: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.9)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9998,
    overflow: "auto",
  },
  content: {
    background: "linear-gradient(135deg, rgba(30, 20, 10, 0.95) 0%, rgba(40, 25, 15, 0.95) 100%)",
    border: "2px solid rgba(201, 168, 76, 0.4)",
    borderRadius: "16px",
    padding: "32px",
    maxWidth: "900px",
    width: "90%",
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(201, 168, 76, 0.2)",
  },
  embeddedWrap: {
    marginTop: "16px",
  },
  embeddedContent: {
    background: "linear-gradient(135deg, rgba(30, 20, 10, 0.95) 0%, rgba(40, 25, 15, 0.95) 100%)",
    border: "1px solid rgba(201, 168, 76, 0.25)",
    borderRadius: "16px",
    padding: "24px",
    width: "100%",
    boxShadow: "0 12px 30px rgba(0, 0, 0, 0.35)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "28px",
    paddingBottom: "16px",
    borderBottom: "1px solid rgba(201, 168, 76, 0.2)",
  },
  title: {
    margin: 0,
    fontSize: "2rem",
    color: "var(--gold-light)",
    fontWeight: "700",
  },
  subtitle: {
    margin: "6px 0 0",
    color: "var(--text-muted)",
    fontSize: "14px",
  },
  closeButton: {
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    fontSize: "24px",
    cursor: "pointer",
    padding: "0",
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  topStats: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "16px",
    marginBottom: "28px",
  },
  statCard: {
    padding: "16px",
    borderRadius: "12px",
    border: "1px solid rgba(201, 168, 76, 0.25)",
    background: "rgba(201, 168, 76, 0.08)",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  statLabel: {
    fontSize: "11px",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    fontWeight: "600",
  },
  statValue: {
    fontSize: "28px",
    color: "var(--gold-light)",
    fontWeight: "700",
  },
  section: {
    marginBottom: "28px",
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: "var(--gold-light)",
    margin: "0 0 16px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  abilitiesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
    gap: "12px",
  },
  abilityCard: {
    padding: "16px",
    borderRadius: "12px",
    border: "1px solid rgba(201, 168, 76, 0.2)",
    background: "rgba(0, 0, 0, 0.3)",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  abilityName: {
    fontSize: "12px",
    color: "var(--text-muted)",
    fontWeight: "700",
    letterSpacing: "0.05em",
  },
  abilityScore: {
    fontSize: "24px",
    color: "var(--gold-light)",
    fontWeight: "700",
  },
  abilityModifier: {
    fontSize: "13px",
    color: "#4cb582",
    fontWeight: "600",
  },
  skillsList: {
    display: "grid",
    gap: "10px",
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  skillItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: "8px",
    background: "rgba(0, 0, 0, 0.2)",
    border: "1px solid rgba(201, 168, 76, 0.1)",
    color: "#d4c5a9",
    fontSize: "14px",
  },
  skillBonus: {
    color: "var(--gold-light)",
    fontWeight: "600",
    fontSize: "13px",
  },
  spellInfo: {
    padding: "16px",
    borderRadius: "12px",
    background: "rgba(147, 112, 219, 0.1)",
    border: "1px solid rgba(147, 112, 219, 0.2)",
    color: "#d4c5a9",
  },
  spellsList: {
    margin: "8px 0 0",
    paddingLeft: "20px",
    color: "#c9a84c",
  },
  spellSlots: {
    marginTop: "12px",
    paddingTop: "12px",
    borderTop: "1px solid rgba(147, 112, 219, 0.2)",
  },
  slotsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(60px, 1fr))",
    gap: "8px",
    marginTop: "8px",
  },
  slotBox: {
    padding: "8px",
    borderRadius: "8px",
    background: "rgba(201, 168, 76, 0.15)",
    border: "1px solid rgba(201, 168, 76, 0.2)",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  slotLevel: {
    fontSize: "11px",
    color: "var(--text-muted)",
    fontWeight: "600",
  },
  slotCount: {
    fontSize: "16px",
    color: "var(--gold-light)",
    fontWeight: "700",
  },
  equipmentList: {
    margin: 0,
    paddingLeft: "20px",
    color: "#d4c5a9",
  },
  featuresList: {
    margin: 0,
    paddingLeft: "20px",
    color: "#d4c5a9",
  },
  inspirationBox: {
    padding: "12px 16px",
    background: "rgba(201, 168, 76, 0.15)",
    border: "1px solid rgba(201, 168, 76, 0.3)",
    borderRadius: "8px",
    fontSize: "18px",
    color: "var(--gold-light)",
    margin: "0",
    textAlign: "center",
  },
  traitBox: {
    padding: "12px 16px",
    background: "rgba(0, 0, 0, 0.3)",
    border: "1px solid rgba(201, 168, 76, 0.2)",
    borderRadius: "8px",
    marginBottom: "12px",
  },
  traitTitle: {
    margin: "0 0 8px 0",
    fontSize: "14px",
    fontWeight: "700",
    color: "var(--gold-light)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  traitText: {
    margin: "0",
    color: "var(--text-base)",
    lineHeight: "1.6",
    fontSize: "14px",
  },
  error: {
    padding: "20px",
    color: "#f1c0b8",
    background: "rgba(255, 68, 68, 0.1)",
    borderRadius: "8px",
  },
  container: {
    padding: "20px",
    color: "var(--text-muted)",
    textAlign: "center",
  },
};

export default CharacterSheet;
