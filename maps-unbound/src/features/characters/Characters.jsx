import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import CharacterCard from "./CharacterCard";
import Button from "../../shared/Button.jsx";
import Gate from "../../shared/Gate.jsx";


const AUTH_STORAGE_KEY = "maps-unbound-auth";
const apiServer = import.meta.env.VITE_API_SERVER;

const Characters = () => {
  // Authentication
  const { user, token, isLoggedIn, loading: authLoading } = useAuth();
  if (!isLoggedIn) {
    return (
      <Gate>
        Sign in to access your characters.
      </Gate>
    );
  }

  const navigate = useNavigate();
  const [characters, setCharacters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetches Characters
    const fetchCharacters = async () => {
      try {
        const response = await fetch(
          `${apiServer}/api/users/${user.username}/characters`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch characters");
        }

        const data = await response.json();
        console.log("API DATA:", data);
        setCharacters(data.characters);
      } catch (err) {
        console.error("Error fetching characters:", err);
        setError("Could not load your characters.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCharacters();
  }, [navigate]);

  // Handle Loading and Error states
  if (isLoading) {
    return (
      <div style={{ color: "white", textAlign: "center", marginTop: "50px" }}>
        Loading your heroes...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ color: "#ff6b6b", textAlign: "center", marginTop: "50px" }}>
        {error}
      </div>
    );
  }

  // Page
  return (
    <>
      <div style={styles.header}>
        <h1>My Characters</h1>
        <Link to="/create-character">
          <Button>Create New Character</Button>
        </Link>
      </div>

      <div style={styles.list}>
        {characters.length === 0 ? (
          <p style={{ color: "#aaa" }}>
            You haven't created any characters yet.
          </p>
        ) : (
          characters.map((character) => (
            <CharacterCard
              key={character._id || character.characterId}
              character={character}
              user={user?.username}
            />
          ))
        )}
      </div>
    </>
  );
};

const styles = {
  header: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "16px",
  },
  list: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "16px",
    padding: "16px",
  },
};

export default Characters;
