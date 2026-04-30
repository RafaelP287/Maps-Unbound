import { createElement, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  HeartPulse,
  Plus,
  Save,
  Shield,
  Sparkles,
  Swords,
  Trash2,
  UserRound,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import Gate from "../../shared/Gate.jsx";
import {
  ABILITY_FIELDS,
  ALIGNMENT_OPTIONS,
  BACKGROUND_OPTIONS,
  CLASS_OPTIONS,
  DEFAULT_ATTACK,
  DEFAULT_CHARACTER_FORM,
  RACE_OPTIONS,
  SKILL_FIELDS,
  abilityModifier,
  buildCharacterPayload,
  formatModifier,
  getCharacterImage,
  optionName,
  proficiencyBonus,
  suggestedHitDice,
} from "./characterFormData.js";

const API_SERVER = import.meta.env.VITE_API_SERVER || "";

const steps = [
  { label: "Origin", icon: UserRound },
  { label: "Abilities", icon: Sparkles },
  { label: "Combat", icon: Shield },
  { label: "Training", icon: BookOpen },
  { label: "Story", icon: Swords },
];

function CreateCharacter() {
  const navigate = useNavigate();
  const { user, token, isLoggedIn, loading: authLoading } = useAuth();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState(DEFAULT_CHARACTER_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const className = optionName(CLASS_OPTIONS, formData.characterClass);
  const raceName = optionName(RACE_OPTIONS, formData.race);
  const backgroundName = optionName(BACKGROUND_OPTIONS, formData.background);
  const armorClass = Number(formData.armorClass) || 10;
  const maxHp = Number(formData.hp.max) || 1;
  const passivePerception = Number(formData.passivePerception) || 10;

  const selectedSkillCount = useMemo(
    () => formData.skillProficiencies.length,
    [formData.skillProficiencies],
  );

  if (authLoading) {
    return <div className="character-status">Loading your character vault...</div>;
  }

  if (!isLoggedIn) {
    return <Gate>Sign in to access your characters.</Gate>;
  }

  const updateField = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const updateNestedField = (section, name, value) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [name]: value,
      },
    }));
  };

  const updateAbility = (ability, value) => {
    setFormData((prev) => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        [ability]: value,
      },
      passivePerception:
        ability === "wis"
          ? 10 +
            abilityModifier(value) +
            (prev.skillProficiencies.includes("perception") ? proficiencyBonus(prev.level) : 0)
          : prev.passivePerception,
    }));
  };

  const updateClass = (value) => {
    setFormData((prev) => ({
      ...prev,
      characterClass: value,
      hitDice: suggestedHitDice(value, prev.level),
    }));
  };

  const updateLevel = (value) => {
    setFormData((prev) => ({
      ...prev,
      level: value,
      hitDice: suggestedHitDice(prev.characterClass, value),
    }));
  };

  const toggleSkill = (skillIndex) => {
    setFormData((prev) => {
      const hasSkill = prev.skillProficiencies.includes(skillIndex);
      const nextSkills = hasSkill
        ? prev.skillProficiencies.filter((skill) => skill !== skillIndex)
        : [...prev.skillProficiencies, skillIndex];

      return {
        ...prev,
        skillProficiencies: nextSkills,
        passivePerception:
          skillIndex === "perception"
            ? 10 +
              abilityModifier(prev.attributes.wis) +
              (!hasSkill ? proficiencyBonus(prev.level) : 0)
            : prev.passivePerception,
      };
    });
  };

  const updateAttack = (index, name, value) => {
    setFormData((prev) => ({
      ...prev,
      attacks: prev.attacks.map((attack, attackIndex) =>
        attackIndex === index ? { ...attack, [name]: value } : attack,
      ),
    }));
  };

  const addAttack = () => {
    setFormData((prev) => ({
      ...prev,
      attacks: [...prev.attacks, { ...DEFAULT_ATTACK }],
    }));
  };

  const removeAttack = (index) => {
    setFormData((prev) => ({
      ...prev,
      attacks: prev.attacks.length === 1 ? [{ ...DEFAULT_ATTACK }] : prev.attacks.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");

    if (step < steps.length - 1) {
      setStep((current) => current + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const payload = buildCharacterPayload(formData, user?.username || "");

    if (payload.name.length < 2) {
      setSubmitError("Character name must be at least 2 characters.");
      setStep(0);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_SERVER}/api/characters`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || "Failed to save character.");
      }

      navigate("/characters");
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const goBack = () => {
    if (step === 0) {
      navigate("/characters");
      return;
    }

    setStep((current) => current - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="character-page">
      <div className="character-shell">
        <header className="character-header">
          <div className="character-header-copy">
            <p className="character-eyebrow">Character Forge</p>
            <h1 className="character-title">Create a Character</h1>
            <p className="character-subtitle">
              Build the sheet in order: concept, abilities, combat, proficiencies, and story.
            </p>
          </div>

          <Link to="/characters" className="character-btn-link character-btn-secondary">
            <ArrowLeft aria-hidden="true" />
            My Characters
          </Link>
        </header>

        <div className="character-form-layout">
          <aside className="character-preview-panel" aria-label="Character preview">
            <div
              className="character-preview-art"
            >
              <img className="character-preview-img" src={getCharacterImage(formData.characterClass)} alt="" />
            </div>
            <div className="character-preview-body">
              <h2 className="character-preview-name">{formData.name || "Unnamed Hero"}</h2>
              <p className="character-preview-meta">
                Level {formData.level || 1} {raceName} {className}
              </p>
              <div className="character-preview-stats">
                <div className="character-preview-stat">
                  <span>Armor</span>
                  <strong>{armorClass}</strong>
                </div>
                <div className="character-preview-stat">
                  <span>Hit Points</span>
                  <strong>{maxHp}</strong>
                </div>
                <div className="character-preview-stat">
                  <span>Passive</span>
                  <strong>{passivePerception}</strong>
                </div>
                <div className="character-preview-stat">
                  <span>Prof.</span>
                  <strong>+{proficiencyBonus(formData.level)}</strong>
                </div>
              </div>
            </div>
          </aside>

          <form className="character-form-panel" onSubmit={handleSubmit}>
            <nav className="character-stepper" aria-label="Character creation steps">
              {steps.map((item, index) => (
                <div
                  className={`character-step-pill ${index === step ? "is-active" : ""} ${
                    index < step ? "is-complete" : ""
                  }`}
                  key={item.label}
                >
                  <span className="character-step-number">{index < step ? <Check aria-hidden="true" /> : index + 1}</span>
                  <span className="character-step-label">{item.label}</span>
                </div>
              ))}
            </nav>

            {submitError && <div className="character-error">{submitError}</div>}

            {step === 0 && (
              <section className="character-section">
                <SectionHeader
                  icon={UserRound}
                  title="Origin"
                  subtitle="Name the hero and set the foundation of the sheet."
                />

                <div className="character-field-grid">
                  <label className="character-field span-2">
                    <span className="character-label">Character Name</span>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(event) => updateField("name", event.target.value)}
                      placeholder="Seraphina Emberfall"
                      minLength={2}
                      maxLength={30}
                      required
                    />
                  </label>

                  <label className="character-field">
                    <span className="character-label">Class</span>
                    <select
                      value={formData.characterClass}
                      onChange={(event) => updateClass(event.target.value)}
                      required
                    >
                      {CLASS_OPTIONS.map((option) => (
                        <option key={option.index} value={option.index}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="character-field">
                    <span className="character-label">Level</span>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={formData.level}
                      onChange={(event) => updateLevel(event.target.value)}
                      required
                    />
                  </label>

                  <label className="character-field">
                    <span className="character-label">Race</span>
                    <select value={formData.race} onChange={(event) => updateField("race", event.target.value)}>
                      {RACE_OPTIONS.map((option) => (
                        <option key={option.index} value={option.index}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="character-field">
                    <span className="character-label">Background</span>
                    <select
                      value={formData.background}
                      onChange={(event) => updateField("background", event.target.value)}
                    >
                      {BACKGROUND_OPTIONS.map((option) => (
                        <option key={option.index} value={option.index}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="character-field">
                    <span className="character-label">Alignment</span>
                    <select
                      value={formData.alignment}
                      onChange={(event) => updateField("alignment", event.target.value)}
                    >
                      {ALIGNMENT_OPTIONS.map((option) => (
                        <option key={option.index} value={option.index}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="character-field">
                    <span className="character-label">Experience</span>
                    <input
                      type="number"
                      min="0"
                      value={formData.experience}
                      onChange={(event) => updateField("experience", event.target.value)}
                    />
                  </label>

                  <label className="character-checkbox-row span-2">
                    <input
                      type="checkbox"
                      checked={formData.inspiration}
                      onChange={(event) => updateField("inspiration", event.target.checked)}
                    />
                    Inspiration
                  </label>
                </div>
              </section>
            )}

            {step === 1 && (
              <section className="character-section">
                <SectionHeader
                  icon={Sparkles}
                  title="Ability Scores"
                  subtitle="Set the six core abilities and review their modifiers."
                />

                <div className="character-ability-grid">
                  {ABILITY_FIELDS.map((ability) => (
                    <div className="character-ability-card" key={ability.key}>
                      <label htmlFor={`ability-${ability.key}`}>{ability.short}</label>
                      <input
                        id={`ability-${ability.key}`}
                        type="number"
                        min="1"
                        max="30"
                        value={formData.attributes[ability.key]}
                        onChange={(event) => updateAbility(ability.key, event.target.value)}
                        required
                      />
                      <span className="character-ability-mod">{formatModifier(formData.attributes[ability.key])}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {step === 2 && (
              <section className="character-section">
                <SectionHeader
                  icon={HeartPulse}
                  title="Combat"
                  subtitle="Add the quick-reference values used most often at the table."
                />

                <div className="character-field-grid three">
                  <label className="character-field">
                    <span className="character-label">Armor Class</span>
                    <input
                      type="number"
                      min="0"
                      value={formData.armorClass}
                      onChange={(event) => updateField("armorClass", event.target.value)}
                    />
                  </label>

                  <label className="character-field">
                    <span className="character-label">Initiative</span>
                    <input
                      type="number"
                      value={formData.initiative}
                      onChange={(event) => updateField("initiative", event.target.value)}
                    />
                  </label>

                  <label className="character-field">
                    <span className="character-label">Speed</span>
                    <input
                      type="number"
                      min="0"
                      value={formData.speed}
                      onChange={(event) => updateField("speed", event.target.value)}
                    />
                  </label>

                  <label className="character-field">
                    <span className="character-label">Current HP</span>
                    <input
                      type="number"
                      min="0"
                      value={formData.hp.current}
                      onChange={(event) => updateNestedField("hp", "current", event.target.value)}
                    />
                  </label>

                  <label className="character-field">
                    <span className="character-label">Max HP</span>
                    <input
                      type="number"
                      min="1"
                      value={formData.hp.max}
                      onChange={(event) => updateNestedField("hp", "max", event.target.value)}
                    />
                  </label>

                  <label className="character-field">
                    <span className="character-label">Temp HP</span>
                    <input
                      type="number"
                      min="0"
                      value={formData.temporaryHp}
                      onChange={(event) => updateField("temporaryHp", event.target.value)}
                    />
                  </label>

                  <label className="character-field">
                    <span className="character-label">Hit Dice</span>
                    <input
                      type="text"
                      value={formData.hitDice}
                      onChange={(event) => updateField("hitDice", event.target.value)}
                      placeholder="1d10"
                    />
                  </label>

                  <label className="character-field">
                    <span className="character-label">Passive Perception</span>
                    <input
                      type="number"
                      min="0"
                      value={formData.passivePerception}
                      onChange={(event) => updateField("passivePerception", event.target.value)}
                    />
                  </label>

                  <label className="character-field">
                    <span className="character-label">Death Saves</span>
                    <div className="character-field-grid">
                      <input
                        aria-label="Death save successes"
                        type="number"
                        min="0"
                        max="3"
                        value={formData.deathSaves.successes}
                        onChange={(event) => updateNestedField("deathSaves", "successes", event.target.value)}
                        placeholder="Successes"
                      />
                      <input
                        aria-label="Death save failures"
                        type="number"
                        min="0"
                        max="3"
                        value={formData.deathSaves.failures}
                        onChange={(event) => updateNestedField("deathSaves", "failures", event.target.value)}
                        placeholder="Failures"
                      />
                    </div>
                  </label>
                </div>
              </section>
            )}

            {step === 3 && (
              <section className="character-section">
                <SectionHeader
                  icon={BookOpen}
                  title="Training"
                  subtitle="Track skill proficiencies, languages, tools, armor, and weapons."
                />

                <div>
                  <span className="character-label">Skill Proficiencies</span>
                  <p className="character-helper">{selectedSkillCount} selected</p>
                  <div className="character-skill-grid">
                    {SKILL_FIELDS.map((skill) => (
                      <label className="character-skill-toggle" key={skill.index}>
                        <input
                          type="checkbox"
                          checked={formData.skillProficiencies.includes(skill.index)}
                          onChange={() => toggleSkill(skill.index)}
                        />
                        <span className="character-skill-name">{skill.name}</span>
                        <span className="character-skill-ability">{skill.ability}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="character-field-grid">
                  <label className="character-field">
                    <span className="character-label">Languages</span>
                    <textarea
                      rows="4"
                      value={formData.languages}
                      onChange={(event) => updateField("languages", event.target.value)}
                      placeholder="Common"
                    />
                  </label>

                  <label className="character-field">
                    <span className="character-label">Tools</span>
                    <textarea
                      rows="4"
                      value={formData.toolProficiencies}
                      onChange={(event) => updateField("toolProficiencies", event.target.value)}
                      placeholder="Thieves' tools"
                    />
                  </label>

                  <label className="character-field">
                    <span className="character-label">Weapons</span>
                    <textarea
                      rows="4"
                      value={formData.weaponProficiencies}
                      onChange={(event) => updateField("weaponProficiencies", event.target.value)}
                      placeholder="Simple weapons"
                    />
                  </label>

                  <label className="character-field">
                    <span className="character-label">Armor</span>
                    <textarea
                      rows="4"
                      value={formData.armorProficiencies}
                      onChange={(event) => updateField("armorProficiencies", event.target.value)}
                      placeholder="Light armor"
                    />
                  </label>
                </div>
              </section>
            )}

            {step === 4 && (
              <section className="character-section">
                <SectionHeader
                  icon={Swords}
                  title="Story and Actions"
                  subtitle="Round out the roleplay notes and the attacks panel."
                />

                <div className="character-field-grid">
                  <label className="character-field">
                    <span className="character-label">Personality Traits</span>
                    <textarea
                      rows="4"
                      value={formData.personalityTraits}
                      onChange={(event) => updateField("personalityTraits", event.target.value)}
                      placeholder="Quiet until the blades come out."
                    />
                  </label>

                  <label className="character-field">
                    <span className="character-label">Ideals</span>
                    <textarea
                      rows="4"
                      value={formData.ideals}
                      onChange={(event) => updateField("ideals", event.target.value)}
                      placeholder="Freedom, honor, discovery..."
                    />
                  </label>

                  <label className="character-field">
                    <span className="character-label">Bonds</span>
                    <textarea
                      rows="4"
                      value={formData.bonds}
                      onChange={(event) => updateField("bonds", event.target.value)}
                      placeholder="A lost mentor, a family oath..."
                    />
                  </label>

                  <label className="character-field">
                    <span className="character-label">Flaws</span>
                    <textarea
                      rows="4"
                      value={formData.flaws}
                      onChange={(event) => updateField("flaws", event.target.value)}
                      placeholder="Too curious for locked doors."
                    />
                  </label>

                  <label className="character-field span-2">
                    <span className="character-label">Features and Traits</span>
                    <textarea
                      rows="5"
                      value={formData.featuresAndTraits}
                      onChange={(event) => updateField("featuresAndTraits", event.target.value)}
                      placeholder="Second Wind, Darkvision, Sneak Attack..."
                    />
                  </label>
                </div>

                <div className="character-attack-list">
                  <div className="character-editor-toolbar">
                    <div>
                      <span className="character-label">Attacks and Spellcasting</span>
                      <p className="character-helper">Quick attacks, cantrips, or signature actions.</p>
                    </div>
                    <button type="button" className="character-button character-btn-secondary" onClick={addAttack}>
                      <Plus aria-hidden="true" />
                      Add
                    </button>
                  </div>

                  {formData.attacks.map((attack, index) => (
                    <div className="character-attack-row" key={`attack-${index}`}>
                      <label className="character-field">
                        <span className="character-label">Name</span>
                        <input
                          type="text"
                          value={attack.name}
                          onChange={(event) => updateAttack(index, "name", event.target.value)}
                          placeholder="Longsword"
                        />
                      </label>
                      <label className="character-field">
                        <span className="character-label">Bonus</span>
                        <input
                          type="text"
                          value={attack.attackBonus}
                          onChange={(event) => updateAttack(index, "attackBonus", event.target.value)}
                          placeholder="+5"
                        />
                      </label>
                      <label className="character-field">
                        <span className="character-label">Damage</span>
                        <input
                          type="text"
                          value={attack.damageAndType}
                          onChange={(event) => updateAttack(index, "damageAndType", event.target.value)}
                          placeholder="1d8+3 slashing"
                        />
                      </label>
                      <button
                        type="button"
                        className="character-icon-button character-btn-danger"
                        onClick={() => removeAttack(index)}
                        aria-label="Remove attack"
                      >
                        <Trash2 aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="character-review-grid">
                  <ReviewItem label="Origin" value={`${raceName} ${className}`} />
                  <ReviewItem label="Background" value={backgroundName} />
                  <ReviewItem label="Proficiency" value={`+${proficiencyBonus(formData.level)}`} />
                </div>
              </section>
            )}

            <div className="character-form-actions">
              <button type="button" className="character-button character-btn-secondary" onClick={goBack} disabled={isSubmitting}>
                <ArrowLeft aria-hidden="true" />
                {step === 0 ? "Cancel" : "Back"}
              </button>

              <button type="submit" className="character-button character-btn-save" disabled={isSubmitting}>
                {step < steps.length - 1 ? (
                  <>
                    Next
                    <ArrowRight aria-hidden="true" />
                  </>
                ) : (
                  <>
                    <Save aria-hidden="true" />
                    {isSubmitting ? "Saving..." : "Create Character"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }) {
  return (
    <header className="character-section-head">
      <span className="character-section-icon">
        {createElement(icon, { "aria-hidden": "true" })}
      </span>
      <div>
        <h2 className="character-section-title">{title}</h2>
        <p className="character-section-subtitle">{subtitle}</p>
      </div>
    </header>
  );
}

function ReviewItem({ label, value }) {
  return (
    <div className="character-review-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default CreateCharacter;
