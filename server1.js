require('dotenv').config(); // Load your secret passwords from .env
const express = require('express');
const mongoose = require('mongoose');
const app = express();

// 1. Middleware (Allows the app to read JSON data)
app.use(express.json());

// 2. Database Connection (Connects to MongoDB Atlas)
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch(err => console.log('❌ MongoDB Connection Error:', err));

// 3. Routes (Traffic Control)
// "If anyone goes to /api/auth, send them to the auth.js file"
app.use('/api/auth', require('./routes/auth'));

// 4. Start the Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));