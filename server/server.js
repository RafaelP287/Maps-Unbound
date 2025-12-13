// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors"); // Allows frontend to talk to backend
const connectDB = require("./config/db");
const { getUsers, getUser, createUser, deleteUser } = require("./controllers/userController.js")
const { login } = require("./controllers/authController.js")

const app = express();

// Middleware to parse JSON bodies (The data sent by frontend)
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());

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

// GET Route: /api/users
app.get("/api/users", async (req, res) => {
  try {
    const savedUsers = await getUsers();
    res.status(200).json({ message: "Fetched all users.", user: savedUsers });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET Route: /api/user/{username}
app.get("/api/user/:username", async (req, res) => {
  try {
    const targetUsername = req.params.username;
    const targetUser = await getUser(targetUsername);

    if (!targetUser) {
      return res.status(404).json({
        message: `User '${targetUsername}' not found.`,
      });
    }

    // Send response back to frontend
    res.status(200).json({ message: "Successfully fetched a user:", user: targetUser });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE Route: /api/user/:username
app.delete("/api/user/:username", async (req, res) => {
  try {
    // Capture the username from the URL
    const targetUsername = req.params.username;
    const deletedUser = await deleteUser(targetUsername);

    // Should return an error if the user was not found in the database.
    if (!deletedUser) {
      return res.status(404).json({
        message: `User '${targetUsername}' not found.`,
      });
    }

    // Success
    return res.status(200).json({
      message: "User deleted successfully",
      deletedUser: deletedUser, // useful for confirmation/logs
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST Route: /api/register
app.post("/api/register", async (req, res) => {
  try {
    // Receive data directly from the request body (no terminal input needed)
    const { username, email, password } = req.body;

    // Run the logic
    const savedUser = await createUser(username, email, password);

    // Send response back to frontend
    res.status(201).json({ message: "User created!", user: savedUser });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST Route: /api/login
app.post("/api/login", async (req, res) => {
  try {
    // Receive data directly from the request body (no terminal input needed)
    const { username, password } = req.body;

    // Run the logic
    const loginUser = await login(username, password);

    // Send response back to frontend
    res.status(200).json({ message: "User successfuly logged in!", user: loginUser });
  } catch (error) {
    const statusCode = error.status || 500;
    res.status(statusCode).json({ error: error.message });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
