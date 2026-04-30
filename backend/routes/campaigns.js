import express from "express";
import jwt from "jsonwebtoken";
import Campaign from "../models/Campaign.js";
import User from "../models/User.js";

const router = express.Router();
const PLAY_STYLES = new Set(["Online", "In Person", "Hybrid"]);
const STATUSES = new Set(["Planning", "Active", "On Hold", "Completed"]);
const QUEST_STATUSES = new Set(["In Progress", "Blocked", "Completed"]);

const normalizeCurrentQuest = (input) => {
  if (!input) return null;

  const title = input.title?.trim?.() || "";
  const objective = input.objective?.trim?.() || "";
  if (!title && !objective) return null;

  const status = QUEST_STATUSES.has(input.status) ? input.status : "In Progress";
  return {
    title,
    objective,
    status,
    updatedAt: new Date(),
  };
};

const normalizeNpcs = (input) => {
  if (!Array.isArray(input)) return [];
  return input
    .map((npc) => ({
      name: npc?.name?.trim?.() || "",
      role: npc?.role?.trim?.() || "",
      notes: npc?.notes?.trim?.() || "",
    }))
    .filter((npc) => npc.name)
    .slice(0, 100);
};

const normalizeEnemies = (input) => {
  if (!Array.isArray(input)) return [];
  return input
    .map((enemy) => ({
      name: enemy?.name?.trim?.() || "",
      role: enemy?.role?.trim?.() || "",
      notes: enemy?.notes?.trim?.() || "",
    }))
    .filter((enemy) => enemy.name)
    .slice(0, 100);
};

const normalizeLoot = (input) => {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => {
      const rawQuantity = Number(item?.quantity);
      const quantity = Number.isFinite(rawQuantity) ? Math.trunc(rawQuantity) : 1;
      return {
        name: item?.name?.trim?.() || "",
        quantity: Math.max(1, Math.min(999, quantity)),
        holder: item?.holder?.trim?.() || "",
        notes: item?.notes?.trim?.() || "",
      };
    })
    .filter((item) => item.name)
    .slice(0, 150);
};

// --- Auth Middleware ---
// May need to move this to another file for reuse in maps and character.
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // contains { userId, username }
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

// Search users by username (for adding players)
router.get("/users/search", verifyToken, async (req, res) => {
  try {
    const { username } = req.query;
    if (!username || username.trim().length < 2) {
      return res.status(400).json({ error: "Query must be at least 2 characters" });
    }

    const users = await User.find({
      username: { $regex: username.trim(), $options: "i" },
      _id: { $ne: req.user.userId }, // exclude the searching user
    })
      .select("_id username")
      .limit(10);

    res.json(users);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Create a new campaign
router.post("/", verifyToken, async (req, res) => {
  try {
    const title = req.body.title?.trim();
    if (!title || title.length < 3) {
      return res.status(400).json({ error: "Title must be at least 3 characters" });
    }

    const memberIds = Array.isArray(req.body.members) ? req.body.members : [];
    const uniquePlayerIds = new Set();
    for (const member of memberIds) {
      const id = member?.userId?.toString();
      if (!id || id === req.user.userId) continue;
      uniquePlayerIds.add(id);
    }

    const maxPlayersValue = Number(req.body.maxPlayers);
    const maxPlayers = Number.isFinite(maxPlayersValue) ? Math.trunc(maxPlayersValue) : 5;
    if (maxPlayers < 1 || maxPlayers > 12) {
      return res.status(400).json({ error: "Max players must be between 1 and 12" });
    }

    const members = [
      { userId: req.user.userId, role: "DM" },
      ...Array.from(uniquePlayerIds).map((id) => ({ userId: id, role: "Player" })),
    ];
    if (uniquePlayerIds.size > maxPlayers) {
      return res.status(400).json({ error: "Party size exceeds max players" });
    }

    const playStyle = req.body.playStyle || "Online";
    if (!PLAY_STYLES.has(playStyle)) {
      return res.status(400).json({ error: "Invalid play style" });
    }

    const status = req.body.status || "Planning";
    if (!STATUSES.has(status)) {
      return res.status(400).json({ error: "Invalid campaign status" });
    }

    const startDate = req.body.startDate ? new Date(req.body.startDate) : undefined;
    if (startDate && Number.isNaN(startDate.getTime())) {
      return res.status(400).json({ error: "Invalid start date" });
    }

    const campaign = new Campaign({
      title,
      description: req.body.description?.trim(),
      image: req.body.image,
      playStyle,
      maxPlayers,
      startDate,
      status,
      currentQuest: normalizeCurrentQuest(req.body.currentQuest),
      npcs: normalizeNpcs(req.body.npcs),
      enemies: normalizeEnemies(req.body.enemies),
      loot: normalizeLoot(req.body.loot),
      members,
    });
    await campaign.save();
    res.status(201).json(campaign);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all campaigns where the logged-in user is a member
router.get("/", verifyToken, async (req, res) => {
  try {
    const campaigns = await Campaign.find({ "members.userId": req.user.userId });
    res.json(campaigns);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get a campaign by ID — only if the user is a member
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id).populate(
      "members.userId",
      "username email"
    );
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });

    const isMember = campaign.members.some(
      (m) => m.userId._id.toString() === req.user.userId
    );
    if (!isMember) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(campaign);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update a campaign — only the DM can update
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });

    const isDM = campaign.members.some(
      (m) => m.userId.toString() === req.user.userId && m.role === "DM"
    );
    if (!isDM) {
      return res.status(403).json({ error: "Only the DM can update this campaign" });
    }

    if (req.body.playStyle && !PLAY_STYLES.has(req.body.playStyle)) {
      return res.status(400).json({ error: "Invalid play style" });
    }

    if (req.body.status && !STATUSES.has(req.body.status)) {
      return res.status(400).json({ error: "Invalid campaign status" });
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "currentQuest")) {
      req.body.currentQuest = normalizeCurrentQuest(req.body.currentQuest);
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "npcs")) {
      req.body.npcs = normalizeNpcs(req.body.npcs);
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "enemies")) {
      req.body.enemies = normalizeEnemies(req.body.enemies);
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "loot")) {
      req.body.loot = normalizeLoot(req.body.loot);
    }

    const incomingMembers = Array.isArray(req.body.members) ? req.body.members : campaign.members;
    const incomingMaxPlayersRaw = req.body.maxPlayers ?? campaign.maxPlayers ?? 5;
    const incomingMaxPlayers = Number(incomingMaxPlayersRaw);
    if (!Number.isFinite(incomingMaxPlayers) || incomingMaxPlayers < 1 || incomingMaxPlayers > 12) {
      return res.status(400).json({ error: "Max players must be between 1 and 12" });
    }
    const incomingPlayerCount = incomingMembers.filter((m) => m.role === "Player").length;
    if (incomingPlayerCount > incomingMaxPlayers) {
      return res.status(400).json({ error: "Party size exceeds max players" });
    }

    const updatedCampaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    res.json(updatedCampaign);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a campaign — only the DM can delete
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });

    const isDM = campaign.members.some(
      (m) => m.userId.toString() === req.user.userId && m.role === "DM"
    );
    if (!isDM) {
      return res.status(403).json({ error: "Only the DM can delete this campaign" });
    }

    await Campaign.findByIdAndDelete(req.params.id);
    res.json({ message: "Campaign deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
