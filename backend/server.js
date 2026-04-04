import express, { urlencoded, json } from "express";
import cors from "cors";
import connectDB from "./config/db.js";

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

// Middleware to parse JSON bodies (The data sent by frontend)
app.use(urlencoded({ extended: false }));
app.use(json({ limit: "15mb" }));
app.use(cors());

// --- Import route files ---
import characterRoutes from './routes/characters.js';
import userRoutes from './routes/users.js';
import registerRoutes from './routes/register.js';
import loginRoutes from './routes/login.js';
import authRoutes from './routes/auth.js';
import campaignRoutes from './routes/campaigns.js';
import partyRoutes from './routes/partyRoutes.js';
import assetRoutes from './routes/assets.js';
import dndProxy from './routes/dndProxy.js';

// ---  Mount the routes ---
app.use('/api/characters', characterRoutes);
app.use('/api/users', userRoutes);
app.use('/api/register', registerRoutes);
app.use('/api/login', loginRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/parties', partyRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/dnd', dndProxy);

// Debugging Middleware (Add this to see what is happening)
app.use((req, res, next) => {
  console.log("---------------------");
  console.log("Incoming Request Method:", req.method);
  console.log("Incoming URL:", req.url); // <--- Added this line
  console.log("Incoming Headers:", req.headers["content-type"]);
  console.log("Incoming Body:", req.body);
  next();
});

connectDB();

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
