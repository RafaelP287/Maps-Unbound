import { CONFIG } from "../config.js";

import mongoose from "mongoose";
import User from "../models/User.js";
import Character from "../models/Character.js";
import { Item, parseEquipmentData } from "../models/Item.js";
import { parseSpellData } from "../models/Spell.js";

function characterIdentifierQuery(id) {
  const clauses = [];
  const numericId = Number(id);

  if (Number.isInteger(numericId)) {
    clauses.push({ characterId: numericId });
  }

  if (mongoose.isValidObjectId(id)) {
    clauses.push({ _id: id });
  }

  return clauses.length > 0 ? { $or: clauses } : { characterId: id };
}

async function findCharacterByIdentifier(id) {
  return await Character.findOne(characterIdentifierQuery(id));
}

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
  return await findCharacterByIdentifier(id);
}

// Finds character by id but expanded
async function getCharacterExpanded(id) {
  const character = await Character.findOne(characterIdentifierQuery(id)).populate("inventory");
  if (!character) return null;
  console.log(await character.getRace());
  console.log(await character.getClass());
  console.log(await character.getAlignment());
  console.log(await character.getBackground());
  return character;
}

// Finds a character by name
async function getCharacterByName(name) {
  return await Character.find({ name: name });
}

// Character creation function
async function createCharacter(
  characterName,
  userName,
  raceObj,
  classObj,
  backgroundObj,
  alignmentObj,
  sheetData = {},
) {
  try {
    const user = await User.findOne({ username: userName });

    if (!user) {
      throw new Error(`User '${userName}' was not found.`);
    }

    // Create and save the new Mongoose document
    const newCharacter = new Character({
      name: characterName,
      user: user._id,
      race: raceObj,
      class: classObj,
      background: backgroundObj,
      alignment: alignmentObj,
      level: sheetData.level,
      experience: sheetData.experience,
      inspiration: sheetData.inspiration,
      attributes: sheetData.attributes,
      hp: sheetData.hp,
      temporaryHp: sheetData.temporaryHp,
      armorClass: sheetData.armorClass,
      initiative: sheetData.initiative,
      speed: sheetData.speed,
      passivePerception: sheetData.passivePerception,
      hitDice: sheetData.hitDice,
      deathSaves: sheetData.deathSaves,
      personalityTraits: sheetData.personalityTraits,
      ideals: sheetData.ideals,
      bonds: sheetData.bonds,
      flaws: sheetData.flaws,
      featuresAndTraits: sheetData.featuresAndTraits,
      languages: sheetData.languages,
      weaponProficiencies: sheetData.weaponProficiencies,
      armorProficiencies: sheetData.armorProficiencies,
      toolProficiencies: sheetData.toolProficiencies,
      skillProficiencies: sheetData.skillProficiencies,
      attacks: sheetData.attacks,
    });

    await newCharacter.save();

    console.log(
      "Character created with fixed bonuses:",
      newCharacter.fixedRacialBonuses,
    );
    return newCharacter;
  } catch (error) {
    console.error("Error creating character:", error);
    throw error;
  }
}

// Character update function
async function updateCharacter(id, updates) {
  const character = await findCharacterByIdentifier(id);

  if (!character) {
    return null;
  }

  Object.assign(character, updates);
  await character.save();
  return character;
}

// Deletes a character only when the requesting user owns it.
async function deleteCharacter(id, userName) {
  const user = await User.findOne({ username: userName });

  if (!user) {
    return { status: "user_not_found" };
  }

  const character = await findCharacterByIdentifier(id);

  if (!character) {
    return { status: "not_found" };
  }

  if (String(character.user) !== String(user._id)) {
    return { status: "forbidden" };
  }

  const inventoryResult = await Item.deleteMany({ owner: character._id });
  await character.deleteOne();

  return {
    status: "deleted",
    character,
    deletedInventoryCount: inventoryResult.deletedCount || 0,
  };
}

// Adds Spell
async function addSpellToCharacter(id, spellIndex) {
  try {
    const currentCharacter = await findCharacterByIdentifier(id);

    if (!currentCharacter) {
      throw new Error("Character not found.");
    }

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
    const character = await findCharacterByIdentifier(id);
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

export {
  getCharacters,
  getCharactersFromUser,
  getCharacter,
  getCharacterExpanded,
  getCharacterByName,
  createCharacter,
  updateCharacter,
  deleteCharacter,
  addSpellToCharacter,
  addItemToInventory,
};
