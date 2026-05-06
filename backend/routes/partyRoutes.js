import express from "express";
import { 
  createParty, 
  getPublicParties, 
  joinParty, 
  deleteParty,
  leaveParty,
  kickPlayer
} from "../controllers/partyController.js";

const router = express.Router();

router.get("/public", getPublicParties);
router.post("/create", createParty);
router.post("/join", joinParty);
router.post("/leave", leaveParty);
router.post("/kick", kickPlayer);
router.delete("/:id", deleteParty);

export default router;
