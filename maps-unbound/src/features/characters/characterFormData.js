export const ABILITY_FIELDS = [
  { key: "str", label: "Strength", short: "STR" },
  { key: "dex", label: "Dexterity", short: "DEX" },
  { key: "con", label: "Constitution", short: "CON" },
  { key: "int", label: "Intelligence", short: "INT" },
  { key: "wis", label: "Wisdom", short: "WIS" },
  { key: "cha", label: "Charisma", short: "CHA" },
];

export const CLASS_OPTIONS = [
  { index: "barbarian", name: "Barbarian", hitDie: "d12" },
  { index: "bard", name: "Bard", hitDie: "d8" },
  { index: "cleric", name: "Cleric", hitDie: "d8" },
  { index: "druid", name: "Druid", hitDie: "d8" },
  { index: "fighter", name: "Fighter", hitDie: "d10" },
  { index: "monk", name: "Monk", hitDie: "d8" },
  { index: "paladin", name: "Paladin", hitDie: "d10" },
  { index: "ranger", name: "Ranger", hitDie: "d10" },
  { index: "rogue", name: "Rogue", hitDie: "d8" },
  { index: "sorcerer", name: "Sorcerer", hitDie: "d6" },
  { index: "warlock", name: "Warlock", hitDie: "d8" },
  { index: "wizard", name: "Wizard", hitDie: "d6" },
];

export const RACE_OPTIONS = [
  { index: "dragonborn", name: "Dragonborn" },
  { index: "dwarf", name: "Dwarf" },
  { index: "elf", name: "Elf" },
  { index: "gnome", name: "Gnome" },
  { index: "half-elf", name: "Half-Elf" },
  { index: "half-orc", name: "Half-Orc" },
  { index: "halfling", name: "Halfling" },
  { index: "human", name: "Human" },
  { index: "tiefling", name: "Tiefling" },
];

export const BACKGROUND_OPTIONS = [
  { index: "acolyte", name: "Acolyte" },
  { index: "charlatan", name: "Charlatan" },
  { index: "criminal", name: "Criminal" },
  { index: "entertainer", name: "Entertainer" },
  { index: "folk-hero", name: "Folk Hero" },
  { index: "guild-artisan", name: "Guild Artisan" },
  { index: "hermit", name: "Hermit" },
  { index: "noble", name: "Noble" },
  { index: "outlander", name: "Outlander" },
  { index: "sage", name: "Sage" },
  { index: "sailor", name: "Sailor" },
  { index: "soldier", name: "Soldier" },
  { index: "urchin", name: "Urchin" },
  { index: "custom", name: "Custom" },
];

export const ALIGNMENT_OPTIONS = [
  { index: "lawful-good", name: "Lawful Good" },
  { index: "neutral-good", name: "Neutral Good" },
  { index: "chaotic-good", name: "Chaotic Good" },
  { index: "lawful-neutral", name: "Lawful Neutral" },
  { index: "neutral", name: "Neutral" },
  { index: "chaotic-neutral", name: "Chaotic Neutral" },
  { index: "lawful-evil", name: "Lawful Evil" },
  { index: "neutral-evil", name: "Neutral Evil" },
  { index: "chaotic-evil", name: "Chaotic Evil" },
];

export const SKILL_FIELDS = [
  { index: "acrobatics", name: "Acrobatics", ability: "DEX" },
  { index: "animal-handling", name: "Animal Handling", ability: "WIS" },
  { index: "arcana", name: "Arcana", ability: "INT" },
  { index: "athletics", name: "Athletics", ability: "STR" },
  { index: "deception", name: "Deception", ability: "CHA" },
  { index: "history", name: "History", ability: "INT" },
  { index: "insight", name: "Insight", ability: "WIS" },
  { index: "intimidation", name: "Intimidation", ability: "CHA" },
  { index: "investigation", name: "Investigation", ability: "INT" },
  { index: "medicine", name: "Medicine", ability: "WIS" },
  { index: "nature", name: "Nature", ability: "INT" },
  { index: "perception", name: "Perception", ability: "WIS" },
  { index: "performance", name: "Performance", ability: "CHA" },
  { index: "persuasion", name: "Persuasion", ability: "CHA" },
  { index: "religion", name: "Religion", ability: "INT" },
  { index: "sleight-of-hand", name: "Sleight of Hand", ability: "DEX" },
  { index: "stealth", name: "Stealth", ability: "DEX" },
  { index: "survival", name: "Survival", ability: "WIS" },
];

