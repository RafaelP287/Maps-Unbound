import express from "express";
import jwt from "jsonwebtoken";
import Campaign from "../models/Campaign.js";
import Session from "../models/Session.js";
import User from "../models/User.js";

const router = express.Router();
const PLAY_STYLES = new Set(["Online", "In Person", "Hybrid"]);
const STATUSES = new Set(["Planning", "Active", "On Hold", "Completed"]);
const QUEST_STATUSES = new Set(["In Progress", "Blocked", "Completed"]);
const JOIN_REQUEST_STATUSES = new Set(["Pending", "Approved", "Rejected"]);

const getUserId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value.$oid) return value.$oid;
  if (value._id && value._id !== value) return getUserId(value._id);
  const stringValue = value.toString?.();
  if (stringValue && stringValue !== "[object Object]") return stringValue;
  if (typeof value.id === "string") return value.id;
  if (value.id && value.id !== value) return getUserId(value.id);
  return "";
};

const isCampaignDM = (campaign, userId) =>
  campaign?.createdBy?.toString?.() === userId ||
  campaign?.members?.some((member) => getUserId(member.userId) === userId && member.role === "DM");

const populateCampaignForDetail = (query) =>
  query
    .populate("members.userId", "username email profileImageUrl")
    .populate("joinRequests.userId", "username email profileImageUrl");

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
      createdBy: req.user.userId,
      playStyle,
      maxPlayers,
      startDate,
      status,
      isPublic: req.body.isPublic !== undefined ? Boolean(req.body.isPublic) : true,
      isHosting: Boolean(req.body.isHosting),
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
    const campaigns = await Campaign.find({ "members.userId": req.user.userId })
      .select("title description image playStyle maxPlayers startDate status isPublic isHosting members joinRequests createdAt updatedAt")
      .sort({ updatedAt: -1 })
      .lean();
    res.json(campaigns);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get active sessions for campaigns where the logged-in user is a member
