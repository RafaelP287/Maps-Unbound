/**
 * D&D 5e Character Progression Rules
 * Automated character advancement based on class and level
 */

// Base ability scores by race
const raceAbilityMods = {
  Human: { strength: 0, dexterity: 0, constitution: 0, intelligence: 0, wisdom: 0, charisma: 0 },
  Elf: { strength: 0, dexterity: 2, constitution: 0, intelligence: 0, wisdom: 0, charisma: 0 },
  Dwarf: { strength: 0, dexterity: 0, constitution: 2, intelligence: 0, wisdom: 0, charisma: 0 },
  Halfling: { strength: 0, dexterity: 2, constitution: 0, intelligence: 0, wisdom: 0, charisma: 0 },
  Dragonborn: { strength: 2, dexterity: 0, constitution: 0, intelligence: 0, wisdom: 0, charisma: 1 },
  Gnome: { strength: 0, dexterity: 0, constitution: 0, intelligence: 2, wisdom: 0, charisma: 0 },
  'Half-Elf': { strength: 0, dexterity: 0, constitution: 0, intelligence: 0, wisdom: 0, charisma: 2 },
  'Half-Orc': { strength: 2, dexterity: 0, constitution: 1, intelligence: 0, wisdom: 0, charisma: 0 },
  Tiefling: { strength: 0, dexterity: 0, constitution: 0, intelligence: 0, wisdom: 0, charisma: 2 },
};

// Proficiency bonus by level
const proficiencyByLevel = {
  1: 2, 2: 2, 3: 2, 4: 2, 5: 3, 6: 3, 7: 3, 8: 3, 9: 4, 10: 4,
  11: 4, 12: 4, 13: 5, 14: 5, 15: 5, 16: 5, 17: 6, 18: 6, 19: 6, 20: 6,
};

