import express, { urlencoded, json } from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import connectDB from "./config/db.js";
import sessionRoutes from './routes/sessions.js';
import encounterRoutes from './routes/encounters.js';
import combatRoutes from "./routes/combat.js";
import Session from "./models/Session.js";
import Campaign from "./models/Campaign.js";
import Party from "./models/Party.js";

const app = express();
const PORT = process.env.PORT || 5001;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});
const sessionRuntimeStates = new Map();

if (!process.env.MONGO_URI) {
  console.error('MONGO_URI is not defined in .env');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not defined in .env');
  process.exit(1);
}

app.use(urlencoded({ extended: false }));
app.use(json({ limit: "50mb" }));
app.use(cors());

import characterRoutes from './routes/characters.js';
import userRoutes from './routes/users.js';
import registerRoutes from './routes/register.js';
import loginRoutes from './routes/login.js';
import authRoutes from './routes/auth.js';
import campaignRoutes from './routes/campaigns.js';
import partyRoutes from './routes/partyRoutes.js';
import assetRoutes from './routes/assets.js';
import dndProxy from './routes/dndProxy.js';
import mapRoutes from './routes/maps.js';

app.use('/api/maps', mapRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/users', userRoutes);
app.use('/api/register', registerRoutes);
app.use('/api/login', loginRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/parties', partyRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/encounters', encounterRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/dnd', dndProxy);
app.use('/api/combat', combatRoutes);

app.use((req, res, next) => {
  console.log("---------------------");
  console.log("Incoming Request Method:", req.method);
  console.log("Incoming URL:", req.url);
  console.log("Incoming Headers:", req.headers["content-type"]);
  console.log("Incoming Body:", req.body);
  next();
});

connectDB();

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getUserId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value._id) return getUserId(value._id);
  if (value.id) return getUserId(value.id);
  return value.toString?.() || "";
};

const isDMForCampaign = (campaign, userId) =>
  campaign?.createdBy?.toString?.() === userId ||
  campaign?.members?.some((member) => getUserId(member.userId) === userId && member.role === "DM");

const getSocketAuthUserId = (socket) => {
  const rawToken = socket.handshake.auth?.token || "";
  const token = typeof rawToken === "string" && rawToken.startsWith("Bearer ")
    ? rawToken.split(" ")[1]
    : rawToken;
  if (!token) return "";

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return getUserId(decoded.userId || decoded.id || decoded._id);
  } catch {
    return "";
  }
};

const getCampaignMembershipForSocket = async (campaignId, userId) => {
  if (!campaignId || !userId) return null;
  const campaign = await Campaign.findById(campaignId).select("createdBy members").lean();
  if (!campaign) return null;
  const membership = campaign.members?.find((member) => getUserId(member.userId) === userId);
  if (!membership) return null;
  return {
    campaign,
    role: membership.role,
    isDM: isDMForCampaign(campaign, userId),
  };
};

const getCampaignForUser = async (campaignId, userId) => {
  if (!campaignId || !userId) return null;

  const campaign = await Campaign.findById(campaignId)
    .populate("members.userId", "username")
    .populate("members.characterId", "name class level abilityScores inspiration armorClass attackBonus proficiencyBonus spellcasting skills savingThrows");
  if (!campaign) return null;

  const isMember = campaign.createdBy?.toString?.() === userId ||
    campaign.members.some((member) => getUserId(member.userId) === userId);

  return isMember ? campaign : null;
};

