import express from "express";
import jwt from "jsonwebtoken";
import Encounter from "../models/Encounter.js";
import Session from "../models/Session.js";
import Campaign from "../models/Campaign.js";

const router = express.Router();
const STATUSES = new Set(["Planned", "In Progress", "Completed", "Archived"]);
const KINDS = new Set(["Player", "NPC", "Enemy"]);

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

const isCampaignMember = (campaign, userId) =>
  campaign.members.some((m) => m.userId.toString() === userId);

const isCampaignDM = (campaign, userId) =>
  campaign.members.some((m) => m.userId.toString() === userId && m.role === "DM");

const sanitizeInitiative = (raw) =>
  Array.isArray(raw)
    ? raw
        .map((entry) => ({
          name: entry?.name?.trim?.() || "",
          kind: KINDS.has(entry?.kind) ? entry.kind : null,
          hp: entry?.hp?.trim?.(),
          initiative: Number.isFinite(Number(entry?.initiative))
            ? Number(entry.initiative)
            : undefined,
          notes: entry?.notes?.trim?.(),
        }))
        .filter((entry) => entry.name && entry.kind)
    : [];

// Create encounter (DM only)
router.post("/", verifyToken, async (req, res) => {
  try {
    const sessionId = req.body.sessionId;
    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required" });
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const campaign = await Campaign.findById(session.campaignId);
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    if (!isCampaignDM(campaign, req.user.userId)) {
      return res.status(403).json({ error: "Only the DM can create encounters" });
    }

    const name = req.body.name?.trim();
    if (!name || name.length < 2) {
      return res.status(400).json({ error: "Name must be at least 2 characters" });
    }

    const status = req.body.status || "Planned";
    if (!STATUSES.has(status)) {
      return res.status(400).json({ error: "Invalid encounter status" });
    }

    const startedAt = req.body.startedAt ? new Date(req.body.startedAt) : undefined;
    if (startedAt && Number.isNaN(startedAt.getTime())) {
      return res.status(400).json({ error: "Invalid startedAt date" });
    }

    const endedAt = req.body.endedAt ? new Date(req.body.endedAt) : undefined;
    if (endedAt && Number.isNaN(endedAt.getTime())) {
      return res.status(400).json({ error: "Invalid endedAt date" });
    }

    const roundsValue = Number(req.body.rounds);
    const rounds = Number.isFinite(roundsValue) ? Math.max(0, Math.trunc(roundsValue)) : 0;

    const encounter = new Encounter({
      campaignId: campaign._id,
      sessionId: session._id,
      name,
      status,
      startedAt,
      endedAt,
      rounds,
      relatedMap: req.body.relatedMap?.trim?.(),
      initiative: sanitizeInitiative(req.body.initiative),
      activeTurnIndex: Number.isFinite(Number(req.body.activeTurnIndex))
        ? Math.max(0, Math.trunc(Number(req.body.activeTurnIndex)))
        : 0,
      summary: req.body.summary?.trim?.(),
      notes: req.body.notes?.trim?.(),
      mapState: req.body.mapState ?? null,
    });

    await encounter.save();

    const encounterIds = Array.isArray(session.encounterIds) ? session.encounterIds : [];
    session.encounterIds = Array.from(new Set([...encounterIds, encounter._id]));
    if (req.body.setActive || !session.activeEncounterId) {
      session.activeEncounterId = encounter._id;
    }
    await session.save();

    res.status(201).json(encounter);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// List encounters for a session (members only)
router.get("/", verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.query;
    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required" });
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const campaign = await Campaign.findById(session.campaignId);
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    if (!isCampaignMember(campaign, req.user.userId)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const encounters = await Encounter.find({ sessionId }).sort({ createdAt: 1 });
    res.json(encounters);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get encounter by ID (members only)
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const encounter = await Encounter.findById(req.params.id);
    if (!encounter) return res.status(404).json({ error: "Encounter not found" });

    const campaign = await Campaign.findById(encounter.campaignId);
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    if (!isCampaignMember(campaign, req.user.userId)) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(encounter);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update encounter (DM only)
router.patch("/:id", verifyToken, async (req, res) => {
  try {
    const encounter = await Encounter.findById(req.params.id);
    if (!encounter) return res.status(404).json({ error: "Encounter not found" });

    const campaign = await Campaign.findById(encounter.campaignId);
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    if (!isCampaignDM(campaign, req.user.userId)) {
      return res.status(403).json({ error: "Only the DM can update encounters" });
    }

    if (req.body.name !== undefined) {
      const name = req.body.name?.trim();
      if (!name || name.length < 2) {
        return res.status(400).json({ error: "Name must be at least 2 characters" });
      }
      encounter.name = name;
    }

    if (req.body.status !== undefined) {
      if (!STATUSES.has(req.body.status)) {
        return res.status(400).json({ error: "Invalid encounter status" });
      }
      encounter.status = req.body.status;
    }

    if (req.body.startedAt !== undefined) {
      const startedAt = req.body.startedAt ? new Date(req.body.startedAt) : null;
      if (startedAt && Number.isNaN(startedAt.getTime())) {
        return res.status(400).json({ error: "Invalid startedAt date" });
      }
      encounter.startedAt = startedAt || undefined;
    }

    if (req.body.endedAt !== undefined) {
      const endedAt = req.body.endedAt ? new Date(req.body.endedAt) : null;
      if (endedAt && Number.isNaN(endedAt.getTime())) {
        return res.status(400).json({ error: "Invalid endedAt date" });
      }
      encounter.endedAt = endedAt || undefined;
    }

    if (req.body.rounds !== undefined) {
      const roundsValue = Number(req.body.rounds);
      if (!Number.isFinite(roundsValue)) {
        return res.status(400).json({ error: "Invalid rounds value" });
      }
      encounter.rounds = Math.max(0, Math.trunc(roundsValue));
    }

    if (req.body.relatedMap !== undefined) {
      encounter.relatedMap = req.body.relatedMap?.trim?.() || "";
    }

    if (req.body.initiative !== undefined) {
      encounter.initiative = sanitizeInitiative(req.body.initiative);
    }

    if (req.body.activeTurnIndex !== undefined) {
      const idx = Number(req.body.activeTurnIndex);
      if (!Number.isFinite(idx) || idx < 0) {
        return res.status(400).json({ error: "Invalid activeTurnIndex" });
      }
      encounter.activeTurnIndex = Math.trunc(idx);
    }

    if (req.body.summary !== undefined) {
      encounter.summary = req.body.summary?.trim?.() || "";
    }

    if (req.body.notes !== undefined) {
      encounter.notes = req.body.notes?.trim?.() || "";
    }

    if (req.body.mapState !== undefined) {
      encounter.mapState = req.body.mapState ?? null;
    }

    await encounter.save();

    if (req.body.setActive) {
      const session = await Session.findById(encounter.sessionId);
      if (session) {
        session.activeEncounterId = encounter._id;
        if (!Array.isArray(session.encounterIds)) {
          session.encounterIds = [];
        }
        if (!session.encounterIds.some((id) => id.toString() === encounter._id.toString())) {
          session.encounterIds.push(encounter._id);
        }
        await session.save();
      }
    }

    res.json(encounter);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
