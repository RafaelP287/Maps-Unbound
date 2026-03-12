import express from "express";
import {
  generateUploadData,
  confirmUpload,
  getUserAssets,
  getPublicAssets,
  deleteAsset,
} from "../controllers/assetController.js";

const router = express.Router();

router.post("/upload/generate-url", generateUploadData);
router.post("/upload/confirm", confirmUpload);
router.get("/my-assets", getUserAssets);
router.get("/public", getPublicAssets);
router.delete("/:id", deleteAsset);

export default router;