const createDefaultEncounter = (campaign) => {
  const playerMembers = (campaign.members || []).filter((member) => member.role === "Player");
  const tokens = playerMembers.map((member, index) => {
    const memberId = getUserId(member.userId);
    const character = member.characterId;
    const initiativeRoll = Math.floor(Math.random() * 20) + 1;
    const level = character?.level || 1;

    return {
      tokenId: `player-${memberId || index + 1}`,
      name: character?.name || member.userId?.username || `Player ${index + 1}`,
      type: "Player",
      role: character?.class || "Adventurer",
      hp: 10 + level * 2,
      maxHp: 10 + level * 2,
      distanceFeet: 0,
      position: {
        x: (index % 6) + 1,
        y: clamp(4 - Math.floor(index / 6), 1, 4),
      },
      status: "Ready",
      color: "#c9a84c",
      ownerUserId: memberId || null,
      characterId: character?._id || null,
      characterStats: character ? {
        abilityScores: character.abilityScores,
        inspiration: character.inspiration,
        armorClass: character.armorClass,
        attackBonus: character.attackBonus,
        proficiencyBonus: character.proficiencyBonus,
        spellcasting: character.spellcasting,
        skills: character.skills,
        savingThrows: character.savingThrows,
      } : undefined,
      initiative: initiativeRoll,
      lastInitiativeRoll: initiativeRoll,
      movementSpeed: 30,
      movementRemaining: 30,
      actionAvailable: true,
      bonusActionAvailable: false,
      reactionAvailable: true,
      objectInteractionAvailable: true,
    };
  });

  return {
    isReady: false,
    grid: { cols: 6, rows: 4 },
    tokens,
    initiativeOrder: tokens
      .slice()
      .sort((a, b) => (b.initiative ?? 0) - (a.initiative ?? 0))
      .map((token) => token.tokenId),
    activeTokenId: tokens[0]?.tokenId || "",
    round: 1,
    log: ["Encounter room created."],
    updatedAt: new Date(),
  };
};

const ensureEncounterState = (campaign) => {
  if (!campaign.encounter || !Array.isArray(campaign.encounter.tokens) || campaign.encounter.tokens.length === 0) {
    campaign.encounter = createDefaultEncounter(campaign);
  }

  const encounter = campaign.encounter;
  if (!encounter.grid) encounter.grid = { cols: 6, rows: 4 };
  if (!Array.isArray(encounter.tokens)) encounter.tokens = [];
  if (!Array.isArray(encounter.initiativeOrder)) encounter.initiativeOrder = [];
  if (!encounter.activeTokenId && encounter.initiativeOrder.length > 0) {
    encounter.activeTokenId = encounter.initiativeOrder[0];
  }
  encounter.round = encounter.round || 1;
  encounter.updatedAt = new Date();
  return encounter;
};

const sanitizeEncounter = (encounter) => {
  const plain = typeof encounter?.toObject === "function" ? encounter.toObject() : encounter;
  return JSON.parse(JSON.stringify(plain || {}));
};

const sortInitiative = (encounter) => {
  encounter.initiativeOrder = (encounter.tokens || [])
    .slice()
    .sort((a, b) => (b.initiative ?? 0) - (a.initiative ?? 0))
    .map((token) => token.tokenId);
  if (!encounter.activeTokenId || !encounter.initiativeOrder.includes(encounter.activeTokenId)) {
    encounter.activeTokenId = encounter.initiativeOrder[0] || "";
  }
};

const emitEncounterState = (campaignId, encounter) => {
  io.to(`campaign:${campaignId}`).emit("encounter:state", {
    campaignId,
    encounter: sanitizeEncounter(encounter),
  });
};

const pushEncounterLog = (campaignId, encounter, message, { broadcastToChat = false } = {}) => {
  const timestampedMessage = `${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${message}`;
  encounter.log = [timestampedMessage, ...(encounter.log || [])].slice(0, 80);
  if (broadcastToChat) {
    io.to(`campaign:${campaignId}`).emit("chat-message", {
      campaignId,
      userId: "system",
      username: "Encounter",
      message,
      timestamp: new Date().toISOString(),
    });
  }
};

const getTokenOwnerId = (token) => token?.ownerUserId?.toString?.() || token?.ownerUserId || "";
const getControlledToken = (encounter, userId) =>
  (encounter.tokens || []).find((token) => getTokenOwnerId(token) === userId) || null;
const getActiveToken = (encounter) =>
  (encounter.tokens || []).find((token) => token.tokenId === encounter.activeTokenId) || null;
const getTokenDistance = (token) => Number.isFinite(token?.distanceFeet) ? token.distanceFeet : 30;
const getStrengthModifier = (token) =>
  Math.floor(((Number(token?.characterStats?.abilityScores?.strength) || 10) - 10) / 2);

const defaultEnemyTemplates = [
  { name: "Enemy Skirmisher", role: "Enemy", hp: 12, maxHp: 12, color: "#b13d30", distanceFeet: 30 },
  { name: "Enemy Guard", role: "Enemy", hp: 16, maxHp: 16, color: "#8f332b", distanceFeet: 35 },
  { name: "Enemy Brute", role: "Enemy", hp: 22, maxHp: 22, color: "#6f4534", distanceFeet: 40 },
];

