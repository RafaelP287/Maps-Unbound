const mongoose = require('mongoose');

const spellSchema = new mongoose.Schema({
  api_index: { type: String, required: true }, 
  name: { type: String, required: true },
  level: Number,
  desc: [String],
  range: String,
  components: [String],
  material: String,
  ritual: Boolean,
  duration: String,
  concentration: Boolean,
  casting_time: String,
  school: { name: String, url: String },

  // Game-Specific
  is_prepared: { type: Boolean, default: false },
  notes: { type: String, default: "" }
});

// --- Static Factory Function ---
const parseSpellData = (apiData) => {
  return {
    api_index: apiData.index,
    name: apiData.name,
    desc: apiData.desc,
    level: apiData.level,
    range: apiData.range,
    components: apiData.components,
    material: apiData.material || null, 
    ritual: apiData.ritual,
    duration: apiData.duration,
    concentration: apiData.concentration,
    casting_time: apiData.casting_time,
    school: apiData.school,
    higher_level: apiData.higher_level || []
  };
};

module.exports = { spellSchema, parseSpellData };
