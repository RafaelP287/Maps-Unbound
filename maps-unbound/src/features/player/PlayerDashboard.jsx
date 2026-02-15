import { useState } from 'react';
import CharacterSelection from './CharacterSelection';
import LobbySearch from './LobbySearch';

function PlayerDashboard() {
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [step, setStep] = useState('character'); // 'character' or 'lobby'

  const handleCharacterSelect = (character) => {
    setSelectedCharacter(character);
    setStep('lobby');
  };

  const handleBack = () => {
    setStep('character');
    setSelectedCharacter(null);
  };

  return (
    <div className="player-dashboard">
      {step === 'character' && (
        <CharacterSelection onCharacterSelect={handleCharacterSelect} />
      )}
      {step === 'lobby' && (
        <LobbySearch 
          character={selectedCharacter} 
          onBack={handleBack}
        />
      )}
    </div>
  );
}

export default PlayerDashboard;