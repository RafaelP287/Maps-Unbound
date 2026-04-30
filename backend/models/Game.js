import { Schema, model } from "mongoose";

const gameSchema = new Schema({
  title: { type: String, required: true, unique: true },
  description: { type: String, maxlength: 500 },
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  dm: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  members: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  maxMembers: {
    type: Number,
    min: 2,
    max: 12,
    default: 8,
  },

  isPublic: { type: Boolean, required: true, index: true, default: false },
  requiresPassword: { type: Boolean, required: true, index: true, default: false },
  password: {type: String },

  timestamps: true,
});

const Game = model("Game", GameSchema);
export default Game;
