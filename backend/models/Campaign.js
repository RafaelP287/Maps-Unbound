import mongoose from "mongoose";

// Sub-schema for members
const memberSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  role: { type: String, enum: ["DM", "Player"], required: true },
});

// Main schema for campaigns
const campaignSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  image: { type: String },
  members: [memberSchema],
});

const Campaign = mongoose.model("Campaign", campaignSchema);

export default Campaign;