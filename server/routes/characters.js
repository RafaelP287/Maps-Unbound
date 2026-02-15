const express = require('express');
const router = express.Router();

const Character = require('../models/Character'); 
const User = require('../models/User.js');

const { getCharacters, getCharacter, createCharacter } = require('../controllers/characterController.js')
const { parseSpellData } = require("../models/Spell.js");

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

    // Fetch
    const apiURL = `${CONFIG.api5e}/api/2014/spells/${spellIndex}`
    console.log(`Attempting to fetch from URL: ${apiURL}`);
    const response = await fetch(apiURL);
    const apiJson = await response.json();

    const character = await Character.findOne({ characterId: req.params.id });

    // Parse & Push
    const newSpell = parseSpellData(apiJson);
    
    character.spellbook.push(newSpell);
    await character.save();
    
    console.log(`Successfully added spell "${newSpell.name}" to ${character.name} (ID '${character.characterId}')`)
    res.status(200).json(character);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
