import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
const router = Router();

import { getUsers, getUser, deleteUser } from "../controllers/userController.js";
import { getCharactersFromUser } from '../controllers/characterController.js';
import User from "../models/User.js";

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

// GET all users
router.get("/", async (req, res) => {
  try {
    const savedUsers = await getUsers();
    res.status(200).json({ message: "Fetched all users.", user: savedUsers });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// UPDATE logged-in user's profile icon image
router.put("/me/profile-image", verifyToken, async (req, res) => {
  try {
    const profileImageUrl = String(req.body?.profileImageUrl || "").trim();
    if (profileImageUrl.length > 12_000_000) {
      return res.status(400).json({ error: "Profile image is too large." });
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { profileImageUrl: profileImageUrl || "" },
      { new: true, runValidators: true }
    ).select("_id username email profileImageUrl");

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profileImageUrl: user.profileImageUrl || "",
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE logged-in user's password
router.put("/me/password", verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current password and new password are required." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: "New password must be at least 8 characters." });
    }

    const user = await User.findById(req.user.userId).select("+password");
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const passwordMatches = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ error: "Current password is incorrect." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password updated successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE logged-in user's account
router.delete("/me", verifyToken, async (req, res) => {
  try {
    const { password } = req.body || {};

    if (!password) {
      return res.status(400).json({ error: "Password confirmation is required." });
    }

    const user = await User.findById(req.user.userId).select("+password");
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ error: "Password is incorrect." });
    }

    await User.findOneAndDelete({ _id: user._id });

    res.json({ message: "Account deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single user by username
router.get("/:username", async (req, res) => {
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

// GET all characters that belongs to the user
router.get("/:username/characters", async (req, res) => {
  try {
    const characters = await getCharactersFromUser(req.params.username);
    res.status(200).json({ message: `Fetched all characters belonging to ${req.params.username}.`, characters: characters });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE Route: /api/user/:username
router.delete("/:username", async (req, res) => {
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

export default router;
