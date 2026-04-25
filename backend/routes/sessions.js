import express from "express";
import jwt from "jsonwebtoken";
import Session from "../models/Session.js";
import Campaign from "../models/Campaign.js";
import Encounter from "../models/Encounter.js";

const router = express.Router();
const STATUSES = new Set(["Planned", "In Progress", "Completed", "Archived"]);
const NOTE_ROLES = new Set(["DM", "Player"]);

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
        createdAt: new Date(),
        updatedAt: new Date(),
      };
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

    const isMember = campaign.members.some(
      (m) => m.userId.toString() === req.user.userId
    );
    if (!isMember) {
      return res.status(403).json({ error: "Access denied" });
    }

    const sessions = await Session.find({ campaignId }).sort({ sessionNumber: 1, createdAt: 1 });
    res.json(sessions);
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

    const isMember = campaign.members.some(
      (m) => m.userId.toString() === req.user.userId
    );
    if (!isMember) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(session);
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

export default router;
