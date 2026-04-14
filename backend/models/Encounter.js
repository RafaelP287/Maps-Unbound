import mongoose from "mongoose";

const encounterParticipantSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 120, required: true },
    kind: { type: String, enum: ["Player", "NPC", "Enemy"], required: true },
    hp: { type: String, trim: true, maxlength: 32 },
    initiative: { type: Number },
    notes: { type: String, trim: true, maxlength: 1000 },
  },
  { _id: true }
);

const encounterSchema = new mongoose.Schema(
  {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign", required: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session", required: true },
    name: { type: String, trim: true, maxlength: 160, required: true },
    status: {
      type: String,
      enum: ["Planned", "In Progress", "Completed", "Archived"],
      default: "Planned",
    },
    startedAt: { type: Date },
    endedAt: { type: Date },
    rounds: { type: Number, min: 0, default: 0 },
    relatedMap: { type: String, trim: true, maxlength: 200 },
    initiative: { type: [encounterParticipantSchema], default: [] },
    activeTurnIndex: { type: Number, min: 0, default: 0 },
    summary: { type: String, trim: true, maxlength: 3000 },
    notes: { type: String, trim: true, maxlength: 5000 },
    mapState: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

const Encounter = mongoose.model("Encounter", encounterSchema);

export default Encounter;
