import express, { urlencoded, json } from "express";
import cors from "cors";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
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

if (!process.env.MONGO_URI) {
  console.error('MONGO_URI is not defined in .env');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not defined in .env');
  process.exit(1);
}

app.use(urlencoded({ extended: false }));
app.use(json({ limit: "15mb" }));
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

// ─── HTTP + Socket.io setup ──────────────────────────────────────────────
const httpServer = http.createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// Authenticate every socket connection using JWT in the handshake auth field.
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("No token provided"));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.data.userId = decoded.userId;
    socket.data.username = decoded.username;
    next();
  } catch {
    next(new Error("Invalid or expired token"));
  }
});

io.on("connection", (socket) => {
  console.log("[socket] connected", socket.data.username);

  // Client asks to join a session room. We verify access (campaign member OR party member).
  socket.on("joinSession", async ({ sessionId }, ack) => {
    try {
      if (!sessionId) return ack?.({ ok: false, error: "No sessionId" });

      const session = await Session.findById(sessionId);
      if (!session) return ack?.({ ok: false, error: "Session not found" });

      const campaign = await Campaign.findById(session.campaignId);
      const membership = campaign?.members?.find(
        (m) => m.userId.toString() === socket.data.userId
      );
      const isMember = Boolean(membership);

      const party = await Party.findOne({ sessionId });
      const isInParty = party?.players?.includes(socket.data.username);

      if (!isMember && !isInParty) {
        return ack?.({ ok: false, error: "Access denied" });
      }

      socket.data.sessionId = sessionId;
      socket.data.isDM = membership?.role === "DM";
      socket.join(`session:${sessionId}`);
      console.log(`[socket] ${socket.data.username} joined session:${sessionId} (DM=${socket.data.isDM})`);
      ack?.({ ok: true, isDM: socket.data.isDM });
    } catch (err) {
      console.error("[socket] joinSession error:", err.message);
      ack?.({ ok: false, error: err.message });
    }
  });

  // Anyone in a session room can broadcast a map state snapshot.
  // We trust the client (this is friend-group scope, not adversarial).
  socket.on("mapState", ({ state }) => {
    if (!socket.data.sessionId) return;
    socket.to(`session:${socket.data.sessionId}`).emit("mapState", { state });
  });

  socket.on("disconnect", () => {
    console.log("[socket] disconnected", socket.data.username);
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔌 Socket.io listening on the same port`);
});