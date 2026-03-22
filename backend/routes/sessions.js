import express from "express";
import jwt from "jsonwebtoken";
import Session from "../models/Session.js";
import Campaign from "../models/Campaign.js";

const router = express.Router();
const STATUSES = new Set(["Planned", "In Progress", "Completed", "Archived"]);

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

    const session = new Session({
      campaignId,
      title,
      sessionNumber,
      status,
      scheduledFor,
      summary: req.body.summary?.trim(),
      notes: req.body.notes?.trim(),
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

export default router;
