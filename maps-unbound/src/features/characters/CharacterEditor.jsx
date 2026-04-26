import { createElement, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  HeartPulse,
  Plus,
  Save,
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
  characterToForm,
  formatModifier,
  getCharacterImage,
  optionName,
  proficiencyBonus,
  suggestedHitDice,
} from "./characterFormData.js";

const API_SERVER = import.meta.env.VITE_API_SERVER || "";

function CharacterEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token, isLoggedIn, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState(DEFAULT_CHARACTER_FORM);
  const [initialSnapshot, setInitialSnapshot] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const allowNavigationRef = useRef(false);

  const isDirty = useMemo(
    () => Boolean(initialSnapshot) && JSON.stringify(formData) !== initialSnapshot,
    [formData, initialSnapshot],
  );
  const isDirtyRef = useRef(isDirty);

  const className = optionName(CLASS_OPTIONS, formData.characterClass);
  const raceName = optionName(RACE_OPTIONS, formData.race);
  const selectedSkillCount = formData.skillProficiencies.length;

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    if (!isLoggedIn || !id) {
      setIsLoading(false);
      return;
    }

    const fetchCharacter = async () => {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetch(`${API_SERVER}/api/characters/${id}`);

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || data.message || "Could not load that character.");
        }

        const data = await response.json();
        const nextForm = characterToForm(data.character || data);
        setFormData(nextForm);
        setInitialSnapshot(JSON.stringify(nextForm));
      } catch (err) {
        setError(err.message || "Could not load that character.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCharacter();
  }, [id, isLoggedIn]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!isDirtyRef.current || allowNavigationRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    const handleDocumentClick = (event) => {
      if (!isDirtyRef.current || allowNavigationRef.current) return;
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const anchor = event.target.closest?.("a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const nextUrl = new URL(anchor.href, window.location.href);
      if (nextUrl.origin !== window.location.origin) return;

      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const nextPath = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
      if (currentPath === nextPath) return;

      event.preventDefault();
      event.stopPropagation();
      setPendingNavigation(nextPath);
    };

    document.addEventListener("click", handleDocumentClick, true);
    return () => document.removeEventListener("click", handleDocumentClick, true);
  }, []);

  if (authLoading) {
    return <div className="character-status">Loading your character sheet...</div>;
  }

  if (!isLoggedIn) {
    return <Gate>Sign in to access your characters.</Gate>;
  }

  const updateField = (name, value) => {
    setSuccess("");
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const updateNestedField = (section, name, value) => {
    setSuccess("");
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [name]: value,
      },
    }));
  };

  const updateAbility = (ability, value) => {
    setSuccess("");
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
    setSuccess("");
    setFormData((prev) => ({
      ...prev,
      characterClass: value,
      hitDice: suggestedHitDice(value, prev.level),
    }));
  };

  const updateLevel = (value) => {
    setSuccess("");
    setFormData((prev) => ({
      ...prev,
      level: value,
      hitDice: suggestedHitDice(prev.characterClass, value),
    }));
  };

  const toggleSkill = (skillIndex) => {
    setSuccess("");
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
    setSuccess("");
    setFormData((prev) => ({
      ...prev,
      attacks: prev.attacks.map((attack, attackIndex) =>
        attackIndex === index ? { ...attack, [name]: value } : attack,
      ),
    }));
  };

  const addAttack = () => {
    setSuccess("");
    setFormData((prev) => ({
      ...prev,
      attacks: [...prev.attacks, { ...DEFAULT_ATTACK }],
    }));
  };

  const removeAttack = (index) => {
    setSuccess("");
    setFormData((prev) => ({
      ...prev,
      attacks: prev.attacks.length === 1 ? [{ ...DEFAULT_ATTACK }] : prev.attacks.filter((_, i) => i !== index),
    }));
  };

  const requestNavigation = (path) => {
    if (isDirty) {
      setPendingNavigation(path);
      return;
    }

    navigate(path);
  };

  const confirmLeave = () => {
    allowNavigationRef.current = true;
    const nextPath = pendingNavigation || "/characters";
    setPendingNavigation(null);
    navigate(nextPath);
  };

  const stayOnPage = () => {
    setPendingNavigation(null);
  };

  const requestDelete = () => {
    setError("");
    setSuccess("");
    setIsDeleteConfirmOpen(true);
  };

  const cancelDelete = () => {
    setIsDeleteConfirmOpen(false);
  };

  const confirmDelete = async () => {
    setError("");
    setSuccess("");
    setIsDeleting(true);

    try {
      const response = await fetch(`${API_SERVER}/api/characters/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ user: user?.username || "" }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || data.message || "Failed to delete character.");
      }

      allowNavigationRef.current = true;
      navigate("/characters");
    } catch (err) {
      setError(err.message || "Failed to delete character.");
      setIsDeleteConfirmOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const payload = buildCharacterPayload(formData, user?.username || "");

    if (payload.name.length < 2) {
      setError("Character name must be at least 2 characters.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`${API_SERVER}/api/characters/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || data.message || "Failed to save character.");
      }

      const data = await response.json();
      const nextForm = characterToForm(data.character || data);
      setFormData(nextForm);
      setInitialSnapshot(JSON.stringify(nextForm));
      setSuccess("Character saved.");
    } catch (err) {
      setError(err.message || "Failed to save character.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="character-page">
      <div className="character-shell">
        <header className="character-header">
          <div className="character-header-copy">
            <p className="character-eyebrow">Character Sheet</p>
            <h1 className="character-title">{formData.name || "Edit Character"}</h1>
            <p className="character-subtitle">
              Level {formData.level || 1} {raceName} {className}
            </p>
          </div>

          <div className="character-action-group">
            {isDirty && <span className="character-dirty-chip">Unsaved Changes</span>}
            <button
              type="button"
              className="character-button character-btn-danger"
              onClick={requestDelete}
              disabled={isDeleting}
            >
              <Trash2 aria-hidden="true" />
              Delete
            </button>
            <button
              type="button"
              className="character-button character-btn-secondary"
              onClick={() => requestNavigation("/characters")}
            >
              <ArrowLeft aria-hidden="true" />
              Roster
            </button>
          </div>
        </header>

        {isLoading ? (
          <div className="character-status">Loading your character sheet...</div>
        ) : (
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
                    <strong>{formData.armorClass || 10}</strong>
                  </div>
                  <div className="character-preview-stat">
                    <span>Hit Points</span>
                    <strong>{formData.hp.max || 1}</strong>
                  </div>
                  <div className="character-preview-stat">
                    <span>Passive</span>
                    <strong>{formData.passivePerception || 10}</strong>
                  </div>
                  <div className="character-preview-stat">
                    <span>Prof.</span>
                    <strong>+{proficiencyBonus(formData.level)}</strong>
                  </div>
                </div>
              </div>
            </aside>

            <form className="character-editor-panel" onSubmit={handleSave}>
              {error && <div className="character-error">{error}</div>}
              {success && <div className="character-success">{success}</div>}

              <div className="character-editor-toolbar">
                <div>
                  <h2 className="character-section-title">Editable Sheet</h2>
                  <p className="character-section-subtitle">Changes stay local until saved.</p>
                </div>
                <button type="submit" className="character-button character-btn-save" disabled={isSaving || !isDirty}>
                  <Save aria-hidden="true" />
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>

              <EditorSection icon={UserRound} title="Identity">
                <div className="character-field-grid">
                  <label className="character-field span-2">
                    <span className="character-label">Character Name</span>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(event) => updateField("name", event.target.value)}
                      minLength={2}
                      maxLength={30}
                      required
                    />
                  </label>

                  <label className="character-field">
                    <span className="character-label">Class</span>
                    <select value={formData.characterClass} onChange={(event) => updateClass(event.target.value)}>
                      {CLASS_OPTIONS.map((option) => (
                        <option key={option.index} value={option.index}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="character-field">
                    <span className="character-label">Level</span>
                    <input type="number" min="1" max="20" value={formData.level} onChange={(event) => updateLevel(event.target.value)} />
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
                    <select value={formData.background} onChange={(event) => updateField("background", event.target.value)}>
                      {BACKGROUND_OPTIONS.map((option) => (
                        <option key={option.index} value={option.index}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="character-field">
                    <span className="character-label">Alignment</span>
                    <select value={formData.alignment} onChange={(event) => updateField("alignment", event.target.value)}>
                      {ALIGNMENT_OPTIONS.map((option) => (
                        <option key={option.index} value={option.index}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="character-field">
                    <span className="character-label">Experience</span>
                    <input type="number" min="0" value={formData.experience} onChange={(event) => updateField("experience", event.target.value)} />
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
              </EditorSection>

              <EditorSection icon={Sparkles} title="Ability Scores">
                <div className="character-ability-grid">
                  {ABILITY_FIELDS.map((ability) => (
                    <div className="character-ability-card" key={ability.key}>
                      <label htmlFor={`edit-ability-${ability.key}`}>{ability.short}</label>
                      <input
                        id={`edit-ability-${ability.key}`}
                        type="number"
                        min="1"
                        max="30"
                        value={formData.attributes[ability.key]}
                        onChange={(event) => updateAbility(ability.key, event.target.value)}
                      />
                      <span className="character-ability-mod">{formatModifier(formData.attributes[ability.key])}</span>
                    </div>
                  ))}
                </div>
              </EditorSection>

              <EditorSection icon={HeartPulse} title="Combat">
                <div className="character-field-grid three">
                  <label className="character-field">
                    <span className="character-label">Armor Class</span>
                    <input type="number" min="0" value={formData.armorClass} onChange={(event) => updateField("armorClass", event.target.value)} />
                  </label>
                  <label className="character-field">
                    <span className="character-label">Initiative</span>
                    <input type="number" value={formData.initiative} onChange={(event) => updateField("initiative", event.target.value)} />
                  </label>
                  <label className="character-field">
                    <span className="character-label">Speed</span>
                    <input type="number" min="0" value={formData.speed} onChange={(event) => updateField("speed", event.target.value)} />
                  </label>
                  <label className="character-field">
                    <span className="character-label">Current HP</span>
                    <input type="number" min="0" value={formData.hp.current} onChange={(event) => updateNestedField("hp", "current", event.target.value)} />
                  </label>
                  <label className="character-field">
                    <span className="character-label">Max HP</span>
                    <input type="number" min="1" value={formData.hp.max} onChange={(event) => updateNestedField("hp", "max", event.target.value)} />
                  </label>
                  <label className="character-field">
                    <span className="character-label">Temp HP</span>
                    <input type="number" min="0" value={formData.temporaryHp} onChange={(event) => updateField("temporaryHp", event.target.value)} />
                  </label>
                  <label className="character-field">
                    <span className="character-label">Hit Dice</span>
                    <input type="text" value={formData.hitDice} onChange={(event) => updateField("hitDice", event.target.value)} />
                  </label>
                  <label className="character-field">
                    <span className="character-label">Passive Perception</span>
                    <input type="number" min="0" value={formData.passivePerception} onChange={(event) => updateField("passivePerception", event.target.value)} />
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
                      />
                      <input
                        aria-label="Death save failures"
                        type="number"
                        min="0"
                        max="3"
                        value={formData.deathSaves.failures}
                        onChange={(event) => updateNestedField("deathSaves", "failures", event.target.value)}
                      />
                    </div>
                  </label>
                </div>
              </EditorSection>

              <EditorSection icon={BookOpen} title="Training">
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

                <div className="character-field-grid">
                  <label className="character-field">
                    <span className="character-label">Languages</span>
                    <textarea rows="4" value={formData.languages} onChange={(event) => updateField("languages", event.target.value)} />
                  </label>
                  <label className="character-field">
                    <span className="character-label">Tools</span>
                    <textarea rows="4" value={formData.toolProficiencies} onChange={(event) => updateField("toolProficiencies", event.target.value)} />
                  </label>
                  <label className="character-field">
                    <span className="character-label">Weapons</span>
                    <textarea rows="4" value={formData.weaponProficiencies} onChange={(event) => updateField("weaponProficiencies", event.target.value)} />
                  </label>
                  <label className="character-field">
                    <span className="character-label">Armor</span>
                    <textarea rows="4" value={formData.armorProficiencies} onChange={(event) => updateField("armorProficiencies", event.target.value)} />
                  </label>
                </div>
              </EditorSection>

              <EditorSection icon={Swords} title="Story and Actions">
                <div className="character-field-grid">
                  <label className="character-field">
                    <span className="character-label">Personality Traits</span>
                    <textarea rows="4" value={formData.personalityTraits} onChange={(event) => updateField("personalityTraits", event.target.value)} />
                  </label>
                  <label className="character-field">
                    <span className="character-label">Ideals</span>
                    <textarea rows="4" value={formData.ideals} onChange={(event) => updateField("ideals", event.target.value)} />
                  </label>
                  <label className="character-field">
                    <span className="character-label">Bonds</span>
                    <textarea rows="4" value={formData.bonds} onChange={(event) => updateField("bonds", event.target.value)} />
                  </label>
                  <label className="character-field">
                    <span className="character-label">Flaws</span>
                    <textarea rows="4" value={formData.flaws} onChange={(event) => updateField("flaws", event.target.value)} />
                  </label>
                  <label className="character-field span-2">
                    <span className="character-label">Features and Traits</span>
                    <textarea rows="5" value={formData.featuresAndTraits} onChange={(event) => updateField("featuresAndTraits", event.target.value)} />
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
                    <div className="character-attack-row" key={`edit-attack-${index}`}>
                      <label className="character-field">
                        <span className="character-label">Name</span>
                        <input type="text" value={attack.name} onChange={(event) => updateAttack(index, "name", event.target.value)} />
                      </label>
                      <label className="character-field">
                        <span className="character-label">Bonus</span>
                        <input type="text" value={attack.attackBonus} onChange={(event) => updateAttack(index, "attackBonus", event.target.value)} />
                      </label>
                      <label className="character-field">
                        <span className="character-label">Damage</span>
                        <input type="text" value={attack.damageAndType} onChange={(event) => updateAttack(index, "damageAndType", event.target.value)} />
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
              </EditorSection>

              <div className="character-form-actions">
                <button
                  type="button"
                  className="character-button character-btn-secondary"
                  onClick={() => requestNavigation("/characters")}
                >
                  <ArrowLeft aria-hidden="true" />
                  Roster
                </button>

                <div className="character-action-group">
                  <button
                    type="button"
                    className="character-button character-btn-danger"
                    onClick={requestDelete}
                    disabled={isDeleting}
                  >
                    <Trash2 aria-hidden="true" />
                    Delete
                  </button>
                  <button type="submit" className="character-button character-btn-save" disabled={isSaving || !isDirty}>
                    <Save aria-hidden="true" />
                    {isSaving ? "Saving..." : "Save Character"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>

      {pendingNavigation && (
        <div className="character-modal-backdrop" role="presentation">
          <div className="character-modal" role="dialog" aria-modal="true" aria-labelledby="leave-character-title">
            <h2 id="leave-character-title">Leave without saving?</h2>
            <p>Your edits have not been saved. Leave this sheet and discard the current changes?</p>
            <div className="character-modal-actions">
              <button type="button" className="character-button character-btn-secondary" onClick={stayOnPage}>
                Stay
              </button>
              <button type="button" className="character-button character-btn-danger" onClick={confirmLeave}>
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteConfirmOpen && (
        <div className="character-modal-backdrop" role="presentation">
          <div className="character-modal" role="dialog" aria-modal="true" aria-labelledby="delete-character-title">
            <h2 id="delete-character-title">Delete this character?</h2>
            <p>
              This permanently removes {formData.name || "this character"} and any inventory records attached to the
              sheet.
            </p>
            <div className="character-modal-actions">
              <button
                type="button"
                className="character-button character-btn-secondary"
                onClick={cancelDelete}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="character-button character-btn-danger"
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                <Trash2 aria-hidden="true" />
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditorSection({ icon, title, children }) {
  return (
    <section className="character-editor-section">
      <header className="character-section-head">
        <span className="character-section-icon">
          {createElement(icon, { "aria-hidden": "true" })}
        </span>
        <h2 className="character-section-title">{title}</h2>
      </header>
      <div className="character-section">{children}</div>
    </section>
  );
}

export default CharacterEditor;
