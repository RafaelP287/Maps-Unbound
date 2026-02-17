const { CONFIG } = require("../config.js");

const User = require("../models/User");
const Character = require("../models/Character");
const { Item, parseEquipmentData } = require("../models/Item");

const { parseSpellData } = require("../models/Spell.js");

// Finds every character in the database
async function getCharacters() {
  return await Character.find({});
}

// Finds all characters that belongs to a user
async function getCharactersFromUser(username) {
  const userId = (await User.findOne({ username: username }))?.id;
  return await Character.find({ user: userId });
}

// Finds character by id
async function getCharacter(id) {
  return await Character.findOne({ characterId: id });
}

// Finds character by id but expanded
async function getCharacterExpanded(id) {
  const character = await Character.findOne({ characterId: id }).populate(
    "inventory",
  );
  console.log(await character.getRace());
  console.log(await character.getClass());
  console.log(await character.getAlignment());
  console.log(await character.getBackground());
  return character;
}

// Finds a character by name
async function getCharacterByName(name) {
  return await Character.findOne({ name: name });
}

// Character creation function
async function createCharacter(
  characterName,
  userName,
  raceIndex,
  classIndex,
  baseStats,
) {
  try {
    const userId = (await User.findOne({ username: userName }))?._id;

    // Create and save the new Mongoose document
    const newCharacter = new Character({
      name: characterName,
      user: userId,
      race: raceIndex,
      class: classIndex,
      baseAbilityScores: baseStats,
    });

    newCharacter.calculateBonuses();
    await newCharacter.save();

    console.log(
      "Character created with fixed bonuses:",
      newCharacter.fixedRacialBonuses,
    );
    return newCharacter;
  } catch (error) {
    console.error("Error creating character:", error);
  }
}

// Adds Spell
async function addSpellToCharacter(id, spellIndex) {
  try {
    const currentCharacter = await Character.findOne({ characterId: id });

    const response = await fetch(
      `${CONFIG.api5e}/api/2014/spells/${spellIndex}`,
    );
    const spellJson = await response.json();

    const newSpell = parseSpellData(spellJson);
    currentCharacter.spellbook.push(newSpell);

    await currentCharacter.save();

    console.log(
      `Successfully added spell "${newSpell.name}" to ${currentCharacter.name} (ID '${currentCharacter.characterId}')`,
    );
    return newSpell;
  } catch (error) {
    console.error("Error adding spell to character:", error);
  }
}

// Adds Item
const addItemToInventory = async (req, res) => {
  try {
    const id = req.params.id;
    const { api_index, quantity = 1 } = req.body;

    if (!api_index) {
      return res
        .status(400)
        .json({ error: "Missing api_index in request body." });
    }

    // Verify character exists
    const character = await Character.findOne({ characterId: id });
    if (!character) {
      return res.status(404).json({ error: "Character not found." });
    }

    // Stacking Check
    let existingItem = await Item.findOne({
      owner: character._id,
      api_index: api_index.toLowerCase(),
    });

    if (existingItem) {
      existingItem.quantity += Number(quantity);
      await existingItem.save();

      return res.status(200).json({
        message: `Updated quantity of ${existingItem.name}.`,
        item: existingItem,
      });
    }

    // Fetch Data
    const apiUrl = `${CONFIG.api5e}/api/2014/equipment/${api_index.toLowerCase()}`;
    const apiResponse = await fetch(apiUrl);

    if (!apiResponse.ok) {
      return res.status(404).json({
        error: `The item '${api_index}' was not found in the D&D 5e API.`,
      });
    }

    const apiData = await apiResponse.json();

    // Format & Save
    const parsedItemData = parseEquipmentData(
      apiData,
      character._id,
      Number(quantity),
    );
    const newItem = new Item(parsedItemData);
    await newItem.save();

    return res.status(201).json({
      message: `Successfully added ${newItem.name} to inventory.`,
      item: newItem,
    });
  } catch (error) {
    console.error("Inventory Add Error:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getCharacters,
  getCharactersFromUser,
  getCharacter,
  getCharacterExpanded,
  getCharacterByName,
  createCharacter,
  addSpellToCharacter,
  addItemToInventory,
};
