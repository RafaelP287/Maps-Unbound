import express from "express";
import Campaign from "../models/Campaign.js";

const router = express.Router();

// GET all campaigns
router.get("/", async (req, res) => {
    const campaigns = await Campaign.find();
    if (!campaigns) return res.status(404).json({ message: "No campaigns found" });
    res.json(campaigns);
});

// GET single campaign by ID
router.get("/:id", async (req, res) => {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: "Campaign not found" });
    res.json(campaign);
});

// CREATE new campaign
router.post("/", async (req, res) => {
    const campaign = new Campaign(req.body);
    await campaign.save();
    res.status(201).json(campaign);
});

export default router;