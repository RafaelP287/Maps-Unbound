import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import Button from "../../shared/Button.jsx";

// Leveling utility (client-side version)
const getStartingAbilityScores = (race) => {
  const raceAbilityMods = {
    Human: { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 },
    Elf: { STR: 0, DEX: 2, CON: 0, INT: 0, WIS: 0, CHA: 0 },
    Dwarf: { STR: 0, DEX: 0, CON: 2, INT: 0, WIS: 0, CHA: 0 },
    Halfling: { STR: 0, DEX: 2, CON: 0, INT: 0, WIS: 0, CHA: 0 },
    Dragonborn: { STR: 2, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 1 },
    Gnome: { STR: 0, DEX: 0, CON: 0, INT: 2, WIS: 0, CHA: 0 },
    'Half-Elf': { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 2 },
    'Half-Orc': { STR: 2, DEX: 0, CON: 1, INT: 0, WIS: 0, CHA: 0 },
    Tiefling: { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 2 },
  };

  const baseScores = { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 };
  const mods = raceAbilityMods[race] || {};

  return {
    STR: Math.min(20, Math.max(1, baseScores.STR + (mods.STR || 0))),
    DEX: Math.min(20, Math.max(1, baseScores.DEX + (mods.DEX || 0))),
    CON: Math.min(20, Math.max(1, baseScores.CON + (mods.CON || 0))),
    INT: Math.min(20, Math.max(1, baseScores.INT + (mods.INT || 0))),
    WIS: Math.min(20, Math.max(1, baseScores.WIS + (mods.WIS || 0))),
    CHA: Math.min(20, Math.max(1, baseScores.CHA + (mods.CHA || 0))),
  };
};

const getClassSpells = (charClass, level) => {
  const spellData = {
    Wizard: ['Magic Missile', 'Mage Armor', 'Identify', ...(level >= 5 ? ['Fireball'] : [])],
    Cleric: ['Cure Wounds', 'Bless', 'Guiding Bolt', ...(level >= 3 ? ['Lesser Restoration'] : [])],
    Warlock: ['Eldritch Blast', 'Hex', ...(level >= 3 ? ['Darkness'] : [])],
    Sorcerer: ['Fire Bolt', 'Mage Armor', ...(level >= 5 ? ['Fireball'] : [])],
    Bard: ['Vicious Mockery', 'Healing Word', 'Tasha\'s Hideous Laughter', ...(level >= 3 ? ['Suggestion'] : [])],
    Druid: ['Druidcraft', 'Goodberry', 'Thunderwave', ...(level >= 5 ? ['Call Lightning'] : [])],
    Ranger: ['Hunter\'s Mark', 'Goodberry', ...(level >= 5 ? ['Pass Without Trace'] : [])],
    Paladin: [...(level >= 2 ? ['Bless', 'Cure Wounds'] : []), ...(level >= 5 ? ['Lesser Restoration'] : [])],
  };
  return spellData[charClass] || [];
};

const getProficiencyBonus = (level) => {
  const profTable = { 1: 2, 2: 2, 3: 2, 4: 2, 5: 3, 6: 3, 7: 3, 8: 3, 9: 4, 10: 4,
    11: 4, 12: 4, 13: 5, 14: 5, 15: 5, 16: 5, 17: 6, 18: 6, 19: 6, 20: 6 };
  return profTable[Math.min(level, 20)] || 2;
};