const canActOnTurn = (campaign, encounter, userId) => {
  if (isDMForCampaign(campaign, userId)) return true;
  const activeToken = getActiveToken(encounter);
  return Boolean(activeToken && getTokenOwnerId(activeToken) === userId);
};

const advanceEncounterTurn = async ({ campaignId, userId, allowPlayerAdvance = false }) => {
  const campaign = await getCampaignForUser(campaignId, userId);
  if (!campaign) return null;

  const encounter = ensureEncounterState(campaign);
  sortInitiative(encounter);
  const order = encounter.initiativeOrder || [];
  if (order.length === 0) return { campaign, encounter };

  const activeOwnerId = getTokenOwnerId(getActiveToken(encounter));
  const canAdvance = allowPlayerAdvance
    ? (activeOwnerId ? activeOwnerId === userId : isDMForCampaign(campaign, userId))
    : isDMForCampaign(campaign, userId);
  if (!canAdvance) return null;

  const currentIndex = order.indexOf(encounter.activeTokenId);
  const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % order.length;
  if (currentIndex >= 0 && nextIndex === 0) encounter.round = (encounter.round || 1) + 1;

  encounter.activeTokenId = order[nextIndex];
  const nextActive = getActiveToken(encounter);
  if (nextActive) {
    const speed = Number.isFinite(nextActive.movementSpeed) ? nextActive.movementSpeed : 30;
    nextActive.movementRemaining = speed;
    nextActive.actionAvailable = true;
    nextActive.bonusActionAvailable = false;
    nextActive.reactionAvailable = true;
    pushEncounterLog(campaignId, encounter, `Round ${encounter.round}: ${nextActive.name}'s turn.`);
  }

  campaign.markModified("encounter");
  await campaign.save();
  return { campaign, encounter };
};

