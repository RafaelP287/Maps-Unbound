import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, ScrollText } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import Gate from "../../shared/Gate.jsx";
import CharacterCard from "./CharacterCard.jsx";

const API_SERVER = import.meta.env.VITE_API_SERVER || "";

function Characters() {
  const { user, isLoggedIn, loading: authLoading } = useAuth();
  const [characters, setCharacters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn || !user?.username) {
      setIsLoading(false);
      return;
    }

    const fetchCharacters = async () => {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetch(`${API_SERVER}/api/users/${user.username}/characters`);

        if (!response.ok) {
          throw new Error("Failed to fetch characters.");
        }

        const data = await response.json();
        setCharacters(Array.isArray(data.characters) ? data.characters : []);
      } catch (err) {
        setError(err.message || "Could not load your characters.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCharacters();
  }, [isLoggedIn, user?.username]);

  if (authLoading) {
    return <div className="character-status">Loading your character vault...</div>;
  }

  if (!isLoggedIn) {
    return <Gate>Sign in to access your characters.</Gate>;
  }

  return (
    <div className="character-page">
      <div className="character-shell">
        <header className="character-header">
          <div className="character-header-copy">
            <p className="character-eyebrow">Adventurer Roster</p>
            <h1 className="character-title">My Characters</h1>
            <p className="character-subtitle">Open a sheet to edit stats, story notes, proficiencies, and combat details.</p>
          </div>

          <Link to="/create-character" className="character-btn-link">
            <Plus aria-hidden="true" />
            Create Character
          </Link>
        </header>

        <div className="character-divider" />

        {isLoading && <div className="character-status">Loading your heroes...</div>}
        {error && <div className="character-error">{error}</div>}

        {!isLoading && !error && (
          <div className="character-list-grid">
            {characters.length === 0 ? (
              <div className="character-empty-state">
                <ScrollText aria-hidden="true" />
                <p>You have not created any characters yet.</p>
              </div>
            ) : (
              characters.map((character) => (
                <CharacterCard key={character._id || character.characterId} character={character} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Characters;
