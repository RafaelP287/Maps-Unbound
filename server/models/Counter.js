const mongoose = require('mongoose');

const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // The name of the sequence (e.g., 'character_id')
  seq: { type: Number, default: 0 }      // The current number
});

module.exports = mongoose.model('Counter', CounterSchema);
