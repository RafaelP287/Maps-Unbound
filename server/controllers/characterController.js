const { CONFIG } = require('../config.js')

const User = require("../models/User");
const Character = require("../models/Character");

const { parseSpellData } = require("../models/Spell.js");

async function getCharacters() {
  return Character.find({})
}

async function getCharactersFromUser(username) {
  const userId = (await User.findOne({ username: username }))?.id;
  return Character.find({ user: userId })
}

async function getCharacter(id) {
  return Character.findOne({characterId: id})
}

async function getCharacterExpanded(id) {
  return Character.findOne({characterId: id})
  // todo: return json but expanded everything
}

async function getCharacterByName(name) {
  return Character.findOne({name: name})
}

// Character creation function
async function createCharacter(characterName, userName, raceIndex, classIndex, baseStats) {
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

    console.log("Character created with fixed bonuses:", newCharacter.fixedRacialBonuses);
    return newCharacter;
  } catch (error) {
    console.error("Error creating character:", error);
  }
}

async function addSpellToCharacter(id, spellIndex) {
  try {
    const currentCharacter = await Character.findOne({ characterId: id });

    const response = await fetch(`${CONFIG.api5e}/api/2014/spells/${spellIndex}`);
    const spellJson = await response.json();

    const newSpell = parseSpellData(spellJson);
    currentCharacter.spellbook.push(newSpell);

    await currentCharacter.save();

    console.log(`Successfully added spell "${newSpell.name}" to ${currentCharacter.name} (ID '${currentCharacter.characterId}')`)
    return newSpell
  } catch (error) {
    console.error("Error adding spell to character:", error);
  }
}

module.exports = { getCharacters, getCharactersFromUser, getCharacter, getCharacterExpanded, getCharacterByName, createCharacter, addSpellToCharacter };
