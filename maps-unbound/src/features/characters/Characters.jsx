import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

import Gate from "../../shared/Gate.jsx";
import CharacterCard from "./CharacterCard";
import Button from "../../shared/Button.jsx";
import dwarfImage from "./images/Dwarf-fighter.jpg";
import elfImage from "./images/Elf-wizard.png";

const Characters = () => {
  const { user, token, isLoggedIn, loading: authLoading } = useAuth();

  if (!isLoggedIn) {
    return (
      <Gate>
        Sign in to access your characters.
      </Gate>
    );
  }

  const [characters] = useState([
    {
      name: "Krorgulir Wyvernbeard",
      class: "Fighter",
      level: 5,
      race: "Dwarf",
      image: dwarfImage,
      owner: "Bob"
    },
    {
      name: "Arel Vasatra",
      class: "Ranger",
      level: 4,
      race: "Elf",
      image: elfImage,
      owner: "Bob"
    }
  ]);

  return (
    <>
      <div style={styles.header}>
        <h1>My Characters</h1>
        <Link to="/create-character">
          <Button>Create New Character</Button>
        </Link>
      </div>
      <div style={styles.list}>
        {characters.map((character, index) => (
          <CharacterCard key={index} character={character} currentUser="Bob" />
        ))}
      </div>
    </>
  );
};

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
  }
};

export default Characters;
