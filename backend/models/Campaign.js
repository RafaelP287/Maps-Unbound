import mongoose from "mongoose";

const campaignSchema = new mongoose.Schema({
    title: String,
    description: String,
    members: [
        {
            userId: String,
            role: { type: String, enum: ["DM", "Player"] }
        }
    ]
}, { timestamps: true });

const Campaign = mongoose.model("Campaign", campaignSchema);

export default Campaign;