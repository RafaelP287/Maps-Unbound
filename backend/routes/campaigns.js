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

// PARTY FINDER ROUTES

// Get available campaigns for the party finder
router.get("/finder/available", async (req, res) => {
  try {
    const { campaignType, minLevel, maxLevel } = req.query;
    
    let filter = {
      isPublic: true,
      isHosting: true
    };

    if (campaignType) filter.campaignType = campaignType;
    if (minLevel) filter.minLevel = { $lte: minLevel };
    if (maxLevel) filter.maxLevel = { $gte: maxLevel };

    const campaigns = await Campaign.find(filter)
      .select('title description campaignType minLevel maxPlayers members isHosting')
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });

    res.json(campaigns);
  } catch (err) {
    console.error('Error fetching available campaigns:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all campaigns that a user can join (including inactive ones)
router.get("/finder/joinable", verifyToken, async (req, res) => {
  try {
    const campaigns = await Campaign.find({
      $and: [
        { isPublic: true },
        { "members.userId": { $ne: req.userId } }
      ]
    })
      .select('title description campaignType status members isHosting')
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });

    res.json(campaigns);
  } catch (err) {
    console.error('Error fetching joinable campaigns:', err);
    res.status(500).json({ error: err.message });
  }
});

// Request to join a campaign
router.post("/:id/join-request", verifyToken, async (req, res) => {
  try {
    const { accessCode, characterId } = req.body;
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    // Check if user is already a member
    const isMember = campaign.members.some(m => m.userId.toString() === req.userId);
    if (isMember) {
      return res.status(400).json({ message: "You are already a member of this campaign" });
    }

    // Check if campaign requires access code
    if (campaign.accessCode && campaign.accessCode !== accessCode) {
      return res.status(403).json({ message: "Invalid access code" });
    }

    // Check if user already has a pending request
    const existingRequest = campaign.joinRequests.find(r => r.userId.toString() === req.userId);
    if (existingRequest) {
      return res.status(400).json({ message: "You already have a pending request for this campaign" });
    }

    // Check max players
    if (campaign.members.length >= campaign.maxPlayers) {
      return res.status(400).json({ message: "Campaign is full" });
    }

    // Add join request with character
    campaign.joinRequests.push({
      userId: req.userId,
      characterId: characterId || null,
      status: "pending"
    });

    await campaign.save();
    res.json({ message: "Join request sent successfully", campaign });
  } catch (err) {
    console.error('Join request error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Approve/reject join request (DM only)
router.put("/:id/join-request/:requestId", verifyToken, async (req, res) => {
  try {
    const { action } = req.body; // "approve" or "reject"
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    // Only the DM can approve/reject
    if (campaign.createdBy.toString() !== req.userId) {
      return res.status(403).json({ message: "Only the DM can approve join requests" });
    }

    const joinRequest = campaign.joinRequests.find(r => r._id.toString() === req.params.requestId);
    if (!joinRequest) {
      return res.status(404).json({ error: "Join request not found" });
    }

    if (action === "approve") {
      joinRequest.status = "approved";
      campaign.members.push({
        userId: joinRequest.userId,
        characterId: joinRequest.characterId,
        role: "Player"
      });
    } else if (action === "reject") {
      joinRequest.status = "rejected";
    } else {
      return res.status(400).json({ message: "Invalid action" });
    }

    await campaign.save();
    res.json({ message: `Join request ${action}ed successfully`, campaign });
  } catch (err) {
    console.error('Join request action error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Start hosting a campaign
router.put("/:id/start-hosting", verifyToken, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    // Only the DM can start hosting
    if (campaign.createdBy.toString() !== req.userId) {
      return res.status(403).json({ message: "Only the DM can start hosting" });
    }

    campaign.isHosting = true;
    campaign.status = "active";
    await campaign.save();

    res.json({ message: "Campaign is now hosting", campaign });
  } catch (err) {
    console.error('Start hosting error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Stop hosting a campaign
router.put("/:id/stop-hosting", verifyToken, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    // Only the DM can stop hosting
    if (campaign.createdBy.toString() !== req.userId) {
      return res.status(403).json({ message: "Only the DM can stop hosting" });
    }

    campaign.isHosting = false;
    campaign.status = "inactive";
    await campaign.save();

    res.json({ message: "Campaign is no longer hosting", campaign });
  } catch (err) {
    console.error('Stop hosting error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update campaign access settings (DM only)
router.put("/:id/access-settings", verifyToken, async (req, res) => {
  try {
    const { isPublic, accessCode, maxPlayers, minLevel } = req.body;
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    // Only the DM can update settings
    if (campaign.createdBy.toString() !== req.userId) {
      return res.status(403).json({ message: "Only the DM can update access settings" });
    }

    if (isPublic !== undefined) campaign.isPublic = isPublic;
    if (accessCode !== undefined) campaign.accessCode = accessCode;
    if (maxPlayers !== undefined) campaign.maxPlayers = maxPlayers;
    if (minLevel !== undefined) campaign.minLevel = minLevel;

    await campaign.save();
    res.json({ message: "Access settings updated successfully", campaign });
  } catch (err) {
    console.error('Access settings error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;