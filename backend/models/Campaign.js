import mongoose from "mongoose";

// Sub-schema for members
const memberSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  characterId: { type: mongoose.Schema.Types.ObjectId, ref: "Character", default: null },
  role: { type: String, enum: ["DM", "Player"], required: true },
  joinedAt: { type: Date, default: Date.now },
});

// Sub-schema for join requests
const joinRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  characterId: { type: mongoose.Schema.Types.ObjectId, ref: "Character", default: null },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  requestedAt: { type: Date, default: Date.now },
});

// Main schema for campaigns
const campaignSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  image: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  members: [memberSchema],
  // Party Finder features
  isPublic: { type: Boolean, default: true },
  isHosting: { type: Boolean, default: false },
  accessCode: { type: String, default: null },
  maxPlayers: { type: Number, default: 6 },
  minLevel: { type: Number, default: 1 },
  campaignType: { type: String, default: "D&D" }, // D&D, Pathfinder, etc.
  status: { type: String, enum: ["active", "inactive", "archived"], default: "inactive" },
  joinRequests: [joinRequestSchema],
}, {
  timestamps: true,
});

const Campaign = mongoose.model("Campaign", campaignSchema);

export default Campaign;