const mongoose = require("mongoose");
const { Schema } = mongoose;

const itemSchema = new Schema(
  {
    // --- Core API Data ---
    api_index: { type: String, required: true },
    name: { type: String, required: true },
    equipment_category: { type: String, required: true },
    
    cost: {
      quantity: { type: Number, default: 0 },
      unit: { type: String, default: "gp", enum: ["cp", "sp", "ep", "gp", "pp"] },
    },
    weight: { type: Number, default: 0 },
    desc: { type: [String], default: [] },

    // --- Weapon-Specific Data (Only populated if it's a weapon) ---
    damage: {
      damage_dice: String, // e.g., "1d8"
      damage_type: String, // e.g., "slashing"
    },
    properties: [String], // e.g., ["finesse", "light"]

    // --- Armor-Specific Data (Only populated if it's armor) ---
    armor_class: {
      base: Number,
      dex_bonus: Boolean,
      max_bonus: Number,
    },
    stealth_disadvantage: { type: Boolean, default: false },

    // --- Game-Specific State (The Player's actual inventory data) ---
    owner: {
      type: Schema.Types.ObjectId,
      ref: "Character",
      required: true,
      index: true,
    },
    quantity: { type: Number, default: 1, min: 1 },
    isEquipped: { type: Boolean, default: false },
    customName: { type: String },
  },
  { timestamps: true }
);

// --- Static Factory Function ---
const parseEquipmentData = (apiData, characterId, quantity = 1) => {
  const parsedItem = {
    owner: characterId,
    api_index: apiData.index,
    name: apiData.name,
    equipment_category: apiData.equipment_category?.name || "Other",
    weight: apiData.weight || 0,
    desc: apiData.desc || [],
    quantity: quantity,
  };

  // Safely grab cost if it exists
  if (apiData.cost) {
    parsedItem.cost = {
      quantity: apiData.cost.quantity,
      unit: apiData.cost.unit,
    };
  }

  // If it's a weapon, grab damage and properties
  if (apiData.equipment_category?.index === "weapon") {
    parsedItem.damage = {
      damage_dice: apiData.damage?.damage_dice,
      damage_type: apiData.damage?.damage_type?.name?.toLowerCase(),
    };
    if (apiData.properties) {
      parsedItem.properties = apiData.properties.map((prop) => prop.name.toLowerCase());
    }
  }

  // If it's armor, grab AC and stealth stats
  if (apiData.equipment_category?.index === "armor") {
    parsedItem.armor_class = {
      base: apiData.armor_class?.base,
      dex_bonus: apiData.armor_class?.dex_bonus,
      max_bonus: apiData.armor_class?.max_bonus,
    };
    parsedItem.stealth_disadvantage = apiData.stealth_disadvantage;
  }

  return parsedItem;
};

const Item = mongoose.model("Item", itemSchema);
module.exports = { Item, parseEquipmentData };
