const express = require("express");
const router = express.Router();

const {createUser} = require("../controllers/userController.js");

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

module.exports = router;
