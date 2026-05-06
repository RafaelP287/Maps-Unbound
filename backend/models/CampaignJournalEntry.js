import mongoose from "mongoose";

const ENTRY_SOURCE_TYPES = ["Session", "Encounter", "Manual"];
const ENTRY_AUTHOR_ROLES = ["System", "DM", "Player"];
const ENTRY_VISIBILITY = ["Campaign", "DM Only"];

const campaignJournalEntrySchema = new mongoose.Schema(
  {
    journalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CampaignJournal",
      required: true,
      index: true,
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
      index: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      default: null,
    },
    encounterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Encounter",
      default: null,
    },
    sourceType: {
      type: String,
      enum: ENTRY_SOURCE_TYPES,
      default: "Manual",
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    authorRole: {
      type: String,
      enum: ENTRY_AUTHOR_ROLES,
      required: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 160,
      default: "",
    },
    content: {
      type: String,
      trim: true,
      maxlength: 10000,
      required: true,
    },
    entryDate: {
      type: Date,
      default: Date.now,
    },
    visibility: {
      type: String,
      enum: ENTRY_VISIBILITY,
      default: "Campaign",
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

campaignJournalEntrySchema.index({ campaignId: 1, entryDate: -1, createdAt: -1 });
campaignJournalEntrySchema.index({ journalId: 1, entryDate: -1, createdAt: -1 });
campaignJournalEntrySchema.index({ campaignId: 1, sessionId: 1, createdAt: -1 });
campaignJournalEntrySchema.index({ campaignId: 1, encounterId: 1, createdAt: -1 });
campaignJournalEntrySchema.index(
  { sourceType: 1, sessionId: 1 },
  { unique: true, partialFilterExpression: { sourceType: "Session", sessionId: { $type: "objectId" } } }
);
campaignJournalEntrySchema.index(
  { sourceType: 1, encounterId: 1 },
  { unique: true, partialFilterExpression: { sourceType: "Encounter", encounterId: { $type: "objectId" } } }
);

const CampaignJournalEntry = mongoose.model(
  "CampaignJournalEntry",
  campaignJournalEntrySchema
);

export default CampaignJournalEntry;
