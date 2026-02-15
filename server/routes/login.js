const express = require("express");
const router = express.Router();

const { login } = require("../controllers/authController.js");

// POST Route: /api/login
router.post("/", async (req, res) => {
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

module.exports = router;
