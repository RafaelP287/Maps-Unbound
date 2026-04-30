import express from "express";
import jwt from "jsonwebtoken";
import {
  generateUploadData,
  confirmUpload,
  getUserAssets,
  getPublicAssets,
  getLikedAssets,
  getFavoritedAssets,
  toggleAssetLike,
  toggleAssetFavorite,
  deleteAsset,
} from "../controllers/assetController.js";

const router = express.Router();

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

router.post("/upload/generate-url", verifyToken, generateUploadData);
router.post("/upload/confirm", verifyToken, confirmUpload);
router.get("/my-assets", verifyToken, getUserAssets);
router.get("/public", verifyToken, getPublicAssets);
router.get("/liked", verifyToken, getLikedAssets);
router.get("/favorites", verifyToken, getFavoritedAssets);
router.patch("/:id/like", verifyToken, toggleAssetLike);
router.patch("/:id/favorite", verifyToken, toggleAssetFavorite);
router.delete("/:id", verifyToken, deleteAsset);

export default router;
