import mongoose from "mongoose";

const participantSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["DM", "Player"], required: true },
  },
  { _id: false }
);

const sessionSchema = new mongoose.Schema(
  {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign", required: true },
    title: { type: String, trim: true, maxlength: 120, required: true },
    sessionNumber: { type: Number, min: 1 },
    status: {
      type: String,
      enum: ["Planned", "In Progress", "Completed", "Archived"],
      default: "Planned",
    },
    scheduledFor: { type: Date },
    startedAt: { type: Date },
    endedAt: { type: Date },
    summary: { type: String, trim: true, maxlength: 2000 },
    notes: { type: String, trim: true, maxlength: 5000 },
    tags: { type: [String], default: [] },
    participants: { type: [participantSchema], default: [] },
  },
  { timestamps: true }
);

const Session = mongoose.model("Session", sessionSchema);

export default Session;