export const DEFAULT_ATTACK = {
  name: "",
  attackBonus: "",
  damageAndType: "",
};

export const DEFAULT_CHARACTER_FORM = {
  name: "",
  race: "human",
  characterClass: "fighter",
  background: "soldier",
  alignment: "neutral-good",
  level: 1,
  experience: 0,
  inspiration: false,
  attributes: {
    str: 15,
    dex: 14,
    con: 13,
    int: 12,
    wis: 10,
    cha: 8,
  },
  hp: {
    current: 12,
    max: 12,
  },
  temporaryHp: 0,
  armorClass: 14,
  initiative: 2,
  speed: 30,
  passivePerception: 10,
  hitDice: "1d10",
  deathSaves: {
    successes: 0,
    failures: 0,
  },
  skillProficiencies: ["athletics", "perception"],
  languages: "Common",
  weaponProficiencies: "Simple weapons\nMartial weapons",
  armorProficiencies: "Light armor\nMedium armor\nShields",
  toolProficiencies: "",
  personalityTraits: "",
  ideals: "",
  bonds: "",
  flaws: "",
  featuresAndTraits: "",
  attacks: [{ ...DEFAULT_ATTACK }],
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function abilityModifier(score) {
  return Math.floor((toNumber(score, 10) - 10) / 2);
}

export function formatModifier(score) {
  const mod = abilityModifier(score);
  return mod >= 0 ? `+${mod}` : String(mod);
}

export function proficiencyBonus(level) {
  return Math.floor((toNumber(level, 1) - 1) / 4) + 2;
}

export function titleFromIndex(index = "") {
  return String(index)
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function optionName(options, index) {
  const found = options.find((option) => option.index === index);
  return found?.name || titleFromIndex(index);
}

export function getClassOption(index) {
  return CLASS_OPTIONS.find((option) => option.index === index) || CLASS_OPTIONS[4];
}

export function suggestedHitDice(classIndex, level = 1) {
  return `${clamp(toNumber(level, 1), 1, 20)}${getClassOption(classIndex).hitDie}`;
}

export function getCharacterImage(characterClass) {
  const classIndex =
    typeof characterClass === "string"
      ? characterClass
      : characterClass?.index || "fighter";

  return `/images/classes/character/${classIndex}.png`;
}

export function listToText(value) {
  if (Array.isArray(value)) return value.join("\n");
  if (typeof value === "string") return value;
  return "";
}

export function textToList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value || "")
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function selectIndex(value, fallback = "") {
  if (typeof value === "string") return value || fallback;
  return value?.index || fallback;
}

export function characterToForm(character = {}) {
  const level = clamp(toNumber(character.level, DEFAULT_CHARACTER_FORM.level), 1, 20);
  const characterClass = selectIndex(character.class, DEFAULT_CHARACTER_FORM.characterClass);
  const attributes = { ...DEFAULT_CHARACTER_FORM.attributes, ...(character.attributes || {}) };

  const proficientSkills = Array.isArray(character.skillProficiencies)
    ? character.skillProficiencies
        .filter((skill) => (typeof skill === "string" ? true : skill?.is_proficient))
        .map((skill) => (typeof skill === "string" ? skill : skill.api_index))
        .filter(Boolean)
    : DEFAULT_CHARACTER_FORM.skillProficiencies;

  const attacks =
    Array.isArray(character.attacks) && character.attacks.length > 0
      ? character.attacks.map((attack) => ({
          name: attack.name || "",
          attackBonus: attack.attackBonus || "",
          damageAndType: attack.damageAndType || "",
        }))
      : [{ ...DEFAULT_ATTACK }];

  return {
    ...DEFAULT_CHARACTER_FORM,
    name: character.name || "",
    race: selectIndex(character.race, DEFAULT_CHARACTER_FORM.race),
    characterClass,
    background: selectIndex(character.background, DEFAULT_CHARACTER_FORM.background),
    alignment: selectIndex(character.alignment, DEFAULT_CHARACTER_FORM.alignment),
    level,
    experience: toNumber(character.experience, DEFAULT_CHARACTER_FORM.experience),
    inspiration: Boolean(character.inspiration),
    attributes,
    hp: {
      current: toNumber(character.hp?.current, DEFAULT_CHARACTER_FORM.hp.current),
      max: toNumber(character.hp?.max, DEFAULT_CHARACTER_FORM.hp.max),
    },
    temporaryHp: toNumber(character.temporaryHp, DEFAULT_CHARACTER_FORM.temporaryHp),
    armorClass: toNumber(character.armorClass, DEFAULT_CHARACTER_FORM.armorClass),
    initiative: toNumber(character.initiative, abilityModifier(attributes.dex)),
    speed: toNumber(character.speed, DEFAULT_CHARACTER_FORM.speed),
    passivePerception: toNumber(character.passivePerception, DEFAULT_CHARACTER_FORM.passivePerception),
    hitDice: character.hitDice || suggestedHitDice(characterClass, level),
    deathSaves: {
      successes: clamp(toNumber(character.deathSaves?.successes, 0), 0, 3),
      failures: clamp(toNumber(character.deathSaves?.failures, 0), 0, 3),
    },
    skillProficiencies: proficientSkills,
    languages: listToText(character.languages),
    weaponProficiencies: listToText(character.weaponProficiencies),
    armorProficiencies: listToText(character.armorProficiencies),
    toolProficiencies: listToText(character.toolProficiencies),
    personalityTraits: listToText(character.personalityTraits),
    ideals: listToText(character.ideals),
    bonds: listToText(character.bonds),
    flaws: listToText(character.flaws),
    featuresAndTraits: listToText(character.featuresAndTraits),
    attacks,
  };
}

export function buildCharacterPayload(form, username) {
  const level = clamp(toNumber(form.level, 1), 1, 20);
  const attributes = ABILITY_FIELDS.reduce((next, ability) => {
    next[ability.key] = clamp(toNumber(form.attributes?.[ability.key], 10), 1, 30);
    return next;
  }, {});

  return {
    name: String(form.name || "").trim(),
    user: username,
    race: form.race,
    characterClass: form.characterClass,
    background: form.background,
    alignment: form.alignment,
    level,
    experience: Math.max(0, toNumber(form.experience, 0)),
    inspiration: Boolean(form.inspiration),
    attributes,
    hp: {
      current: Math.max(0, toNumber(form.hp?.current, 0)),
      max: Math.max(1, toNumber(form.hp?.max, 1)),
    },
    temporaryHp: Math.max(0, toNumber(form.temporaryHp, 0)),
    armorClass: Math.max(0, toNumber(form.armorClass, 10)),
    initiative: toNumber(form.initiative, 0),
    speed: Math.max(0, toNumber(form.speed, 30)),
    passivePerception: Math.max(0, toNumber(form.passivePerception, 10)),
    hitDice: String(form.hitDice || "").trim(),
    deathSaves: {
      successes: clamp(toNumber(form.deathSaves?.successes, 0), 0, 3),
      failures: clamp(toNumber(form.deathSaves?.failures, 0), 0, 3),
    },
    skillProficiencies: Array.isArray(form.skillProficiencies) ? form.skillProficiencies : [],
    languages: textToList(form.languages),
    weaponProficiencies: textToList(form.weaponProficiencies),
    armorProficiencies: textToList(form.armorProficiencies),
    toolProficiencies: textToList(form.toolProficiencies),
    personalityTraits: textToList(form.personalityTraits),
    ideals: textToList(form.ideals),
    bonds: textToList(form.bonds),
    flaws: textToList(form.flaws),
    featuresAndTraits: textToList(form.featuresAndTraits),
    attacks: (form.attacks || [])
      .map((attack) => ({
        name: String(attack.name || "").trim(),
        attackBonus: String(attack.attackBonus || "").trim(),
        damageAndType: String(attack.damageAndType || "").trim(),
      }))
      .filter((attack) => attack.name),
  };
}
