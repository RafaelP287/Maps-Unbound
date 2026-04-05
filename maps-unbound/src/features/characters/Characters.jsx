import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import CharacterCard from "./CharacterCard";
import Button from "../../shared/Button.jsx";
import "./characters.css";

const Characters = () => {
  const { token } = useAuth();
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [viewCharacter, setViewCharacter] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        setLoading(true);
        const response = await fetch("http://localhost:5001/api/characters", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error("Failed to fetch characters");
        }

        const data = await response.json();
        setCharacters(data);
        setError("");
      } catch (err) {
        console.error("Error fetching characters:", err);
        setError("Failed to load characters");
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchCharacters();
    }
  }, [token]);

  const handleDeleteCharacter = async (characterId) => {
    const confirmed = window.confirm("Delete this character? This action cannot be undone.");
    if (!confirmed) return;

    try {
      setDeletingId(characterId);
      setError("");

      const response = await fetch(`http://localhost:5001/api/characters/${characterId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete character");
      }

      setCharacters((prev) => prev.filter((character) => character._id !== characterId));
      if (viewCharacter?._id === characterId) {
        setViewCharacter(null);
      }
    } catch (err) {
      setError(err.message || "Failed to delete character");
    } finally {
      setDeletingId("");
    }
  };

  if (loading) {
    return <div className="characters-loading">Loading characters...</div>;
  }

  return (
    <div className="characters-page">
      <div className="characters-shell">
        <header className="section-page-header">
          <div className="section-header-divider" />
          <div className="section-header-row">
            <span className="section-header-rune">✦</span>
            <h1 className="section-page-title">My Characters</h1>
            <span className="section-header-rune">✦</span>
          </div>
          <div className="section-header-divider" />
          <Link to="/create-character" className="section-header-cta">
            <Button>Create Character</Button>
          </Link>
        </header>
      {error && <div className="characters-error">{error}</div>}
      <div className="characters-list">
        {characters.length > 0 ? (
          characters.map((character) => (
            <div key={character._id} className="characters-item">
              <CharacterCard character={character} />
              <div className="characters-actions-row">
                <button
                  type="button"
                  className="characters-action-btn"
                  onClick={() => setViewCharacter(character)}
                >
                  View
                </button>
                <Link to={`/create-character?characterId=${character._id}`}>
                  <button type="button" className="characters-action-btn">Edit</button>
                </Link>
                <button
                  type="button"
                  className="characters-action-btn is-danger"
                  onClick={() => handleDeleteCharacter(character._id)}
                  disabled={deletingId === character._id}
                >
                  {deletingId === character._id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="characters-empty">
            <h2>No characters yet</h2>
            <p>Create your first character to get started!</p>
          </div>
        )}
      </div>
      {viewCharacter && (
        <div className="characters-modal">
          <div className="characters-modal-card">
            <h2>{viewCharacter.name}</h2>
            <p><strong>Class:</strong> {viewCharacter.class}</p>
            <p><strong>Race:</strong> {viewCharacter.race}</p>
            <p><strong>Level:</strong> {viewCharacter.level}</p>
            <div className="characters-modal-actions">
              <Link to={`/create-character?characterId=${viewCharacter._id}`}>
                <button type="button" className="characters-action-btn">Edit</button>
              </Link>
              <button type="button" className="characters-action-btn" onClick={() => setViewCharacter(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default Characters;
