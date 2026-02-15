const express = require('express');
const router = express.Router();

const Character = require('../models/Character'); 
const User = require('../models/User.js');

const { getCharacters, getCharacter, createCharacter, addSpellToCharacter } = require('../controllers/characterController.js')

// GET all characters 
router.get('/', async (req, res) => {
  try {
    const characters = await getCharacters();
    res.json(characters);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET a single character by ID
router.get('/:id', async (req, res) => {
  try {
    const character = await getCharacter(req.params.id);
    res.status(201).json({
      message: `Obtained the data of ${character.name}!`,
      character: character});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST a new character
router.post('/', async (req, res) => {
  try {
    const { name, user, race, characterClass, attributes, ...charData } = req.body;

    // Create the Character Instance
    const newCharacter = await createCharacter(name, user, race, characterClass, attributes);

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
    const characterId = req.params.id

    const response = await addSpellToCharacter(characterId, spellIndex)
    
    res.status(200).json({
      message: `Successfully added spell "${spellIndex}" to character (ID '${characterId}')`,
      content: response
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
