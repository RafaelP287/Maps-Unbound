import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../shared/Button.jsx";

const AUTH_STORAGE_KEY = "maps-unbound-auth";
const api5e = import.meta.env.VITE_API_5E;
const apiServer = import.meta.env.VITE_API_SERVER;

const CreateCharacter = () => {
  // Loads the user
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    user: "",
    race: "",
    characterClass: "",
    attributes: "",
    alignment: "", 
    background: "",
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

  // API state for backgrounds
  const [backgrounds, setBackgrounds] = useState([]);
  const [isLoadingBackgrounds, setIsLoadingBackgrounds] = useState(true);
  const [backgroundApiError, setBackgroundApiError] = useState("");

  // API state for backgrounds
  const [alignments, setAlignments] = useState([]);
  const [isLoadingAlignments, setIsLoadingAlignments] = useState(true);
  const [alignmentApiError, setAlignmentApiError] = useState("");

  
  useEffect(() => {
    // Fetches user auth data
    const authData = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!authData) {
      navigate("/login");
      return;
    }
    const { user } = JSON.parse(authData);
    setUser(user);

    // Fetch classes on component mount 
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

    // Fetch races on component mount 
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

    // Fetch backgrounds on component mount 
    const fetchBackgrounds = async () => {
      const cachedBackgrounds = sessionStorage.getItem("dnd_backgrounds");
      if (cachedBackgrounds) {
        setBackgrounds(JSON.parse(cachedBackgrounds));
        setIsLoadingBackgrounds(false);
        return;
      }

      try {
        const response = await fetch(`${api5e}/api/2014/backgrounds`);
        if (!response.ok) throw new Error("Failed to fetch backgrounds");
        const data = await response.json();
        setBackgrounds(data.results);
        sessionStorage.setItem("dnd_backgrounds", JSON.stringify(data.results));
      } catch (err) {
        console.error("Backgrounds API Error:", err);
        setBackgroundApiError("Could not load backgrounds.");
      } finally {
        setIsLoadingBackgrounds(false);
      }
    };

    // Fetch alignments on component mount 
    const fetchAlignments = async () => {
      const cachedAlignments = sessionStorage.getItem("dnd_alignments");
      if (cachedAlignments) {
        setAlignments(JSON.parse(cachedAlignments));
        setIsLoadingAlignments(false);
        return;
      }

      try {
        const response = await fetch(`${api5e}/api/2014/alignments`);
        if (!response.ok) throw new Error("Failed to fetch alignments");
        const data = await response.json();
        setAlignments(data.results);
        sessionStorage.setItem("dnd_alignments", JSON.stringify(data.results));
      } catch (err) {
        console.error("Alignments API Error:", err);
        setAlignmentApiError("Could not load alignments.");
      } finally {
        setIsLoadingAlignments(false);
      }
    };

    fetchClasses();
    fetchRaces();
    fetchBackgrounds();
    fetchAlignments();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 2. Handle the progression of steps
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevents page reload

    if (step === 1) {
      setStep(2);
    } else {
      formData.user = user.username
      console.log("Creating character:", formData);

      try {
        // Send the POST request to crate character
        const response = await fetch(`${apiServer}/api/characters`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });

        if (response.ok) {
          const result = await response.json();
          console.log("Character created successfully:", result);
          
          navigate("/characters"); 
        } else {
          const errorData = await response.json();
          console.error("Failed to create character:", errorData);
        }
      } catch (error) {
        console.error("Network error:", error);
      }

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
                name="characterClass"
                value={formData.characterClass}
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

            {/* Backgrounds */}
            <div style={styles.field}>
              <label style={styles.label}>Background</label>
              <select
                name="background"
                value={formData.background}
                onChange={handleChange}
                style={styles.input}
                required
                disabled={isLoadingBackgrounds}
              >
                <option value="">
                  {isLoadingBackgrounds
                    ? "Loading backgrounds..."
                    : "Select a background"}
                </option>
                {backgrounds.map((dndBackground) => (
                  <option key={dndBackground.index} value={dndBackground.name}>
                    {dndBackground.name}
                  </option>
                ))}
              </select>
              {backgroundApiError && (
                <span style={styles.errorText}>{backgroundApiError}</span>
              )}
            </div>

            {/* Alignments */}
            <div style={styles.field}>
              <label style={styles.label}>Background</label>
              <select
                name="alignment"
                value={formData.alignment}
                onChange={handleChange}
                style={styles.input}
                required
                disabled={isLoadingAlignments}
              >
                <option value="">
                  {isLoadingAlignments
                    ? "Loading alignments..."
                    : "Select a alignment"}
                </option>
                {alignments.map((dndAlignment) => (
                  <option key={dndAlignment.index} value={dndAlignment.name}>
                    {dndAlignment.name}
                  </option>
                ))}
              </select>
              {alignmentApiError && (
                <span style={styles.errorText}>{alignmentApiError}</span>
              )}
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
