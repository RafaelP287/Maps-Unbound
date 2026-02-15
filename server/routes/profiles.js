const express = require("express");
const router = express.Router();

const { updateBio } = require("../controllers/profileController.js");

router.put("/:username", async (req, res) => {
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

module.exports = router;
