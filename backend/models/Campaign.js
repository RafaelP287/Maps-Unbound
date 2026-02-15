import mongoose from "mongoose";

const memberSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  role: { type: String, enum: ["DM", "Player"], required: true },
});

const campaignSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  image: { type: String },
  members: [memberSchema],
});

const Campaign = mongoose.model("Campaign", campaignSchema);

export default Campaign;