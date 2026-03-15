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

const currentQuestSchema = new mongoose.Schema({
  title: { type: String, trim: true, maxlength: 120 },
  objective: { type: String, trim: true, maxlength: 500 },
  status: {
    type: String,
    enum: ["In Progress", "Blocked", "Completed"],
    default: "In Progress",
  },
  updatedAt: { type: Date, default: Date.now },
}, { _id: false });

const npcSchema = new mongoose.Schema({
  name: { type: String, trim: true, maxlength: 80, required: true },
  role: { type: String, trim: true, maxlength: 120 },
  notes: { type: String, trim: true, maxlength: 400 },
}, { _id: false });

const lootSchema = new mongoose.Schema({
  name: { type: String, trim: true, maxlength: 120, required: true },
  quantity: { type: Number, min: 1, max: 999, default: 1 },
  holder: { type: String, trim: true, maxlength: 80 },
  notes: { type: String, trim: true, maxlength: 300 },
}, { _id: false });

// Main schema for campaigns
const campaignSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, trim: true, maxlength: 500 },
  image: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  isPublic: { type: Boolean, default: true },
  isHosting: { type: Boolean, default: false },
  accessCode: { type: String, default: null },
  maxPlayers: { type: Number, min: 1, max: 12, default: 5 },
  minLevel: { type: Number, default: 1 },
  maxLevel: { type: Number, default: 20 },
  campaignType: { type: String, default: "D&D" }, // D&D, Pathfinder, etc.
  playStyle: {
    type: String,
    enum: ["Online", "In Person", "Hybrid"],
    default: "Online",
  },
  startDate: { type: Date },
  status: {
    type: String,
    enum: ["active", "inactive", "archived", "Planning", "Active", "On Hold", "Completed"],
    default: "Planning",
  },
  currentQuest: { type: currentQuestSchema, default: null },
  npcs: { type: [npcSchema], default: [] },
  loot: { type: [lootSchema], default: [] },
  members: [memberSchema],
  joinRequests: [joinRequestSchema],
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
}, {
  timestamps: true,
});

const Campaign = mongoose.model("Campaign", campaignSchema);

export default Campaign;