const CreateCharacter = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token } = useAuth();
  const selectedCharacterId = searchParams.get("characterId") || "";
  const [formData, setFormData] = useState({
    name: "",
    class: "",
    race: "",
    level: 1,
    abilityScores: {
      strength: 15,
      dexterity: 14,
      constitution: 13,
      intelligence: 12,
      wisdom: 10,
      charisma: 8,
    },
    inspiration: 0,
    personalityTraits: "",
    ideals: "",
    bonds: "",
    flaws: "",
  });
  const [showPreview, setShowPreview] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loadingCharacter, setLoadingCharacter] = useState(Boolean(selectedCharacterId));
  const [loading, setLoading] = useState(false);

  const applyCharacterToForm = (character) => {
    if (!character) {
      return;
    }
    setFormData({
      name: character.name || "",
      class: character.class || "",
      race: character.race || "",
      level: character.level || 1,
      abilityScores: character.abilityScores || {
        strength: 15,
        dexterity: 14,
        constitution: 13,
        intelligence: 12,
        wisdom: 10,
        charisma: 8,
      },
      inspiration: character.inspiration || 0,
      personalityTraits: character.personalityTraits || "",
      ideals: character.ideals || "",
      bonds: character.bonds || "",
      flaws: character.flaws || "",
    });
  };

  useEffect(() => {
    const fetchCharacter = async () => {
      if (!selectedCharacterId || !token) {
        setLoadingCharacter(false);
        return;
      }

      try {
        setLoadingCharacter(true);
        const response = await fetch(`http://localhost:5001/api/characters/${selectedCharacterId}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error("Failed to load character");
        }

        const data = await response.json();
        applyCharacterToForm(data);
      } catch (err) {
        setError(err.message || "Failed to load character");
      } finally {
        setLoadingCharacter(false);
      }
    };

    fetchCharacter();
  }, [token, selectedCharacterId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setShowPreview(false);
  };

  const generatePreview = () => {
    if (!formData.class || !formData.race) {
      setError("Please select both class and race");
      return;
    }

    const abilityScores = getStartingAbilityScores(formData.race);
    const profBonus = getProficiencyBonus(formData.level);
    const dexMod = Math.floor((abilityScores.DEX - 10) / 2);
    const spells = getClassSpells(formData.class, formData.level);
    
    setPreview({
      abilityScores,
      proficiencyBonus: profBonus,
      ac: 10 + dexMod,
      spells,
    });
    setShowPreview(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setStatus("");
    setLoading(true);

    try {
      const endpoint = selectedCharacterId
        ? `http://localhost:5001/api/characters/${selectedCharacterId}`
        : "http://localhost:5001/api/characters";

      // Prepare full character data with auto-generated stats
      const abilityScores = getStartingAbilityScores(formData.race);
      const profBonus = getProficiencyBonus(formData.level);
      const dexMod = Math.floor((abilityScores.DEX - 10) / 2);
      const charData = {
        ...formData,
        abilityScores,
        proficiencyBonus: profBonus,
        armorClass: 10 + dexMod,
        spellcasting: {
          canCastSpells: ['Wizard', 'Cleric', 'Warlock', 'Sorcerer', 'Bard', 'Druid', 'Ranger', 'Paladin'].includes(formData.class),
          spellsKnown: getClassSpells(formData.class, formData.level),
        },
      };

      const response = await fetch(endpoint, {
        method: selectedCharacterId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(charData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create character");
      }

      const data = await response.json();

      if (selectedCharacterId) {
        setStatus("Character updated successfully.");
      } else {
        setStatus("Character created successfully.");
        const savedCharacter = data.character;
        if (savedCharacter) applyCharacterToForm(savedCharacter);
      }

      navigate("/characters");
    } catch (err) {
      console.error("Character creation error:", err);
      setError(err.message || "Failed to save character. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>{selectedCharacterId ? "Edit Character" : "Create Character"}</h1>
      {loadingCharacter && <p style={styles.loadingText}>Loading character...</p>}
      {error && <div style={styles.error}>{error}</div>}
      {status && <div style={styles.success}>{status}</div>}
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.field}>
          <label style={styles.label}>Character Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            style={styles.input}
            placeholder="Enter character name"
            required
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Class</label>
          <select
            name="class"
            value={formData.class}
            onChange={handleChange}
            style={styles.input}
            required
          >
            <option value="">Select a class</option>
            <option value="Barbarian">Barbarian</option>
            <option value="Bard">Bard</option>
            <option value="Cleric">Cleric</option>
            <option value="Druid">Druid</option>
            <option value="Fighter">Fighter</option>
            <option value="Monk">Monk</option>
            <option value="Paladin">Paladin</option>
            <option value="Ranger">Ranger</option>
            <option value="Rogue">Rogue</option>
            <option value="Sorcerer">Sorcerer</option>
            <option value="Warlock">Warlock</option>
            <option value="Wizard">Wizard</option>
          </select>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Race</label>
          <select
            name="race"
            value={formData.race}
            onChange={handleChange}
            style={styles.input}
            required
          >
            <option value="">Select a race</option>
            <option value="Human">Human</option>
            <option value="Elf">Elf</option>
            <option value="Dwarf">Dwarf</option>
            <option value="Halfling">Halfling</option>
            <option value="Dragonborn">Dragonborn</option>
            <option value="Gnome">Gnome</option>
            <option value="Half-Elf">Half-Elf</option>
            <option value="Half-Orc">Half-Orc</option>
            <option value="Tiefling">Tiefling</option>
          </select>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Starting Level</label>
          <input
            type="number"
            name="level"
            value={formData.level}
            onChange={handleChange}
            style={styles.input}
            min="1"
            max="20"
            required
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Inspiration Points</label>
          <input
            type="number"
            name="inspiration"
            value={formData.inspiration}
            onChange={handleChange}
            style={styles.input}
            min="0"
            max="10"
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Personality Traits</label>
          <textarea
            name="personalityTraits"
            value={formData.personalityTraits}
            onChange={handleChange}
            style={{...styles.input, minHeight: "80px"}}
            placeholder="Describe your character's personality traits..."
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Ideals</label>
          <textarea
            name="ideals"
            value={formData.ideals}
            onChange={handleChange}
            style={{...styles.input, minHeight: "80px"}}
            placeholder="What ideals does your character hold dear?"
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Bonds</label>
          <textarea
            name="bonds"
            value={formData.bonds}
            onChange={handleChange}
            style={{...styles.input, minHeight: "80px"}}
            placeholder="Describe your character's bonds..."
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Flaws</label>
          <textarea
            name="flaws"
            value={formData.flaws}
            onChange={handleChange}
            style={{...styles.input, minHeight: "80px"}}
            placeholder="What flaws or weaknesses does your character have?"
          />
        </div>

        {!selectedCharacterId && (
          <button type="button" onClick={generatePreview} style={styles.previewBtn}>
            Preview Auto-Generated Stats
          </button>
        )}

        {showPreview && preview && (
          <div style={styles.previewPanel}>
            <h3 style={styles.previewTitle}>Character Preview</h3>
            <div style={styles.abilityGrid}>
              <div style={styles.abilityBox}>
                <span style={styles.abilityLabel}>STR</span>
                <span style={styles.abilityScore}>{preview.abilityScores.STR}</span>
              </div>
              <div style={styles.abilityBox}>
                <span style={styles.abilityLabel}>DEX</span>
                <span style={styles.abilityScore}>{preview.abilityScores.DEX}</span>
              </div>
              <div style={styles.abilityBox}>
                <span style={styles.abilityLabel}>CON</span>
                <span style={styles.abilityScore}>{preview.abilityScores.CON}</span>
              </div>
              <div style={styles.abilityBox}>
                <span style={styles.abilityLabel}>INT</span>
                <span style={styles.abilityScore}>{preview.abilityScores.INT}</span>
              </div>
              <div style={styles.abilityBox}>
                <span style={styles.abilityLabel}>WIS</span>
                <span style={styles.abilityScore}>{preview.abilityScores.WIS}</span>
              </div>
              <div style={styles.abilityBox}>
                <span style={styles.abilityLabel}>CHA</span>
                <span style={styles.abilityScore}>{preview.abilityScores.CHA}</span>
              </div>
            </div>
            <div style={styles.previewStats}>
              <div>AC: <strong>{preview.ac}</strong></div>
              <div>Proficiency Bonus: <strong>+{preview.proficiencyBonus}</strong></div>
            </div>
            {preview.spells.length > 0 && (
              <div style={styles.spellsPreview}>
                <strong>Spells Known:</strong>
                <ul style={styles.spellsList}>
                  {preview.spells.map((spell) => (
                    <li key={spell}>{spell}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div style={styles.buttons}>
          <button type="button" onClick={() => navigate("/characters")} style={styles.cancelBtn}>
            Cancel
          </button>
          <Button type="submit" disabled={loading}>
            {loading
              ? (selectedCharacterId ? "Saving..." : "Creating...")
              : (selectedCharacterId ? "Save Updates" : "Create Character")}
          </Button>
        </div>
      </form>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: "600px",
    margin: "0 auto",
    padding: "20px"
  },
  title: {
    textAlign: "center",
    color: "var(--gold-light)",
    marginBottom: "30px"
  },
  error: {
    backgroundColor: "#ff4444",
    color: "#fff",
    padding: "12px",
    borderRadius: "6px",
    marginBottom: "20px",
    fontSize: "14px"
  },
  success: {
    backgroundColor: "rgba(76, 175, 130, 0.2)",
    border: "1px solid rgba(76, 175, 130, 0.55)",
    color: "#d2ffea",
    padding: "12px",
    borderRadius: "6px",
    marginBottom: "20px",
    fontSize: "14px"
  },
  loadingText: {
    color: "#d4c5a9",
    marginBottom: "14px",
    textAlign: "center"
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px"
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  },
  label: {
    color: "#fff",
    fontSize: "16px",
    fontWeight: "500"
  },
  input: {
    padding: "10px",
    fontSize: "16px",
    borderRadius: "6px",
    border: "1px solid #333",
    backgroundColor: "#222",
    color: "#fff"
  },
  previewBtn: {
    padding: "12px",
    fontSize: "14px",
    borderRadius: "6px",
    border: "1px solid rgba(201, 168, 76, 0.5)",
    backgroundColor: "rgba(201, 168, 76, 0.1)",
    color: "var(--gold-light)",
    cursor: "pointer",
    fontWeight: "600",
    transition: "all 0.2s ease",
  },
  previewPanel: {
    padding: "20px",
    borderRadius: "12px",
    border: "1px solid rgba(201, 168, 76, 0.3)",
    backgroundColor: "rgba(201, 168, 76, 0.05)",
    marginTop: "10px",
  },
  previewTitle: {
    color: "var(--gold-light)",
    marginTop: 0,
    marginBottom: "15px",
    fontSize: "16px",
  },
  abilityGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "10px",
    marginBottom: "15px",
  },
  abilityBox: {
    padding: "12px",
    borderRadius: "8px",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    border: "1px solid rgba(201, 168, 76, 0.2)",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  abilityLabel: {
    fontSize: "12px",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    fontWeight: "600",
  },
  abilityScore: {
    fontSize: "18px",
    color: "var(--gold-light)",
    fontWeight: "700",
  },
  previewStats: {
    display: "flex",
    gap: "20px",
    padding: "12px 0",
    borderTop: "1px solid rgba(201, 168, 76, 0.2)",
    borderBottom: "1px solid rgba(201, 168, 76, 0.2)",
    color: "#fff",
    marginBottom: "15px",
  },
  spellsPreview: {
    marginTop: "15px",
  },
  spellsList: {
    listStyle: "none",
    padding: "10px 0",
    margin: 0,
    color: "#d4c5a9",
    fontSize: "14px",
  },
  buttons: {
    display: "flex",
    gap: "10px",
    justifyContent: "center",
    marginTop: "20px"
  },
  cancelBtn: {
    padding: "10px 20px",
    fontSize: "16px",
    borderRadius: "6px",
    border: "1px solid #666",
    backgroundColor: "#333",
    color: "#fff",
    cursor: "pointer"
  }
};

export default CreateCharacter;
