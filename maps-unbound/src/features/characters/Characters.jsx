import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import CharacterCard from "./CharacterCard";
import Button from "../../shared/Button.jsx";

const Characters = () => {
  const { token } = useAuth();
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
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

  if (loading) {
    return <div style={styles.loading}>Loading characters...</div>;
  }

  return (
    <>
      <div style={styles.header}>
        <h1>My Characters</h1>
        <Link to="/create-character">
          <Button>Create New Character</Button>
        </Link>
      </div>
      {error && <div style={styles.error}>{error}</div>}
      <div style={styles.list}>
        {characters.length > 0 ? (
          characters.map((character) => (
            <CharacterCard key={character._id} character={character} />
          ))
        ) : (
          <div style={styles.empty}>
            <h2>No characters yet</h2>
            <p>Create your first character to get started!</p>
            <Link to="/create-character">
              <Button>Create Character</Button>
            </Link>
          </div>
        )}
      </div>
    </>
  );
}

const styles = {
  header: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "16px"
  },
  list: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "16px",
    padding: "16px"
  },
  loading: {
    textAlign: "center",
    padding: "40px 20px",
    fontSize: "18px",
    color: "#666"
  },
  error: {
    backgroundColor: "#ff4444",
    color: "#fff",
    padding: "12px",
    borderRadius: "6px",
    margin: "20px",
    textAlign: "center"
  },
  empty: {
    textAlign: "center",
    padding: "40px 20px",
    color: "#666"
  }
};

export default Characters;
