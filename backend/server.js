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

      return {
        tokenId: `player-${memberId || index + 1}`,
        name: characterName || member.userId?.username || `Player ${index + 1}`,
        type: 'Player',
        role: className,
        hp: 10 + level * 2,
        maxHp: 10 + level * 2,
        position: {
          x: (index % 6) + 1,
          y: clamp(4 - Math.floor(index / 6), 1, 4),
        },
        status: 'Ready',
        color: '#c9a84c',
        ownerUserId: memberId || null,
        initiative: 0,
        movementSpeed: 30,
        movementRemaining: 30,
        actionAvailable: true,
        bonusActionAvailable: true,
      };
    });

    const fallbackTokens = [
      {
        tokenId: 'enemy-1',
        name: 'Raid Leader',
        type: 'Enemy',
        role: 'Enemy',
        hp: 20,
        maxHp: 20,
        position: { x: 5, y: 2 },
        status: 'Watching',
        color: '#b13d30',
        ownerUserId: null,
        initiative: 0,
        movementSpeed: 30,
        movementRemaining: 30,
        actionAvailable: true,
        bonusActionAvailable: true,
      },
    ];

    const tokens = generatedPlayerTokens.length > 0 ? [...generatedPlayerTokens, ...fallbackTokens] : fallbackTokens;

    return {
      isReady: false,
      grid: { cols: 6, rows: 4 },
      tokens,
      initiativeOrder: tokens.map((t) => t.tokenId),
      activeTokenId: tokens[0]?.tokenId || '',
      round: 1,
      log: ['Encounter initialized.'],
      updatedAt: new Date(),
    };
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
      if (
        token.movementSpeed === undefined ||
        token.movementRemaining === undefined ||
        token.actionAvailable === undefined ||
        token.bonusActionAvailable === undefined
      ) {
        touched = true;
      }
      return {
        ...token,
        movementSpeed,
        movementRemaining,
        actionAvailable: token.actionAvailable ?? true,
        bonusActionAvailable: token.bonusActionAvailable ?? true,
      };
    });

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
        movementSpeed: token.movementSpeed ?? 30,
        movementRemaining: token.movementRemaining ?? token.movementSpeed ?? 30,
        actionAvailable: token.actionAvailable ?? true,
        bonusActionAvailable: token.bonusActionAvailable ?? true,
      }))
      : [],
    initiativeOrder: Array.isArray(encounter?.initiativeOrder) ? encounter.initiativeOrder : [],
    activeTokenId: encounter?.activeTokenId || '',
    round: encounter?.round || 1,
    log: Array.isArray(encounter?.log) ? encounter.log.slice(0, 30) : [],
    updatedAt: encounter?.updatedAt,
  });

  const emitEncounterState = (campaignId, encounter) => {
    const room = `campaign:${campaignId}`;
    io.to(room).emit('encounter:state', {
      campaignId,
      encounter: sanitizeEncounter(encounter),
    });
  };

  const pushEncounterLog = (encounter, message) => {
    const next = Array.isArray(encounter.log) ? encounter.log : [];
    encounter.log = [message, ...next].slice(0, 30);
    encounter.updatedAt = new Date();
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

  socket.on('encounter:load', async ({ campaignId, userId }) => {
    try {
      const campaign = await getCampaignForUser(campaignId, userId);
      if (!campaign) {
        socket.emit('encounter:error', { message: 'Campaign not found or access denied' });
        return;
      }

      const encounter = await ensureEncounterState(campaign);
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
        bonusActionAvailable: true,
      };

      encounter.tokens.push(nextToken);
      sortInitiative(encounter);
      pushEncounterLog(encounter, `${nextToken.name} was placed on the board.`);

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
        pushEncounterLog(encounter, `${removed.name} was removed from the board.`);
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
      pushEncounterLog(encounter, `${token.name} moved to (${nextX}, ${nextY}) spending ${feetCost} ft.`);

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

      pushEncounterLog(encounter, `${token.name} was updated.`);
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
      pushEncounterLog(encounter, `${token.name} initiative set to ${token.initiative}.`);

      campaign.markModified('encounter');
      await campaign.save();
      emitEncounterState(campaignId, encounter);
    } catch (error) {
      console.error('Encounter initiative error:', error);
      socket.emit('encounter:error', { message: 'Failed to update initiative' });
    }
  });

  socket.on('encounter:next-turn', async ({ campaignId, userId }) => {
    try {
      const campaign = await getCampaignForUser(campaignId, userId);
      if (!campaign) return;
      if (!isDMForCampaign(campaign, userId)) {
        socket.emit('encounter:error', { message: 'Only the DM can advance turns' });
        return;
      }

      const encounter = await ensureEncounterState(campaign);
      const order = encounter.initiativeOrder || [];
      if (order.length === 0) {
        encounter.activeTokenId = '';
      } else {
        const currentIndex = order.indexOf(encounter.activeTokenId);
        const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % order.length;
        if (currentIndex >= 0 && nextIndex === 0) {
          encounter.round = (encounter.round || 1) + 1;
        }
        encounter.activeTokenId = order[nextIndex];
        const active = encounter.tokens.find((token) => token.tokenId === encounter.activeTokenId);
        if (active) {
          const speed = Number.isFinite(active.movementSpeed) ? active.movementSpeed : 30;
          active.movementRemaining = speed;
          active.actionAvailable = true;
          active.bonusActionAvailable = true;
          pushEncounterLog(encounter, `Round ${encounter.round}: ${active.name}'s turn.`);
        }
      }

      campaign.markModified('encounter');
      await campaign.save();
      emitEncounterState(campaignId, encounter);
    } catch (error) {
      console.error('Encounter next turn error:', error);
      socket.emit('encounter:error', { message: 'Failed to advance turn' });
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
      pushEncounterLog(encounter, encounter.isReady ? 'DM opened the encounter to players.' : 'DM locked the encounter for prep.');

      campaign.markModified('encounter');
      await campaign.save();
      emitEncounterState(campaignId, encounter);
    } catch (error) {
      console.error('Encounter readiness error:', error);
      socket.emit('encounter:error', { message: 'Failed to update encounter readiness' });
    }
  });
});

// Start HTTP server (handles both Express routes and Socket.io connections)
// IMPORTANT: Must use 'server.listen()' not 'app.listen()' for Socket.io to work
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
