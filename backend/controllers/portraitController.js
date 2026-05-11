import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from "sharp";
import Character from "../models/Character.js";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  // Use virtual-hosted-style URLs (bucket.s3.region.amazonaws.com) instead
  // of path-style (s3.region.amazonaws.com/bucket). Path-style triggers a 301
  // redirect, which kills CORS.
  forcePathStyle: false,
});

const BUCKET = process.env.AWS_S3_BUCKET_NAME;
const HAS_S3_CONFIG = Boolean(
  process.env.AWS_REGION &&
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  BUCKET
);

function portraitProxyUrl(characterId, version) {
  if (!characterId) return "";
  const base =
    process.env.PUBLIC_API_BASE ||
    `http://localhost:${process.env.PORT || 5001}`;
  const v = version ? `?v=${new Date(version).getTime()}` : "";
  return `${base}/api/characters/${characterId}/portrait/image${v}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

// Decode a "data:image/png;base64,xxxxx" string into a raw Buffer.
// Throws if the input doesn't look like a valid data URL.
function dataUrlToBuffer(dataUrl) {
  if (typeof dataUrl !== "string") {
    throw new Error("Portrait must be a base64 data URL string");
  }
  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid image format — must be PNG, JPEG, or WebP");
  }
  return Buffer.from(match[2], "base64");
}

// Build the S3 key for a character portrait.
// private/{userId}/portraits/{characterId}.png
function portraitKeyFor(userId, characterId) {
  return `private/${userId}/portraits/${characterId}.png`;
}

// Generate a 1-hour signed URL so the frontend (and Godot) can fetch the image.
async function signGetUrl(key) {
  if (!HAS_S3_CONFIG || key?.startsWith("local:")) return "";
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, cmd, { expiresIn: 3600 });
}

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/characters/:characterId/portrait
// Body: { imageDataUrl: "data:image/png;base64,..." }
//
// Resizes to 256×256 square, stores as PNG in S3, updates the Character.
// Returns the updated character (with new portrait field).
// ═══════════════════════════════════════════════════════════════════════════
export async function uploadPortrait(req, res) {
  try {
    const { characterId } = req.params;
    const { imageDataUrl } = req.body;

    // Look up character + check ownership.
    const character = await Character.findById(characterId);
    if (!character) {
      return res.status(404).json({ error: "Character not found" });
    }
    // Check the character belongs to the requesting user.
    if (String(character.user) !== String(req.user.userId)) {
      return res.status(403).json({ error: "Not your character" });
    }

    // Decode + resize the image.
    let buffer;
    try {
      buffer = dataUrlToBuffer(imageDataUrl);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
    const processed = await sharp(buffer)
      .resize(256, 256, { fit: "cover", position: "center" })
      .png({ quality: 90 })
      .toBuffer();

    const key = portraitKeyFor(req.user.userId, characterId);
    if (HAS_S3_CONFIG) {
      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          Body: processed,
          ContentType: "image/png",
        })
      );
    }

// Hand back our proxy URL — stable, never expires, no CORS issues.
    const url = portraitProxyUrl(characterId, Date.now());

    // Update the character document.
    character.portrait = {
      url,
      s3Key: HAS_S3_CONFIG ? key : `local:${key}`,
      data: HAS_S3_CONFIG ? undefined : processed,
      mimeType: "image/png",
    };
    await character.save();

    res.json(character);
  } catch (err) {
    console.error("uploadPortrait error:", err);
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DELETE /api/characters/:characterId/portrait
// Removes the portrait from S3 and clears the field on the character.
// ═══════════════════════════════════════════════════════════════════════════
export async function deletePortrait(req, res) {
  try {
    const { characterId } = req.params;
    const character = await Character.findById(characterId);
    if (!character) {
      return res.status(404).json({ error: "Character not found" });
    }
    if (String(character.user) !== String(req.user.userId)) {
      return res.status(403).json({ error: "Not your character" });
    }
    if (HAS_S3_CONFIG && character.portrait?.s3Key && !character.portrait.s3Key.startsWith("local:")) {
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: BUCKET,
            Key: character.portrait.s3Key,
          })
        );
      } catch (err) {
        // S3 delete errors are non-fatal — clean up the DB anyway.
        console.warn("S3 delete failed (continuing):", err.message);
      }
    }
    character.portrait = { url: "", s3Key: "", data: undefined, mimeType: "" };
    await character.save();
    res.json(character);
  } catch (err) {
    console.error("deletePortrait error:", err);
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/characters/:characterId/portrait/refresh
// Re-sign a fresh URL for an existing portrait. Signed URLs expire after
// 1 hour — call this if a stored URL is stale.
// ═══════════════════════════════════════════════════════════════════════════
export async function refreshPortraitUrl(req, res) {
  try {
    const { characterId } = req.params;
    const character = await Character.findById(characterId);
    if (!character) {
      return res.status(404).json({ error: "Character not found" });
    }
    if (!character.portrait?.s3Key) {
      return res.json({ url: "" });
    }
    const url = portraitProxyUrl(characterId, character.updatedAt);
    character.portrait.url = url;
    await character.save();
    res.json({ url });
  } catch (err) {
    console.error("refreshPortraitUrl error:", err);
    res.status(500).json({ error: err.message });
  }
}

// GET /api/characters/:characterId/portrait/image
// Streams the portrait image through our backend so the browser sees it as
// (relatively) same-origin and no S3 CORS rules are needed.
export async function streamPortraitImage(req, res) {
  try {
    const { characterId } = req.params;
    const character = await Character.findById(characterId);
    if (!character || !character.portrait?.s3Key) {
      return res.status(404).json({ error: "No portrait found" });
    }
    if (!HAS_S3_CONFIG || character.portrait.s3Key.startsWith("local:")) {
      if (!character.portrait.data) {
        return res.status(404).json({ error: "No portrait found" });
      }
      res.set("Content-Type", character.portrait.mimeType || "image/png");
      res.set("Cache-Control", "public, max-age=3600");
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Cross-Origin-Resource-Policy", "cross-origin");
      return res.send(character.portrait.data);
    }
    const cmd = new GetObjectCommand({
      Bucket: BUCKET,
      Key: character.portrait.s3Key,
    });
    const s3Response = await s3.send(cmd);
    res.set("Content-Type", s3Response.ContentType || "image/png");
    res.set("Cache-Control", "public, max-age=3600");
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Cross-Origin-Resource-Policy", "cross-origin");
    s3Response.Body.pipe(res);
  } catch (err) {
    console.error("streamPortraitImage error:", err);
    res.status(500).json({ error: err.message });
  }
}
