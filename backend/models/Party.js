import mongoose from "mongoose";

const partySchema = new mongoose.Schema({
  owner: {
    type: String, // Assuming usernames based on your frontend setup
    required: true,
  },
  partyName: {
    type: String,
    required: true,
    maxLength: [40, "Party name cannot exceed 40 characters."],
  },
  isPublic: {
    type: Boolean,
    default: true,
  },
  lobbyCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
  },
  maxPlayers: {
    type: Number,
    required: true,
    min: [1, "Party must have at least 1 player slot."],
    max: [12, "Party cannot exceed 12 player slots."],
    default: 4,
  },
  players: [{
    type: String, // Array of usernames currently in the lobby
  }],
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 7200, // MongoDB will automatically delete this document after 7200 seconds (2 hours)
  },
});

export default mongoose.model("Party", partySchema);
