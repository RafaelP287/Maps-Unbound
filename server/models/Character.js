const mongoose = require("mongoose");
const { Schema } = mongoose;
const Counter = require("./Counter");
const { spellSchema } = require("./Spell.js");

const characterSchema = new Schema(
  {
    // --- Identity ---
    characterId: { type: Number, unique: true },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 30,
    },
    // Link to the Player Account
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // --- Core RPG Data ---
    race: {
      type: String,
      required: true,
    },
    class: {
      type: String,
      required: true,
    },
    maxLevel: {
      type: Number,
      default: 20,
    },
    level: {
      type: Number,
      min: 1,
      default: 1,
      validate: {
        // "this" refers to the document being saved
        validator: function (value) {
          return value <= this.maxLevel;
        },
        message: (props) =>
          `Level (${props.value}) cannot exceed the character's max level.`,
      },
    },
    experience: {
      type: Number,
      min: 0,
      default: 0,
    },

    // --- Vitals (Current State) ---
    hp: {
      current: { type: Number, min: 0, default: 10 },
      max: { type: Number, min: 1, default: 10 },
    },
    mana: {
      current: { type: Number, min: 0, default: 0 },
      max: { type: Number, min: 0, default: 0 },
    },

    // --- Attributes (Stats) ---
    attributes: {
      strength: { type: Number, min: 1, max: 30, default: 10 },
      dexterity: { type: Number, min: 1, max: 30, default: 10 },
      constitution: { type: Number, min: 1, max: 30, default: 10 },
      intelligence: { type: Number, min: 1, max: 30, default: 10 },
      wisdom: { type: Number, min: 1, max: 30, default: 10 },
      charisma: { type: Number, min: 1, max: 30, default: 10 },
    },

    // --- Skills ---
    skills: {
      name: {
        type: String,
        required: true,
      },
      level: {
        type: Number,
        required: true,
        default: 1,
      },
      desc: {
        type: String,
        required: true,
        maxlength: 30,
      },
    },
    // --- Spellbook ---
    spellbook: [spellSchema],

    // --- Status Flags ---
    isDead: {
      type: Boolean,
      default: false,
    },
    lastLogin: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true }, // Ensure virtuals are sent to client
    toObject: { virtuals: true },
  },
);

// --- Virtual Population: Inventory ---
// Instead of storing an array of Item IDs here, we ask Mongoose to look at the
// 'Item' collection and find items where 'owner' matches this Character's ID.
characterSchema.virtual("inventory", {
  ref: "Item", // The model to use
  localField: "_id", // Find items where `localField`
  foreignField: "owner", // is equal to `foreignField`
});

// --- Instance Method: Apply Damage ---
characterSchema.methods.takeDamage = async function (amount) {
  this.hitPoints.current -= amount;

  if (this.hitPoints.current <= 0) {
    this.hitPoints.current = 0;
    this.isDead = true;
  }

  return this.save();
};

characterSchema.pre("save", async function () {
  const doc = this;

  // Only generate a new ID if this is a NEW document
  if (!doc.isNew) {
    return;
  }

  try {
    // Atomically find the counter and increment it ('character_id')
    const counter = await Counter.findByIdAndUpdate(
      { _id: "character_id" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    // Assign the new number to the character
    doc.characterId = counter.seq;
  } catch (error) {
    throw error;
  }
});

const Character = mongoose.model("Character", characterSchema);
module.exports = Character;
