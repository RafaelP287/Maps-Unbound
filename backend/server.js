import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';

import authRoutes from './routes/auth.js';
import campaignRoutes from './routes/campaigns.js';
import characterRoutes from './routes/characters.js';

dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 5001;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/characters', characterRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Maps Unbound API' });
});

io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  socket.on('join-room', ({ campaignId, userId }) => {
    if (!campaignId || !userId) {
      socket.emit('room-error', { message: 'campaignId and userId are required' });
      return;
    }

    const room = `campaign:${campaignId}`;
    socket.join(room);

    socket.emit('room-joined', {
      room,
      campaignId,
      userId,
      socketId: socket.id,
    });

    socket.to(room).emit('player-joined', {
      campaignId,
      userId,
      socketId: socket.id,
      joinedAt: new Date().toISOString(),
    });
  });

  socket.on('disconnect', () => {
    console.log(`❌ Socket disconnected: ${socket.id}`);
  });

  socket.on('send-message', ({ campaignId, userId, username, message }) => {
    if (!campaignId || !userId || !message) {
      return;
    }

    const room = `campaign:${campaignId}`;
    io.to(room).emit('chat-message', {
      campaignId,
      userId,
      username,
      message,
      timestamp: new Date().toISOString(),
    });
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
