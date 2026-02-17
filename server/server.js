// server.js
require("dotenv").config();
const { CONFIG } = require("./config.js");
const express = require("express");
const cors = require("cors"); // Allows frontend to talk to backend
const connectDB = require("./config/db");

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware to parse JSON bodies (The data sent by frontend)
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());

// --- Import route files ---
const characterRoutes = require('./routes/characters');
const userRoutes = require('./routes/users');
const registerRoutes = require('./routes/register');
const loginRoutes = require('./routes/login');
const authRoutes = require('./routes/auth');
const campaignRoutes = require('./routes/campaigns');

// ---  Mount the routes ---
app.use('/api/characters', characterRoutes);
app.use('/api/users', userRoutes);
app.use('/api/register', registerRoutes);
app.use('/api/login', loginRoutes);

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

app.listen(PORT, () => console.log("Server running on port 3000"));