// Spellcasting setup by class
const classSpellcasting = {
  Wizard: {
    canCastSpells: true,
    spellcastingAbility: 'intelligence',
    knownSpellsByLevel: {
      1: ['Magic Missile', 'Mage Armor', 'Identify'],
      5: ['Fireball', 'Lightning Bolt'],
      9: ['Cone of Cold'],
    },
    slotsByLevel: {
      1: { level1: 2 },
      2: { level1: 3 },
      3: { level1: 3, level2: 2 },
      4: { level1: 4, level2: 3 },
      5: { level1: 4, level2: 3, level3: 2 },
      6: { level1: 4, level2: 3, level3: 3 },
      7: { level1: 4, level2: 3, level3: 3, level4: 1 },
      8: { level1: 4, level2: 3, level3: 3, level4: 2 },
      9: { level1: 4, level2: 3, level3: 3, level4: 3, level5: 1 },
    },
  },
  Cleric: {
    canCastSpells: true,
    spellcastingAbility: 'wisdom',
    knownSpellsByLevel: {
      1: ['Cure Wounds', 'Bless', 'Guiding Bolt'],
      3: ['Lesser Restoration'],
      5: ['Revivify'],
    },
    slotsByLevel: {
      1: { level1: 2 },
      2: { level1: 3 },
      3: { level1: 3, level2: 2 },
      4: { level1: 4, level2: 2 },
      5: { level1: 4, level2: 3, level3: 2 },
      6: { level1: 4, level2: 3, level3: 3 },
      7: { level1: 4, level2: 3, level3: 3, level4: 1 },
      8: { level1: 4, level2: 3, level3: 3, level4: 2 },
      9: { level1: 4, level2: 3, level3: 3, level4: 3, level5: 1 },
    },
  },
  Warlock: {
    canCastSpells: true,
    spellcastingAbility: 'charisma',
    knownSpellsByLevel: {
      1: ['Eldritch Blast', 'Hex', 'Protection from Evil and Good'],
      5: ['Counterspell (invocation)'],
    },
    slotsByLevel: {
      1: { level1: 1 },
      2: { level1: 2 },
      3: { level1: 2, level2: 1 },
      5: { level1: 2, level2: 2, level3: 1 },
      7: { level1: 2, level2: 2, level3: 2, level4: 1 },
      9: { level1: 2, level2: 2, level3: 2, level4: 2, level5: 1 },
    },
  },
  Sorcerer: {
    canCastSpells: true,
    spellcastingAbility: 'charisma',
    knownSpellsByLevel: {
      1: ['Fire Bolt', 'Mage Armor'],
      5: ['Fireball'],
      9: ['Cone of Cold'],
    },
    slotsByLevel: {
      1: { level1: 2 },
      2: { level1: 3 },
      3: { level1: 3, level2: 2 },
      4: { level1: 4, level2: 2 },
      5: { level1: 4, level2: 3, level3: 2 },
    },
  },
  Bard: {
    canCastSpells: true,
    spellcastingAbility: 'charisma',
    knownSpellsByLevel: {
      1: ['Vicious Mockery', 'Healing Word', 'Tasha\'s Hideous Laughter'],
      3: ['Suggestion'],
      5: ['Counterspell'],
    },
    slotsByLevel: {
      1: { level1: 2 },
      2: { level1: 3 },
      3: { level1: 3, level2: 2 },
      5: { level1: 4, level2: 3, level3: 2 },
    },
  },
  Druid: {
    canCastSpells: true,
    spellcastingAbility: 'wisdom',
    knownSpellsByLevel: {
      1: ['Druidcraft', 'Goodberry', 'Thunderwave'],
      5: ['Call Lightning'],
    },
    slotsByLevel: {
      1: { level1: 2 },
      2: { level1: 3 },
      3: { level1: 3, level2: 2 },
      5: { level1: 4, level2: 3, level3: 2 },
    },
  },
  Ranger: {
    canCastSpells: true,
    spellcastingAbility: 'wisdom',
    knownSpellsByLevel: {
      1: ['Hunter\'s Mark', 'Goodberry'],
      5: ['Pass Without Trace'],
    },
    slotsByLevel: {
      1: { level1: 1 },
      2: { level1: 2 },
      3: { level1: 2 },
      5: { level1: 2, level2: 2 },
    },
  },
  Paladin: {
    canCastSpells: true,
    spellcastingAbility: 'charisma',
    knownSpellsByLevel: {
      2: ['Bless', 'Cure Wounds'],
      5: ['Lesser Restoration'],
    },
    slotsByLevel: {
      2: { level1: 2 },
      3: { level1: 3 },
      5: { level1: 4, level2: 2 },
    },
  },
  Fighter: { canCastSpells: false },
  Barbarian: { canCastSpells: false },
  Rogue: { canCastSpells: false },
  Monk: { canCastSpells: false },
};

// Calculate proficiency bonus
export const getProficiencyBonus = (level) => proficiencyByLevel[Math.min(level, 20)] || 2;

/**
 * Generate starting ability scores based on race
 * Uses standard array: 15, 14, 13, 12, 10, 8
 * Player assigns them, then race modifiers are applied
 */
export const getStartingAbilityScores = (race) => {
  const baseScores = {
    strength: 15,
    dexterity: 14,
    constitution: 13,
    intelligence: 12,
    wisdom: 10,
    charisma: 8,
  };

  const mods = raceAbilityMods[race] || {};
  return {
    strength: Math.min(20, Math.max(1, baseScores.strength + (mods.strength || 0))),
    dexterity: Math.min(20, Math.max(1, baseScores.dexterity + (mods.dexterity || 0))),
    constitution: Math.min(20, Math.max(1, baseScores.constitution + (mods.constitution || 0))),
    intelligence: Math.min(20, Math.max(1, baseScores.intelligence + (mods.intelligence || 0))),
    wisdom: Math.min(20, Math.max(1, baseScores.wisdom + (mods.wisdom || 0))),
    charisma: Math.min(20, Math.max(1, baseScores.charisma + (mods.charisma || 0))),
  };
};

/**
 * Calculate ability score increases at levels 4, 8, 12, 16, 19
 */
export const getAbilityScoreIncrease = (level) => {
  const increasePoints = [4, 8, 12, 16, 19];
  return increasePoints.includes(level) ? 2 : 0; // +2 to one ability or +1 to two abilities
};

/**
 * Get spellcasting info for a class at a given level
 */
