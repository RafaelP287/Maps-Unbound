import { Router } from "express";
const router = Router();

import { createUser } from "../controllers/userController.js";

// POST Route: /api/register
router.post("/", async (req, res) => {
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

export default router;
