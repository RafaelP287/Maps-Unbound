import mongoose, { Schema, model } from 'mongoose';

const counterSchema = new Schema({
  _id: { type: String, required: true }, // The name of the sequence (e.g., 'character_id')
  seq: { type: Number, default: 0 }      // The current number
});

const Counter = mongoose.model("Counter", counterSchema);
export default Counter;
