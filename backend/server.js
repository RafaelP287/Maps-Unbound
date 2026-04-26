/**
 * Maps Unbound Backend Server
 * 
 * Express.js server with Socket.io WebSocket support for real-time features.
 * Handles REST API routes and WebSocket connections for campaign lobbies.
 * 
 * Key Features:
 * - RESTful API for authentication, campaigns, and characters
 * - Socket.io for real-time lobby communication
 * - MongoDB database integration
 * - CORS enabled for frontend communication
 */

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';              // Required to wrap Express for Socket.io
import { Server } from 'socket.io';   // WebSocket server

import authRoutes from './routes/auth.js';
import campaignRoutes from './routes/campaigns.js';
import characterRoutes from './routes/characters.js';
import Campaign from './models/Campaign.js';

dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 5001;

// Create HTTP server by wrapping Express app (required for Socket.io)
const server = http.createServer(app);

// Initialize Socket.io server with CORS configuration
// Must allow frontend origin for WebSocket connections to succeed
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173', // Frontend URL
    methods: ['GET', 'POST'],
  },
});

  const enrichEncounterTokens = async (encounter) => {
    if (!Array.isArray(encounter?.tokens)) return;
    try {
      const Character = mongoose.model('Character');
      for (let token of encounter.tokens) {
        if (token.characterId) {
          const character = await Character.findById(token.characterId);
          if (character) {
            token.characterStats = {
              abilityScores: character.abilityScores,
              inspiration: character.inspiration,
              armorClass: character.armorClass,
              attackBonus: character.attackBonus,
              proficiencyBonus: character.proficiencyBonus,
              spellcasting: character.spellcasting,
              skills: character.skills,
              savingThrows: character.savingThrows,
            };
          }
        }
      }
    } catch (error) {
      console.error('Error enriching encounter tokens:', error);
    }
  };

// Middleware
app.use(cors());         // Enable CORS for all routes
app.use(express.json({ limit: "15mb" })); // Parse JSON request bodies

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// REST API Routes
app.use('/api/auth', authRoutes);           // Authentication (login/signup)
app.use('/api/campaigns', campaignRoutes);  // Campaign CRUD and party finder
app.use('/api/characters', characterRoutes); // Character management

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Maps Unbound API' });
});

/**
 * Socket.io Connection Handler
 * 
 * Manages real-time WebSocket connections for campaign lobbies.
 * Each campaign has an isolated room (campaign:<campaignId>) for private communication.
 * 
 * Supported Events:
 * - 'join-room': Player joins a campaign lobby
 * - 'send-message': Player sends a chat message
 * - 'disconnect': Player disconnects from server
 */
