import { useState } from 'react';

function AddCharacterModal({ onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    class: '',
    level: 1,
    race: '',
  });

  const classes = [
    'Barbarian', 'Bard', 'Cleric', 'Druid', 
    'Fighter', 'Monk', 'Paladin', 'Ranger', 
    'Rogue', 'Sorcerer', 'Warlock', 'Wizard'
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'level' ? parseInt(value) : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.name && formData.class) {
      onSubmit(formData);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Create New Character</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Character Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="race">Race</label>
            <input
              type="text"
              id="race"
              name="race"
              value={formData.race}
              onChange={handleChange}
              placeholder="e.g., Human, Elf, Dwarf"
            />
          </div>

          <div className="form-group">
            <label htmlFor="class">Class *</label>
            <select
              id="class"
              name="class"
              value={formData.class}
              onChange={handleChange}
              required
            >
              <option value="">Select a class</option>
              {classes.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="level">Level</label>
            <input
              type="number"
              id="level"
              name="level"
              min="1"
              max="20"
              value={formData.level}
              onChange={handleChange}
            />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create Character
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddCharacterModal;