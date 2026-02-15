import { useState } from "react";
import { Link } from "react-router-dom";
import CharacterCard from "./CharacterCard";
import Button from "../../shared/Button.jsx";
import dwarfImage from "./images/Dwarf-fighter.jpg";
import elfImage from "./images/Elf-wizard.png";

/**
 * Characters Component
 * 
 * Main page for displaying all player characters in the D&D virtual tabletop.
 * Features:
 * - Display list of player characters as cards
 * - Navigation to character creation page
 * - Mock data with sample dwarf fighter and elf ranger
 */
const Characters = () => {

  // Mock character data - replace with API call when backend is ready
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
      {/* Header section with title and create button */}
      <div style={styles.header}>
        <h1>My Characters</h1>
        <Link to="/create-character">
          <Button>Create New Character</Button>
        </Link>
      </div>

      {/* Character grid - displays all characters as cards */}
      <div style={styles.list}>
        {characters.map((character, index) => (
          <CharacterCard key={index} character={character} currentUser="Bob" />
        ))}
      </div>
    </>
  );
};

// Styling for the Characters page layout
const styles = {
  // Header container - centered column layout
  header: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "16px"
  },
  // Character grid - flexible wrap layout for responsive design
  list: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "16px",
    padding: "16px"
  }
};

export default Characters;
