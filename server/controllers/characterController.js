const { CONFIG } = require('../config.js')

const User = require("../models/User");
const Character = require("../models/Character");

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

module.exports = { getCharacters, getCharactersFromUser, getCharacter, getCharacterExpanded, getCharacterByName, createCharacter };
