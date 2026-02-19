import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../shared/Button.jsx";

const api5e = import.meta.env.VITE_API_5E;
const apiServer = import.meta.env.VITE_API_SERVER;

const CreateCharacter = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    class: "",
    race: "",
    level: 1,
  });

  // API state for classes
  const [classes, setClasses] = useState([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [apiError, setApiError] = useState("");

  // API state for races
  const [races, setRaces] = useState([]);
  const [isLoadingRaces, setIsLoadingRaces] = useState(true);
  const [raceApiError, setRaceApiError] = useState("");

  // Fetch classes on component mount
  useEffect(() => {
    const fetchClasses = async () => {
      const cachedClasses = sessionStorage.getItem("dnd_classes");
      if (cachedClasses) {
        setClasses(JSON.parse(cachedClasses));
        setIsLoadingClasses(false);
        return;
      }

      try {
        const response = await fetch(`${api5e}/api/2014/classes`);
        if (!response.ok) {
          throw new Error("Failed to fetch classes");
        }
        const data = await response.json();
        setClasses(data.results);
        sessionStorage.setItem("dnd_classes", JSON.stringify(data.results));
      } catch (err) {
        console.error("API Error:", err);
        setApiError("Could not load classes.");
      } finally {
        setIsLoadingClasses(false);
      }
    };

    const fetchRaces = async () => {
      const cachedRaces = sessionStorage.getItem("dnd_races");
      if (cachedRaces) {
        setRaces(JSON.parse(cachedRaces));
        setIsLoadingRaces(false);
        return;
      }

      try {
        const response = await fetch(`${api5e}/api/2014/races`);
        if (!response.ok) throw new Error("Failed to fetch races");
        const data = await response.json();
        setRaces(data.results);
        sessionStorage.setItem("dnd_races", JSON.stringify(data.results));
      } catch (err) {
        console.error("Race API Error:", err);
        setRaceApiError("Could not load races.");
      } finally {
        setIsLoadingRaces(false);
      }
    };

    fetchClasses();
    fetchRaces();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 2. Handle the progression of steps
  const handleSubmit = (e) => {
    e.preventDefault(); // Prevents page reload

    if (step === 1) {
      // Move to step 2 if we are on step 1
      setStep(2);
    } else {
      // We are on the final step, actually submit the data
      console.log("Creating character:", formData);
      navigate("/characters");
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Create New Character</h1>

      {/* 3. Step Indicator */}
      <p style={styles.stepIndicator}>Step {step} of 2</p>
      <form onSubmit={handleSubmit} style={styles.form}>
        {/* STEP 1: BASICS */}
        {step === 1 && (
          <div style={styles.stepContainer}>
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
                disabled={isLoadingClasses}
              >
                <option value="">
                  {isLoadingClasses ? "Loading classes..." : "Select a class"}
                </option>
                {classes.map((dndClass) => (
                  <option key={dndClass.index} value={dndClass.name}>
                    {dndClass.name}
                  </option>
                ))}
              </select>
              {apiError && <span style={styles.errorText}>{apiError}</span>}
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
          </div>
        )}

        {/* STEP 2: ORIGIN */}
        {step === 2 && (
          <div style={styles.stepContainer}>
            <div style={styles.field}>
              <label style={styles.label}>Race</label>
              <select
                name="race"
                value={formData.race}
                onChange={handleChange}
                style={styles.input}
                required
                disabled={isLoadingRaces}
              >
                <option value="">
                  {isLoadingRaces ? "Loading races..." : "Select a race"}
                </option>
                {races.map((dndRace) => (
                  <option key={dndRace.index} value={dndRace.name}>
                    {dndRace.name}
                  </option>
                ))}
              </select>
              {raceApiError && (
                <span style={styles.errorText}>{raceApiError}</span>
              )}
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Background</label>
              <input
                type="text"
                name="background"
                value={formData.background}
                onChange={handleChange}
                style={styles.input}
                placeholder="e.g. Acolyte, Criminal, Soldier"
                required
              />
            </div>
          </div>
        )}

        {/* BUTTON CONTROLS */}
        <div style={styles.buttons}>
          {step === 1 ? (
            <button
              type="button"
              onClick={() => navigate("/characters")}
              style={styles.cancelBtn}
            >
              Cancel
            </button>
          ) : (
            <button type="button" onClick={handleBack} style={styles.cancelBtn}>
              Back
            </button>
          )}

          <Button type="submit">
            {step === 1 ? "Next Step" : "Create Character"}
          </Button>
        </div>
      </form>
    </div>
  );
};

const styles = {
  container: { maxWidth: "600px", margin: "0 auto", padding: "20px" },
  title: { textAlign: "center", color: "#00FFFF", marginBottom: "10px" },
  stepIndicator: {
    textAlign: "center",
    color: "#888",
    marginBottom: "30px",
    fontSize: "14px",
  },
  form: { display: "flex", flexDirection: "column", gap: "20px" },
  stepContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    animation: "fadeIn 0.3s ease-in-out",
  },
  field: { display: "flex", flexDirection: "column", gap: "8px" },
  label: { color: "#fff", fontSize: "16px", fontWeight: "500" },
  input: {
    padding: "10px",
    fontSize: "16px",
    borderRadius: "6px",
    border: "1px solid #333",
    backgroundColor: "#222",
    color: "#fff",
  },
  buttons: {
    display: "flex",
    gap: "10px",
    justifyContent: "center",
    marginTop: "20px",
  },
  cancelBtn: {
    padding: "10px 20px",
    fontSize: "16px",
    borderRadius: "6px",
    border: "1px solid #666",
    backgroundColor: "#333",
    color: "#fff",
    cursor: "pointer",
  },
  errorText: { color: "#fca5a5", fontSize: "14px", marginTop: "4px" },
};

export default CreateCharacter;
