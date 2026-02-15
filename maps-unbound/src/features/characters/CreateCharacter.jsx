import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../shared/Button.jsx";

const CreateCharacter = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    class: "",
    race: "",
    level: 1
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Add character creation logic here (API call)
    console.log("Creating character:", formData);
    navigate("/characters");
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Create New Character</h1>
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
          <Button type="submit">Create Character</Button>
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
    color: "#00FFFF",
    marginBottom: "30px"
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
