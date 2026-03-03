import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import CharacterCard from "./CharacterCard";
import Button from "../../shared/Button.jsx";

const AUTH_STORAGE_KEY = "maps-unbound-auth";
const apiServer = import.meta.env.VITE_API_SERVER;

const Characters = () => {
  const navigate = useNavigate();

  const [characters, setCharacters] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const authData = localStorage.getItem(AUTH_STORAGE_KEY);

    // Redirect to login if no user is found
    if (!authData) {
      navigate("/login");
      return;
    }

    const { user } = JSON.parse(authData);
    setCurrentUser(user);

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
              currentUser={currentUser?.username}
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
