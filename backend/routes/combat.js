import express from "express";
import requireAuth from "../middleware/auth.js";
import { updateCombatantVisibility } from "../controllers/combatController.js";
import {
  getActiveCombat,
  createCombat,
  updateSetup,
  startCombat,
  nextTurn,
  reorderCombatants,
  applyDamage,
  updateCombatant,
  endCombat,
  getCampaignCharacters,
} from "../controllers/combatController.js";

const router = express.Router();

// All combat endpoints require auth.
router.use(requireAuth);

// ─── Per-session combat lifecycle ─────────────────────────────────────────
// These all key off sessionId — one active combat per session.

// GET /api/combat/session/:sessionId
//   → Returns the active LiveCombat for this session, or null.
router.get("/session/:sessionId", getActiveCombat);

// POST /api/combat/session/:sessionId
//   → Create a new combat in setup mode. Idempotent (returns existing if present).
//   Body: { combatants: [...] }
router.post("/session/:sessionId", createCombat);

// PUT /api/combat/session/:sessionId/setup
//   → Update the combatants array while still in setup mode.
//   Body: { combatants: [...] }   // full replacement
router.put("/session/:sessionId/setup", updateSetup);

// POST /api/combat/session/:sessionId/start
//   → Transition setup → active. Locks order, sets round 1.
router.post("/session/:sessionId/start", startCombat);

// POST /api/combat/session/:sessionId/next-turn
//   → Advance to the next combatant. Increments round on wrap.
router.post("/session/:sessionId/next-turn", nextTurn);

// POST /api/combat/session/:sessionId/reorder
//   → Reorder combatants mid-combat. Preserves whose turn it is.
//   Body: { orderedIds: [...] }
router.post("/session/:sessionId/reorder", reorderCombatants);

// POST /api/combat/session/:sessionId/damage
//   → Apply damage (positive amount) or healing (negative amount) to a combatant.
//   Body: { combatantId, amount, source? }
router.post("/session/:sessionId/damage", applyDamage);

// PATCH /api/combat/session/:sessionId/combatant/:combatantId
//   → Generic edit on a single combatant (rename, set tokenId, toggle hidden, etc.).
//   Body: any subset of allowed fields.
router.patch("/session/:sessionId/combatant/:combatantId", updateCombatant);

// POST /api/combat/session/:sessionId/end
//   → End combat. Syncs final HP to player character sheets, deletes the doc.
router.post("/session/:sessionId/end", endCombat);

// ─── Campaign-scoped lookups ──────────────────────────────────────────────
// Used by the Combat Setup modal to populate "available players."

// GET /api/combat/campaign/:campaignId/characters
//   → Returns all player characters in this campaign.
router.get("/campaign/:campaignId/characters", getCampaignCharacters);
router.patch(
  "/session/:sessionId/combatant/:combatantId/visibility",
  requireAuth,
  updateCombatantVisibility
);

export default router;