export const getSpellcastingInfo = (charClass, level) => {
  const classInfo = classSpellcasting[charClass];

  if (!classInfo || !classInfo.canCastSpells) {
    return {
      canCastSpells: false,
      spellsKnown: [],
      spellSlots: {},
      spellcastingAbility: 'wisdom',
    };
  }

  const spells = [];
  if (classInfo.knownSpellsByLevel) {
    Object.entries(classInfo.knownSpellsByLevel).forEach(([lvl, spellList]) => {
      if (parseInt(lvl) <= level) {
        spells.push(...spellList);
      }
    });
  }

  const slots = classInfo.slotsByLevel?.[level] || {};

  return {
    canCastSpells: true,
    spellsKnown: spells,
    spellSlots: {
      level1: slots.level1 || 0,
      level2: slots.level2 || 0,
      level3: slots.level3 || 0,
      level4: slots.level4 || 0,
      level5: slots.level5 || 0,
      level6: slots.level6 || 0,
      level7: slots.level7 || 0,
      level8: slots.level8 || 0,
      level9: slots.level9 || 0,
    },
    spellcastingAbility: classInfo.spellcastingAbility || 'wisdom',
  };
};

/**
 * Calculate AC based on armor assumptions (light armor + dex, medium armor, heavy armor)
 * For simplicity: Light 10 + dex, Medium 12 + (dex/2), Heavy 16
 * Defaults to light armor with dex bonus
 */
export const calculateArmorClass = (abilityScores) => {
  const dexMod = Math.floor((abilityScores.dexterity - 10) / 2);
  return 10 + dexMod; // Light armor + dex modifier
};

/**
 * Calculate attack bonus based on attack type and ability
 */
export const calculateAttackBonus = (abilityScores, proficiencyBonus, useMelee = true) => {
  const strMod = Math.floor((abilityScores.strength - 10) / 2);
  const dexMod = Math.floor((abilityScores.dexterity - 10) / 2);
  const abilityMod = useMelee ? strMod : dexMod;
  return abilityMod + proficiencyBonus;
};

/**
 * Main function: initialize character with all progression data
 */
export const initializeCharacter = (characterData) => {
  const { class: charClass, race, level = 1 } = characterData;

  const profBonus = getProficiencyBonus(level);
  const abilityScores = getStartingAbilityScores(race);
  const spellcasting = getSpellcastingInfo(charClass, level);
  const ac = calculateArmorClass(abilityScores);
  const attackBonus = calculateAttackBonus(abilityScores, profBonus);

  return {
    abilityScores,
    armorClass: ac,
    attackBonus,
    proficiencyBonus: profBonus,
    spellcasting,
    skills: {
      acrobatics: false,
      animalHandling: false,
      arcana: false,
      athletics: charClass === 'Barbarian' || charClass === 'Fighter',
      deception: charClass === 'Rogue' || charClass === 'Bard',
      history: charClass === 'Wizard' || charClass === 'Cleric',
      insight: charClass === 'Cleric' || charClass === 'Ranger',
      intimidation: charClass === 'Barbarian',
      investigation: charClass === 'Rogue' || charClass === 'Wizard',
      medicine: charClass === 'Cleric',
      nature: charClass === 'Ranger' || charClass === 'Druid',
      perception: charClass === 'Ranger' || charClass === 'Rogue',
      performance: charClass === 'Bard',
      persuasion: charClass === 'Bard' || charClass === 'Paladin',
      sleightOfHand: charClass === 'Rogue',
      stealth: charClass === 'Rogue' || charClass === 'Ranger',
      survival: charClass === 'Ranger' || charClass === 'Barbarian',
    },
    classFeatures: getClassFeatures(charClass, level),
    equipment: getStartingEquipment(charClass),
  };
};

/**
 * Get class features for a given class and level
 */
