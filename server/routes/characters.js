import { Router } from "express";
const router = Router();

import {
  DEFAULT_RACES,
  DEFAULT_CLASSES,
  DEFAULT_ALIGNMENTS,
  DEFAULT_BACKGROUNDS,
} from "../constants/gameData.js";

import {
  getCharacters,
  getCharacter,
  getCharacterExpanded,
  createCharacter,
  addSpellToCharacter,
  addItemToInventory,
} from "../controllers/characterController.js";

// Helper function to find the name, or fallback to the index if not found
const getNameFromIndex = (index, list) => {
  if (!index) return "Unknown";
  const found = list.find((item) => item.index === index.toLowerCase());
  return found ? found.name : index;
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

// GET a single character by ID
router.get("/:id", async (req, res) => {
  try {
    // const character = await getCharacter(req.params.id);
    const character = await getCharacterExpanded(req.params.id);
    res.status(201).json({
      message: `Obtained the data of ${character.name}!`,
      character: character,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST a new character
router.post("/", async (req, res) => {
  try {
    const { name, user, race, characterClass, alignment, background, level } =
      req.body;

    // Gets the objects for each of the fields
    const raceObj = {
      index: race,
      name: getNameFromIndex(race, DEFAULT_RACES)
    };

    const classObj = {
      index: characterClass,
      name: getNameFromIndex(characterClass, DEFAULT_CLASSES)
    };

    const alignmentObj = {
      index: alignment,
      name: getNameFromIndex(alignment, DEFAULT_ALIGNMENTS)
    };

    const backgroundObj = {
      index: background,
      name: getNameFromIndex(background, DEFAULT_BACKGROUNDS)
    };

    // EXAMPLE ATTRIBUTES: to do later
    const attributes = {
      "str": 15,
      "dex": 14,
      "con": 13,
      "int": 12,
      "wis": 10,
      "cha": 8,
    }

    // Creates the character using the function
    const newCharacter = await createCharacter(
      name,
      user,
      raceObj,
      classObj,
      backgroundObj,
      alignmentObj,
      attributes,
    );

    // Response
    res.status(201).json({
      message: `Character created successfully! $(id: ${newCharacter.id})`,
      character: newCharacter,
    });
  } catch (error) {
    // Handle Mongoose Validation Errors (e.g. max level exceeded)
    if (error.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }
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
