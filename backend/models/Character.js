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
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Character', characterSchema);
