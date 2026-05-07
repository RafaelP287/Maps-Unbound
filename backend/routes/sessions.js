import express from "express";
import jwt from "jsonwebtoken";
import Session from "../models/Session.js";
import Campaign from "../models/Campaign.js";
import Encounter from "../models/Encounter.js";

const router = express.Router();
const STATUSES = new Set(["Planned", "In Progress", "Completed", "Archived"]);
const NOTE_ROLES = new Set(["DM", "Player"]);

const getNoteAuthorId = (note) => note?.authorId?.toString?.() || note?.authorId || "";

const sanitizeSessionNotesForViewer = (notes, isDM, viewerId) =>
  (Array.isArray(notes) ? notes : []).filter((note) =>
    isDM ||
    getNoteAuthorId(note) === viewerId ||
    (note?.authorRole === "DM" && Boolean(note?.visibleToPlayers))
  );

const serializeSessionForViewer = (sessionDoc, isDM, viewerId) => {
  const session = typeof sessionDoc?.toObject === "function" ? sessionDoc.toObject() : { ...sessionDoc };
  session.notes = sanitizeSessionNotesForViewer(session.notes, isDM, viewerId);
  return session;
};

const getCampaignMembership = (campaign, userId) =>
  campaign?.members?.find((m) => m.userId.toString() === userId) || null;

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

    const campaign = await Campaign.findById(campaignId).select("members sessionIds");
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const isDM = campaign.members.some(
      (m) => m.userId.toString() === req.user.userId && m.role === "DM"
    );
    if (!isDM) {
      return res.status(403).json({ error: "Only the DM can create sessions" });
    }

    let title = req.body.title?.trim();
    if (!title || title.length < 3) {
      return res.status(400).json({ error: "Title must be at least 3 characters" });
    }

    const status = req.body.status || "Planned";
    if (!STATUSES.has(status)) {
      return res.status(400).json({ error: "Invalid session status" });
    }

    const sessionNumberValue = Number(req.body.sessionNumber);
    let sessionNumber = Number.isFinite(sessionNumberValue)
      ? Math.max(1, Math.trunc(sessionNumberValue))
      : undefined;

    if (!sessionNumber) {
      const latestSession = await Session.findOne({ campaignId })
        .select("sessionNumber")
        .sort({ sessionNumber: -1, createdAt: -1 })
        .lean();
      sessionNumber = (Number(latestSession?.sessionNumber) || 0) + 1;
    }
    if (title === "Session") {
      title = `Session ${sessionNumber}`;
    }

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

    const membership = getCampaignMembership(campaign, req.user.userId);
    if (!membership) {
      return res.status(403).json({ error: "Access denied" });
    }
    const isDM = membership.role === "DM";
    const hasSessionNoteContent = Object.prototype.hasOwnProperty.call(req.body, "sessionNoteContent");
    const requestedFields = Object.keys(req.body || {});
    const noteOnlyUpdate = requestedFields.every((field) =>
      ["sessionNoteContent", "sessionNoteVisibleToPlayers"].includes(field)
    );
    if (!isDM && (!hasSessionNoteContent || !noteOnlyUpdate)) {
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
        authorRole: isDM ? "DM" : "Player",
        content,
        visibleToPlayers: isDM ? Boolean(req.body.sessionNoteVisibleToPlayers) : true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "noteVisibilityIndex")) {
      if (!isDM) {
        return res.status(403).json({ error: "Only the DM can change note visibility" });
      }
      const noteIndex = Number(req.body.noteVisibilityIndex);
      if (!Number.isInteger(noteIndex) || noteIndex < 0 || noteIndex >= session.notes.length) {
        return res.status(400).json({ error: "Invalid noteVisibilityIndex" });
      }

      session.notes[noteIndex].visibleToPlayers = Boolean(req.body.noteVisibleToPlayers);
      session.notes[noteIndex].updatedAt = new Date();
      await session.save();
      return res.json(serializeSessionForViewer(session, true, req.user.userId));
    }

    const updatePayload = noteToAppend
      ? { ...updates, $push: { notes: noteToAppend } }
      : updates;

    const updatedSession = await Session.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true, runValidators: true }
    );

    res.json(serializeSessionForViewer(updatedSession, isDM, req.user.userId));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get sessions for a campaign (members only)
router.get("/", verifyToken, async (req, res) => {
  try {
    const { campaignId } = req.query;
    const includeNotes = req.query.includeNotes === "true";
    if (!campaignId) {
      return res.status(400).json({ error: "campaignId is required" });
    }

    const campaign = await Campaign.findById(campaignId).select("members").lean();
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

    const sessionFields = includeNotes
      ? "campaignId title sessionNumber status scheduledFor startedAt endedAt summary notes participants tags createdAt updatedAt"
      : "campaignId title sessionNumber status scheduledFor startedAt endedAt summary participants tags createdAt updatedAt";
    const sessions = await Session.find({ campaignId })
      .select(sessionFields)
      .sort({ sessionNumber: 1, createdAt: 1 })
      .lean();
    res.json(sessions.map((session) => serializeSessionForViewer(session, isDM, req.user.userId)));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get journal-ready campaign activity in one request (members only)
router.get("/journal/:campaignId", verifyToken, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const campaign = await Campaign.findById(campaignId).select("members").lean();
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const membership = getCampaignMembership(campaign, req.user.userId);
    if (!membership) {
      return res.status(403).json({ error: "Access denied" });
    }

    const isDM = membership.role === "DM";
    const [sessions, encounters] = await Promise.all([
      Session.find({ campaignId })
        .select("campaignId title sessionNumber status scheduledFor startedAt endedAt summary notes participants tags createdAt updatedAt")
        .sort({ sessionNumber: 1, createdAt: 1 })
        .lean(),
      Encounter.find({ campaignId })
        .select("campaignId sessionId name status startedAt endedAt rounds relatedMap initiative summary notes createdAt updatedAt")
        .sort({ sessionId: 1, createdAt: 1 })
        .lean(),
    ]);

    const encountersBySession = encounters.reduce((groups, encounter) => {
      const key = encounter.sessionId?.toString();
      if (!key) return groups;
      if (!groups[key]) groups[key] = [];
      groups[key].push(encounter);
      return groups;
    }, {});

    res.json({
      sessions: sessions.map((session) => serializeSessionForViewer(session, isDM, req.user.userId)),
      encountersBySession,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get a session by ID (members only)
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id).lean();
    if (!session) return res.status(404).json({ error: "Session not found" });

    const campaign = await Campaign.findById(session.campaignId).select("members").lean();
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

    res.json(serializeSessionForViewer(session, isDM, req.user.userId));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Join a session lobby or active session (campaign members only)
router.post("/:id/join", verifyToken, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: "Session not found" });

    if (["Completed", "Archived"].includes(session.status)) {
      return res.status(400).json({ error: "This session is no longer open" });
    }

    const campaign = await Campaign.findById(session.campaignId).select("members").lean();
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const membership = getCampaignMembership(campaign, req.user.userId);
    if (!membership) {
      return res.status(403).json({ error: "Access denied" });
    }

    const alreadyJoined = session.participants.some(
      (participant) => participant.userId.toString() === req.user.userId
    );

    if (!alreadyJoined) {
      session.participants.push({
        userId: req.user.userId,
        role: membership.role,
      });
      await session.save();
    }

    const updatedSession = await Session.findById(session._id).lean();
    res.json(serializeSessionForViewer(updatedSession, membership.role === "DM", req.user.userId));
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
