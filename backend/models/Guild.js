import { Schema, model } from "mongoose";

const guildSchema = new Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, maxlength: 500 },
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  members: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],

  isPublic: { type: Boolean, required: true, index: true, default: false },

  maxMembers: {
    type: Number,
    default: 50,
  },

  timestamps: true,
  guildImageUrl: { type: String },
  s3Key: { type: String },
});

guildSchema.index({ owner: 1, name: 1 });

const Guild = model("Guild", guildSchema);
export default Guild;
