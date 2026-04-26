import mongoose from "mongoose";

const participantSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["DM", "Player"], required: true },
  },
  { _id: false }
);

const noteSchema = new mongoose.Schema(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    authorRole: { type: String, enum: ["DM", "Player"], required: true },
    content: { type: String, trim: true, maxlength: 5000, required: true },
    visibleToPlayers: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const encounterParticipantSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 120, required: true },
    kind: { type: String, enum: ["Player", "NPC", "Enemy"], required: true },
    hp: { type: String, trim: true, maxlength: 32 },
    initiative: { type: Number },
  },
  { _id: false }
);

const encounterRecordSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 160, required: true },
    status: {
      type: String,
      enum: ["Planned", "In Progress", "Completed"],
      default: "Planned",
    },
    startedAt: { type: Date },
    endedAt: { type: Date },
    rounds: { type: Number, min: 0, default: 0 },
    relatedMap: { type: String, trim: true, maxlength: 200 },
    initiative: { type: [encounterParticipantSchema], default: [] },
    summary: { type: String, trim: true, maxlength: 3000 },
    notes: { type: String, trim: true, maxlength: 5000 },
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
    notes: { type: [noteSchema], default: [] },
    encounterRecords: { type: [encounterRecordSchema], default: [] },
    encounterIds: { type: [mongoose.Schema.Types.ObjectId], ref: "Encounter", default: [] },
    activeEncounterId: { type: mongoose.Schema.Types.ObjectId, ref: "Encounter", default: null },
    tags: { type: [String], default: [] },
    participants: { type: [participantSchema], default: [] },
  },
  { timestamps: true }
);

const Session = mongoose.model("Session", sessionSchema);

export default Session;
