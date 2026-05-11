import express from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import Session from "../models/Session.js";
import Campaign from "../models/Campaign.js";
import Encounter from "../models/Encounter.js";
import Party from "../models/Party.js";
import Map from "../models/Map.js";
import { fetchJsonFromS3 } from "../controllers/mapController.js";

// Generate a 6-char lobby code (mirrors partyController helper).
const generateLobbyCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[crypto.randomInt(0, chars.length)];
  return code;
};

const router = express.Router();
const STATUSES = new Set(["Planned", "In Progress", "Completed", "Archived"]);
const NOTE_ROLES = new Set(["DM", "Player"]);

const sanitizeSessionNotesForViewer = (notes, isDM) =>
  (Array.isArray(notes) ? notes : []).filter((note) =>
    isDM || note?.authorRole !== "DM" || Boolean(note?.visibleToPlayers)
  );

const serializeSessionForViewer = (sessionDoc, isDM) => {
  const session = typeof sessionDoc?.toObject === "function" ? sessionDoc.toObject() : { ...sessionDoc };
  session.notes = sanitizeSessionNotesForViewer(session.notes, isDM);
  return session;
};

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

// Create a session for a campaign (DM only)
router.post("/", verifyToken, async (req, res) => {
  try {
    const campaignId = req.body.campaignId;
    if (!campaignId) {
      return res.status(400).json({ error: "campaignId is required" });
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const isDM = campaign.members.some(
      (m) => m.userId.toString() === req.user.userId && m.role === "DM"
    );
    if (!isDM) {
      return res.status(403).json({ error: "Only the DM can create sessions" });
    }

    const title = req.body.title?.trim();
    if (!title || title.length < 3) {
      return res.status(400).json({ error: "Title must be at least 3 characters" });
    }

    const status = req.body.status || "Planned";
    if (!STATUSES.has(status)) {
      return res.status(400).json({ error: "Invalid session status" });
    }

    const sessionNumberValue = Number(req.body.sessionNumber);
    const sessionNumber = Number.isFinite(sessionNumberValue)
      ? Math.max(1, Math.trunc(sessionNumberValue))
      : undefined;

    const scheduledFor = req.body.scheduledFor ? new Date(req.body.scheduledFor) : undefined;
    if (scheduledFor && Number.isNaN(scheduledFor.getTime())) {
      return res.status(400).json({ error: "Invalid scheduledFor date" });
    }
    const startedAt = req.body.startedAt ? new Date(req.body.startedAt) : undefined;
    if (startedAt && Number.isNaN(startedAt.getTime())) {
      return res.status(400).json({ error: "Invalid startedAt date" });
    }
    const endedAt = req.body.endedAt ? new Date(req.body.endedAt) : undefined;
    if (endedAt && Number.isNaN(endedAt.getTime())) {
      return res.status(400).json({ error: "Invalid endedAt date" });
    }

    const session = new Session({
      campaignId,
      title,
      sessionNumber,
      status,
      scheduledFor,
      startedAt,
      endedAt,
      summary: req.body.summary?.trim(),
      notes: Array.isArray(req.body.notes)
        ? req.body.notes
            .map((note) => ({
              authorId: note?.authorId,
              authorRole: NOTE_ROLES.has(note?.authorRole) ? note.authorRole : "Player",
              content: note?.content?.trim?.() || "",
              visibleToPlayers: note?.authorRole === "DM" ? Boolean(note?.visibleToPlayers) : true,
              createdAt: note?.createdAt ? new Date(note.createdAt) : new Date(),
              updatedAt: note?.updatedAt ? new Date(note.updatedAt) : new Date(),
            }))
            .filter((note) => note.authorId && note.content)
            .slice(0, 200)
        : [],
      tags: Array.isArray(req.body.tags) ? req.body.tags.filter(Boolean).slice(0, 20) : [],
      participants: Array.isArray(req.body.participants) ? req.body.participants : [],
    });

    await session.save();
    campaign.sessionIds = Array.from(new Set([...campaign.sessionIds, session._id]));
    await campaign.save();

    res.status(201).json(session);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update a session (DM only)
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: "Session not found" });

    const campaign = await Campaign.findById(session.campaignId);
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const isDM = campaign.members.some(
      (m) => m.userId.toString() === req.user.userId && m.role === "DM"
    );
    if (!isDM) {
      return res.status(403).json({ error: "Only the DM can update this session" });
    }

    const updates = {};

    if (Object.prototype.hasOwnProperty.call(req.body, "title")) {
      const title = req.body.title?.trim?.() || "";
      if (!title || title.length < 3) {
        return res.status(400).json({ error: "Title must be at least 3 characters" });
      }
      updates.title = title;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "status")) {
      if (!STATUSES.has(req.body.status)) {
        return res.status(400).json({ error: "Invalid session status" });
      }
      updates.status = req.body.status;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "startedAt")) {
      if (!req.body.startedAt) {
        updates.startedAt = null;
      } else {
        const startedAt = new Date(req.body.startedAt);
        if (Number.isNaN(startedAt.getTime())) {
          return res.status(400).json({ error: "Invalid startedAt date" });
        }
        updates.startedAt = startedAt;
      }
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "endedAt")) {
      if (!req.body.endedAt) {
        updates.endedAt = null;
      } else {
        const endedAt = new Date(req.body.endedAt);
        if (Number.isNaN(endedAt.getTime())) {
          return res.status(400).json({ error: "Invalid endedAt date" });
        }
        updates.endedAt = endedAt;
      }
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "summary")) {
      updates.summary = req.body.summary?.trim?.() || "";
    }

    let noteToAppend = null;
    if (Object.prototype.hasOwnProperty.call(req.body, "sessionNoteContent")) {
      const content = req.body.sessionNoteContent?.trim?.() || "";
      if (!content) {
        return res.status(400).json({ error: "sessionNoteContent is required" });
      }
      noteToAppend = {
        authorId: req.user.userId,
        authorRole: "DM",
        content,
        visibleToPlayers: Boolean(req.body.sessionNoteVisibleToPlayers),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "noteVisibilityIndex")) {
      const noteIndex = Number(req.body.noteVisibilityIndex);
      if (!Number.isInteger(noteIndex) || noteIndex < 0 || noteIndex >= session.notes.length) {
        return res.status(400).json({ error: "Invalid noteVisibilityIndex" });
      }

      session.notes[noteIndex].visibleToPlayers = Boolean(req.body.noteVisibleToPlayers);
      session.notes[noteIndex].updatedAt = new Date();
      await session.save();
      return res.json(serializeSessionForViewer(session, true));
    }

    const updatePayload = noteToAppend
      ? { ...updates, $push: { notes: noteToAppend } }
      : updates;

    const updatedSession = await Session.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true, runValidators: true }
    );

    res.json(updatedSession);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get sessions for a campaign (members only)
