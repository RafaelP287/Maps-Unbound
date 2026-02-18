import { useState } from 'react';
import AddCharacterModal from './AddCharacterModal';

function CharacterSelection({ onCharacterSelect }) {
  const [characters, setCharacters] = useState([
    { id: 1, name: 'Skarn', class: 'Artificer', level: 5 },
    { id: 2, name: 'Karlach', class: 'Barbarian', level: 3 },
  ]);
  const [showAddModal, setShowAddModal] = useState(false);

  const handleAddCharacter = (newCharacter) => {
    setCharacters(prev => [...prev, { ...newCharacter, id: Date.now() }]);
    setShowAddModal(false);
  };

  return (
    <div className="character-selection">
      <h2>Select Your Character</h2>
      
      <div className="character-grid">
        {characters.map((character) => (
          <div 
            key={character.id} 
            className="character-card"
            onClick={() => onCharacterSelect(character)}
          >
            <h3>{character.name}</h3>
            <p className="character-class">{character.class}</p>
            <p className="character-level">Level {character.level}</p>
          </div>
        ))}
        
        <button 
          className="add-character-btn"
          onClick={() => setShowAddModal(true)}
        >
          <span className="plus-icon">+</span>
          <span>Add Character</span>
        </button>
      </div>

      {showAddModal && (
        <AddCharacterModal 
          onSubmit={handleAddCharacter}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}

export default CharacterSelection;