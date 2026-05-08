/**
 * Campaign Data Model
 *
 * Represents a campaign (game/session) in Maps Unbound with:
 * - Campaign metadata (title, description, type)
 * - Member management (DM, players, join requests)
 * - Encounter state (grid, tokens, initiative, combat log)
 * - Campaign content (NPCs, loot, quests)
 *
 * KEY FEATURES:
 * - Encounter readiness gate: only DM can prep, players join when isReady=true
 * - Token ownership: tokens have ownerUserId for strict movement control
 * - Turn economy: action, bonus action, reaction tracking per token
 * - Theater of mind support: tokens track distance in feet (~5ft per grid square)
 */

/**
 * Campaign Data Model
 *
 * Represents a campaign (game/session) in Maps Unbound with:
 * - Campaign metadata (title, description, type)
 * - Member management (DM, players, join requests)
 * - Encounter state (grid, tokens, initiative, combat log)
 * - Campaign content (NPCs, loot, quests)
 *
 * KEY FEATURES:
 * - Encounter readiness gate: only DM can prep, players join when isReady=true
 * - Token ownership: tokens have ownerUserId for strict movement control
 * - Turn economy: action, bonus action, reaction tracking per token
 * - Theater of mind support: tokens track distance in feet (~5ft per grid square)
 */

import mongoose from "mongoose";

// Sub-schema for members
const memberSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  characterId: { type: mongoose.Schema.Types.ObjectId, ref: "Character", default: null },
  role: { type: String, enum: ["DM", "Player"], required: true },
  joinedAt: { type: Date, default: Date.now },
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

const enemySchema = new mongoose.Schema({
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

const encounterGridSchema = new mongoose.Schema({
  cols: { type: Number, min: 2, max: 30, default: 6 },
  rows: { type: Number, min: 2, max: 30, default: 4 },
}, { _id: false });

// IMPORTANT: Token schema represents a combatant on the encounter map.
// Each token tracks combat resources and ownership for strict control.
// IMPORTANT: Token schema represents a combatant on the encounter map.
// Each token tracks combat resources and ownership for strict control.
const encounterTokenSchema = new mongoose.Schema({
  tokenId: { type: String, required: true },
  name: { type: String, trim: true, maxlength: 80, required: true },
  type: { type: String, enum: ["Player", "NPC", "Enemy", "Token"], default: "Token" },
  role: { type: String, trim: true, maxlength: 80, default: "Unit" },
  hp: { type: Number, min: 0, max: 9999, default: 10 },
  maxHp: { type: Number, min: 1, max: 9999, default: 10 },
  initiativeBonus: { type: Number, min: -20, max: 20, default: 0 },
  lastInitiativeRoll: { type: Number, min: 0, max: 20, default: 0 },
  position: {
    x: { type: Number, min: 1, max: 30, default: 1 },
    y: { type: Number, min: 1, max: 30, default: 1 },
  },
  distanceFeet: { type: Number, min: 0, max: 9999, default: 30 },
  status: { type: String, trim: true, maxlength: 200, default: "Ready" },
  color: { type: String, trim: true, maxlength: 24, default: "#c9a84c" },
  ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  initiative: { type: Number, min: -99, max: 999, default: 0 },
  movementSpeed: { type: Number, min: 0, max: 120, default: 30 },
  // Theater-of-mind combat tracks separation in feet instead of relying on the grid.
  distanceFeet: { type: Number, min: 0, max: 9999, default: 30 },
  characterId: { type: mongoose.Schema.Types.ObjectId, ref: "Character", default: null },
  characterStats: { type: mongoose.Schema.Types.Mixed, default: null },
  movementRemaining: { type: Number, min: 0, max: 120, default: 30 },
  actionAvailable: { type: Boolean, default: true },
  // IMPORTANT: Bonus actions default to false (must be explicitly granted by class features).
  // This differs from standard D&D; enforces careful class/feat design.
  bonusActionAvailable: { type: Boolean, default: false },
  reactionAvailable: { type: Boolean, default: true },
  objectInteractionAvailable: { type: Boolean, default: true },
}, { _id: false });

// IMPORTANT: Encounter state schema holds all combat info and readiness flag.
// isReady gates player access; DM can prep privately before opening encounter.
const encounterStateSchema = new mongoose.Schema({
  // FEATURE: isReady blocks non-DM access to live encounter until DM explicitly opens it.
  isReady: { type: Boolean, default: false },
  grid: { type: encounterGridSchema, default: () => ({ cols: 6, rows: 4 }) },
  tokens: { type: [encounterTokenSchema], default: [] },
  initiativeOrder: { type: [String], default: [] },
  activeTokenId: { type: String, default: "" },
  round: { type: Number, min: 1, max: 9999, default: 1 },
  log: { type: [String], default: [] },
  updatedAt: { type: Date, default: Date.now },
}, { _id: false });

// Main schema for campaigns
const campaignSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, trim: true, maxlength: 500 },
  image: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  isPublic: { type: Boolean, default: true },
  isHosting: { type: Boolean, default: false },
  accessCode: { type: String, default: null },
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
  enemies: { type: [enemySchema], default: [] },
  loot: { type: [lootSchema], default: [] },
  members: [memberSchema],
  sessionIds: { type: [mongoose.Schema.Types.ObjectId], ref: "Session", default: [] },
  encounter: { type: encounterStateSchema, default: () => ({}) },
}, {timestamps: true});

campaignSchema.index({ "members.userId": 1, updatedAt: -1 });

const Campaign = mongoose.model("Campaign", campaignSchema);

export default Campaign;