io.on("connection", (socket) => {
  socket.on("joinSession", async ({ sessionId }, ack) => {
    try {
      if (!sessionId) return ack?.({ ok: false, error: "No sessionId" });

      const authUserId = getSocketAuthUserId(socket);
      if (!authUserId) return ack?.({ ok: false, error: "Invalid or expired token" });

      const session = await Session.findById(sessionId);
      if (!session) return ack?.({ ok: false, error: "Session not found" });

      const campaign = await Campaign.findById(session.campaignId).select("createdBy members").lean();
      const membership = campaign?.members?.find((member) => getUserId(member.userId) === authUserId);
      const party = await Party.findOne({ sessionId }).lean();
      const isInParty = party?.players?.includes(socket.data?.username);

      if (!membership && !isInParty) {
        return ack?.({ ok: false, error: "Access denied" });
      }

      socket.data.sessionId = sessionId;
      socket.data.userId = authUserId;
      socket.data.isDM = isDMForCampaign(campaign, authUserId);
      socket.join(`session:${sessionId}`);
      ack?.({ ok: true, isDM: socket.data.isDM });
    } catch (error) {
      console.error("joinSession error:", error);
      ack?.({ ok: false, error: error.message });
    }
  });

  socket.on("mapState", ({ state }) => {
    if (!socket.data.sessionId || !state) return;
    socket.to(`session:${socket.data.sessionId}`).emit("mapState", { state });
  });

  socket.on("join-room", ({ campaignId, userId }) => {
    if (!campaignId || !userId) {
      socket.emit("room-error", { message: "campaignId and userId are required" });
      return;
    }

    const room = `campaign:${campaignId}`;
    socket.join(room);
    socket.emit("room-joined", { room, campaignId, userId, socketId: socket.id });
    socket.to(room).emit("player-joined", {
      campaignId,
      userId,
      socketId: socket.id,
      joinedAt: new Date().toISOString(),
    });
  });

  socket.on("send-message", ({ campaignId, userId, username, message }) => {
    if (!campaignId || !userId || !message) return;
    io.to(`campaign:${campaignId}`).emit("chat-message", {
      campaignId,
      userId,
      username,
      message,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on("session:state-load", async ({ campaignId, sessionId, userId }) => {
    try {
      if (!campaignId || !sessionId || !userId) return;
      const authUserId = getSocketAuthUserId(socket);
      if (authUserId !== userId) {
        socket.emit("room-error", { message: "Session sync authentication failed." });
        return;
      }
      const membership = await getCampaignMembershipForSocket(campaignId, userId);
      if (!membership) {
        socket.emit("room-error", { message: "Campaign access denied." });
        return;
      }
      const state = sessionRuntimeStates.get(sessionId);
      if (state) {
        socket.emit("session:state", state);
      }
    } catch (error) {
      console.error("Session state load error:", error);
      socket.emit("room-error", { message: "Failed to load live session state." });
    }
  });

  socket.on("session:state-update", async ({ campaignId, sessionId, userId, state }) => {
    try {
      if (!campaignId || !sessionId || !userId || !state) return;
      const authUserId = getSocketAuthUserId(socket);
      if (authUserId !== userId) {
        socket.emit("room-error", { message: "Session sync authentication failed." });
        return;
      }
      const membership = await getCampaignMembershipForSocket(campaignId, userId);
      if (!membership?.isDM) {
        socket.emit("room-error", { message: "Only the DM can update live session state." });
        return;
      }
      const nextState = {
        ...state,
        campaignId,
        sessionId,
        updatedAt: new Date().toISOString(),
      };
      sessionRuntimeStates.set(sessionId, nextState);
      io.to(`campaign:${campaignId}`).emit("session:state", nextState);
    } catch (error) {
      console.error("Session state update error:", error);
      socket.emit("room-error", { message: "Failed to update live session state." });
    }
  });

  socket.on("session:lobby-joined", ({ campaignId, sessionId, userId }) => {
    if (!campaignId || !sessionId || !userId) return;
    io.to(`campaign:${campaignId}`).emit("session:lobby-updated", {
      campaignId,
      sessionId,
      userId,
      updatedAt: new Date().toISOString(),
    });
  });

  socket.on("session:notes-updated", ({ campaignId, sessionId, userId }) => {
    if (!campaignId || !sessionId || !userId) return;
    io.to(`campaign:${campaignId}`).emit("session:notes-updated", {
      campaignId,
      sessionId,
      userId,
      updatedAt: new Date().toISOString(),
    });
  });

  socket.on("encounter:load", async ({ campaignId, userId }) => {
    try {
      const campaign = await getCampaignForUser(campaignId, userId);
      if (!campaign) {
        socket.emit("encounter:error", { message: "Campaign not found or access denied" });
        return;
      }

      const encounter = ensureEncounterState(campaign);
      sortInitiative(encounter);
      campaign.markModified("encounter");
      await campaign.save();

      if (!isDMForCampaign(campaign, userId) && !encounter.isReady) {
        socket.emit("encounter:error", { message: "Encounter is not open yet. Please wait for the DM." });
        return;
      }

      socket.emit("encounter:state", { campaignId, encounter: sanitizeEncounter(encounter) });
    } catch (error) {
      console.error("Encounter load error:", error);
      socket.emit("encounter:error", { message: "Failed to load encounter" });
    }
  });

  socket.on("encounter:place-token", async ({ campaignId, userId, token }) => {
    try {
      const campaign = await getCampaignForUser(campaignId, userId);
      if (!campaign || !isDMForCampaign(campaign, userId)) {
        socket.emit("encounter:error", { message: "Only the DM can place tokens" });
        return;
      }

      const encounter = ensureEncounterState(campaign);
      const cols = encounter.grid?.cols || 6;
      const rows = encounter.grid?.rows || 4;
      const nextToken = {
        tokenId: `token-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        name: token?.name?.trim?.() || "Token",
        type: ["Player", "NPC", "Enemy", "Token"].includes(token?.type) ? token.type : "Token",
        role: token?.role?.trim?.() || "Unit",
        hp: clamp(Number(token?.hp) || 10, 0, 9999),
        maxHp: clamp(Number(token?.maxHp) || 10, 1, 9999),
        position: {
          x: clamp(Number(token?.position?.x) || 1, 1, cols),
          y: clamp(Number(token?.position?.y) || 1, 1, rows),
        },
        status: token?.status?.trim?.() || "Ready",
        color: token?.color?.trim?.() || "#c9a84c",
        ownerUserId: token?.ownerUserId || userId,
        initiative: clamp(Number(token?.initiative) || 0, -99, 999),
        movementSpeed: clamp(Number(token?.movementSpeed) || 30, 0, 120),
        movementRemaining: clamp(Number(token?.movementSpeed) || 30, 0, 120),
        actionAvailable: true,
        bonusActionAvailable: false,
        reactionAvailable: true,
        objectInteractionAvailable: true,
        distanceFeet: token?.type === "Player" ? 0 : 30,
      };

      encounter.tokens.push(nextToken);
      sortInitiative(encounter);
      pushEncounterLog(campaignId, encounter, `${nextToken.name} was placed on the board.`);
      campaign.markModified("encounter");
      await campaign.save();
      emitEncounterState(campaignId, encounter);
    } catch (error) {
      console.error("Encounter place token error:", error);
      socket.emit("encounter:error", { message: "Failed to place token" });
    }
  });

  socket.on("encounter:remove-token", async ({ campaignId, userId, tokenId }) => {
    try {
      const campaign = await getCampaignForUser(campaignId, userId);
      if (!campaign || !isDMForCampaign(campaign, userId)) {
        socket.emit("encounter:error", { message: "Only the DM can remove tokens" });
        return;
      }

      const encounter = ensureEncounterState(campaign);
      const removed = encounter.tokens.find((token) => token.tokenId === tokenId);
      encounter.tokens = encounter.tokens.filter((token) => token.tokenId !== tokenId);
      sortInitiative(encounter);
      if (removed) pushEncounterLog(campaignId, encounter, `${removed.name} was removed from the board.`);
      campaign.markModified("encounter");
      await campaign.save();
      emitEncounterState(campaignId, encounter);
    } catch (error) {
      console.error("Encounter remove token error:", error);
      socket.emit("encounter:error", { message: "Failed to remove token" });
    }
  });

  socket.on("encounter:move-token", async ({ campaignId, userId, tokenId, position }) => {
    try {
      const campaign = await getCampaignForUser(campaignId, userId);
      if (!campaign) return;
      const encounter = ensureEncounterState(campaign);
      if (!isDMForCampaign(campaign, userId) && !encounter.isReady) {
        socket.emit("encounter:error", { message: "Encounter is not open yet. Please wait for the DM." });
        return;
      }

      const token = encounter.tokens.find((item) => item.tokenId === tokenId);
      if (!token) return;
      const isOwner = getTokenOwnerId(token) === userId;
      if (!isDMForCampaign(campaign, userId) && !isOwner) {
        socket.emit("encounter:error", { message: "You can only move tokens you control." });
        return;
      }

      const cols = encounter.grid?.cols || 6;
      const rows = encounter.grid?.rows || 4;
      const nextX = clamp(Number(position?.x) || token.position.x, 1, cols);
      const nextY = clamp(Number(position?.y) || token.position.y, 1, rows);
      const feetCost = (Math.abs(nextX - token.position.x) + Math.abs(nextY - token.position.y)) * 5;
      if (!isDMForCampaign(campaign, userId) && feetCost > 0 && (token.movementRemaining ?? 30) < feetCost) {
        socket.emit("encounter:error", { message: `${token.name} does not have enough movement.` });
        return;
      }

      token.position = { x: nextX, y: nextY };
      token.movementRemaining = Math.max(0, (token.movementRemaining ?? 30) - feetCost);
      pushEncounterLog(campaignId, encounter, `${token.name} moved to (${nextX}, ${nextY}) spending ${feetCost} ft.`);
      campaign.markModified("encounter");
      await campaign.save();
      emitEncounterState(campaignId, encounter);
    } catch (error) {
      console.error("Encounter move token error:", error);
      socket.emit("encounter:error", { message: "Failed to move token" });
    }
  });

  socket.on("encounter:approach-target", async ({ campaignId, userId, targetTokenId, feet = 5 }) => {
    try {
      const campaign = await getCampaignForUser(campaignId, userId);
      if (!campaign) return;
      const encounter = ensureEncounterState(campaign);
      if (!isDMForCampaign(campaign, userId) && !encounter.isReady) {
        socket.emit("encounter:error", { message: "Encounter is not open yet. Please wait for the DM." });
        return;
      }
      if (!canActOnTurn(campaign, encounter, userId)) {
        socket.emit("encounter:error", { message: "You can only move on your turn." });
        return;
      }

      const actor = getControlledToken(encounter, userId);
      const target = encounter.tokens.find((token) => token.tokenId === targetTokenId);
      if (!actor || !target || actor.tokenId === target.tokenId) return;
      const requestedFeet = clamp(Number(feet) || 5, 5, 30);
      const availableMovement = Number.isFinite(actor.movementRemaining) ? actor.movementRemaining : 30;
      if (availableMovement <= 0) {
        socket.emit("encounter:error", { message: `${actor.name} has no movement remaining.` });
        return;
      }

      const spentFeet = Math.min(requestedFeet, availableMovement);
      actor.movementRemaining = Math.max(0, availableMovement - spentFeet);
      target.distanceFeet = Math.max(0, getTokenDistance(target) - spentFeet);
      pushEncounterLog(campaignId, encounter, `${actor.name} moved ${spentFeet} ft closer to ${target.name}.`);
      campaign.markModified("encounter");
      await campaign.save();
      emitEncounterState(campaignId, encounter);
    } catch (error) {
      console.error("Encounter approach target error:", error);
      socket.emit("encounter:error", { message: "Failed to approach target" });
    }
  });

  socket.on("encounter:use-action", async ({ campaignId, userId, actionType }) => {
    try {
      const campaign = await getCampaignForUser(campaignId, userId);
      if (!campaign) return;
      const encounter = ensureEncounterState(campaign);
      if (!isDMForCampaign(campaign, userId) && !encounter.isReady) {
        socket.emit("encounter:error", { message: "Encounter is not open yet. Please wait for the DM." });
        return;
      }
      if (!canActOnTurn(campaign, encounter, userId)) {
        socket.emit("encounter:error", { message: "You can only use actions on your turn." });
        return;
      }

      const actor = getControlledToken(encounter, userId) || getActiveToken(encounter);
      if (!actor) return;
      if (!actor.actionAvailable) {
        socket.emit("encounter:error", { message: `${actor.name} has already used their action.` });
        return;
      }

      actor.actionAvailable = false;
      const normalizedAction = String(actionType || "action").toLowerCase();
      if (normalizedAction === "dash") {
        actor.movementRemaining = actor.movementSpeed ?? 30;
        pushEncounterLog(campaignId, encounter, `${actor.name} dashed and refreshed their movement.`);
      } else {
        pushEncounterLog(campaignId, encounter, `${actor.name} used ${normalizedAction}.`);
      }

      campaign.markModified("encounter");
      await campaign.save();
      emitEncounterState(campaignId, encounter);
    } catch (error) {
      console.error("Encounter use action error:", error);
      socket.emit("encounter:error", { message: "Failed to use action" });
    }
  });

  socket.on("encounter:unarmed-attack", async ({ campaignId, userId, targetTokenId, resourceType = "action" }) => {
    try {
      const campaign = await getCampaignForUser(campaignId, userId);
      if (!campaign) return;
      const encounter = ensureEncounterState(campaign);
      if (!isDMForCampaign(campaign, userId) && !encounter.isReady) {
        socket.emit("encounter:error", { message: "Encounter is not open yet. Please wait for the DM." });
        return;
      }
      if (!canActOnTurn(campaign, encounter, userId)) {
        socket.emit("encounter:error", { message: "You can only attack on your turn." });
        return;
      }

      const attacker = getControlledToken(encounter, userId) || getActiveToken(encounter);
      const target = encounter.tokens.find((token) => token.tokenId === targetTokenId);
      if (!attacker || !target || attacker.tokenId === target.tokenId) return;
      if (getTokenDistance(target) > 5) {
        socket.emit("encounter:error", { message: `${target.name} is too far away for an unarmed attack.` });
        return;
      }

      const damage = Math.max(0, 1 + getStrengthModifier(attacker));
      target.hp = Math.max(0, (Number.isFinite(target.hp) ? target.hp : 0) - damage);
      if (target.hp === 0) target.status = "Defeated";
      if (String(resourceType).toLowerCase() === "reaction") {
        attacker.reactionAvailable = false;
      } else {
        attacker.actionAvailable = false;
      }

      pushEncounterLog(campaignId, encounter, `${target.name} took ${damage} damage from ${attacker.name}'s unarmed attack.`, { broadcastToChat: true });
      campaign.markModified("encounter");
      await campaign.save();
      emitEncounterState(campaignId, encounter);
    } catch (error) {
      console.error("Encounter unarmed attack error:", error);
      socket.emit("encounter:error", { message: "Failed to resolve attack" });
    }
  });

  socket.on("encounter:update-token", async ({ campaignId, userId, tokenId, updates }) => {
    try {
      const campaign = await getCampaignForUser(campaignId, userId);
      if (!campaign) return;
      const encounter = ensureEncounterState(campaign);
      if (!isDMForCampaign(campaign, userId) && !encounter.isReady) {
        socket.emit("encounter:error", { message: "Encounter is not open yet. Please wait for the DM." });
        return;
      }

      const token = encounter.tokens.find((item) => item.tokenId === tokenId);
      if (!token) return;
      const isDM = isDMForCampaign(campaign, userId);
      const isOwner = getTokenOwnerId(token) === userId;
      if (!isDM && !isOwner) {
        socket.emit("encounter:error", { message: "Not allowed to update this token" });
        return;
      }

      if (typeof updates?.status === "string") token.status = updates.status.slice(0, 200);
      if (updates?.hp !== undefined) token.hp = clamp(Number(updates.hp) || 0, 0, 9999);
      if (updates?.maxHp !== undefined) token.maxHp = clamp(Number(updates.maxHp) || 1, 1, 9999);
      if (updates?.movementRemaining !== undefined) token.movementRemaining = clamp(Number(updates.movementRemaining) || 0, 0, 120);
      if (updates?.actionAvailable !== undefined) token.actionAvailable = Boolean(updates.actionAvailable);
      if (updates?.bonusActionAvailable !== undefined) token.bonusActionAvailable = Boolean(updates.bonusActionAvailable);
      if (updates?.reactionAvailable !== undefined) token.reactionAvailable = Boolean(updates.reactionAvailable);

      if (isDM) {
        if (typeof updates?.name === "string") token.name = updates.name.slice(0, 80) || token.name;
        if (typeof updates?.role === "string") token.role = updates.role.slice(0, 80) || token.role;
        if (typeof updates?.color === "string") token.color = updates.color.slice(0, 24) || token.color;
        if (updates?.movementSpeed !== undefined) token.movementSpeed = clamp(Number(updates.movementSpeed) || 30, 0, 120);
        if (updates?.initiativeBonus !== undefined) token.initiativeBonus = clamp(Number(updates.initiativeBonus) || 0, -20, 20);
      }

      pushEncounterLog(campaignId, encounter, `${token.name} was updated.`);
      campaign.markModified("encounter");
      await campaign.save();
      emitEncounterState(campaignId, encounter);
    } catch (error) {
      console.error("Encounter update token error:", error);
      socket.emit("encounter:error", { message: "Failed to update token" });
    }
  });

  socket.on("encounter:update-initiative", async ({ campaignId, userId, tokenId, initiative }) => {
    try {
      const campaign = await getCampaignForUser(campaignId, userId);
      if (!campaign || !isDMForCampaign(campaign, userId)) {
        socket.emit("encounter:error", { message: "Only the DM can update initiative" });
        return;
      }

      const encounter = ensureEncounterState(campaign);
      const token = encounter.tokens.find((item) => item.tokenId === tokenId);
      if (!token) return;
      token.initiative = clamp(Number(initiative) || 0, -99, 999);
      sortInitiative(encounter);
      pushEncounterLog(campaignId, encounter, `${token.name} initiative set to ${token.initiative}.`);
      campaign.markModified("encounter");
      await campaign.save();
      emitEncounterState(campaignId, encounter);
    } catch (error) {
      console.error("Encounter initiative error:", error);
      socket.emit("encounter:error", { message: "Failed to update initiative" });
    }
  });

  socket.on("encounter:next-turn", async ({ campaignId, userId }) => {
    try {
      const result = await advanceEncounterTurn({ campaignId, userId, allowPlayerAdvance: false });
      if (!result) {
        socket.emit("encounter:error", { message: "Only the DM can advance turns" });
        return;
      }
      emitEncounterState(campaignId, result.encounter);
    } catch (error) {
      console.error("Encounter next turn error:", error);
      socket.emit("encounter:error", { message: "Failed to advance turn" });
    }
  });

  socket.on("encounter:end-turn", async ({ campaignId, userId }) => {
    try {
      const result = await advanceEncounterTurn({ campaignId, userId, allowPlayerAdvance: true });
      if (!result) {
        socket.emit("encounter:error", { message: "You can only end your own turn." });
        return;
      }
      emitEncounterState(campaignId, result.encounter);
    } catch (error) {
      console.error("Encounter end turn error:", error);
      socket.emit("encounter:error", { message: "Failed to end turn" });
    }
  });

  socket.on("encounter:reset", async ({ campaignId, userId }) => {
    try {
      const campaign = await getCampaignForUser(campaignId, userId);
      if (!campaign || !isDMForCampaign(campaign, userId)) {
        socket.emit("encounter:error", { message: "Only the DM can reset the encounter" });
        return;
      }

      campaign.encounter = createDefaultEncounter(campaign);
      campaign.markModified("encounter");
      await campaign.save();
      emitEncounterState(campaignId, campaign.encounter);
    } catch (error) {
      console.error("Encounter reset error:", error);
      socket.emit("encounter:error", { message: "Failed to reset encounter" });
    }
  });

  socket.on("encounter:add-default-enemies", async ({ campaignId, userId }) => {
    try {
      const campaign = await getCampaignForUser(campaignId, userId);
      if (!campaign || !isDMForCampaign(campaign, userId)) {
        socket.emit("encounter:error", { message: "Only the DM can add default enemies" });
        return;
      }

      const encounter = ensureEncounterState(campaign);
      const existingEnemyNames = new Set((encounter.tokens || [])
        .filter((token) => token.type === "Enemy")
        .map((token) => token.name));
      const newTokens = defaultEnemyTemplates
        .filter((template) => !existingEnemyNames.has(template.name))
        .map((template, index) => {
          const initiativeRoll = Math.floor(Math.random() * 20) + 1;
          return {
            tokenId: `enemy-${Date.now()}-${index}-${Math.floor(Math.random() * 10000)}`,
            ...template,
            type: "Enemy",
            position: { x: 4 + index, y: 1 },
            ownerUserId: null,
            initiative: initiativeRoll,
            lastInitiativeRoll: initiativeRoll,
            movementSpeed: 30,
            movementRemaining: 30,
            actionAvailable: true,
            bonusActionAvailable: false,
            reactionAvailable: true,
            objectInteractionAvailable: true,
          };
        });

      if (newTokens.length === 0) {
        socket.emit("encounter:error", { message: "Default enemies are already added." });
        return;
      }

      encounter.tokens.push(...newTokens);
      sortInitiative(encounter);
      pushEncounterLog(campaignId, encounter, `${newTokens.length} default enemy token${newTokens.length === 1 ? "" : "s"} added.`);
      campaign.markModified("encounter");
      await campaign.save();
      emitEncounterState(campaignId, encounter);
    } catch (error) {
      console.error("Encounter add default enemies error:", error);
      socket.emit("encounter:error", { message: "Failed to add default enemies" });
    }
  });

  socket.on("encounter:log-roll", ({ campaignId, userId, label, expression, total, breakdown }) => {
    if (!campaignId || !userId) return;
    io.to(`campaign:${campaignId}`).emit("chat-message", {
      campaignId,
      userId,
      username: "Dice",
      message: `${label || "Roll"} (${expression}): ${total}${breakdown ? ` [${breakdown}]` : ""}`,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on("encounter:level-up-all", async ({ campaignId, userId }) => {
    try {
      const campaign = await getCampaignForUser(campaignId, userId);
      if (!campaign || !isDMForCampaign(campaign, userId)) {
        socket.emit("encounter:error", { message: "Only the DM can trigger level up" });
        return;
      }

      io.to(`campaign:${campaignId}`).emit("encounter:level-up-prompt", {
        campaignId,
        message: "The DM started a party level-up.",
        promptedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Encounter level-up error:", error);
      socket.emit("encounter:error", { message: "Failed to trigger level up" });
    }
  });

  socket.on("encounter:set-ready", async ({ campaignId, userId, isReady }) => {
    try {
      const campaign = await getCampaignForUser(campaignId, userId);
      if (!campaign || !isDMForCampaign(campaign, userId)) {
        socket.emit("encounter:error", { message: "Only the DM can change encounter readiness" });
        return;
      }

      const encounter = ensureEncounterState(campaign);
      encounter.isReady = Boolean(isReady);
      pushEncounterLog(campaignId, encounter, encounter.isReady ? "DM opened the encounter to players." : "DM locked the encounter for prep.");
      campaign.markModified("encounter");
      await campaign.save();
      emitEncounterState(campaignId, encounter);
    } catch (error) {
      console.error("Encounter readiness error:", error);
      socket.emit("encounter:error", { message: "Failed to update encounter readiness" });
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
