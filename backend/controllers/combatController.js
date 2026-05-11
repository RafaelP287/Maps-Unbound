import LiveCombat from "../models/LiveCombat.js";
import Character from "../models/Character.js";
import Session from "../models/Session.js";
import Campaign from "../models/Campaign.js";

// Proxy URL for character portraits — backend streams S3 bytes, no CORS pain.
function portraitProxyUrl(characterId, version) {
  if (!characterId) return "";
  const base =
    process.env.PUBLIC_API_BASE ||
    `http://localhost:${process.env.PORT || 5001}`;
  const v = version ? `?v=${new Date(version).getTime()}` : "";
  return `${base}/api/characters/${characterId}/portrait/image${v}`;
}

function getUserId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value._id) return getUserId(value._id);
  if (value.id) return getUserId(value.id);
  return value.toString?.() || "";
}

function isDMForCampaign(campaign, userId) {
  return (
    getUserId(campaign?.createdBy) === userId ||
    campaign?.members?.some(
      (member) => getUserId(member.userId) === userId && member.role === "DM"
    )
  );
}

async function requireCampaignAccess(req, res, campaignId, { dmOnly = false } = {}) {
  const userId = getUserId(req.user?.userId || req.userId);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }

  const campaign = await Campaign.findById(campaignId);
  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return null;
  }

  const isMember =
    getUserId(campaign.createdBy) === userId ||
    campaign.members?.some((member) => getUserId(member.userId) === userId);
  if (!isMember) {
    res.status(403).json({ error: "Campaign access denied" });
    return null;
  }

  const isDM = isDMForCampaign(campaign, userId);
  if (dmOnly && !isDM) {
    res.status(403).json({ error: "Only the DM can update live combat" });
    return null;
  }

  return { campaign, userId, isDM };
}

async function requireSessionAccess(req, res, sessionId, { dmOnly = false } = {}) {
  const session = await Session.findById(sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return null;
  }

  const access = await requireCampaignAccess(req, res, session.campaignId, { dmOnly });
  if (!access) return null;
  return { ...access, session };
}

// ─── Helper: find a combatant by id within a combat doc ────────────────────
function findCombatant(combat, combatantId) {
  return combat.combatants.find((c) => c.id === combatantId);
}

// ─── Helper: append a log entry ────────────────────────────────────────────
// Mutates the combat doc in-place. Caller is responsible for saving.
function logEvent(combat, entry) {
  combat.log.push({
    round: combat.round || 1,
    timestamp: new Date(),
    ...entry,
  });
}

