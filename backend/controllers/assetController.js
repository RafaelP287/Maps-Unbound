import { S3Client, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import Asset from "../models/Asset.js";
import User from "../models/User.js";

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
const MAX_ASSET_PAGE_SIZE = 20;

const getRequestUsername = (req) => req.user?.username || req.body.username || req.query.username;

const getRequestUserContext = async (req) => {
  const fallbackUsername = getRequestUsername(req);
  let userRecord = null;

  if (req.user?.userId) {
    userRecord = await User.findById(req.user.userId).select("username isAdmin");
  }

  if (!userRecord && fallbackUsername) {
    userRecord = await User.findOne({ username: fallbackUsername }).select("username isAdmin");
  }

  return {
    username: userRecord?.username || fallbackUsername,
    isAdmin: Boolean(userRecord?.isAdmin || req.user?.isAdmin),
  };
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getPageOptions = (req) => {
  const rawPage = Number.parseInt(req.query.page, 10);
  const rawLimit = Number.parseInt(req.query.limit, 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const requestedLimit = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : MAX_ASSET_PAGE_SIZE;
  const limit = Math.min(requestedLimit, MAX_ASSET_PAGE_SIZE);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const getSearchFilter = (req) => {
  const search = req.query.search?.trim();
  if (!search) return null;

  const searchRegex = new RegExp(escapeRegex(search), "i");
  return {
    $or: [
      { title: searchRegex },
      { owner: searchRegex },
      { tags: searchRegex },
    ],
  };
};

const addSearchFilter = (filter, req) => {
  const searchFilter = getSearchFilter(req);
  if (!searchFilter) return filter;
  return { $and: [filter, searchFilter] };
};

const normalizeTags = (tags) => {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((tag) => tag?.toString().trim())
    .filter(Boolean)
    .slice(0, 30);
};

const serializeAsset = (asset, username, isAdmin = false) => {
  const assetObj = asset.toObject ? asset.toObject() : asset;
  const likedBy = Array.isArray(assetObj.likedBy) ? assetObj.likedBy : [];
  const favoritedBy = Array.isArray(assetObj.favoritedBy) ? assetObj.favoritedBy : [];
  const { likedBy: _likedBy, favoritedBy: _favoritedBy, ...publicAsset } = assetObj;

  return {
    ...publicAsset,
    likes: likedBy.length > 0 ? likedBy.length : publicAsset.likes || 0,
    favorites: favoritedBy.length > 0 ? favoritedBy.length : publicAsset.favorites || 0,
    userLiked: username ? likedBy.includes(username) : false,
    userFavorited: username ? favoritedBy.includes(username) : false,
    userCanDelete: Boolean(username && (publicAsset.owner === username || isAdmin)),
  };
};

const canViewAsset = (asset, username) => asset.isPublic || asset.owner === username;

// Generate an Upload URL (Enforces 1MB limit & 1GB total user limit)
export const generateUploadData = async (req, res) => {
  try {
    // Takes the body payload
    const { category, isPublic, fileSize, fileName, fileType } = req.body;
    const owner = getRequestUsername(req);

    if (!owner) {
      return res.status(400).json({ message: "Username is required." });
    }

    if (!["image", "audio"].includes(category)) {
      return res.status(400).json({ message: "Invalid category. Must be image or audio." });
    }
    if (fileSize > ONE_MB) {
      return res.status(400).json({ message: "File exceeds the 1MB limit." });
    }

    // Validates the fileType matches the category
    if (category === 'image' && !fileType.startsWith('image/')) {
       return res.status(400).json({ message: "File type must be an image." });
    }

    // Finds all assets that belong to a certain User
    const userAssets = await Asset.aggregate([
      { $match: { owner } },
      { $group: { _id: null, totalSize: { $sum: "$size" } } },
    ]);
    
    // Validates that the current User does not have over 1GB accumulated over their uploaded assets.
    const currentTotalSize = userAssets.length > 0 ? userAssets[0].totalSize : 0;
    if (currentTotalSize + fileSize > ONE_GB) {
      return res.status(403).json({ message: "Upload denied. Exceeds 1GB total storage limit." });
    }

    // Constants for S3 uploading
    const visibilityFolder = isPublic ? "public" : "private";
    const fileExtension = fileName.split('.').pop();
    const s3Key = `${visibilityFolder}/${owner}/${category}/${uuidv4()}.${fileExtension}`;

    // Creates a presigned URL that lasts for the Expires time (also contains all data like fields, conditions, and metadata)
    const { url, fields } = await createPresignedPost(s3Client, {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Conditions: [
        ["content-length-range", 0, ONE_MB], 
        // Security: Enforce that the user MUST upload this specific content type
        ["eq", "$Content-Type", fileType] 
      ],
      // Metadata: Set the default Content-Type field for the S3 object
      Fields: {
        "Content-Type": fileType 
      },
      Expires: 300, 
    });

    res.status(200).json({ url, fields, s3Key });
  } catch (error) {
    res.status(500).json({ message: "Error generating upload URL", error: error.message });
  }
};

// Confirm Upload (Saves metadata to MongoDB after successful S3 upload)
export const confirmUpload = async (req, res) => {
  try {
    const { s3Key, category, size, isPublic, title, description, tags } = req.body;
    const owner = getRequestUsername(req);

    if (!owner) {
      return res.status(400).json({ message: "Username is required." });
    }

    const newAsset = new Asset({
      owner,
      title,
      description,
      s3Key,
      url: `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`,
      category,
      size,
      isPublic,
      tags: normalizeTags(tags),
    });

    const savedAsset = await newAsset.save();
    res.status(201).json(serializeAsset(savedAsset, owner));
  } catch (error) {
    res.status(500).json({ message: "Failed to save asset metadata", error: error.message });
  }
};

// Helper function to attach signed URLs to an array of assets
const attachSignedUrls = async (assets, username, isAdmin = false) => {
  return Promise.all(
    assets.map(async (asset) => {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: asset.s3Key,
      });
      
      // Generate a URL valid for 1 hour (3600 seconds)
      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

      // Convert Mongoose document to plain object to safely overwrite the URL
      const assetObj = serializeAsset(asset, username, isAdmin);
      return { ...assetObj, url: signedUrl };
    })
  );
};

const sendPaginatedAssets = async (req, res, filter, sort, userContext) => {
  const { page, limit, skip } = getPageOptions(req);
  const searchableFilter = addSearchFilter(filter, req);

  const [assets, totalItems] = await Promise.all([
    Asset.find(searchableFilter).sort(sort).skip(skip).limit(limit),
    Asset.countDocuments(searchableFilter),
  ]);

  const assetsWithUrls = await attachSignedUrls(
    assets,
    userContext.username,
    userContext.isAdmin,
  );
  res.status(200).json({
    assets: assetsWithUrls,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / limit)),
    },
  });
};

