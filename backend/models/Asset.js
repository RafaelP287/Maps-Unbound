import mongoose from "mongoose";

const assetSchema = new mongoose.Schema({
  owner: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  s3Key: {
    type: String,
    required: true,
    unique: true, // The exact path in S3 (e.g., public/username/images/uuid.png)
  },
  url: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ["image", "audio"],
    required: true,
  },
  size: {
    type: Number, // Stored in bytes
    required: true,
  },
  isPublic: {
    type: Boolean,
    default: false,
    index: true, // Indexed to speed up the global public asset search
  },
  views: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0,
  },
  likedBy: [{
    type: String,
    index: true,
  }],
  favorites: {
    type: Number,
    default: 0,
  },
  favoritedBy: [{
    type: String,
    index: true,
  }],
  tags: [{
    type: String,
    index: true // Highly recommended for fast tag searching
  }],
  imports: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Asset", assetSchema);
