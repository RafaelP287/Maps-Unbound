const mongoose = require('mongoose');
const { Schema } = mongoose;

const itemSchema = new Schema({
  // --- Metadata ---
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  description: {
    type: String,
    maxlength: 1000
  },
  
  // --- Classification (Enums) ---
  category: {
    type: String,
    required: true,
    enum: ['WEAPON', 'ARMOR', 'CONSUMABLE', 'TOOL', 'MISC'], 
    default: 'MISC'
  },
  rarity: {
    type: String,
    enum: ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'],
    default: 'COMMON'
  },

  // --- Game Mechanics (Ranges & Validation) ---
  stats: {
    // For weapons: "1d8", "2d6"
    damageDice: String, 
    // For armor
    armorClass: { type: Number, min: 0 }, 
    durability: {
      type: Number,
      min: 0,
      max: 100,
      default: 100
    },
    requiresLevel: { type: Number, min: 1, default: 1 }
  },

  // --- Inventory Management ---
  quantity: {
    type: Number,
    min: 1,
    max: [99, 'Cannot stack more than 99 items.'],
    default: 1
  },
  weight: {
    type: Number,
    default: 0.5 // in kg
  },
  value: {
    type: Number, // In copper pieces or gold
    min: 0,
    default: 0
  },

  // --- Ownership ---
  // Reference to the character holding this item
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'Character',
    index: true // Fast lookup for "Inventory" queries
  },
  isEquipped: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Virtual: Helper to check if item is broken without storing a boolean
itemSchema.virtual('isBroken').get(function() {
  return this.stats.durability === 0;
});

const Item = mongoose.model('Item', itemSchema);
module.exports = Item;
