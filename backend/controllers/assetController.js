import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { v4 as uuidv4 } from "uuid";
import Asset from "../models/Asset.js";

// Initialize S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
const ONE_MB = 1048576;    // 1MB in bytes
const ONE_GB = 1073741824; // 1GB in bytes

// Generate an Upload URL (Enforces 1MB limit & 1GB total user limit)
export const generateUploadData = async (req, res) => {
  try {
    const { category, isPublic, fileSize, fileName } = req.body;
    const owner = req.body.username; // Ideally from req.user.username in JWT middleware

    // Validate category and file size
    if (!["image", "audio"].includes(category)) {
      return res.status(400).json({ message: "Invalid category. Must be image or audio." });
    }
    if (fileSize > ONE_MB) {
      return res.status(400).json({ message: "File exceeds the 1MB limit." });
    }

    // Check total user storage limit (1GB)
    const userAssets = await Asset.aggregate([
      { $match: { owner } },
      { $group: { _id: null, totalSize: { $sum: "$size" } } },
    ]);
    
    const currentTotalSize = userAssets.length > 0 ? userAssets[0].totalSize : 0;
    if (currentTotalSize + fileSize > ONE_GB) {
      return res.status(403).json({ message: "Upload denied. Exceeds 1GB total storage limit." });
    }

    // Define S3 path (e.g., public/johndoe/image/uuid-filename.png)
    const visibilityFolder = isPublic ? "public" : "private";
    const fileExtension = fileName.split('.').pop();
    const s3Key = `${visibilityFolder}/${owner}/${category}/${uuidv4()}.${fileExtension}`;

    // Create Presigned POST rules
    const { url, fields } = await createPresignedPost(s3Client, {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Conditions: [
        ["content-length-range", 0, ONE_MB], // AWS natively blocks files > 1MB here
      ],
      Expires: 300, // URL valid for 5 minutes
    });

    res.status(200).json({ url, fields, s3Key });
  } catch (error) {
    res.status(500).json({ message: "Error generating upload URL", error: error.message });
  }
};

// Confirm Upload (Saves metadata to MongoDB after successful S3 upload)
export const confirmUpload = async (req, res) => {
  try {
    const { s3Key, category, size, isPublic, title, description } = req.body;
    const owner = req.body.username; 

    const newAsset = new Asset({
      owner,
      title,
      description,
      s3Key,
      url: `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`,
      category,
      size,
      isPublic,
    });

    const savedAsset = await newAsset.save();
    res.status(201).json(savedAsset);
  } catch (error) {
    res.status(500).json({ message: "Failed to save asset metadata", error: error.message });
  }
};

// Get User's Own Assets
export const getUserAssets = async (req, res) => {
  try {
    const owner = req.body.username; 
    const assets = await Asset.find({ owner }).sort({ createdAt: -1 });
    res.status(200).json(assets);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch assets", error: error.message });
  }
};

// Get All Public Assets (Globally searchable)
export const getPublicAssets = async (req, res) => {
  try {
    const publicAssets = await Asset.find({ isPublic: true }).sort({ createdAt: -1 });
    res.status(200).json(publicAssets);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch public assets", error: error.message });
  }
};

// Delete an Asset
export const deleteAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const owner = req.body.username; 

    const asset = await Asset.findById(id);

    if (!asset) return res.status(404).json({ message: "Asset not found." });
    if (asset.owner !== owner) return res.status(403).json({ message: "Unauthorized deletion." });

    // Delete from AWS S3
    await s3Client.send(new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: asset.s3Key,
    }));

    // Delete from MongoDB
    await Asset.findByIdAndDelete(id);

    res.status(200).json({ message: "Asset successfully deleted." });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete asset", error: error.message });
  }
};
