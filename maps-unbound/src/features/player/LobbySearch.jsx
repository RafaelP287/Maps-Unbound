import { useState } from 'react';

function LobbySearch({ character, onBack }) {
  const [lobbies] = useState([
    { 
      id: 1, 
      name: 'Immortal Isles', 
      dm: 'Raff', 
      players: 3, 
      maxPlayers: 5,
      levelRange: '1-5',
      description: 'A classic adventure for new players'
    },
    { 
      id: 2, 
      name: 'Divinity', 
      dm: 'Larian', 
      players: 4, 
      maxPlayers: 6,
      levelRange: '1-10',
      description: 'Gothic horror in Barovia'
    },
  ]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');

  const handleJoinLobby = (lobbyId) => {
    console.log(`${character.name} requesting to join lobby ${lobbyId}`);
    alert(`Join request sent for ${character.name}!`);
  };

  const filteredLobbies = lobbies.filter(lobby => {
    const matchesSearch = lobby.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lobby.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterLevel === 'all') return matchesSearch;
    
    const [minLevel, maxLevel] = lobby.levelRange.split('-').map(Number);
    return matchesSearch && character.level >= minLevel && character.level <= maxLevel;
  });

  return (
    <div className="lobby-search">
      <div className="lobby-header">
        <button onClick={onBack} className="back-btn">← Back</button>
        <div className="selected-character">
          <h3>Playing as: {character.name}</h3>
          <p>Level {character.level} {character.class}</p>
        </div>
      </div>

      <div className="search-controls">
        <input
          type="text"
          placeholder="Search lobbies..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        
        <select 
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Levels</option>
          <option value="character">Match My Level ({character.level})</option>
        </select>
      </div>

      <div className="lobbies-list">
        {filteredLobbies.length === 0 ? (
          <p className="no-lobbies">No lobbies found. Try adjusting your search.</p>
        ) : (
          filteredLobbies.map(lobby => (
            <div key={lobby.id} className="lobby-card">
              <div className="lobby-info">
                <h3>{lobby.name}</h3>
                <p className="lobby-description">{lobby.description}</p>
                <div className="lobby-details">
                  <span className="lobby-dm">DM: {lobby.dm}</span>
                  <span className="lobby-players">Players: {lobby.players}/{lobby.maxPlayers}</span>
                  <span className="lobby-level">Levels: {lobby.levelRange}</span>
                </div>
              </div>
              <button 
                onClick={() => handleJoinLobby(lobby.id)}
                className="join-btn"
                disabled={lobby.players >= lobby.maxPlayers}
              >
                {lobby.players >= lobby.maxPlayers ? 'Full' : 'Join'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default LobbySearch;