import mongoose from "mongoose";

// Sub-schema for members
const memberSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  role: { type: String, enum: ["DM", "Player"], required: true },
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
  playStyle: {
    type: String,
    enum: ["Online", "In Person", "Hybrid"],
    default: "Online",
  },
  maxPlayers: { type: Number, min: 1, max: 12, default: 5 },
  startDate: { type: Date },
  status: {
    type: String,
    enum: ["Planning", "Active", "On Hold", "Completed"],
    default: "Planning",
  },
  currentQuest: { type: currentQuestSchema, default: null },
  npcs: { type: [npcSchema], default: [] },
  loot: { type: [lootSchema], default: [] },
  members: [memberSchema],
  sessionIds: { type: [mongoose.Schema.Types.ObjectId], ref: "Session", default: [] },
}, {timestamps: true});

const Campaign = mongoose.model("Campaign", campaignSchema);

export default Campaign;