router.get("/", verifyToken, async (req, res) => {
  try {
    const { campaignId } = req.query;
    if (!campaignId) {
      return res.status(400).json({ error: "campaignId is required" });
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const membership = campaign.members.find(
      (m) => m.userId.toString() === req.user.userId
    );
    const isMember = Boolean(membership);
    if (!isMember) {
      return res.status(403).json({ error: "Access denied" });
    }
    const isDM = membership.role === "DM";

    const sessions = await Session.find({ campaignId }).sort({ sessionNumber: 1, createdAt: 1 });
    res.json(sessions.map((session) => serializeSessionForViewer(session, isDM)));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get a session by ID (members only)
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: "Session not found" });

    const campaign = await Campaign.findById(session.campaignId);
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const membership = campaign.members.find(
      (m) => m.userId.toString() === req.user.userId
    );
    const isMember = Boolean(membership);
    if (!isMember) {
      return res.status(403).json({ error: "Access denied" });
    }
    const isDM = membership.role === "DM";

    res.json(serializeSessionForViewer(session, isDM));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a session (DM only)
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: "Session not found" });

    const campaign = await Campaign.findById(session.campaignId);
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const isDM = campaign.members.some(
      (m) => m.userId.toString() === req.user.userId && m.role === "DM"
    );
    if (!isDM) {
      return res.status(403).json({ error: "Only the DM can delete this session" });
    }

    await Encounter.deleteMany({ sessionId: session._id });
    await Session.findByIdAndDelete(req.params.id);
    campaign.sessionIds = (campaign.sessionIds || []).filter(
      (id) => id.toString() !== req.params.id
    );
    await campaign.save();

    res.json({ message: "Session deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/sessions/:id/start
// DM clicks "Start Session" — flips status to In Progress, creates a Party.
router.post("/:id/start", verifyToken, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: "Session not found" });

    const campaign = await Campaign.findById(session.campaignId);
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });

    const membership = campaign.members.find(
      (m) => m.userId.toString() === req.user.userId
    );
    if (!membership || membership.role !== "DM") {
      return res.status(403).json({ error: "Only the DM can start sessions" });
    }

    // Idempotent: if already In Progress with a party, return what's there.
    if (session.status === "In Progress") {
      const existing = await Party.findOne({ sessionId: session._id });
      if (existing) {
        return res.json({
          session: serializeSessionForViewer(session, true),
          party: existing,
        });
      }
      // Stale "In Progress" status with no party — fall through and recreate.
    }

    // Disband any existing party owned by this DM (one party per owner).
    await Party.deleteMany({ owner: req.user.username });

    // Unique 6-char lobby code (10 attempts).
    let lobbyCode = "";
    for (let i = 0; i < 10; i++) {
      const candidate = generateLobbyCode();
      const collision = await Party.findOne({ lobbyCode: candidate });
      if (!collision) {
        lobbyCode = candidate;
        break;
      }
    }
    if (!lobbyCode) {
      return res.status(500).json({ error: "Failed to generate lobby code" });
    }

    const party = await Party.create({
      owner: req.user.username,
      partyName: session.title || `${req.user.username}'s Session`,
      isPublic: false,
      maxPlayers: 12,
      lobbyCode,
      players: [req.user.username],
      sessionId: session._id,
    });

    session.status = "In Progress";
    if (!session.startedAt) session.startedAt = new Date();
    await session.save();

    res.json({
      session: serializeSessionForViewer(session, true),
      party,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/sessions/:id/end
// DM clicks "End Session" — flips status to Completed, disbands the Party.
router.post("/:id/end", verifyToken, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: "Session not found" });

    const campaign = await Campaign.findById(session.campaignId);
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });

    const membership = campaign.members.find(
      (m) => m.userId.toString() === req.user.userId
    );
    if (!membership || membership.role !== "DM") {
      return res.status(403).json({ error: "Only the DM can end sessions" });
    }

    await Party.deleteOne({ sessionId: session._id });

    session.status = "Completed";
    if (!session.endedAt) session.endedAt = new Date();
    await session.save();

    res.json({ session: serializeSessionForViewer(session, true) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/sessions/:id/current-map
// DM updates which map is currently loaded for this session.
// Players poll /party (which returns session data) to see when the map changes.
router.patch("/:id/current-map", verifyToken, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: "Session not found" });

    const campaign = await Campaign.findById(session.campaignId);
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });

    const membership = campaign.members.find(
      (m) => m.userId.toString() === req.user.userId
    );
    if (!membership || membership.role !== "DM") {
      return res.status(403).json({ error: "Only the DM can set the current map" });
    }

    session.currentMapId = req.body.mapId || null;
    await session.save();
    res.json({ session: serializeSessionForViewer(session, true) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/sessions/:id/party
// Returns the live lobby. Accessible to campaign members AND to non-member
// players who joined the lobby via code.
router.get("/:id/party", verifyToken, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: "Session not found" });

    const party = await Party.findOne({ sessionId: session._id });
    if (!party) {
      return res.status(404).json({ error: "No active lobby for this session" });
    }

    // Resolve membership + active character (campaign members only).
    const campaign = await Campaign.findById(session.campaignId);
    const membership = campaign?.members?.find(
      (m) => m.userId.toString() === req.user.userId
    );
    const isMember = Boolean(membership);
    const isInParty = party.players?.includes(req.user.username);
    if (!isMember && !isInParty) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json({
      party,
      session: {
        _id: session._id,
        title: session.title,
        status: session.status,
        campaignId: session.campaignId,
        currentMapId: session.currentMapId,
      },
      viewer: {
        isMember,
        role: membership?.role || "Guest",
        activeCharacterId: membership?.activeCharacterId?.toString() || null,
      },
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
// GET /api/sessions/:id/map
// Returns the current map's JSON. Accessible to campaign members AND
// non-member party members. Used by PlayerDashboard to mirror the DM's map.
router.get("/:id/map", verifyToken, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: "Session not found" });

    const party = await Party.findOne({ sessionId: session._id });
    const campaign = await Campaign.findById(session.campaignId);
    const isMember = campaign?.members?.some(
      (m) => m.userId.toString() === req.user.userId
    );
    const isInParty = party?.players?.includes(req.user.username);
    if (!isMember && !isInParty) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!session.currentMapId) {
      return res.status(404).json({ error: "No map loaded for this session" });
    }

    const map = await Map.findById(session.currentMapId);
    if (!map) return res.status(404).json({ error: "Map not found" });

    const json = await fetchJsonFromS3(map.jsonKey);
    if (!json) {
      return res.status(500).json({ error: "Failed to load map data" });
    }

    res.json({ _id: map._id, name: map.name, json });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
// POST /api/sessions/:id/live-map-state
// DM stashes the latest map state (terrain, environment, etc.) so players can poll for it.
router.post("/:id/live-map-state", verifyToken, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: "Session not found" });

    const campaign = await Campaign.findById(session.campaignId);
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });

    const membership = campaign.members.find(
      (m) => m.userId.toString() === req.user.userId
    );
    if (!membership || membership.role !== "DM") {
      return res.status(403).json({ error: "Only the DM can update live map state" });
    }

    session.liveMapState = req.body?.state ?? null;
    session.liveMapStateUpdatedAt = new Date();
    await session.save();

    res.json({ updatedAt: session.liveMapStateUpdatedAt });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/sessions/:id/live-map-state
// Players (and DM) read the latest live map state. Same access pattern as /party.
router.get("/:id/live-map-state", verifyToken, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id).select(
      "campaignId liveMapState liveMapStateUpdatedAt"
    );
    if (!session) return res.status(404).json({ error: "Session not found" });

    const party = await Party.findOne({ sessionId: session._id });

    const campaign = await Campaign.findById(session.campaignId);
    const isMember = campaign?.members?.some(
      (m) => m.userId.toString() === req.user.userId
    );
    const isInParty = party?.players?.includes(req.user.username);
    if (!isMember && !isInParty) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json({
      state: session.liveMapState || null,
      updatedAt: session.liveMapStateUpdatedAt || null,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
