// server.js
require("dotenv").config();
const { CONFIG } = require("./config.js");
const express = require("express");
const cors = require("cors"); // Allows frontend to talk to backend
const connectDB = require("./config/db");
const multer = require("multer"); // Handles the file parsing
// controllers
const {
  getUsers,
  getUser,
  createUser,
  deleteUser,
} = require("./controllers/userController.js");
const { login } = require("./controllers/authController.js");
const { updateBio } = require("./controllers/profileController.js");

// move these later
const Character = require("./models/Character.js");
const User = require("./models/User.js");
const { parseSpellData } = require("./models/Spell.js");

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
    res
      .status(200)
      .json({ message: "Successfully fetched a user:", user: targetUser });
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
    res
      .status(200)
      .json({ message: "User successfuly logged in!", user: loginUser });
  } catch (error) {
    const statusCode = error.status || 500;
    res.status(statusCode).json({ error: error.message });
  }
});

// PUT Route: /api/profile/:username
app.put("/api/profile/:username", async (req, res) => {
  try {
    const username = req.params.username;

    // Receive data directly from the request body (no terminal input needed)
    const { bio } = req.body;

    // Run the logic
    const editedProfile = await updateBio(username, bio);

    // Should return an error if the user was not found in the database.
    if (!editedProfile) {
      return res.status(404).json({
        message: `User '${username}' not found.`,
      });
    }

    // Send response back to frontend
    res.status(200).json({ message: "Bio updated!", profile: editedProfile });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/characters
app.post("/api/characters", async (req, res) => {
  try {
    // Destructure data from the request body
    // Separate certain fields for calculations + log-in logic
    const { user, race, ...charData } = req.body;

    //  Verify the User exists before creating character
    const userDoc = await User.findOne({ username: user });
    if (!userDoc) {
        return res.status(404).json({ error: "User not found" });
    }

    // Create the Character Instance
    const newCharacter = new Character({
        ...req.body,
        user: userDoc._id // <--- Correct: Passing the ObjectId
    });
    await newCharacter.save();

    // Calculate the bonus attributes, depending on race and etc.
    
    await newCharacter.save();

    // 5. Respond
    res.status(201).json({
      message: "Character created successfully!",
      character: newCharacter,
    });
  } catch (error) {
    // Handle Mongoose Validation Errors (e.g. max level exceeded)
    if (error.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// GET /api/characters/{:id}
app.get("/api/characters/:id", async (req, res) => {
  try {
    const character = await Character.findOne({ characterId: req.params.id });

    const raceData = await character.getRace();
    const classData = await character.getClass();
    console.log("Race:", raceData);
    console.log("Class:", classData);

    res.status(201).json({
      message: `Obtained the data of ${character.name}!`,
      character: character,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Character Spells
app.post("/api/characters/:id/spells", async (req, res) => {
  try {
    const { spellIndex } = req.body;

    // Fetch
    const apiURL = `${CONFIG.api5e}/api/2014/spells/${spellIndex}`
    console.log(`Attempting to fetch from URL: ${apiURL}`);
    const response = await fetch(apiURL);
    const apiJson = await response.json();

    const character = await Character.findOne({ characterId: req.params.id });

    // Parse & Push
    const newSpell = parseSpellData(apiJson);
    
    character.spellbook.push(newSpell);
    await character.save();
    
    console.log(`Successfully added spell "${newSpell.name}" to ${character.name} (ID '${character.characterId}')`)
    res.status(200).json(character);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
