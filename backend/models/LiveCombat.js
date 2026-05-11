import mongoose from "mongoose";

// ─── A single combatant in the initiative order ────────────────────────────
// Could be a player character, an NPC, or an enemy.
// Players are linked to their Character document (so we can pull live HP, etc.).
// NPCs and enemies are inline — no Character reference needed.
const combatantSchema = new mongoose.Schema(
  {
    // Stable id used by the frontend for keying + reorder operations.
    // Generated client-side or server-side; doesn't need to match anything in DB.
    id: { type: String, required: true },

    // What kind of combatant this is.
    kind: {
      type: String,
      enum: ["Player", "NPC", "Enemy"],
      required: true,
    },

    // Display name (always set; for Players this is their character's name).
    name: { type: String, required: true, trim: true, maxlength: 120 },

    // ─── Player-specific fields ─────────────────────────────────────────
    // For Players, link to the Character document so we can sync HP both ways.
    // For NPCs/Enemies, this is null.
    characterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Character",
      default: null,
    },
    // The user who owns this character. Useful for permission checks
    // (e.g., "is this player allowed to edit their own token?").
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ─── Stats ──────────────────────────────────────────────────────────
    // Initiative score the DM entered. Used for sorting at combat start.
    initiative: { type: Number, default: 0 },
    // Current HP. For Players, this mirrors Character.hp.current.
    hp: { type: Number, default: 0 },
    // Max HP. For Players, mirrors Character.hp.max.
    maxHp: { type: Number, default: 0 },

    // ─── Token reference (Godot side) ───────────────────────────────────
    // The Godot token's stable id (e.g., "token_42") so we can send updates
    // back to Godot when HP changes.
    tokenId: { type: String, default: "" },

    // ─── Visibility flags (DM-only toggles in EncounterOverlay) ─────────
    // hiddenFromMap → Godot in player/projector mode skips the token spawn
    // hiddenFromInitiative → InitiativeStrip filters them out for non-DMs
    hiddenFromMap: { type: Boolean, default: false },
    hiddenFromInitiative: { type: Boolean, default: false },
    // Legacy field — kept so old docs deserialize cleanly. Unused now.
    hiddenFromPlayers: { type: Boolean, default: false },

    // ─── Portrait override (rare) ───────────────────────────────────────
    // Normally portraits come from Character.portrait. For NPCs/Enemies,
    // DM can paste an arbitrary URL or leave blank for default circle.
    portraitUrl: { type: String, default: "" },
  },
  { _id: false }
);

// ─── A single combat log entry ─────────────────────────────────────────────
// Auto-appended as combat actions happen. Shown in the Events panel.
const combatLogEntrySchema = new mongoose.Schema(
  {
    // Round number when this happened (e.g., 1, 2, 3...).
    round: { type: Number, default: 1 },
    // Type of event. Drives icon/color in the UI.
    type: {
      type: String,
      enum: [
        "round_started",
        "turn_started",
        "damage",
        "heal",
        "died",
        "revived",
        "joined",
        "removed",
        "combat_started",
        "combat_ended",
        "note", // free-text DM annotation
      ],
      required: true,
    },
    // Names involved. Most events have one; damage events have source + target.
    actorName: { type: String, default: "" }, // who did the action
    targetName: { type: String, default: "" }, // who received the action
    // Magnitude (HP amount for damage/heal).
    amount: { type: Number, default: 0 },
    // Free-text message (used for "note" type and for fallback display).
    message: { type: String, default: "", maxlength: 500 },
    // When it happened.
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

// ─── The main LiveCombat document ──────────────────────────────────────────
// One per active combat. When combat ends, we either delete this or archive
// to an Encounter record. For now we keep ONE LiveCombat per session at a
// time (sessionId is unique).
const liveCombatSchema = new mongoose.Schema(
  {
    // Which session this combat belongs to. One active combat per session.
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
      unique: true,
      index: true,
    },
    // Cached for convenience (avoids needing to populate Session every fetch).
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
      index: true,
    },

    // Status of this combat.
    // "setup"  → DM is still building the initiative list (modal open)
    // "active" → combat has started, turns are advancing
    // "ended"  → DM clicked End Combat (we usually delete the doc here, but
    //            keeping the enum lets us archive in the future)
    status: {
      type: String,
      enum: ["setup", "active", "ended"],
      default: "setup",
    },

    // Current round (1-indexed). Increments when activeTurnIndex wraps.
    round: { type: Number, min: 0, default: 0 },

    // Index into `combatants` — whose turn is it right now.
    // -1 means combat hasn't started yet (still in setup).
    activeTurnIndex: { type: Number, default: -1 },

    // The initiative order. Index 0 is the first to act.
    combatants: { type: [combatantSchema], default: [] },

    // Chronological combat log.
    log: { type: [combatLogEntrySchema], default: [] },

    // When combat actually started (status went setup → active).
    startedAt: { type: Date },
  },
  { timestamps: true }
);

// Helper indexes — one per session, lookups by campaign for active-combat checks.
liveCombatSchema.index({ campaignId: 1, status: 1 });

const LiveCombat = mongoose.model("LiveCombat", liveCombatSchema);

export default LiveCombat;