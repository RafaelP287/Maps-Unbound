import express from "express";

import requireAuth from "../middleware/auth.js";
import {
  listMyMaps,
  getMap,
  createMap,
  updateMap,
  deleteMap,
  duplicateMap,
} from "../controllers/mapController.js";

const router = express.Router();

// Every map route requires a logged-in user. The middleware attaches req.user.
router.use(requireAuth);

// GET    /api/maps              → list all of the current user's maps (no JSON bodies)
router.get("/", listMyMaps);

// GET    /api/maps/:id          → fetch one map, including its JSON body
router.get("/:id", getMap);

// POST   /api/maps              → create a new map (requires name)
router.post("/", createMap);

// PUT    /api/maps/:id          → update a map (partial: name / json / thumbnail)
router.put("/:id", updateMap);

// DELETE /api/maps/:id          → delete a map and its S3 objects
router.delete("/:id", deleteMap);

// POST   /api/maps/:id/duplicate → "Save As" — creates a copy with auto-suffixed name
router.post("/:id/duplicate", duplicateMap);

export default router;