// ─── Helper: Player-character HP sync ──────────────────────────────────────
// When DM does damage/heal to a player token, update the Character document too
// so the player's sheet reflects what happened in combat. Best-effort — if
// Character can't be found we just skip and log a warning.
async function syncCharacterHp(combatant) {
  if (!combatant.characterId) return;
  try {
    const character = await Character.findById(combatant.characterId);
    if (!character) return;
    character.hp.current = combatant.hp;
    character.isDead = combatant.hp <= 0;
    await character.save();
  } catch (err) {
    console.warn("Failed to sync character HP:", err.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/combat/session/:sessionId
// Fetch the active LiveCombat for a session (or null if none).
// ═══════════════════════════════════════════════════════════════════════════
export async function getActiveCombat(req, res) {
  try {
    const { sessionId } = req.params;
    const access = await requireSessionAccess(req, res, sessionId);
    if (!access) return;

    const combat = await LiveCombat.findOne({ sessionId });
    res.json(combat); // null is fine — frontend treats null as "no combat"
  } catch (err) {
    console.error("getActiveCombat error:", err);
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/combat/session/:sessionId
// Create a new combat in setup mode. Used when DM clicks "Start Combat" and
// the modal opens. If a combat already exists for this session, return it
// instead of creating a duplicate (idempotent).
//
// Body: { combatants: [...] }   // initial roster — usually auto-populated
//                               // from the campaign's player characters
// ═══════════════════════════════════════════════════════════════════════════
export async function createCombat(req, res) {
  try {
    const { sessionId } = req.params;
    const { combatants = [] } = req.body;
    const access = await requireSessionAccess(req, res, sessionId, { dmOnly: true });
    if (!access) return;

    // If a combat already exists, return it (covers refreshes, double-clicks).
    const existing = await LiveCombat.findOne({ sessionId });
    if (existing) {
      return res.json(existing);
    }

    const combat = await LiveCombat.create({
      sessionId,
      campaignId: access.session.campaignId,
      status: "setup",
      round: 0,
      activeTurnIndex: -1,
      combatants,
      log: [],
    });
    res.status(201).json(combat);
  } catch (err) {
    console.error("createCombat error:", err);
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PUT /api/combat/session/:sessionId/setup
// Update the roster while still in setup mode. DM is editing the list,
// dragging rows around, changing HP/init values, etc.
//
// Body: { combatants: [...] }   // full replacement of the array
// ═══════════════════════════════════════════════════════════════════════════
export async function updateSetup(req, res) {
  try {
    const { sessionId } = req.params;
    const { combatants } = req.body;
    const access = await requireSessionAccess(req, res, sessionId, { dmOnly: true });
    if (!access) return;

    const combat = await LiveCombat.findOne({ sessionId });
    if (!combat) return res.status(404).json({ error: "No active combat" });
    if (combat.status !== "setup") {
      return res
        .status(400)
        .json({ error: "Can only update setup before combat starts" });
    }

    if (Array.isArray(combatants)) {
      combat.combatants = combatants;
    }
    await combat.save();
    res.json(combat);
  } catch (err) {
    console.error("updateSetup error:", err);
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/combat/session/:sessionId/start
// Transition from "setup" to "active". Locks in the initiative order,
// sets activeTurnIndex to 0, round to 1, and writes the first log entries.
// ═══════════════════════════════════════════════════════════════════════════
export async function startCombat(req, res) {
  try {
    const { sessionId } = req.params;
    const access = await requireSessionAccess(req, res, sessionId, { dmOnly: true });
    if (!access) return;

    const combat = await LiveCombat.findOne({ sessionId });
    if (!combat) return res.status(404).json({ error: "No active combat" });
    if (combat.status === "active") return res.json(combat); // idempotent
    if (combat.combatants.length === 0) {
      return res
        .status(400)
        .json({ error: "Add at least one combatant before starting" });
    }

    combat.status = "active";
    combat.round = 1;
    combat.activeTurnIndex = 0;
    combat.startedAt = new Date();

    // Log: combat started + first turn.
    logEvent(combat, { type: "combat_started", message: "Combat started" });
    logEvent(combat, { type: "round_started", round: 1 });
    const first = combat.combatants[0];
    if (first) {
      logEvent(combat, {
        type: "turn_started",
        actorName: first.name,
      });
    }

    await combat.save();
    res.json(combat);
  } catch (err) {
    console.error("startCombat error:", err);
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/combat/session/:sessionId/next-turn
// Advance to the next combatant. If we wrap around, increment round.
// Skips dead non-Player combatants (they were removed when they died) — but
// they shouldn't be in the array at all if death-removal is working.
// ═══════════════════════════════════════════════════════════════════════════
export async function nextTurn(req, res) {
  try {
    const { sessionId } = req.params;
    const access = await requireSessionAccess(req, res, sessionId, { dmOnly: true });
    if (!access) return;

    const combat = await LiveCombat.findOne({ sessionId });
    if (!combat) return res.status(404).json({ error: "No active combat" });
    if (combat.status !== "active") {
      return res.status(400).json({ error: "Combat is not active" });
    }
    if (combat.combatants.length === 0) {
      return res.status(400).json({ error: "No combatants" });
    }

    const nextIndex = combat.activeTurnIndex + 1;
    if (nextIndex >= combat.combatants.length) {
      // Wrap around — new round.
      combat.round += 1;
      combat.activeTurnIndex = 0;
      logEvent(combat, { type: "round_started" });
    } else {
      combat.activeTurnIndex = nextIndex;
    }

    const active = combat.combatants[combat.activeTurnIndex];
    if (active) {
      logEvent(combat, { type: "turn_started", actorName: active.name });
    }

    await combat.save();
    res.json(combat);
  } catch (err) {
    console.error("nextTurn error:", err);
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/combat/session/:sessionId/reorder
// DM drags rows in the initiative strip to fix order. Pass the new order as
// an array of combatant ids.
//
// Body: { orderedIds: ["abc123", "def456", ...] }
// Activity index is preserved by tracking who was active and finding their
// new index after the reorder.
// ═══════════════════════════════════════════════════════════════════════════
export async function reorderCombatants(req, res) {
  try {
    const { sessionId } = req.params;
    const { orderedIds } = req.body;
    const access = await requireSessionAccess(req, res, sessionId, { dmOnly: true });
    if (!access) return;

    const combat = await LiveCombat.findOne({ sessionId });
    if (!combat) return res.status(404).json({ error: "No active combat" });
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ error: "orderedIds must be an array" });
    }

    // Track who was active so we can find them in the new order.
    const wasActive =
      combat.activeTurnIndex >= 0
        ? combat.combatants[combat.activeTurnIndex]
        : null;

    // Build the reordered array based on the new id order. Any ids that don't
    // match get dropped silently (defensive — frontend should never send junk).
    const byId = new Map(combat.combatants.map((c) => [c.id, c]));
    combat.combatants = orderedIds
      .map((id) => byId.get(id))
      .filter((c) => !!c);

    // Restore active index by finding the previously-active combatant's
    // position in the new array.
    if (wasActive) {
      const newIdx = combat.combatants.findIndex((c) => c.id === wasActive.id);
      if (newIdx !== -1) {
        combat.activeTurnIndex = newIdx;
      } else {
        // Active combatant was reordered out of existence (shouldn't happen
        // since DM just dragged, didn't delete) — clamp to 0.
        combat.activeTurnIndex = 0;
      }
    }

    await combat.save();
    res.json(combat);
  } catch (err) {
    console.error("reorderCombatants error:", err);
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/combat/session/:sessionId/damage
// Apply damage to a combatant. Negative amount = healing.
// If a Player drops to 0 they STAY in initiative (red highlight on the strip).
// If an NPC/Enemy drops to 0 they're removed entirely.
//
// Body: { combatantId, amount, source? }
// ═══════════════════════════════════════════════════════════════════════════
export async function applyDamage(req, res) {
  try {
    const { sessionId } = req.params;
    const { combatantId, amount, source = "" } = req.body;
    const access = await requireSessionAccess(req, res, sessionId, { dmOnly: true });
    if (!access) return;

    if (typeof amount !== "number" || amount === 0) {
      return res.status(400).json({ error: "Amount must be a non-zero number" });
    }

    const combat = await LiveCombat.findOne({ sessionId });
    if (!combat) return res.status(404).json({ error: "No active combat" });

    const target = findCombatant(combat, combatantId);
    if (!target) return res.status(404).json({ error: "Combatant not found" });

    const wasAlive = target.hp > 0;
    const newHp = Math.max(0, Math.min(target.maxHp, target.hp - amount));
    target.hp = newHp;

    // Log damage or heal.
    if (amount > 0) {
      logEvent(combat, {
        type: "damage",
        actorName: source,
        targetName: target.name,
        amount,
      });
    } else {
      logEvent(combat, {
        type: "heal",
        actorName: source,
        targetName: target.name,
        amount: Math.abs(amount),
      });
    }

    // Death + revival logic.
    const nowDead = target.hp <= 0;
    if (wasAlive && nowDead) {
      logEvent(combat, { type: "died", actorName: target.name });
      // Players stay in the initiative; NPCs/Enemies are removed.
      if (target.kind !== "Player") {
        // If the active combatant is being removed, we need to handle the
        // active index carefully. We DON'T advance the turn (DM may want to
        // describe the death). We just shift the index if the dead one is
        // before the active one.
        const removedIdx = combat.combatants.findIndex(
          (c) => c.id === target.id
        );
        combat.combatants = combat.combatants.filter(
          (c) => c.id !== target.id
        );
        // Rebalance active index.
        if (removedIdx < combat.activeTurnIndex) {
          combat.activeTurnIndex = Math.max(0, combat.activeTurnIndex - 1);
        } else if (removedIdx === combat.activeTurnIndex) {
          // Dead one was active. Clamp to within bounds.
          if (combat.activeTurnIndex >= combat.combatants.length) {
            combat.activeTurnIndex = 0;
            combat.round += 1;
            logEvent(combat, { type: "round_started" });
          }
        }
        logEvent(combat, { type: "removed", actorName: target.name });
      }
    } else if (!wasAlive && newHp > 0) {
      // Revive — log it, no removal.
      logEvent(combat, { type: "revived", actorName: target.name });
    }

    await combat.save();
    // Sync to player's character sheet (best-effort, non-blocking).
    if (target.kind === "Player") {
      await syncCharacterHp(target);
    }
    res.json(combat);
  } catch (err) {
    console.error("applyDamage error:", err);
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PATCH /api/combat/session/:sessionId/combatant/:combatantId
// Generic edit on a single combatant (rename, change HP/maxHp directly,
// toggle hiddenFromPlayers, set tokenId after Godot spawn, etc.).
//
// Body: any subset of combatant fields to update.
// ═══════════════════════════════════════════════════════════════════════════
export async function updateCombatant(req, res) {
  try {
    const { sessionId, combatantId } = req.params;
    const updates = req.body;
    const access = await requireSessionAccess(req, res, sessionId, { dmOnly: true });
    if (!access) return;

    const combat = await LiveCombat.findOne({ sessionId });
    if (!combat) return res.status(404).json({ error: "No active combat" });

    const target = findCombatant(combat, combatantId);
    if (!target) return res.status(404).json({ error: "Combatant not found" });

    // Whitelist fields the DM can update directly. Status-affecting fields
    // (hp, dead, etc.) should go through applyDamage.
    const ALLOWED = [
      "name",
      "initiative",
      "maxHp",
      "hp",
      "tokenId",
      "hiddenFromPlayers",
      "portraitUrl",
    ];
    for (const key of ALLOWED) {
      if (key in updates) {
        target[key] = updates[key];
      }
    }
    await combat.save();
    if (target.kind === "Player" && "hp" in updates) {
      await syncCharacterHp(target);
    }
    res.json(combat);
  } catch (err) {
    console.error("updateCombatant error:", err);
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/combat/session/:sessionId/end
// End combat. We delete the LiveCombat doc — no archiving in Phase 1.
// (Phase 2+ could append to Session.encounterRecords here.)
// ═══════════════════════════════════════════════════════════════════════════
export async function endCombat(req, res) {
  try {
    const { sessionId } = req.params;
    const access = await requireSessionAccess(req, res, sessionId, { dmOnly: true });
    if (!access) return;

    const combat = await LiveCombat.findOne({ sessionId });
    if (!combat) return res.json({ ok: true }); // already gone

    // Final HP sync for any players, in case anything was dirty.
    for (const c of combat.combatants) {
      if (c.kind === "Player" && c.characterId) {
        await syncCharacterHp(c);
      }
    }

    await LiveCombat.deleteOne({ _id: combat._id });
    res.json({ ok: true });
  } catch (err) {
    console.error("endCombat error:", err);
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/combat/campaign/:campaignId/characters
// List all player characters in a campaign — used by the Combat Setup modal
// to show who's available to add to initiative.
//
// Returns an array of lean character documents with the fields needed by
// the modal: _id, name, hp, race, class, user, portrait (later).
// ═══════════════════════════════════════════════════════════════════════════
export async function getCampaignCharacters(req, res) {
  try {
    const { campaignId } = req.params;
    const access = await requireCampaignAccess(req, res, campaignId, { dmOnly: true });
    if (!access) return;

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });

    // Players who have selected an active character for this campaign.
    const activeCharacterIds = campaign.members
      .filter((m) => m.role === "Player" && m.activeCharacterId)
      .map((m) => m.activeCharacterId);

    if (activeCharacterIds.length === 0) return res.json([]);

    // Fetch only those characters (one per player who has selected).
    const characters = await Character.find({
      _id: { $in: activeCharacterIds },
    })
      .select("_id name hp race class level user portrait")
      .lean();

    // Swap stored S3 URLs for stable proxy URLs that route through our backend.
    const charactersWithProxyUrls = characters.map((character) => {
      if (character.portrait?.s3Key) {
        return {
          ...character,
          portrait: {
            ...character.portrait,
            url: portraitProxyUrl(character._id, character.updatedAt),
          },
        };
      }
      return character;
    });

    res.json(charactersWithProxyUrls);
  } catch (err) {
    console.error("getCampaignCharacters error:", err);
    res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PATCH /api/combat/session/:sessionId/combatant/:combatantId/visibility
// Toggle a single combatant's hiddenFromMap / hiddenFromInitiative flag.
// Body: { hiddenFromMap?: boolean, hiddenFromInitiative?: boolean }
// Works during both setup and active combat.
// ═══════════════════════════════════════════════════════════════════════════
export async function updateCombatantVisibility(req, res) {
  try {
    const { sessionId, combatantId } = req.params;
    const { hiddenFromMap, hiddenFromInitiative } = req.body;
    const access = await requireSessionAccess(req, res, sessionId, { dmOnly: true });
    if (!access) return;

    const combat = await LiveCombat.findOne({ sessionId });
    if (!combat) return res.status(404).json({ error: "No combat found" });

    const target = combat.combatants.find((c) => c.id === combatantId);
    if (!target) return res.status(404).json({ error: "Combatant not found" });

    if (typeof hiddenFromMap === "boolean") target.hiddenFromMap = hiddenFromMap;
    if (typeof hiddenFromInitiative === "boolean")
      target.hiddenFromInitiative = hiddenFromInitiative;

    await combat.save();
    res.json(combat);
  } catch (err) {
    console.error("updateCombatantVisibility error:", err);
    res.status(500).json({ error: err.message });
  }
}