io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const getCampaignForUser = async (campaignId, userId) => {
    if (!campaignId || !userId) return null;

    const campaign = await Campaign.findById(campaignId)
      .populate('members.userId', 'username')
      .populate('members.characterId', 'name class level');
    if (!campaign) return null;

    const isMember = campaign.createdBy?.toString() === userId ||
      campaign.members.some((m) => {
        const memberId = m.userId?._id?.toString?.() || m.userId?.toString?.();
        return memberId === userId;
      });

    if (!isMember) return null;
    return campaign;
  };

  const isDMForCampaign = (campaign, userId) => {
    if (!campaign || !userId) return false;

    if (campaign.createdBy?.toString() === userId) return true;

    return campaign.members.some((member) => {
      const memberId = member.userId?._id?.toString?.() || member.userId?.toString?.();
      return memberId === userId && member.role === 'DM';
    });
  };

  const createDefaultEncounter = (campaign) => {
    const playerMembers = campaign.members.filter((member) => member.role === 'Player');

    const generatedPlayerTokens = playerMembers.map((member, index) => {
      const memberId = member.userId?._id?.toString?.() || member.userId?.toString?.() || '';
      const characterName = member.characterId?.name;
      const className = member.characterId?.class || 'Adventurer';
      const level = member.characterId?.level || 1;
      const initiativeRoll = Math.floor(Math.random() * 20) + 1;

      return {
        tokenId: `player-${memberId || index + 1}`,
        name: characterName || member.userId?.username || `Player ${index + 1}`,
        type: 'Player',
        role: className,
        hp: 10 + level * 2,
        maxHp: 10 + level * 2,
        distanceFeet: 0,
        position: {
          x: (index % 6) + 1,
          y: clamp(4 - Math.floor(index / 6), 1, 4),
        },
        status: 'Ready',
        color: '#c9a84c',
        ownerUserId: memberId || null,
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

    const tokens = generatedPlayerTokens;

    if (tokens.length > 0) {
      tokens.forEach((token) => {
        if ((token.initiative ?? 0) > 0 || (token.lastInitiativeRoll ?? 0) > 0) return;
        const roll = Math.floor(Math.random() * 20) + 1;
        token.lastInitiativeRoll = roll;
        token.initiative = roll + (token.initiativeBonus ?? 0);
      });
    }

    return {
      isReady: false,
      grid: { cols: 6, rows: 4 },
      tokens,
      initiativeOrder: tokens
        .slice()
        .sort((a, b) => (b.initiative ?? 0) - (a.initiative ?? 0))
        .map((t) => t.tokenId),
      activeTokenId: tokens
        .slice()
        .sort((a, b) => (b.initiative ?? 0) - (a.initiative ?? 0))[0]?.tokenId || '',
      round: 1,
      log: ['Encounter initialized.'],
      updatedAt: new Date(),
    };
  };

  const defaultEnemyTemplates = [
    {
      name: 'Raid Leader',
      role: 'Enemy',
      hp: 20,
      maxHp: 20,
      distanceFeet: 30,
      position: { x: 5, y: 2 },
      color: '#b13d30',
    },
    {
      name: 'Raid Stalker',
      role: 'Enemy',
      hp: 16,
      maxHp: 16,
      distanceFeet: 40,
      position: { x: 4, y: 3 },
      color: '#8f3b55',
    },
    {
      name: 'Raid Brute',
      role: 'Enemy',
      hp: 24,
      maxHp: 24,
      distanceFeet: 50,
      position: { x: 3, y: 3 },
      color: '#7d2c2c',
    },
  ];

  const resetEncounterTokens = (encounter) => {
    const tokens = Array.isArray(encounter?.tokens) ? encounter.tokens : [];

    encounter.round = 1;
    encounter.initiativeOrder = [];
    encounter.activeTokenId = '';

    tokens.forEach((token) => {
      const hp = Number.isFinite(token.maxHp) ? token.maxHp : Number(token.hp) || 0;
      const movementSpeed = Number.isFinite(token.movementSpeed) ? token.movementSpeed : 30;
      const initiativeRoll = Math.floor(Math.random() * 20) + 1;

      token.hp = hp;
      token.status = token.type === 'Player' ? 'Ready' : 'Watching';
      token.movementRemaining = movementSpeed;
      token.actionAvailable = true;
      token.bonusActionAvailable = false;
      token.reactionAvailable = true;
      token.objectInteractionAvailable = true;
      token.lastInitiativeRoll = initiativeRoll;
      token.initiative = initiativeRoll + (token.initiativeBonus ?? 0);
      token.distanceFeet = token.type === 'Player' ? 0 : (Number.isFinite(token.distanceFeet) ? token.distanceFeet : 30);
    });

    encounter.initiativeOrder = tokens
      .slice()
      .sort((a, b) => (b.initiative ?? 0) - (a.initiative ?? 0))
      .map((token) => token.tokenId);

    encounter.activeTokenId = encounter.initiativeOrder[0] || '';
  };

  const ensureEncounterState = async (campaign) => {
    const hasTokens = Array.isArray(campaign.encounter?.tokens) && campaign.encounter.tokens.length > 0;

    if (!hasTokens) {
      campaign.encounter = createDefaultEncounter(campaign);
      campaign.markModified('encounter');
      await campaign.save();
    }

    // Hydrate defaults for older encounter records.
    let touched = false;
    if (campaign.encounter?.isReady === undefined) {
      campaign.encounter.isReady = false;
      touched = true;
    }
    campaign.encounter.tokens = (campaign.encounter.tokens || []).map((token) => {
      const movementSpeed = Number.isFinite(token.movementSpeed) ? token.movementSpeed : 30;
      const movementRemaining = Number.isFinite(token.movementRemaining) ? token.movementRemaining : movementSpeed;
      const distanceFeet = Number.isFinite(token.distanceFeet)
        ? token.distanceFeet
        : (token.type === 'Player' ? 0 : 30);
      if (
        token.movementSpeed === undefined ||
        token.movementRemaining === undefined ||
        token.actionAvailable === undefined ||
        token.bonusActionAvailable === undefined ||
        token.distanceFeet === undefined
      ) {
        touched = true;
      }
      return {
        ...token,
        movementSpeed,
        movementRemaining,
        actionAvailable: token.actionAvailable ?? true,
        bonusActionAvailable: token.bonusActionAvailable ?? false,
        distanceFeet,
        characterStats: token.characterStats || null,
      };
    });

    const hasAutoInitiative = campaign.encounter.tokens.some((token) => (token.initiative ?? 0) > 0 || (token.lastInitiativeRoll ?? 0) > 0);
    if (!hasAutoInitiative && campaign.encounter.tokens.length > 0) {
      campaign.encounter.tokens = campaign.encounter.tokens.map((token) => {
        const roll = Math.floor(Math.random() * 20) + 1;
        return {
          ...token,
          initiative: roll + (token.initiativeBonus ?? 0),
          lastInitiativeRoll: roll,
        };
      });
      touched = true;
    }

    if (touched) {
      campaign.markModified('encounter');
      await campaign.save();
    }

    return campaign.encounter;
  };

  const sanitizeEncounter = (encounter) => ({
    isReady: Boolean(encounter?.isReady),
    grid: {
      cols: encounter?.grid?.cols || 6,
      rows: encounter?.grid?.rows || 4,
    },
    tokens: Array.isArray(encounter?.tokens)
      ? encounter.tokens.map((token) => ({
        tokenId: token.tokenId,
        name: token.name,
        type: token.type,
        role: token.role,
        hp: token.hp,
        maxHp: token.maxHp,
        position: {
          x: token.position?.x || 1,
          y: token.position?.y || 1,
        },
        status: token.status,
        color: token.color,
        ownerUserId: token.ownerUserId?.toString?.() || token.ownerUserId || null,
        initiative: token.initiative ?? 0,
        lastInitiativeRoll: token.lastInitiativeRoll ?? 0,
        movementSpeed: token.movementSpeed ?? 30,
        movementRemaining: token.movementRemaining ?? token.movementSpeed ?? 30,
        actionAvailable: token.actionAvailable ?? true,
        bonusActionAvailable: token.bonusActionAvailable ?? false,
        reactionAvailable: token.reactionAvailable ?? true,
        objectInteractionAvailable: token.objectInteractionAvailable ?? true,
        distanceFeet: token.distanceFeet ?? 30,
      }))
      : [],
    initiativeOrder: Array.isArray(encounter?.initiativeOrder) ? encounter.initiativeOrder : [],
    activeTokenId: encounter?.activeTokenId || '',
    round: encounter?.round || 1,
    log: Array.isArray(encounter?.log) ? encounter.log.slice(0, 30) : [],
    updatedAt: encounter?.updatedAt,
  });

  const emitEncounterState = async (campaignId, encounter) => {
    await enrichEncounterTokens(encounter);
    const room = `campaign:${campaignId}`;
    io.to(room).emit('encounter:state', {
      campaignId,
      encounter: sanitizeEncounter(encounter),
    });
  };

  const broadcastEncounterChat = (campaignId, message) => {
    const room = `campaign:${campaignId}`;
    io.to(room).emit('chat-message', {
      campaignId,
      userId: 'system',
      username: 'Encounter',
      message,
      timestamp: new Date().toISOString(),
      system: true,
    });
  };

  const shouldBroadcastEncounterLog = (message) => /\b(took|healed|damage|knocked out)\b/i.test(String(message));

  const pushEncounterLog = (campaignId, encounter, message, { broadcastToChat = false } = {}) => {
    const next = Array.isArray(encounter.log) ? encounter.log : [];
    encounter.log = [message, ...next].slice(0, 30);
    encounter.updatedAt = new Date();
    if (broadcastToChat || shouldBroadcastEncounterLog(message)) {
      broadcastEncounterChat(campaignId, message);
    }
  };

  const getTokenOwnerId = (token) => token?.ownerUserId?.toString?.() || token?.ownerUserId || null;

  const getControlledToken = (encounter, userId) => {
    if (!Array.isArray(encounter?.tokens) || !userId) return null;
    return encounter.tokens.find((token) => getTokenOwnerId(token) === userId) || null;
  };

  const getActiveToken = (encounter) => {
    if (!Array.isArray(encounter?.tokens)) return null;
    return encounter.tokens.find((token) => token.tokenId === encounter.activeTokenId) || null;
  };

  const canActOnTurn = (campaign, encounter, userId) => {
    const activeToken = getActiveToken(encounter);
    if (!activeToken) return false;

    const ownerId = getTokenOwnerId(activeToken);
    if (ownerId) {
      return ownerId === userId;
    }

    return isDMForCampaign(campaign, userId);
  };

  const getStrengthModifier = (token) => {
    const strength = Number(token?.characterStats?.abilityScores?.strength ?? 10);
    if (!Number.isFinite(strength)) return 0;
    return Math.floor((strength - 10) / 2);
  };

  const getTokenDistance = (token) => {
    if (!token) return 9999;
    return Number.isFinite(token.distanceFeet) ? token.distanceFeet : 30;
  };

  const setTokenDistance = (token, distanceFeet) => {
    if (!token) return;
    token.distanceFeet = clamp(Number(distanceFeet) || 0, 0, 9999);
  };

  const sortInitiative = (encounter) => {
    const tokens = Array.isArray(encounter.tokens) ? encounter.tokens : [];
    encounter.initiativeOrder = tokens
      .slice()
      .sort((a, b) => (b.initiative ?? 0) - (a.initiative ?? 0))
      .map((t) => t.tokenId);

    if (!encounter.activeTokenId || !encounter.initiativeOrder.includes(encounter.activeTokenId)) {
      encounter.activeTokenId = encounter.initiativeOrder[0] || '';
    }
  };

  /**
   * Event: 'join-room'
   * Handles player joining a campaign-specific room
   * 
   * @param {string} campaignId - The campaign ID to join
   * @param {string} userId - The user's ID for tracking presence
   * 
   * Emits:
   * - 'room-joined' to the joining player (confirmation)
   * - 'player-joined' to all OTHER players in the room (broadcast)
   */
  socket.on('join-room', ({ campaignId, userId }) => {
    // Validation: Ensure required parameters are provided
    if (!campaignId || !userId) {
      socket.emit('room-error', { message: 'campaignId and userId are required' });
      return;
    }

    // Room naming convention: "campaign:<campaignId>"
    // This isolates each campaign's communication
    const room = `campaign:${campaignId}`;
    
    // Add this socket to the specified room
    socket.join(room);

    // Send confirmation to the user who joined
    socket.emit('room-joined', {
      room,
      campaignId,
      userId,
      socketId: socket.id,
    });

    // Broadcast to all OTHER users in the room that a new player joined
    // socket.to(room) excludes the sender
    socket.to(room).emit('player-joined', {
      campaignId,
      userId,
      socketId: socket.id,
      joinedAt: new Date().toISOString(),
    });
  });

  /**
   * Event: 'disconnect'
   * Fired automatically when a socket connection is closed
   * (e.g., user closes browser, loses internet, navigates away)
   */
  socket.on('disconnect', () => {
    console.log(`❌ Socket disconnected: ${socket.id}`);
  });

  /**
   * Event: 'send-message'
   * Handles chat messages sent by players in a campaign lobby
   * 
   * @param {string} campaignId - Which campaign room to send to
   * @param {string} userId - The sender's user ID
   * @param {string} username - The sender's display name
   * @param {string} message - The message content
   * 
   * Emits:
   * - 'chat-message' to ALL users in the room (including sender)
   */
  socket.on('send-message', ({ campaignId, userId, username, message }) => {
    // Validation: Ensure required fields are present
    if (!campaignId || !userId || !message) {
      return;
    }

    const room = `campaign:${campaignId}`;
    
    // Broadcast message to ALL users in the room (io.to includes sender)
    io.to(room).emit('chat-message', {
      campaignId,
      userId,
      username,
      message,
      timestamp: new Date().toISOString(), // Server-side timestamp
    });
  });

  socket.on('encounter:approach-target', async ({ campaignId, userId, targetTokenId, feet = 5 }) => {
    try {
      const campaign = await getCampaignForUser(campaignId, userId);
      if (!campaign) return;

      const encounter = await ensureEncounterState(campaign);
      if (!isDMForCampaign(campaign, userId) && !encounter.isReady) {
        socket.emit('encounter:error', { message: 'Encounter is not open yet. Please wait for the DM.' });
        return;
      }

      if (!canActOnTurn(campaign, encounter, userId)) {
        socket.emit('encounter:error', { message: 'You can only move on your turn.' });
        return;
      }

      const actor = getControlledToken(encounter, userId);
      const target = encounter.tokens.find((token) => token.tokenId === targetTokenId);
      if (!actor || !target || actor.tokenId === target.tokenId) return;

      const requestedFeet = clamp(Number(feet) || 5, 5, 30);
      const availableMovement = Number.isFinite(actor.movementRemaining) ? actor.movementRemaining : 30;
      if (availableMovement <= 0) {
        socket.emit('encounter:error', { message: `${actor.name} has no movement remaining.` });
        return;
      }

      const spentFeet = Math.min(requestedFeet, availableMovement);
      actor.movementRemaining = Math.max(0, availableMovement - spentFeet);
      target.distanceFeet = Math.max(0, getTokenDistance(target) - spentFeet);

      pushEncounterLog(
        campaignId,
        encounter,
        `${actor.name} moved ${spentFeet} ft closer to ${target.name}. ${target.name} is now ${target.distanceFeet} ft away.`
      );

      campaign.markModified('encounter');
      await campaign.save();
      emitEncounterState(campaignId, encounter);
    } catch (error) {
      console.error('Encounter approach target error:', error);
      socket.emit('encounter:error', { message: 'Failed to approach target' });
    }
  });

  socket.on('encounter:use-action', async ({ campaignId, userId, actionType, targetTokenId }) => {
    try {
      const campaign = await getCampaignForUser(campaignId, userId);
      if (!campaign) return;

      const encounter = await ensureEncounterState(campaign);
      if (!isDMForCampaign(campaign, userId) && !encounter.isReady) {
        socket.emit('encounter:error', { message: 'Encounter is not open yet. Please wait for the DM.' });
        return;
      }

      if (!canActOnTurn(campaign, encounter, userId)) {
        socket.emit('encounter:error', { message: 'You can only use actions on your turn.' });
        return;
      }

      const actor = getControlledToken(encounter, userId);
      if (!actor) return;

      if (!actor.actionAvailable) {
        socket.emit('encounter:error', { message: `${actor.name} has already used their action.` });
        return;
      }

      const normalizedAction = String(actionType || '').toLowerCase();
      actor.actionAvailable = false;

      if (normalizedAction === 'dash') {
        actor.movementRemaining = actor.movementSpeed ?? 30;
        pushEncounterLog(campaignId, encounter, `${actor.name} dashed and refreshed their movement.`);
      } else if (normalizedAction === 'hide') {
        actor.status = 'Hidden';
        pushEncounterLog(campaignId, encounter, `${actor.name} took the Hide action.`);
      } else if (normalizedAction === 'help') {
        pushEncounterLog(campaignId, encounter, `${actor.name} used Help.`);
      } else if (normalizedAction === 'disengage') {
        pushEncounterLog(campaignId, encounter, `${actor.name} disengaged from combat.`);
      } else {
        pushEncounterLog(campaignId, encounter, `${actor.name} used an action.`);
      }

      campaign.markModified('encounter');
      await campaign.save();
      emitEncounterState(campaignId, encounter);
    } catch (error) {
      console.error('Encounter use action error:', error);
      socket.emit('encounter:error', { message: 'Failed to use action' });
    }
  });

  socket.on('encounter:unarmed-attack', async ({ campaignId, userId, targetTokenId, resourceType = 'action' }) => {
    try {
      const campaign = await getCampaignForUser(campaignId, userId);
      if (!campaign) return;

      const encounter = await ensureEncounterState(campaign);
      if (!isDMForCampaign(campaign, userId) && !encounter.isReady) {
        socket.emit('encounter:error', { message: 'Encounter is not open yet. Please wait for the DM.' });
        return;
      }

      if (!canActOnTurn(campaign, encounter, userId)) {
        socket.emit('encounter:error', { message: 'You can only attack on your turn.' });
        return;
      }

      const attacker = getControlledToken(encounter, userId);
      const target = encounter.tokens.find((token) => token.tokenId === targetTokenId);
      if (!attacker || !target || attacker.tokenId === target.tokenId) return;

      if (getTokenDistance(target) > 5) {
        socket.emit('encounter:error', { message: `${target.name} is too far away for an unarmed attack.` });
        return;
      }

      const strengthModifier = getStrengthModifier(attacker);
      const damage = Math.max(0, 1 + strengthModifier);
      const nextHp = Math.max(0, (Number.isFinite(target.hp) ? target.hp : 0) - damage);
      target.hp = nextHp;
      if (nextHp === 0) {
        target.status = 'Defeated';
      }

      if (String(resourceType).toLowerCase() === 'reaction') {
        attacker.reactionAvailable = false;
      } else {
        attacker.actionAvailable = false;
      }

      const attackLabel = String(resourceType).toLowerCase() === 'reaction' ? 'opportunity attack' : 'unarmed attack';
      pushEncounterLog(campaignId, encounter, `${target.name} has taken ${damage} damage from ${attacker.name}'s ${attackLabel}.`, { broadcastToChat: true });
      if (nextHp === 0) {
        pushEncounterLog(campaignId, encounter, `${target.name} was knocked out.`, { broadcastToChat: true });
      }

      campaign.markModified('encounter');
      await campaign.save();
      emitEncounterState(campaignId, encounter);
    } catch (error) {
      console.error('Encounter unarmed attack error:', error);
      socket.emit('encounter:error', { message: 'Failed to resolve attack' });
    }
  });

  socket.on('encounter:load', async ({ campaignId, userId }) => {
    try {
      const campaign = await getCampaignForUser(campaignId, userId);
      if (!campaign) {
        socket.emit('encounter:error', { message: 'Campaign not found or access denied' });
        return;
      }

      const encounter = await ensureEncounterState(campaign);
      sortInitiative(encounter);
      campaign.markModified('encounter');
      await campaign.save();
      if (!isDMForCampaign(campaign, userId) && !encounter.isReady) {
        socket.emit('encounter:error', { message: 'Encounter is not open yet. Please wait for the DM.' });
        return;
      }
      socket.emit('encounter:state', {
        campaignId,
        encounter: sanitizeEncounter(encounter),
      });
    } catch (error) {
      console.error('Encounter load error:', error);
      socket.emit('encounter:error', { message: 'Failed to load encounter' });
    }
  });

  socket.on('encounter:place-token', async ({ campaignId, userId, token }) => {
    try {
      const campaign = await getCampaignForUser(campaignId, userId);
      if (!campaign) return;
      if (!isDMForCampaign(campaign, userId)) {
        socket.emit('encounter:error', { message: 'Only the DM can place tokens' });
        return;
      }

      const encounter = await ensureEncounterState(campaign);
      const cols = encounter.grid?.cols || 6;
      const rows = encounter.grid?.rows || 4;
      const name = token?.name?.trim?.() || 'Token';

      const nextToken = {
        tokenId: `token-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        name,
        type: ['Player', 'NPC', 'Enemy', 'Token'].includes(token?.type) ? token.type : 'Token',
        role: token?.role?.trim?.() || 'Unit',
        hp: clamp(Number(token?.hp) || 10, 0, 9999),
        maxHp: clamp(Number(token?.maxHp) || 10, 1, 9999),
        position: {
          x: clamp(Number(token?.position?.x) || 1, 1, cols),
          y: clamp(Number(token?.position?.y) || 1, 1, rows),
        },
        status: token?.status?.trim?.() || 'Ready',
        color: token?.color?.trim?.() || '#c9a84c',
        ownerUserId: token?.ownerUserId || userId,
        initiative: clamp(Number(token?.initiative) || 0, -99, 999),
        movementSpeed: clamp(Number(token?.movementSpeed) || 30, 0, 120),
        movementRemaining: clamp(Number(token?.movementSpeed) || 30, 0, 120),
        actionAvailable: true,
        bonusActionAvailable: false,
        reactionAvailable: true,
        objectInteractionAvailable: true,
        distanceFeet: token?.type === 'Player' ? 0 : 30,
      };

      encounter.tokens.push(nextToken);
      sortInitiative(encounter);
      pushEncounterLog(campaignId, encounter, `${nextToken.name} was placed on the board.`);

      campaign.markModified('encounter');
      await campaign.save();
      emitEncounterState(campaignId, encounter);
    } catch (error) {
      console.error('Encounter place token error:', error);
      socket.emit('encounter:error', { message: 'Failed to place token' });
    }
  });

  socket.on('encounter:remove-token', async ({ campaignId, userId, tokenId }) => {
    try {
      const campaign = await getCampaignForUser(campaignId, userId);
      if (!campaign) return;
      if (!isDMForCampaign(campaign, userId)) {
        socket.emit('encounter:error', { message: 'Only the DM can remove tokens' });
        return;
      }

      const encounter = await ensureEncounterState(campaign);
      const removed = encounter.tokens.find((t) => t.tokenId === tokenId);
      encounter.tokens = encounter.tokens.filter((t) => t.tokenId !== tokenId);
      encounter.initiativeOrder = (encounter.initiativeOrder || []).filter((id) => id !== tokenId);
      if (encounter.activeTokenId === tokenId) {
        encounter.activeTokenId = encounter.initiativeOrder[0] || '';
      }

      if (removed) {
        pushEncounterLog(campaignId, encounter, `${removed.name} was removed from the board.`);
      }

      campaign.markModified('encounter');
      await campaign.save();
      emitEncounterState(campaignId, encounter);
    } catch (error) {
      console.error('Encounter remove token error:', error);
      socket.emit('encounter:error', { message: 'Failed to remove token' });
    }
  });

  socket.on('encounter:move-token', async ({ campaignId, userId, tokenId, position }) => {
    try {
      const campaign = await getCampaignForUser(campaignId, userId);
      if (!campaign) return;

      const encounter = await ensureEncounterState(campaign);
      if (!isDMForCampaign(campaign, userId) && !encounter.isReady) {
        socket.emit('encounter:error', { message: 'Encounter is not open yet. Please wait for the DM.' });
        return;
      }
      const token = encounter.tokens.find((t) => t.tokenId === tokenId);
      if (!token) return;

      const ownerId = token.ownerUserId?.toString?.() || token.ownerUserId;
      if (!ownerId || ownerId !== userId) {
        socket.emit('encounter:error', { message: 'You can only move tokens you control.' });
        return;
      }

      const cols = encounter.grid?.cols || 6;
      const rows = encounter.grid?.rows || 4;
      const nextX = clamp(Number(position?.x) || token.position.x, 1, cols);
      const nextY = clamp(Number(position?.y) || token.position.y, 1, rows);

      const squaresMoved = Math.abs(nextX - token.position.x) + Math.abs(nextY - token.position.y);
      const feetCost = squaresMoved * 5;
      if (feetCost > 0 && (token.movementRemaining ?? 30) < feetCost) {
        socket.emit('encounter:error', { message: `${token.name} does not have enough movement.` });
        return;
      }

      token.position = { x: nextX, y: nextY };
      token.movementRemaining = Math.max(0, (token.movementRemaining ?? 30) - feetCost);
      pushEncounterLog(campaignId, encounter, `${token.name} moved to (${nextX}, ${nextY}) spending ${feetCost} ft.`);

      campaign.markModified('encounter');
      await campaign.save();
      emitEncounterState(campaignId, encounter);
    } catch (error) {
      console.error('Encounter move token error:', error);
      socket.emit('encounter:error', { message: 'Failed to move token' });
    }
  });

  socket.on('encounter:update-token', async ({ campaignId, userId, tokenId, updates }) => {
    try {
      const campaign = await getCampaignForUser(campaignId, userId);
      if (!campaign) return;

      const encounter = await ensureEncounterState(campaign);
      if (!isDMForCampaign(campaign, userId) && !encounter.isReady) {
        socket.emit('encounter:error', { message: 'Encounter is not open yet. Please wait for the DM.' });
        return;
      }
      const token = encounter.tokens.find((t) => t.tokenId === tokenId);
      if (!token) return;

      const isDM = isDMForCampaign(campaign, userId);
      const isOwner = token.ownerUserId?.toString?.() === userId;
      if (!isDM && !isOwner) {
        socket.emit('encounter:error', { message: 'Not allowed to update this token' });
        return;
      }

      const previousHp = token.hp;
      const previousStatus = token.status;

      if (typeof updates?.status === 'string') token.status = updates.status.slice(0, 200);
      if (updates?.hp !== undefined) token.hp = clamp(Number(updates.hp) || 0, 0, 9999);
      if (updates?.maxHp !== undefined) token.maxHp = clamp(Number(updates.maxHp) || 1, 1, 9999);
      if (updates?.movementRemaining !== undefined) token.movementRemaining = clamp(Number(updates.movementRemaining) || 0, 0, 120);
      if (updates?.actionAvailable !== undefined) token.actionAvailable = Boolean(updates.actionAvailable);
      if (updates?.bonusActionAvailable !== undefined) token.bonusActionAvailable = Boolean(updates.bonusActionAvailable);

      if (isDM) {
        if (typeof updates?.name === 'string') token.name = updates.name.slice(0, 80) || token.name;
        if (typeof updates?.role === 'string') token.role = updates.role.slice(0, 80) || token.role;
        if (typeof updates?.color === 'string') token.color = updates.color.slice(0, 24) || token.color;
        if (updates?.movementSpeed !== undefined) {
          token.movementSpeed = clamp(Number(updates.movementSpeed) || 30, 0, 120);
          token.movementRemaining = Math.min(token.movementRemaining, token.movementSpeed);
        }
      }

      let logMessage = `${token.name} was updated.`;
      if (updates?.hp !== undefined && token.hp !== previousHp) {
        const hpDelta = token.hp - previousHp;
        logMessage = hpDelta < 0
          ? `${token.name} took ${Math.abs(hpDelta)} damage.`
          : `${token.name} healed ${hpDelta} HP.`;
      } else if (updates?.status !== undefined && token.status !== previousStatus) {
        logMessage = `${token.name} status changed to ${token.status}.`;
      }

      pushEncounterLog(campaignId, encounter, logMessage);
      campaign.markModified('encounter');
      await campaign.save();
      emitEncounterState(campaignId, encounter);
    } catch (error) {
      console.error('Encounter update token error:', error);
      socket.emit('encounter:error', { message: 'Failed to update token' });
    }
  });

  socket.on('encounter:update-initiative', async ({ campaignId, userId, tokenId, initiative }) => {
    try {
      const campaign = await getCampaignForUser(campaignId, userId);
      if (!campaign) return;
      if (!isDMForCampaign(campaign, userId)) {
        socket.emit('encounter:error', { message: 'Only the DM can update initiative' });
        return;
      }

      const encounter = await ensureEncounterState(campaign);
      const token = encounter.tokens.find((t) => t.tokenId === tokenId);
      if (!token) return;

      token.initiative = clamp(Number(initiative) || 0, -99, 999);
      sortInitiative(encounter);
      pushEncounterLog(campaignId, encounter, `${token.name} initiative set to ${token.initiative}.`);

      campaign.markModified('encounter');
      await campaign.save();
      emitEncounterState(campaignId, encounter);
    } catch (error) {
      console.error('Encounter initiative error:', error);
      socket.emit('encounter:error', { message: 'Failed to update initiative' });
    }
  });

  const advanceEncounterTurn = async ({ campaignId, userId, allowPlayerAdvance = false }) => {
    const campaign = await getCampaignForUser(campaignId, userId);
    if (!campaign) return null;

    const encounter = await ensureEncounterState(campaign);
    const order = encounter.initiativeOrder || [];
    if (order.length === 0) {
      encounter.activeTokenId = '';
      campaign.markModified('encounter');
      await campaign.save();
      return { campaign, encounter };
    }

    const activeToken = getActiveToken(encounter);
    const activeOwnerId = getTokenOwnerId(activeToken);
    const canAdvance = allowPlayerAdvance
      ? (activeOwnerId ? activeOwnerId === userId : isDMForCampaign(campaign, userId))
      : isDMForCampaign(campaign, userId);

    if (!canAdvance) {
      return null;
    }

    const currentIndex = order.indexOf(encounter.activeTokenId);
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % order.length;
    if (currentIndex >= 0 && nextIndex === 0) {
      encounter.round = (encounter.round || 1) + 1;
    }

    encounter.activeTokenId = order[nextIndex];
    const nextActive = encounter.tokens.find((token) => token.tokenId === encounter.activeTokenId);
    if (nextActive) {
      const speed = Number.isFinite(nextActive.movementSpeed) ? nextActive.movementSpeed : 30;
      nextActive.movementRemaining = speed;
      nextActive.actionAvailable = true;
      nextActive.bonusActionAvailable = false;
      nextActive.reactionAvailable = true;
      pushEncounterLog(campaignId, encounter, `Round ${encounter.round}: ${nextActive.name}'s turn.`);
    }

    campaign.markModified('encounter');
    await campaign.save();
    return { campaign, encounter };
  };

  socket.on('encounter:next-turn', async ({ campaignId, userId }) => {
    try {
      const result = await advanceEncounterTurn({ campaignId, userId, allowPlayerAdvance: false });
      if (!result) {
        socket.emit('encounter:error', { message: 'Only the DM can advance turns' });
        return;
      }

      emitEncounterState(campaignId, result.encounter);
    } catch (error) {
      console.error('Encounter next turn error:', error);
      socket.emit('encounter:error', { message: 'Failed to advance turn' });
    }
  });

  socket.on('encounter:end-turn', async ({ campaignId, userId }) => {
    try {
      const result = await advanceEncounterTurn({ campaignId, userId, allowPlayerAdvance: true });
      if (!result) {
        socket.emit('encounter:error', { message: 'You can only end your own turn.' });
        return;
      }

      emitEncounterState(campaignId, result.encounter);
    } catch (error) {
      console.error('Encounter end turn error:', error);
      socket.emit('encounter:error', { message: 'Failed to end turn' });
    }
  });

  socket.on('encounter:reset', async ({ campaignId, userId }) => {
    try {
      const campaign = await getCampaignForUser(campaignId, userId);
      if (!campaign) return;
      if (!isDMForCampaign(campaign, userId)) {
        socket.emit('encounter:error', { message: 'Only the DM can reset the encounter' });
        return;
      }

      const encounter = await ensureEncounterState(campaign);
      resetEncounterTokens(encounter);
      pushEncounterLog(campaignId, encounter, 'Encounter reset. Initiative was rerolled and all tokens were restored.');

      campaign.markModified('encounter');
      await campaign.save();
      emitEncounterState(campaignId, encounter);
    } catch (error) {
      console.error('Encounter reset error:', error);
      socket.emit('encounter:error', { message: 'Failed to reset encounter' });
    }
  });

  socket.on('encounter:set-ready', async ({ campaignId, userId, isReady }) => {
    try {
      const campaign = await getCampaignForUser(campaignId, userId);
      if (!campaign) return;
      if (!isDMForCampaign(campaign, userId)) {
        socket.emit('encounter:error', { message: 'Only the DM can change encounter readiness' });
        return;
      }

      const encounter = await ensureEncounterState(campaign);
      encounter.isReady = Boolean(isReady);
      pushEncounterLog(campaignId, encounter, encounter.isReady ? 'DM opened the encounter to players.' : 'DM locked the encounter for prep.');

      campaign.markModified('encounter');
      await campaign.save();
      emitEncounterState(campaignId, encounter);
    } catch (error) {
      console.error('Encounter readiness error:', error);
      socket.emit('encounter:error', { message: 'Failed to update encounter readiness' });
    }
  });

  socket.on('encounter:add-default-enemies', async ({ campaignId, userId }) => {
    try {
      const campaign = await getCampaignForUser(campaignId, userId);
      if (!campaign) return;
      if (!isDMForCampaign(campaign, userId)) {
        socket.emit('encounter:error', { message: 'Only the DM can add default enemies' });
        return;
      }

      const encounter = await ensureEncounterState(campaign);
      if (encounter.isReady) {
        socket.emit('encounter:error', { message: 'Default enemies can only be added before the encounter starts.' });
        return;
      }

      const existingEnemyNames = new Set((encounter.tokens || [])
        .filter((token) => token.type === 'Enemy')
        .map((token) => token.name));

      const newTokens = defaultEnemyTemplates
        .filter((template) => !existingEnemyNames.has(template.name))
        .map((template, index) => ({
          tokenId: `enemy-${Date.now()}-${index}-${Math.floor(Math.random() * 10000)}`,
          name: template.name,
          type: 'Enemy',
          role: template.role,
          hp: template.hp,
          maxHp: template.maxHp,
          distanceFeet: template.distanceFeet,
          position: template.position,
          status: 'Watching',
          color: template.color,
          ownerUserId: null,
          initiative: (() => {
            const roll = Math.floor(Math.random() * 20) + 1;
            return roll;
          })(),
          lastInitiativeRoll: 0,
          movementSpeed: 30,
          movementRemaining: 30,
          actionAvailable: true,
          bonusActionAvailable: false,
          reactionAvailable: true,
          objectInteractionAvailable: true,
        }));

      if (newTokens.length === 0) {
        socket.emit('encounter:error', { message: 'Default enemies are already added.' });
        return;
      }

      newTokens.forEach((token) => {
        token.lastInitiativeRoll = token.initiative;
      });

      encounter.tokens.push(...newTokens);
      sortInitiative(encounter);
      pushEncounterLog(campaignId, encounter, `${newTokens.length} default enemy token${newTokens.length === 1 ? '' : 's'} added.`);

      campaign.markModified('encounter');
      await campaign.save();
      emitEncounterState(campaignId, encounter);
    } catch (error) {
      console.error('Encounter add default enemies error:', error);
      socket.emit('encounter:error', { message: 'Failed to add default enemies' });
    }
  });
});

// Start HTTP server (handles both Express routes and Socket.io connections)
// IMPORTANT: Must use 'server.listen()' not 'app.listen()' for Socket.io to work
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