const getClassFeatures = (charClass, level) => {
  const features = {};

  const classFeatures = {
    Fighter: {
      1: ['Fighting Style', 'Second Wind'],
      2: ['Action Surge'],
      5: ['Extra Attack'],
      11: ['Extra Attack (2)'],
      20: ['Extra Attack (3)'],
    },
    Rogue: {
      1: ['Expertise', 'Sneak Attack', 'Thieves\' Cant'],
      2: ['Cunning Action'],
      5: ['Uncanny Dodge'],
    },
    Barbarian: {
      1: ['Rage', 'Unarmored Defense'],
      2: ['Reckless Attack', 'Danger Sense'],
      5: ['Extra Attack'],
    },
    Wizard: {
      1: ['Spellcasting', 'Arcane Recovery'],
      2: ['Arcane Tradition'],
      10: ['Potent Cantrip'],
    },
    Cleric: {
      1: ['Spellcasting', 'Channel Divinity'],
      2: ['Healing Hands'],
      6: ['Improved Channel Divinity'],
    },
    Ranger: {
      1: ['Spellcasting', 'Favored Enemy', 'Natural Explorer'],
      2: ['Fighting Style'],
      3: ['Ranger Archetype'],
      5: ['Extra Attack'],
    },
    Paladin: {
      1: ['Divine Sense', 'Lay on Hands'],
      2: ['Fighting Style', 'Spellcasting'],
      3: ['Divine Health', 'Sacred Oath'],
      5: ['Extra Attack'],
    },
    Bard: {
      1: ['Spellcasting', 'Bardic Inspiration', 'Bardic Knowledge'],
      2: ['Jack of All Trades', 'Song of Rest'],
      3: ['Bard College'],
    },
    Druid: {
      1: ['Spellcasting', 'Druidic'],
      2: ['Wild Shape'],
      18: ['Timeless Body'],
    },
    Sorcerer: {
      1: ['Spellcasting', 'Sorcerous Origin'],
      2: ['Font of Magic'],
      3: ['Metamagic'],
    },
    Warlock: {
      1: ['Otherworldly Patron', 'Pact Magic'],
      2: ['Eldritch Invocations'],
      11: ['Mystic Arcanum (6th level)'],
    },
    Monk: {
      1: ['Unarmored Defense', 'Martial Arts', 'Spellcasting'],
      2: ['Ki', 'Unarmored Movement'],
      5: ['Extra Attack'],
    },
  };

  const feat = classFeatures[charClass] || {};
  const result = [];

  Object.entries(feat).forEach(([lvl, featureList]) => {
    if (parseInt(lvl) <= level) {
      result.push(...featureList);
    }
  });

  return result;
};

/**
 * Get starting equipment by class
 */
const getStartingEquipment = (charClass) => {
  const equipment = {
    Fighter: ['Longsword', 'Shield', 'Leather Armor', 'Bedroll', 'Rope'],
    Rogue: ['Rapier', 'Shortbow', 'Quiver of 20 Arrows', 'Leather Armor', 'Thieves\' Tools'],
    Barbarian: ['Greataxe', 'Handaxe', 'Hide Armor', 'Bedroll'],
    Wizard: ['Quarterstaff', 'Dagger', 'Spellbook', 'Scholar\'s Pack'],
    Cleric: ['Mace', 'Holy Symbol', 'Priest\'s Pack', 'Chain Mail'],
    Ranger: ['Longsword', 'Shortbow', 'Quiver of 20 Arrows', 'Leather Armor'],
    Paladin: ['Longsword', 'Shield', 'Plate Armor', 'Holy Symbol'],
    Bard: ['Rapier', 'Dagger', 'Lute', 'Leather Armor', 'Entertainer\'s Pack'],
    Druid: ['Quarterstaff', 'Shield', 'Scimitar', 'Leather Armor'],
    Sorcerer: ['Dagger', 'Dagger', 'Scholar\'s Pack', 'Leather Armor'],
    Warlock: ['Dagger', 'Light Crossbow', 'Bolts', 'Scholar\'s Pack'],
    Monk: ['Shortsword', 'Shortbow', 'Quiver of 20 Arrows', 'Monk\'s Outfit'],
  };

  return equipment[charClass] || ['Dagger', 'Backpack'];
};

export default {
  getProficiencyBonus,
  getStartingAbilityScores,
  getAbilityScoreIncrease,
  getSpellcastingInfo,
  calculateArmorClass,
  calculateAttackBonus,
  initializeCharacter,
};
