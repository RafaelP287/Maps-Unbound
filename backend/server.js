import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import campaignRoutes from './routes/campaigns.js';
import sessionRoutes from './routes/sessions.js';

dotenv.config({ path: '../.env' });

if (!process.env.MONGO_URI) {
  console.error('MONGO_URI is not defined in .env');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not defined in .env');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json({ limit: "15mb" }));

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/sessions', sessionRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Maps Unbound API' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
