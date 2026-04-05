import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import Button from "../../shared/Button.jsx";

const CreateCharacter = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token } = useAuth();
  const selectedCharacterId = searchParams.get("characterId") || "";
  const [formData, setFormData] = useState({
    name: "",
    class: "",
    race: "",
    level: 1
  });
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

      const response = await fetch(endpoint, {
        method: selectedCharacterId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(formData)
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
