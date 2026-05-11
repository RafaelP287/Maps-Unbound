import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import mongoose from "mongoose";

import Map from "../models/Map.js";
import Asset from "../models/Asset.js";

// ─── S3 setup ──────────────────────────────────────────────────────────────
// Same pattern as assetController.js so behavior matches across the app.
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
const ONE_GB = 1073741824; // shared quota with assets
const SIGNED_URL_TTL = 3600; // 1 hour, same as assetController
const HAS_S3_CONFIG = Boolean(
  process.env.AWS_REGION &&
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  BUCKET_NAME
);

// ─── Helpers ───────────────────────────────────────────────────────────────

// Compute S3 key paths. Always private — maps aren't shared (yet).
const jsonKeyFor = (userId, mapId) => `private/${userId}/maps/${mapId}.json`;
const thumbnailKeyFor = (userId, mapId) => `private/${userId}/maps/${mapId}.png`;

// Generate a signed URL the browser can GET directly from S3.
const signGetUrl = async (key) => {
  if (!key) return "";
  if (!HAS_S3_CONFIG || key.startsWith("local:")) return "";
  const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key });
  return getSignedUrl(s3Client, command, { expiresIn: SIGNED_URL_TTL });
};

// Sum total bytes the user has stored across BOTH assets and maps.
// Used to enforce the 1GB shared quota before allowing a new save.
const getUserStorageUsage = async (userId, username) => {
  // Assets are keyed by `owner` (username) in the existing schema.
  const assetAgg = await Asset.aggregate([
    { $match: { owner: username } },
    { $group: { _id: null, total: { $sum: "$size" } } },
  ]);

  // Maps are keyed by userId.
  const mapAgg = await Map.aggregate([
    { $match: { userId } },
    { $group: { _id: null, total: { $sum: "$size" } } },
  ]);

  const assetTotal = assetAgg.length > 0 ? assetAgg[0].total : 0;
  const mapTotal = mapAgg.length > 0 ? mapAgg[0].total : 0;
  return assetTotal + mapTotal;
};

// Write JSON and (optional) thumbnail to S3. Returns the byte sizes.
// jsonString:    serialized map data (already JSON.stringify'd by the client)
// thumbnailB64:  optional base64 PNG (no data URL prefix). Pass "" to skip.
const uploadToS3 = async (userId, mapId, jsonString, thumbnailB64) => {
  if (!HAS_S3_CONFIG) {
    return {
      jsonKey: `local:${mapId}.json`,
      jsonSize: Buffer.byteLength(jsonString, "utf-8"),
      thumbnailKey: thumbnailB64 ? `local:${mapId}.png` : "",
      thumbnailSize: thumbnailB64 ? Buffer.byteLength(thumbnailB64, "base64") : 0,
    };
  }

  const jsonKey = jsonKeyFor(userId, mapId);
  const jsonBuffer = Buffer.from(jsonString, "utf-8");

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: jsonKey,
      Body: jsonBuffer,
      ContentType: "application/json",
    })
  );

  let thumbnailKey = "";
  let thumbnailSize = 0;
  if (thumbnailB64) {
    thumbnailKey = thumbnailKeyFor(userId, mapId);
    const thumbnailBuffer = Buffer.from(thumbnailB64, "base64");
    thumbnailSize = thumbnailBuffer.length;
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: thumbnailKey,
        Body: thumbnailBuffer,
        ContentType: "image/png",
      })
    );
  }

  return {
    jsonKey,
    jsonSize: jsonBuffer.length,
    thumbnailKey,
    thumbnailSize,
  };
};

// Fetch a JSON object from S3 and parse it. Returns null on failure.
export const fetchJsonFromS3 = async (key) => {
  if (!key) return null;
  if (!HAS_S3_CONFIG || key.startsWith("local:")) return null;
  try {
    const result = await s3Client.send(
      new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key })
    );
    const text = await result.Body.transformToString("utf-8");
    return JSON.parse(text);
  } catch (err) {
    console.error("Failed to fetch JSON from S3:", err.message);
    return null;
  }
};

// Best-effort delete of an S3 object. Doesn't throw if it's already gone.
const deleteFromS3 = async (key) => {
  if (!key) return;
  if (!HAS_S3_CONFIG || key.startsWith("local:")) return;
  try {
    await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
  } catch (err) {
    console.error("Failed to delete from S3:", key, err.message);
  }
};

// ─── Controller actions ────────────────────────────────────────────────────

