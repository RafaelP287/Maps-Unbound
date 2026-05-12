import express, { urlencoded, json } from "express";
import http from "http";
import { Server } from "socket.io";
import combatRoutes from "./routes/combat.js";
import cors from "cors";
import connectDB from "./config/db.js";
import sessionRoutes from './routes/sessions.js';
import encounterRoutes from './routes/encounters.js';

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

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔌 Socket.io listening on the same port`);
});