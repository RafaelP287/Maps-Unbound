import express from "express";
import Campaign from "../models/Campaign.js";

const router = express.Router();

// Create a new campaign
router.post("/", async (req, res) => {
  try {
    const { title, description, members } = req.body;
    const campaign = new Campaign({ title, description, members });
    await campaign.save();
    res.status(201).json(campaign);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all campaigns
router.get("/", async (req, res) => {
  try {
    const campaigns = await Campaign.find();
    res.json(campaigns);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get a campaign by ID
router.get("/:id", async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });
    res.json(campaign);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update a campaign
router.put("/:id", async (req, res) => {
  try {
    const updatedCampaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updatedCampaign);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a campaign
router.delete("/:id", async (req, res) => {
  try {
    await Campaign.findByIdAndDelete(req.params.id);
    res.json({ message: "Campaign deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;