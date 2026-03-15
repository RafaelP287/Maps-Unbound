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
});

// Start HTTP server (handles both Express routes and Socket.io connections)
// IMPORTANT: Must use 'server.listen()' not 'app.listen()' for Socket.io to work
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
