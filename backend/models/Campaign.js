import mongoose from "mongoose";

// Sub-schema for members
const memberSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  role: { type: String, enum: ["DM", "Player"], required: true },
});

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
  members: [memberSchema],
}, {timestamps: true});

const Campaign = mongoose.model("Campaign", campaignSchema);

export default Campaign;
