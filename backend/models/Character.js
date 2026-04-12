import mongoose from 'mongoose';

const characterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Character name is required'],
      trim: true,
    },
    class: {
      type: String,
      required: [true, 'Character class is required'],
      enum: [
        'Barbarian',
        'Bard',
        'Cleric',
        'Druid',
        'Fighter',
        'Monk',
        'Paladin',
        'Ranger',
        'Rogue',
        'Sorcerer',
        'Warlock',
        'Wizard',
      ],
    },
    race: {
      type: String,
      required: [true, 'Character race is required'],
      enum: [
        'Human',
        'Elf',
        'Dwarf',
        'Halfling',
        'Dragonborn',
        'Gnome',
        'Half-Elf',
        'Half-Orc',
        'Tiefling',
      ],
    },
    level: {
      type: Number,
      default: 1,
      min: 1,
      max: 20,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Ability scores
    abilityScores: {
      strength: { type: Number, default: 10, min: 1, max: 20 },
      dexterity: { type: Number, default: 10, min: 1, max: 20 },
      constitution: { type: Number, default: 10, min: 1, max: 20 },
      intelligence: { type: Number, default: 10, min: 1, max: 20 },
      wisdom: { type: Number, default: 10, min: 1, max: 20 },
      charisma: { type: Number, default: 10, min: 1, max: 20 },
    },
    // Combat stats
    armorClass: { type: Number, default: 10 },
    attackBonus: { type: Number, default: 0 },
    proficiencyBonus: { type: Number, default: 2 },
    
    // Skills (proficiency boolean for each)
    skills: {
      acrobatics: { type: Boolean, default: false },
      animalHandling: { type: Boolean, default: false },
      arcana: { type: Boolean, default: false },
      athletics: { type: Boolean, default: false },
      deception: { type: Boolean, default: false },
      history: { type: Boolean, default: false },
      insight: { type: Boolean, default: false },
      intimidation: { type: Boolean, default: false },
      investigation: { type: Boolean, default: false },
      medicine: { type: Boolean, default: false },
      nature: { type: Boolean, default: false },
      perception: { type: Boolean, default: false },
      performance: { type: Boolean, default: false },
      persuasion: { type: Boolean, default: false },
      sleightOfHand: { type: Boolean, default: false },
      stealth: { type: Boolean, default: false },
      survival: { type: Boolean, default: false },
    },
    
    // Spellcasting info
    spellcasting: {
      type: {
        canCastSpells: { type: Boolean, default: false },
        spellsKnown: [String], // names of spells
        spellSlots: {
          level1: { type: Number, default: 0 },
          level2: { type: Number, default: 0 },
          level3: { type: Number, default: 0 },
          level4: { type: Number, default: 0 },
          level5: { type: Number, default: 0 },
          level6: { type: Number, default: 0 },
          level7: { type: Number, default: 0 },
          level8: { type: Number, default: 0 },
          level9: { type: Number, default: 0 },
        },
        spellcastingAbility: {
          type: String,
          enum: ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'],
          default: 'wisdom',
        },
      },
      default: () => ({}),
    },
    
    // Class features
    classFeatures: [String], // descriptions of acquired features
    
    // Inspiration & Saving Throws
    inspiration: { type: Number, default: 0, min: 0 },
    savingThrows: {
      strength: { type: Boolean, default: false },
      dexterity: { type: Boolean, default: false },
      constitution: { type: Boolean, default: false },
      intelligence: { type: Boolean, default: false },
      wisdom: { type: Boolean, default: false },
      charisma: { type: Boolean, default: false },
    },
    
    // Personality & Roleplay
    personalityTraits: { type: String, default: "" },
    ideals: { type: String, default: "" },
    bonds: { type: String, default: "" },
    flaws: { type: String, default: "" },
    
    // Equipment & resources
    equipment: [String],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Character', characterSchema);
