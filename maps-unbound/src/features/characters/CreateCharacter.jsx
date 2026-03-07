import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import Button from "../../shared/Button.jsx";
import Gate from "../../shared/Gate.jsx";

const API_5E = import.meta.env.VITE_API_5E;
const API_SERVER = import.meta.env.VITE_API_SERVER;
const AUTH_STORAGE_KEY = "maps-unbound-auth";

const CreateCharacter = () => {
  // Authentication
  const { user, token, isLoggedIn, loading: authLoading } = useAuth();
  if (!isLoggedIn) {
    return (
      <Gate>
        Sign in to access your characters.
      </Gate>
    );
  }

  // Loads the user
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    level: 1,
    name: "",
    race: "",
    characterClass: "",
    background: "",
    alignment: "",
    attributes: "",
    user: ""
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

  // API state for alignments
  const [alignments, setAlignments] = useState([]);
  const [isLoadingAlignments, setIsLoadingAlignments] = useState(true);
  const [alignmentApiError, setAlignmentApiError] = useState("");

  // Submission States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

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
        const response = await fetch(`${API_5E}/api/2014/classes`);
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
        const response = await fetch(`${API_5E}/api/2014/races`);
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

    const fetchBackgrounds = async () => {
      const cachedBackgrounds = sessionStorage.getItem("dnd_backgrounds");
      if (cachedBackgrounds) {
        setBackgrounds(JSON.parse(cachedBackgrounds));
        setIsLoadingBackgrounds(false);
        return;
      }

      try {
        const response = await fetch(`${API_5E}/api/2014/backgrounds`);
        if (!response.ok) throw new Error("Failed to fetch backgrounds");
        const data = await response.json();
        setBackgrounds(data.results);
        sessionStorage.setItem("dnd_backgrounds", JSON.stringify(data.results));
      } catch (err) {
        console.error("Background API Error:", err);
        setBackgroundApiError("Could not load backgrounds.");
      } finally {
        setIsLoadingBackgrounds(false);
      }
    };

    const fetchAlignments = async () => {
      const cachedAlignments = sessionStorage.getItem("dnd_alignments");
      if (cachedAlignments) {
        setAlignments(JSON.parse(cachedAlignments));
        setIsLoadingAlignments(false);
        return;
      }

      try {
        const response = await fetch(`${API_5E}/api/2014/alignments`);
        if (!response.ok) throw new Error("Failed to fetch alignments");
        const data = await response.json();
        setAlignments(data.results);
        sessionStorage.setItem("dnd_alignments", JSON.stringify(data.results));
      } catch (err) {
        console.error("Alignment API Error:", err);
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

  // Handle the progression of steps
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
      return;
    } 
    const finalCharacterData = {
      ...formData,
      user: user?.username || "Unknown", 
    };

    setIsSubmitting(true);
    setSubmitError("");

    // Re-fetch auth data to grab the token for the Authorization header
    try {
      const authData = localStorage.getItem(AUTH_STORAGE_KEY);
      const token = authData ? JSON.parse(authData).token : "";

      const response = await fetch(`${API_SERVER}/api/characters`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // "Authorization": `Bearer ${token}`  // For Authorization later
        },
        body: JSON.stringify(finalCharacterData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to save character to the server.");
      }

      // Success
      console.log("Character successfully created on server");
      navigate("/characters");

    } catch (err) {
      console.error("Submission Error:", err);
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Create New Character</h1>

      {/* Step Indicator */}
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
                  <option key={dndClass.index} value={dndClass.index}>
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
                  <option key={dndRace.index} value={dndRace.index}>
                    {dndRace.name}
                  </option>
                ))}
              </select>
              {raceApiError && (
                <span style={styles.errorText}>{raceApiError}</span>
              )}
            </div>

            {/* Background */}
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
                  <option key={dndBackground.index} value={dndBackground.index}>
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
              <label style={styles.label}>Alignment</label>
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
                  <option key={dndAlignment.index} value={dndAlignment.index}>
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

        {/* Render submission errors if the POST request fails */}
        {submitError && (
          <div style={{ color: "#fca5a5", textAlign: "center", marginBottom: "10px" }}>
            {submitError}
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
            <button type="button" onClick={handleBack} style={styles.cancelBtn} disabled={isSubmitting}>
              Back
            </button>
          )}

          <Button type="submit" disabled={isSubmitting}>
            {step === 1 
              ? "Next Step" 
              : isSubmitting 
                ? "Saving..." 
                : "Create Character"}
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
