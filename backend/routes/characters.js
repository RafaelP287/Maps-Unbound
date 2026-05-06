import { Router } from "express";
const router = Router();

import {
  DEFAULT_RACES,
  DEFAULT_CLASSES,
  DEFAULT_ALIGNMENTS,
  DEFAULT_BACKGROUNDS,
} from "../constants/gameData.js";
import { DEFAULT_SKILLS } from "../constants/skills_data.js";

import {
  getCharacters,
  getCharacter,
  createCharacter,
  updateCharacter,
  deleteCharacter,
  addSpellToCharacter,
  addItemToInventory,
} from "../controllers/characterController.js";

const abilityKeys = ["str", "dex", "con", "int", "wis", "cha"];

const titleFromIndex = (index = "") =>
  String(index)
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const getNameFromIndex = (index, list) => {
  if (!index) return "Unknown";
  const found = list.find((item) => item.index === String(index).toLowerCase());
  return found ? found.name : titleFromIndex(index);
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const normalizeReference = (value, list, fallbackIndex) => {
  const rawIndex =
    typeof value === "object" && value !== null
      ? value.index
      : value;
  const index = String(rawIndex || fallbackIndex).toLowerCase();

  return {
    index,
    name: getNameFromIndex(index, list),
  };
};

const normalizeStringArray = (value, fallback = []) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return fallback;
};

const normalizeAttributes = (attributes = {}) =>
  abilityKeys.reduce((next, key) => {
    next[key] = clamp(toNumber(attributes[key], 10), 1, 30);
    return next;
  }, {});

const normalizeSkillProficiencies = (value = []) => {
  const incomingSkills = Array.isArray(value) ? value : [];
  const selected = new Set(
    incomingSkills
      .map((skill) => (typeof skill === "string" ? skill : skill?.api_index))
      .filter(Boolean),
  );

  return DEFAULT_SKILLS.map((skill) => {
    const incoming = incomingSkills.find((item) =>
      typeof item === "object" && item?.api_index === skill.api_index
    );

    return {
      ...skill,
      is_proficient: selected.has(skill.api_index) || Boolean(incoming?.is_proficient),
      expertise: Boolean(incoming?.expertise),
      notes: incoming?.notes || "",
    };
  });
};

const normalizeAttacks = (attacks = []) => {
  if (!Array.isArray(attacks)) return [];

  return attacks
    .map((attack) => ({
      name: String(attack?.name || "").trim(),
      attackBonus: String(attack?.attackBonus || "").trim(),
      damageAndType: String(attack?.damageAndType || "").trim(),
    }))
    .filter((attack) => attack.name);
};

const normalizeSheetData = (body = {}) => {
  const level = clamp(toNumber(body.level, 1), 1, 20);

  return {
    level,
    experience: Math.max(0, toNumber(body.experience, 0)),
    inspiration: Boolean(body.inspiration),
    attributes: normalizeAttributes(body.attributes),
    hp: {
      current: Math.max(0, toNumber(body.hp?.current, 10)),
      max: Math.max(1, toNumber(body.hp?.max, 10)),
    },
    temporaryHp: Math.max(0, toNumber(body.temporaryHp, 0)),
    armorClass: Math.max(0, toNumber(body.armorClass, 10)),
    initiative: toNumber(body.initiative, 0),
    speed: Math.max(0, toNumber(body.speed, 30)),
    passivePerception: Math.max(0, toNumber(body.passivePerception, 10)),
    hitDice: String(body.hitDice || "").trim().slice(0, 30),
    deathSaves: {
      successes: clamp(toNumber(body.deathSaves?.successes, 0), 0, 3),
      failures: clamp(toNumber(body.deathSaves?.failures, 0), 0, 3),
    },
    personalityTraits: normalizeStringArray(body.personalityTraits),
    ideals: normalizeStringArray(body.ideals),
    bonds: normalizeStringArray(body.bonds),
    flaws: normalizeStringArray(body.flaws),
    featuresAndTraits: normalizeStringArray(body.featuresAndTraits),
    languages: normalizeStringArray(body.languages, ["common"]),
    weaponProficiencies: normalizeStringArray(body.weaponProficiencies),
    armorProficiencies: normalizeStringArray(body.armorProficiencies),
    toolProficiencies: normalizeStringArray(body.toolProficiencies),
    skillProficiencies: normalizeSkillProficiencies(body.skillProficiencies),
    attacks: normalizeAttacks(body.attacks),
  };
};