router.get("/active-sessions", verifyToken, async (req, res) => {
  try {
    const campaigns = await Campaign.find({ "members.userId": req.user.userId })
      .select("title status members")
      .lean();
    const campaignIds = campaigns.map((campaign) => campaign._id);
    if (campaignIds.length === 0) {
      return res.json([]);
    }

    const sessions = await Session.find({
      campaignId: { $in: campaignIds },
      status: "In Progress",
    })
      .select("campaignId title status startedAt createdAt")
      .sort({ startedAt: -1, createdAt: -1 })
      .lean();

    const campaignById = new Map(campaigns.map((campaign) => [campaign._id.toString(), campaign]));
    const seenCampaignIds = new Set();
    const activeCampaigns = [];

    for (const session of sessions) {
      const campaignId = session.campaignId?.toString();
      if (!campaignId || seenCampaignIds.has(campaignId)) continue;

      const campaign = campaignById.get(campaignId);
      if (!campaign) continue;

      seenCampaignIds.add(campaignId);
      activeCampaigns.push({
        campaign: {
          _id: campaign._id,
          title: campaign.title,
          status: campaign.status,
        },
        session: {
          _id: session._id,
          title: session.title,
          status: session.status,
          startedAt: session.startedAt,
          createdAt: session.createdAt,
        },
      });
    }

    res.json(activeCampaigns);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Discover campaigns that have opted into Party Finder.
router.get("/findable", verifyToken, async (req, res) => {
  try {
    const campaigns = await Campaign.find({
      isPublic: true,
      isHosting: true,
      status: { $ne: "Completed" },
    })
      .populate("members.userId", "username profileImageUrl")
      .populate("joinRequests.userId", "username profileImageUrl")
      .select("title description image playStyle maxPlayers startDate status isHosting members joinRequests updatedAt")
      .sort({ updatedAt: -1 })
      .lean();

    const userId = req.user.userId;
    const visibleCampaigns = campaigns.map((campaign) => {
      const players = (campaign.members || []).filter((member) => member.role === "Player");
      const isMember = (campaign.members || []).some((member) => getUserId(member.userId) === userId);
      const request = (campaign.joinRequests || [])
        .slice()
        .reverse()
        .find((joinRequest) => getUserId(joinRequest.userId) === userId);

      return {
        _id: campaign._id,
        title: campaign.title,
        description: campaign.description,
        image: campaign.image,
        playStyle: campaign.playStyle,
        maxPlayers: campaign.maxPlayers,
        startDate: campaign.startDate,
        status: campaign.status,
        isHosting: campaign.isHosting,
        playerCount: players.length,
        dm: (campaign.members || []).find((member) => member.role === "DM")?.userId || null,
        isMember,
        requestStatus: request?.status || null,
      };
    });

    res.json(visibleCampaigns);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Pending Party Finder requests for campaigns run by the logged-in DM.
router.get("/party-finder-requests", verifyToken, async (req, res) => {
  try {
    const campaigns = await Campaign.find({
      members: {
        $elemMatch: {
          userId: req.user.userId,
          role: "DM",
        },
      },
      "joinRequests.status": "Pending",
    })
      .populate("joinRequests.userId", "username profileImageUrl")
      .select("title maxPlayers members joinRequests isHosting updatedAt")
      .sort({ updatedAt: -1 })
      .lean();

    const requests = campaigns.flatMap((campaign) => {
      const playerCount = (campaign.members || []).filter((member) => member.role === "Player").length;
      return (campaign.joinRequests || [])
        .filter((request) => request.status === "Pending")
        .map((request) => ({
          _id: request._id,
          campaignId: campaign._id,
          campaignTitle: campaign.title,
          campaignIsHosting: Boolean(campaign.isHosting),
          playerCount,
          maxPlayers: campaign.maxPlayers,
          user: request.userId,
          requestedAt: request.requestedAt,
        }));
    });

    res.json(requests);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Request DM approval to join a findable campaign.
router.post("/:id/join-requests", verifyToken, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });
    if (!campaign.isPublic || !campaign.isHosting) {
      return res.status(400).json({ error: "This campaign is not accepting join requests" });
    }
    if (campaign.status === "Completed") {
      return res.status(400).json({ error: "This campaign is completed" });
    }

    const isMember = campaign.members.some((member) => getUserId(member.userId) === req.user.userId);
    if (isMember) {
      return res.status(400).json({ error: "You are already a member of this campaign" });
    }

    const players = campaign.members.filter((member) => member.role === "Player");
    if (players.length >= campaign.maxPlayers) {
      return res.status(400).json({ error: "This campaign is full" });
    }

    const existingPending = campaign.joinRequests.find(
      (joinRequest) => getUserId(joinRequest.userId) === req.user.userId && joinRequest.status === "Pending"
    );
    if (existingPending) {
      return res.status(400).json({ error: "You already have a pending request for this campaign" });
    }

    campaign.joinRequests.push({
      userId: req.user.userId,
      status: "Pending",
      requestedAt: new Date(),
    });
    await campaign.save();

    res.status(201).json({ message: "Join request sent" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DM resolves a pending join request. Approval adds the user as a Player.
router.put("/:id/join-requests/:requestId", verifyToken, async (req, res) => {
  try {
    const status = req.body.status;
    if (!JOIN_REQUEST_STATUSES.has(status) || status === "Pending") {
      return res.status(400).json({ error: "Request status must be Approved or Rejected" });
    }

    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });
    if (!isCampaignDM(campaign, req.user.userId)) {
      return res.status(403).json({ error: "Only the DM can manage join requests" });
    }

    const joinRequest = campaign.joinRequests.id(req.params.requestId);
    if (!joinRequest) return res.status(404).json({ error: "Join request not found" });
    if (joinRequest.status !== "Pending") {
      return res.status(400).json({ error: "This join request has already been resolved" });
    }

    const requestedUserId = getUserId(joinRequest.userId);
    const isAlreadyMember = campaign.members.some((member) => getUserId(member.userId) === requestedUserId);
    const playerCount = campaign.members.filter((member) => member.role === "Player").length;
    if (status === "Approved") {
      if (isAlreadyMember) {
        return res.status(400).json({ error: "This user is already a campaign member" });
      }
      if (playerCount >= campaign.maxPlayers) {
        return res.status(400).json({ error: "Party size exceeds max players" });
      }
      campaign.members.push({ userId: joinRequest.userId, role: "Player" });
    }

    joinRequest.status = status;
    joinRequest.resolvedAt = new Date();
    await campaign.save();

    const updatedCampaign = await populateCampaignForDetail(Campaign.findById(campaign._id)).lean();
    res.json(updatedCampaign);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id/encounter-ready", verifyToken, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });

    const isDM = isCampaignDM(campaign, req.user.userId);
    if (!isDM) {
      return res.status(403).json({ error: "Only the DM can change encounter readiness" });
    }

    if (!campaign.encounter) campaign.encounter = {};
    campaign.encounter.isReady = Boolean(req.body?.isReady);
    campaign.markModified("encounter");
    await campaign.save();

    res.json({
      message: campaign.encounter.isReady ? "Encounter opened to players" : "Encounter locked for DM prep",
      isReady: campaign.encounter.isReady,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get a campaign by ID — only if the user is a member
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const campaign = await populateCampaignForDetail(Campaign.findById(req.params.id)).lean();
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });

    const isMember = campaign.members.some(
      (m) => getUserId(m.userId) === req.user.userId
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

    const isDM = isCampaignDM(campaign, req.user.userId);
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
    if (Object.prototype.hasOwnProperty.call(req.body, "isPublic")) {
      req.body.isPublic = Boolean(req.body.isPublic);
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "isHosting")) {
      req.body.isHosting = Boolean(req.body.isHosting);
    }
    delete req.body.joinRequests;

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

    const isDM = isCampaignDM(campaign, req.user.userId);
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
