import { Schema } from 'mongoose';

const skillSchema = new Schema({
  // --- API Data ---
  api_index: { type: String, required: true }, 
  name: { type: String, required: true },
  desc: [String],
  
  // The API returns the governing stat for the skill (e.g., DEX for Acrobatics)
  ability_score: { 
    index: String, 
    name: String, 
    url: String 
  },

  // --- Game-Specific ---
  is_proficient: { type: Boolean, default: false },
  expertise: { type: Boolean, default: false }, // For Rogues/Bards doubling their proficiency
  notes: { type: String, default: "" }
}, { _id: false });

// --- Static Factory Function ---
const parseSkillData = (apiData) => {
  return {
    api_index: apiData.index,
    name: apiData.name,
    desc: apiData.desc || [],
    ability_score: apiData.ability_score
  };
};

export { skillSchema, parseSkillData };
