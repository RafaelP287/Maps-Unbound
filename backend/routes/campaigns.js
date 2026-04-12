import express from "express";
import Campaign from "../models/Campaign.js";
import User from "../models/User.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();
const PLAY_STYLES = new Set(["Online", "In Person", "Hybrid"]);
const STATUSES = new Set(["Planning", "Active", "On Hold", "Completed", "active", "inactive", "archived"]);
const QUEST_STATUSES = new Set(["In Progress", "Blocked", "Completed"]);

const normalizeCurrentQuest = (input) => {
  if (!input) return null;
  const title = input.title?.trim?.() || "";
  const objective = input.objective?.trim?.() || "";
  if (!title && !objective) return null;

  return {
    title,
    objective,
    status: QUEST_STATUSES.has(input.status) ? input.status : "In Progress",
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

// Search users by username (for adding players)
router.get("/users/search", verifyToken, async (req, res) => {
  try {
    const { username } = req.query;
    if (!username || username.trim().length < 2) {
      return res.status(400).json({ error: "Query must be at least 2 characters" });
    }

    const users = await User.find({
      username: { $regex: username.trim(), $options: "i" },
      _id: { $ne: req.userId },
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

    const maxPlayersValue = Number(req.body.maxPlayers);
    const maxPlayers = Number.isFinite(maxPlayersValue) ? Math.trunc(maxPlayersValue) : 5;
    if (maxPlayers < 1 || maxPlayers > 12) {
      return res.status(400).json({ error: "Max players must be between 1 and 12" });
    }

    const memberIds = Array.isArray(req.body.members) ? req.body.members : [];
    const uniquePlayerIds = new Set();
    for (const member of memberIds) {
      const id = member?.userId?.toString();
      if (!id || id === req.userId) continue;
      uniquePlayerIds.add(id);
    }
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
      createdBy: req.userId,
      playStyle,
      maxPlayers,
      minLevel: req.body.minLevel,
      maxLevel: req.body.maxLevel,
      campaignType: req.body.campaignType || "D&D",
      startDate,
      status,
      isPublic: req.body.isPublic ?? true,
      accessCode: req.body.accessCode || null,
      currentQuest: normalizeCurrentQuest(req.body.currentQuest),
      npcs: normalizeNpcs(req.body.npcs),
      loot: normalizeLoot(req.body.loot),
      members: [
        { userId: req.userId, role: "DM" },
        ...Array.from(uniquePlayerIds).map((id) => ({ userId: id, role: "Player" })),
      ],
    });

    await campaign.save();
    res.status(201).json({ message: "Campaign created successfully", campaign });
  } catch (err) {
    console.error("Campaign creation error:", err);
    res.status(400).json({ error: err.message });
  }
});

// PARTY FINDER ROUTES
router.get("/finder/available", async (req, res) => {
  try {
    const { campaignType, minLevel, maxLevel } = req.query;

    const filter = { isPublic: true, isHosting: true };
    if (campaignType) filter.campaignType = campaignType;
    if (minLevel) filter.minLevel = { $lte: Number(minLevel) };
    if (maxLevel) filter.maxLevel = { $gte: Number(maxLevel) };

    const campaigns = await Campaign.find(filter)
      .select("title description campaignType minLevel maxPlayers members isHosting joinRequests createdBy")
      .populate("createdBy", "username")
      .sort({ createdAt: -1 });

    res.json(campaigns);
  } catch (err) {
    console.error("Error fetching available campaigns:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/finder/joinable", verifyToken, async (req, res) => {
  try {
    const campaigns = await Campaign.find({
      $and: [{ isPublic: true }, { "members.userId": { $ne: req.userId } }],
    })
      .select("title description campaignType status members isHosting joinRequests createdBy")
      .populate("createdBy", "username")
      .sort({ createdAt: -1 });

    res.json(campaigns);
  } catch (err) {
    console.error("Error fetching joinable campaigns:", err);
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id/start-hosting", verifyToken, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });

    const isDM = campaign.createdBy?.toString() === req.userId ||
      campaign.members.some((m) => m.userId.toString() === req.userId && m.role === "DM");
    if (!isDM) return res.status(403).json({ message: "Only the DM can start hosting" });

    campaign.isHosting = true;
    campaign.status = "active";
    const saved = await campaign.save();
    res.json({ message: "Campaign is now hosting", campaign: saved });
  } catch (err) {
    console.error("Start hosting error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id/stop-hosting", verifyToken, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });

    const isDM = campaign.createdBy?.toString() === req.userId ||
      campaign.members.some((m) => m.userId.toString() === req.userId && m.role === "DM");
    if (!isDM) return res.status(403).json({ message: "Only the DM can stop hosting" });

    campaign.isHosting = false;
    campaign.status = "inactive";
    const saved = await campaign.save();
    res.json({ message: "Campaign is no longer hosting", campaign: saved });
  } catch (err) {
    console.error("Stop hosting error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id/access-settings", verifyToken, async (req, res) => {
  try {
    const { isPublic, accessCode, maxPlayers, minLevel, maxLevel } = req.body;
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });

    const isDM = campaign.createdBy?.toString() === req.userId ||
      campaign.members.some((m) => m.userId.toString() === req.userId && m.role === "DM");
    if (!isDM) return res.status(403).json({ message: "Only the DM can update access settings" });

    if (isPublic !== undefined) campaign.isPublic = isPublic;
    if (accessCode !== undefined) campaign.accessCode = accessCode;
    if (maxPlayers !== undefined) campaign.maxPlayers = maxPlayers;
    if (minLevel !== undefined) campaign.minLevel = minLevel;
    if (maxLevel !== undefined) campaign.maxLevel = maxLevel;

    await campaign.save();
    res.json({ message: "Access settings updated successfully", campaign });
  } catch (err) {
    console.error("Access settings error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id/encounter-ready", verifyToken, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });

    const isDM = campaign.createdBy?.toString() === req.userId ||
      campaign.members.some((m) => m.userId.toString() === req.userId && m.role === "DM");
    // IMPORTANT: readiness can only be toggled by DM/creator.
    if (!isDM) return res.status(403).json({ message: "Only the DM can change encounter readiness" });

    if (!campaign.encounter) campaign.encounter = {};
    // IMPORTANT: readiness state used by socket layer to allow/deny player entry.
    campaign.encounter.isReady = Boolean(req.body?.isReady);
    campaign.markModified("encounter");
    await campaign.save();

    res.json({
      message: campaign.encounter.isReady ? "Encounter opened to players" : "Encounter locked for DM prep",
      isReady: campaign.encounter.isReady,
    });
  } catch (err) {
    console.error("Encounter readiness update error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/join-request", verifyToken, async (req, res) => {
  try {
    const { accessCode, characterId } = req.body;
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });

    const isMember = campaign.members.some((m) => m.userId.toString() === req.userId);
    if (isMember) return res.status(400).json({ message: "You are already a member of this campaign" });

    if (campaign.blockedUsers?.some((u) => u.toString() === req.userId)) {
      return res.status(403).json({ message: "You are blocked from joining this campaign" });
    }

    if (campaign.accessCode && campaign.accessCode !== accessCode) {
      return res.status(403).json({ message: "Invalid access code" });
    }

    const existingRequest = campaign.joinRequests.find((r) => r.userId.toString() === req.userId);
    if (existingRequest && existingRequest.status === "pending") {
      return res.status(400).json({ message: "You already have a pending request for this campaign" });
    }
    if (existingRequest && existingRequest.status === "rejected") {
      campaign.joinRequests = campaign.joinRequests.filter((r) => r._id.toString() !== existingRequest._id.toString());
    }

    const playerCount = campaign.members.filter((member) => member.role === "Player").length;
    if (playerCount >= campaign.maxPlayers) {
      return res.status(400).json({ message: "Campaign is full" });
    }

    campaign.joinRequests.push({ userId: req.userId, characterId: characterId || null, status: "pending" });
    await campaign.save();
    res.json({ message: "Join request sent successfully", campaign });
  } catch (err) {
    console.error("Join request error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id/join-request/:requestId", verifyToken, async (req, res) => {
  try {
    const { action, blockUser } = req.body;
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });

    const isDM = campaign.createdBy?.toString() === req.userId ||
      campaign.members.some((m) => m.userId.toString() === req.userId && m.role === "DM");
    if (!isDM) return res.status(403).json({ message: "Only the DM can approve join requests" });

    const joinRequest = campaign.joinRequests.find((r) => r._id.toString() === req.params.requestId);
    if (!joinRequest) return res.status(404).json({ error: "Join request not found" });

    if (action === "approve") {
      joinRequest.status = "approved";
      const alreadyMember = campaign.members.some((m) => m.userId.toString() === joinRequest.userId.toString());
      if (!alreadyMember) {
        campaign.members.push({ userId: joinRequest.userId, characterId: joinRequest.characterId, role: "Player" });
      }
    } else if (action === "reject") {
      joinRequest.status = "rejected";
      if (blockUser) {
        if (!campaign.blockedUsers) campaign.blockedUsers = [];
        if (!campaign.blockedUsers.some((u) => u.toString() === joinRequest.userId.toString())) {
          campaign.blockedUsers.push(joinRequest.userId);
        }
      }
    } else {
      return res.status(400).json({ message: "Invalid action" });
    }

    await campaign.save();
    res.json({ message: `Join request ${action}ed successfully`, campaign });
  } catch (err) {
    console.error("Join request action error:", err);
    res.status(500).json({ error: err.message });
  }
});

// List campaigns where user is a member or creator
router.get("/", verifyToken, async (req, res) => {
  try {
    const campaigns = await Campaign.find({
      $or: [
        { createdBy: req.userId },
        { "members.userId": req.userId },
      ],
    }).sort({ createdAt: -1 });
    res.json(campaigns);
  } catch (err) {
    console.error("Campaign fetch error:", err);
    res.status(400).json({ error: err.message });
  }
});

router.get("/:id", verifyToken, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id).populate("members.userId", "username email");
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });

    const isMember = campaign.createdBy?.toString() === req.userId || campaign.members.some((m) => {
      const memberId = m.userId?._id?.toString?.() || m.userId?.toString?.();
      return memberId === req.userId;
    });
    if (!isMember) return res.status(403).json({ error: "Access denied" });

    res.json(campaign);
  } catch (err) {
    console.error("Campaign fetch error:", err);
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id", verifyToken, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });

    const isDM = campaign.createdBy?.toString() === req.userId ||
      campaign.members.some((m) => m.userId.toString() === req.userId && m.role === "DM");
    if (!isDM) return res.status(403).json({ error: "Only the DM can update this campaign" });

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

    const updatedCampaign = await Campaign.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    res.json({ message: "Campaign updated successfully", campaign: updatedCampaign });
  } catch (err) {
    console.error("Campaign update error:", err);
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });

    const isDM = campaign.createdBy?.toString() === req.userId ||
      campaign.members.some((m) => m.userId.toString() === req.userId && m.role === "DM");
    if (!isDM) return res.status(403).json({ error: "Only the DM can delete this campaign" });

    await Campaign.findByIdAndDelete(req.params.id);
    res.json({ message: "Campaign deleted successfully" });
  } catch (err) {
    console.error("Campaign delete error:", err);
    res.status(400).json({ error: err.message });
  }
});

export default router;