const normalizeCharacterPayload = (body = {}) => {
  const name = String(body.name || "").trim();

  return {
    name,
    user: String(body.user || "").trim(),
    raceObj: normalizeReference(body.race, DEFAULT_RACES, "human"),
    classObj: normalizeReference(body.characterClass || body.class, DEFAULT_CLASSES, "fighter"),
    backgroundObj: normalizeReference(body.background, DEFAULT_BACKGROUNDS, "acolyte"),
    alignmentObj: normalizeReference(body.alignment, DEFAULT_ALIGNMENTS, "neutral"),
    sheetData: normalizeSheetData(body),
  };
};

// GET all characters
router.get("/", async (req, res) => {
  try {
    const characters = await getCharacters();
    res.json(characters);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET a single character by characterId or Mongo _id
router.get("/:id", async (req, res) => {
  try {
    const character = await getCharacter(req.params.id);

    if (!character) {
      return res.status(404).json({ error: "Character not found." });
    }

    res.status(200).json({
      message: `Obtained the data of ${character.name}.`,
      character,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST a new character
router.post("/", async (req, res) => {
  try {
    const { name, user, raceObj, classObj, backgroundObj, alignmentObj, sheetData } =
      normalizeCharacterPayload(req.body);

    if (name.length < 2) {
      return res.status(400).json({ error: "Character name must be at least 2 characters." });
    }

    if (!user) {
      return res.status(400).json({ error: "A character must belong to a user." });
    }

    const newCharacter = await createCharacter(
      name,
      user,
      raceObj,
      classObj,
      backgroundObj,
      alignmentObj,
      sheetData,
    );

    res.status(201).json({
      message: `Character created successfully. ID: ${newCharacter.characterId}`,
      character: newCharacter,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// PUT update an existing character
router.put("/:id", async (req, res) => {
  try {
    const { name, raceObj, classObj, backgroundObj, alignmentObj, sheetData } =
      normalizeCharacterPayload(req.body);

    if (name.length < 2) {
      return res.status(400).json({ error: "Character name must be at least 2 characters." });
    }

    const character = await updateCharacter(req.params.id, {
      name,
      race: raceObj,
      class: classObj,
      background: backgroundObj,
      alignment: alignmentObj,
      ...sheetData,
    });

    if (!character) {
      return res.status(404).json({ error: "Character not found." });
    }

    res.status(200).json({
      message: "Character saved successfully.",
      character,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE a character owned by the requesting user
router.delete("/:id", async (req, res) => {
  try {
    const user = String(req.body?.user || req.query?.user || "").trim();

    if (!user) {
      return res.status(400).json({ error: "A username is required to delete a character." });
    }

    const result = await deleteCharacter(req.params.id, user);

    if (result.status === "user_not_found") {
      return res.status(404).json({ error: "User not found." });
    }

    if (result.status === "not_found") {
      return res.status(404).json({ error: "Character not found." });
    }

    if (result.status === "forbidden") {
      return res.status(403).json({ error: "You can only delete your own characters." });
    }

    res.status(200).json({
      message: "Character deleted successfully.",
      character: result.character,
      deletedInventoryCount: result.deletedInventoryCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST Adds Spells to Character
router.post("/:id/spells", async (req, res) => {
  try {
    const { spellIndex } = req.body;
    const characterId = req.params.id;

    const response = await addSpellToCharacter(characterId, spellIndex);

    res.status(200).json({
      message: `Successfully added spell "${spellIndex}" to character (ID '${characterId}')`,
      content: response,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST: Add an item to a character's inventory
router.post("/:id/inventory", addItemToInventory);

export default router;
