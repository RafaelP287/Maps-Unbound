import mongoose from "mongoose";

// One saved map per document.
// JSON and thumbnail bytes live in S3; we only keep the keys + cached URLs here.
const mapSchema = new mongoose.Schema(
  {
    // The user who owns this map. Required.
    // Stored as the user's MongoDB _id (string form), set by the controller from req.user.userId.
    userId: {
      type: String,
      required: true,
      index: true,
    },

    // Display name shown in the load grid. Required (we never save unnamed maps).
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    // Optional description / notes — not used in the UI yet, but cheap to support now.
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    // S3 keys for the JSON map data and thumbnail PNG.
    //   private/{userId}/maps/{mapId}.json
    //   private/{userId}/maps/{mapId}.png
    jsonKey: {
      type: String,
      default: "",
    },
    thumbnailKey: {
      type: String,
      default: "",
    },

    // Cached S3 URLs (we'll regenerate signed URLs at read time, but storing the
    // bucket-relative path is useful for debugging and admin tools).
    jsonUrl: {
      type: String,
      default: "",
    },
    thumbnailUrl: {
      type: String,
      default: "",
    },

    // Local-dev fallback when S3 is not configured.
    jsonData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    thumbnailDataUrl: {
      type: String,
      default: "",
    },

    // Total storage used by this map's S3 objects (json + thumbnail) in bytes.
    // Used by the shared 1GB-per-user quota check (counted alongside Asset.size).
    size: {
      type: Number,
      default: 0,
    },
    jsonSize: {
      type: Number,
      default: 0,
    },
    thumbnailSize: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true } // adds createdAt / updatedAt automatically
);

// Compound index — listing a user's maps newest-first is the most common query.
mapSchema.index({ userId: 1, updatedAt: -1 });

const Map = mongoose.model("Map", mapSchema);
export default Map;
