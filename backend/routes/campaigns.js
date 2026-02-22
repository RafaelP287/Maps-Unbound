import express from "express";
import Campaign from "../models/Campaign.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// Create a new campaign
router.post("/", verifyToken, async (req, res) => {
  try {
    const { title, description } = req.body;
    
    if (!title) {
      return res.status(400).json({ message: 'Campaign title is required' });
    }

    const campaign = new Campaign({
      title,
      description,
      createdBy: req.userId,
      members: [
        {
          userId: req.userId,
          role: "DM"
        }
      ]
    });
    
    await campaign.save();
    res.status(201).json({ message: 'Campaign created successfully', campaign });
  } catch (err) {
    console.error('Campaign creation error:', err);
    res.status(400).json({ error: err.message });
  }
});

// Get all campaigns for the logged-in user
router.get("/", verifyToken, async (req, res) => {
  try {
    const campaigns = await Campaign.find({
      $or: [
        { createdBy: req.userId },
        { "members.userId": req.userId }
      ]
    }).sort({ createdAt: -1 });
    res.json(campaigns);
  } catch (err) {
    console.error('Campaign fetch error:', err);
    res.status(400).json({ error: err.message });
  }
});

// Get a campaign by ID
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });
    
    // Check if user is part of the campaign
    const isMember = campaign.createdBy.toString() === req.userId || 
                     campaign.members.some(m => m.userId.toString() === req.userId);
    
    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized to view this campaign' });
    }
    
    res.json(campaign);
  } catch (err) {
    console.error('Campaign fetch error:', err);
    res.status(400).json({ error: err.message });
  }
});

// Update a campaign
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    // Only the creator can update
    if (campaign.createdBy.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to update this campaign' });
    }

    const updatedCampaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json({ message: 'Campaign updated successfully', campaign: updatedCampaign });
  } catch (err) {
    console.error('Campaign update error:', err);
    res.status(400).json({ error: err.message });
  }
});

// Delete a campaign
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    // Only the creator can delete
    if (campaign.createdBy.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this campaign' });
    }

    await Campaign.findByIdAndDelete(req.params.id);
    res.json({ message: "Campaign deleted successfully" });
  } catch (err) {
    console.error('Campaign delete error:', err);
    res.status(400).json({ error: err.message });
  }
});

export default router;