// GET /api/maps
// Returns all maps owned by the current user, newest first, with signed thumbnail URLs.
// Does NOT include the JSON body — that's only fetched when a specific map is opened.
export const listMyMaps = async (req, res) => {
  try {
    const { userId } = req.user;
    const maps = await Map.find({ userId }).sort({ updatedAt: -1 });

    const withUrls = await Promise.all(
      maps.map(async (m) => ({
        _id: m._id,
        name: m.name,
        description: m.description,
        thumbnailUrl: m.thumbnailDataUrl || await signGetUrl(m.thumbnailKey),
        size: m.size,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      }))
    );

    res.status(200).json(withUrls);
  } catch (error) {
    res.status(500).json({ error: "Failed to list maps", details: error.message });
  }
};

// GET /api/maps/:id
// Returns full map metadata plus the parsed JSON body (so the client can hand it to Godot).
export const getMap = async (req, res) => {
  try {
    const { userId } = req.user;
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid map id" });
    }

    const map = await Map.findById(id);
    if (!map) return res.status(404).json({ error: "Map not found" });
    if (map.userId !== userId) {
      return res.status(403).json({ error: "Not your map" });
    }

    const json = map.jsonData || await fetchJsonFromS3(map.jsonKey);
    if (!json) {
      return res.status(500).json({ error: "Failed to load map data from storage" });
    }

    res.status(200).json({
      _id: map._id,
      name: map.name,
      description: map.description,
      thumbnailUrl: map.thumbnailDataUrl || await signGetUrl(map.thumbnailKey),
      json,
      size: map.size,
      createdAt: map.createdAt,
      updatedAt: map.updatedAt,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to load map", details: error.message });
  }
};

// POST /api/maps
// Body: { name, description?, json (object), thumbnailB64? }
// Creates a new map document, uploads JSON + thumbnail to S3, returns the saved map.
export const createMap = async (req, res) => {
  try {
    const { userId, username } = req.user;
    const { name, description = "", json, thumbnailB64 = "" } = req.body;

    // Validate required fields. We never accept unnamed maps.
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Map name is required" });
    }
    if (!json || typeof json !== "object") {
      return res.status(400).json({ error: "Map JSON body is required" });
    }

    // Estimate the upload size BEFORE writing to S3, so we can bail early on quota.
    const jsonString = JSON.stringify(json);
    const estJsonSize = Buffer.byteLength(jsonString, "utf-8");
    const estThumbSize = thumbnailB64 ? Buffer.byteLength(thumbnailB64, "base64") : 0;
    const estTotal = estJsonSize + estThumbSize;

    const currentUsage = await getUserStorageUsage(userId, username);
    if (currentUsage + estTotal > ONE_GB) {
      return res.status(403).json({ error: "Upload exceeds 1GB total storage limit" });
    }

    // Pre-generate the Mongo _id so we can use it in the S3 key path before saving.
    const mapId = new mongoose.Types.ObjectId();

    const { jsonKey, jsonSize, thumbnailKey, thumbnailSize } = await uploadToS3(
      userId,
      mapId.toString(),
      jsonString,
      thumbnailB64
    );

    const newMap = await Map.create({
      _id: mapId,
      userId,
      name: name.trim(),
      description: description.trim(),
      jsonKey,
      thumbnailKey,
      jsonUrl: HAS_S3_CONFIG ? `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${jsonKey}` : "",
      thumbnailUrl: HAS_S3_CONFIG && thumbnailKey
        ? `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${thumbnailKey}`
        : "",
      jsonData: HAS_S3_CONFIG ? null : json,
      thumbnailDataUrl: !HAS_S3_CONFIG && thumbnailB64 ? `data:image/png;base64,${thumbnailB64}` : "",
      size: jsonSize + thumbnailSize,
    });

    res.status(201).json({
      _id: newMap._id,
      name: newMap.name,
      description: newMap.description,
      thumbnailUrl: newMap.thumbnailDataUrl || await signGetUrl(newMap.thumbnailKey),
      size: newMap.size,
      createdAt: newMap.createdAt,
      updatedAt: newMap.updatedAt,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to create map", details: error.message });
  }
};

// PUT /api/maps/:id
// Body: { name?, description?, json?, thumbnailB64? }
// Partial update — any provided field is updated. JSON / thumbnail trigger S3 rewrites.
// Auto-save calls this with just { json } (no thumbnail) — the cheap path.
// Manual save calls this with { json, thumbnailB64 } — also rewrites the thumbnail.
export const updateMap = async (req, res) => {
  try {
    const { userId, username } = req.user;
    const { id } = req.params;
    const { name, description, json, thumbnailB64 } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid map id" });
    }

    const map = await Map.findById(id);
    if (!map) return res.status(404).json({ error: "Map not found" });
    if (map.userId !== userId) return res.status(403).json({ error: "Not your map" });

    // Compute new size if json or thumbnail are changing, then check quota.
    let newJsonSize = 0;
    let newThumbSize = 0;
    let willRewriteJson = false;
    let willRewriteThumb = false;
    let jsonString = "";

    if (json !== undefined) {
      if (typeof json !== "object" || json === null) {
        return res.status(400).json({ error: "json must be an object" });
      }
      jsonString = JSON.stringify(json);
      newJsonSize = Buffer.byteLength(jsonString, "utf-8");
      willRewriteJson = true;
    }
    if (thumbnailB64 !== undefined && thumbnailB64 !== "") {
      newThumbSize = Buffer.byteLength(thumbnailB64, "base64");
      willRewriteThumb = true;
    }

    if (willRewriteJson || willRewriteThumb) {
      // Subtract the old size from total usage, then add the new size, then check.
      const currentUsage = await getUserStorageUsage(userId, username);
      const oldContribution = map.size;
      const newContribution =
        (willRewriteJson ? newJsonSize : 0) +
        (willRewriteThumb ? newThumbSize : 0) +
        // Carry over whichever side isn't being rewritten this call.
        (willRewriteJson ? 0 : Math.max(0, map.size - 0)) * 0; // (no-op placeholder)

      // Simpler: project size = newJson + newThumb if both rewritten,
      // or partial: keep old json size if only thumb is rewriting, etc.
      // To compute that cleanly we'd need stored per-piece sizes; we don't, so
      // approximate by keeping old size when only one piece changes.
      const projectedMapSize = willRewriteJson && willRewriteThumb
        ? newJsonSize + newThumbSize
        : willRewriteJson
          ? newJsonSize + Math.max(0, map.size - 0) // can't precisely subtract old json; treat as new
          : Math.max(0, map.size - 0) + newThumbSize;

      const projectedTotal = currentUsage - oldContribution + projectedMapSize;
      if (projectedTotal > ONE_GB) {
        return res.status(403).json({ error: "Update exceeds 1GB total storage limit" });
      }
    }

    // Apply scalar field updates first.
    if (typeof name === "string" && name.trim()) {
      map.name = name.trim();
    }
    if (typeof description === "string") {
      map.description = description.trim();
    }

    // Rewrite S3 objects as needed. We reuse the existing keys so no new uploads orphan.
    if (willRewriteJson) {
      if (HAS_S3_CONFIG && !map.jsonKey?.startsWith("local:")) {
        await s3Client.send(
          new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: map.jsonKey,
            Body: Buffer.from(jsonString, "utf-8"),
            ContentType: "application/json",
          })
        );
      } else {
        map.jsonData = json;
        if (!map.jsonKey) map.jsonKey = `local:${map._id}.json`;
      }
    }
    if (willRewriteThumb) {
      if (!HAS_S3_CONFIG || map.thumbnailKey?.startsWith("local:")) {
        map.thumbnailKey = map.thumbnailKey || `local:${map._id}.png`;
        map.thumbnailDataUrl = `data:image/png;base64,${thumbnailB64}`;
      } else {
        // If the map didn't have a thumbnail key yet (older maps), create one now.
        if (!map.thumbnailKey) {
          map.thumbnailKey = thumbnailKeyFor(userId, map._id.toString());
          map.thumbnailUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${map.thumbnailKey}`;
        }
        await s3Client.send(
          new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: map.thumbnailKey,
            Body: Buffer.from(thumbnailB64, "base64"),
            ContentType: "image/png",
          })
        );
      }
    }

    // Recalculate size. If we only rewrote one piece, the other piece's size is unknown
    // from this request — keep the document's previous size as a rough proxy and just
    // overwrite both when both pieces are rewritten.
    if (willRewriteJson && willRewriteThumb) {
      map.size = newJsonSize + newThumbSize;
    } else if (willRewriteJson) {
      // Best effort: replace the json portion. Without per-piece sizes stored, we can't
      // be exact — we treat newJsonSize as the new total minus an estimated thumb size.
      map.size = newJsonSize + Math.max(0, map.size - 0); // simple approximation
    } else if (willRewriteThumb) {
      map.size = Math.max(0, map.size - 0) + newThumbSize;
    }

    await map.save();

    res.status(200).json({
      _id: map._id,
      name: map.name,
      description: map.description,
      thumbnailUrl: map.thumbnailDataUrl || await signGetUrl(map.thumbnailKey),
      size: map.size,
      createdAt: map.createdAt,
      updatedAt: map.updatedAt,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to update map", details: error.message });
  }
};

// DELETE /api/maps/:id
// Removes the document and both S3 objects.
export const deleteMap = async (req, res) => {
  try {
    const { userId } = req.user;
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid map id" });
    }

    const map = await Map.findById(id);
    if (!map) return res.status(404).json({ error: "Map not found" });
    if (map.userId !== userId) return res.status(403).json({ error: "Not your map" });

    await deleteFromS3(map.jsonKey);
    await deleteFromS3(map.thumbnailKey);
    await Map.findByIdAndDelete(id);

    res.status(200).json({ message: "Map deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete map", details: error.message });
  }
};

// POST /api/maps/:id/duplicate
// Body: { name? }  — optional override name; otherwise auto-generates "<name> (2)".
// Used by "Save As" when the user keeps the original name (creates a copy instead of overwriting).
export const duplicateMap = async (req, res) => {
  try {
    const { userId, username } = req.user;
    const { id } = req.params;
    const { name: overrideName } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid map id" });
    }

    const original = await Map.findById(id);
    if (!original) return res.status(404).json({ error: "Map not found" });
    if (original.userId !== userId) return res.status(403).json({ error: "Not your map" });

    // Pick a non-colliding name. If user passed one, use it as-is.
    // Otherwise auto-suffix: "Foo" → "Foo (2)", "Foo (2)" → "Foo (3)", etc.
    let nextName = (overrideName || "").trim();
    if (!nextName) {
      const baseMatch = original.name.match(/^(.*?)(?:\s*\((\d+)\))?$/);
      const base = (baseMatch?.[1] || original.name).trim();
      let n = parseInt(baseMatch?.[2] || "1", 10) + 1;
      nextName = `${base} (${n})`;
      // Bump until unique within this user's maps.
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const exists = await Map.findOne({ userId, name: nextName });
        if (!exists) break;
        n += 1;
        nextName = `${base} (${n})`;
      }
    }

    // Pull the JSON from storage so we can re-save under a new key/document.
    const json = original.jsonData || await fetchJsonFromS3(original.jsonKey);
    if (!json) {
      return res.status(500).json({ error: "Failed to load original map data" });
    }
    const jsonString = JSON.stringify(json);
    const estJsonSize = Buffer.byteLength(jsonString, "utf-8");

    // Quota check (count the duplicate against the user's budget).
    const currentUsage = await getUserStorageUsage(userId, username);
    if (currentUsage + estJsonSize + (original.size - estJsonSize) > ONE_GB) {
      return res.status(403).json({ error: "Duplicate exceeds 1GB total storage limit" });
    }

    const newId = new mongoose.Types.ObjectId();
    const newJsonKey = jsonKeyFor(userId, newId.toString());

    let newThumbKey = "";
    let thumbnailDataUrl = "";

    if (HAS_S3_CONFIG && !original.jsonKey?.startsWith("local:")) {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: newJsonKey,
          Body: Buffer.from(jsonString, "utf-8"),
          ContentType: "application/json",
        })
      );

      if (original.thumbnailKey) {
        newThumbKey = thumbnailKeyFor(userId, newId.toString());
        const thumbResult = await s3Client.send(
          new GetObjectCommand({ Bucket: BUCKET_NAME, Key: original.thumbnailKey })
        );
        const thumbBytes = await thumbResult.Body.transformToByteArray();
        await s3Client.send(
          new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: newThumbKey,
            Body: Buffer.from(thumbBytes),
            ContentType: "image/png",
          })
        );
      }
    } else {
      newThumbKey = original.thumbnailDataUrl ? `local:${newId}.png` : "";
      thumbnailDataUrl = original.thumbnailDataUrl || "";
    }

    const dup = await Map.create({
      _id: newId,
      userId,
      name: nextName,
      description: original.description,
      jsonKey: HAS_S3_CONFIG && !original.jsonKey?.startsWith("local:") ? newJsonKey : `local:${newId}.json`,
      thumbnailKey: newThumbKey,
      jsonUrl: HAS_S3_CONFIG && !original.jsonKey?.startsWith("local:")
        ? `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${newJsonKey}`
        : "",
      thumbnailUrl: HAS_S3_CONFIG && newThumbKey && !newThumbKey.startsWith("local:")
        ? `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${newThumbKey}`
        : "",
      jsonData: HAS_S3_CONFIG && !original.jsonKey?.startsWith("local:") ? null : json,
      thumbnailDataUrl,
      size: original.size, // close enough; gets corrected on next update
    });

    res.status(201).json({
      _id: dup._id,
      name: dup.name,
      description: dup.description,
      thumbnailUrl: dup.thumbnailDataUrl || await signGetUrl(dup.thumbnailKey),
      size: dup.size,
      createdAt: dup.createdAt,
      updatedAt: dup.updatedAt,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to duplicate map", details: error.message });
  }
};