// Get User's Own Assets
export const getUserAssets = async (req, res) => {
  try {
    // Look in the query string, not the body, for GET requests
    const userContext = await getRequestUserContext(req);
    const owner = userContext.username;
    
    if (!owner) {
      return res.status(400).json({ message: "Username is required." });
    }

    await sendPaginatedAssets(req, res, { owner }, { createdAt: -1 }, userContext);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch assets", error: error.message });
  }
};

// Get All Public Assets (Globally searchable)
export const getPublicAssets = async (req, res) => {
  try {
    const userContext = await getRequestUserContext(req);
    const sort = req.query.sort === "topLiked"
      ? { likes: -1, favorites: -1, createdAt: -1 }
      : { createdAt: -1 };
    await sendPaginatedAssets(req, res, { isPublic: true }, sort, userContext);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch public assets", error: error.message });
  }
};

// Get assets liked by the current user
export const getLikedAssets = async (req, res) => {
  try {
    const userContext = await getRequestUserContext(req);
    const username = userContext.username;

    if (!username) {
      return res.status(400).json({ message: "Username is required." });
    }

    await sendPaginatedAssets(req, res, {
      likedBy: username,
      $or: [{ isPublic: true }, { owner: username }],
    }, { createdAt: -1 }, userContext);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch liked assets", error: error.message });
  }
};

// Get assets favorited by the current user
export const getFavoritedAssets = async (req, res) => {
  try {
    const userContext = await getRequestUserContext(req);
    const username = userContext.username;

    if (!username) {
      return res.status(400).json({ message: "Username is required." });
    }

    await sendPaginatedAssets(req, res, {
      favoritedBy: username,
      $or: [{ isPublic: true }, { owner: username }],
    }, { createdAt: -1 }, userContext);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch favorited assets", error: error.message });
  }
};

const toggleAssetUserList = async (req, res, listField, countField, userFlagField) => {
  try {
    const { id } = req.params;
    const userContext = await getRequestUserContext(req);
    const username = userContext.username;

    if (!username) {
      return res.status(400).json({ message: "Username is required." });
    }

    const asset = await Asset.findById(id);

    if (!asset) return res.status(404).json({ message: "Asset not found." });
    if (!canViewAsset(asset, username)) {
      return res.status(403).json({ message: "Asset is private." });
    }

    const userList = new Set(asset[listField] || []);
    if (userList.has(username)) {
      userList.delete(username);
    } else {
      userList.add(username);
    }

    asset[listField] = Array.from(userList);
    asset[countField] = asset[listField].length;

    const savedAsset = await asset.save();
    const serializedAsset = serializeAsset(savedAsset, username, userContext.isAdmin);

    res.status(200).json({
      ...serializedAsset,
      [userFlagField]: savedAsset[listField].includes(username),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to update asset", error: error.message });
  }
};

export const toggleAssetLike = (req, res) => (
  toggleAssetUserList(req, res, "likedBy", "likes", "userLiked")
);

export const toggleAssetFavorite = (req, res) => (
  toggleAssetUserList(req, res, "favoritedBy", "favorites", "userFavorited")
);

// Delete an Asset
export const deleteAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const userContext = await getRequestUserContext(req);
    const username = userContext.username;

    if (!username) {
      return res.status(400).json({ message: "Username is required." });
    }

    const asset = await Asset.findById(id);

    if (!asset) return res.status(404).json({ message: "Asset not found." });
    if (asset.owner !== username && !userContext.isAdmin) {
      return res.status(403).json({ message: "Unauthorized deletion." });
    }

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
