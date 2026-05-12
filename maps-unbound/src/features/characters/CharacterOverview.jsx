import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Edit3, HeartPulse, Map, Shield, Sparkles, Swords } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import Gate from "../../shared/Gate.jsx";
import LoadingPage from "../../shared/Loading.jsx";
import { getUserId } from "../../shared/getUserId.js";
import {
  ABILITY_FIELDS,
  CLASS_OPTIONS,
  RACE_OPTIONS,
  SKILL_FIELDS,
  characterToForm,
  formatModifier,
  getCharacterImage,
  optionName,
  proficiencyBonus,
} from "./characterFormData.js";

const API_SERVER = import.meta.env.VITE_API_SERVER || "";

const textLines = (value) =>
  String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

function CharacterOverview() {
  const { id } = useParams();
  const { user, token, isLoggedIn, loading: authLoading } = useAuth();
  const [character, setCharacter] = useState(null);
  const [linkedCampaigns, setLinkedCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn || !id) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const fetchCharacter = async () => {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetch(`${API_SERVER}/api/characters/${id}`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || data.message || "Could not load that character.");
        }

        const data = await response.json();
        const nextCharacter = data.character || data;
        if (cancelled) return;

        setCharacter(nextCharacter);

        const campaignsResponse = await fetch(`${API_SERVER}/api/campaigns`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!campaignsResponse.ok) {
          setLinkedCampaigns([]);
          return;
        }

        const campaigns = await campaignsResponse.json();
        const characterObjectId = getUserId(nextCharacter._id);
        const nextLinkedCampaigns = Array.isArray(campaigns)
          ? campaigns.filter((campaign) =>
              (campaign.members || []).some((member) => getUserId(member.activeCharacterId) === characterObjectId)
            )
          : [];
        setLinkedCampaigns(nextLinkedCampaigns);
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load that character.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchCharacter();
    return () => {
      cancelled = true;
    };
  }, [id, isLoggedIn, token]);

  const formData = useMemo(() => characterToForm(character || {}), [character]);
  const ownerId = getUserId(character?.user);
  const isOwner = Boolean(ownerId && user?.id && ownerId === getUserId(user.id));
  const className = optionName(CLASS_OPTIONS, formData.characterClass);
  const raceName = optionName(RACE_OPTIONS, formData.race);
  const portraitUrl = character?.portrait?.url || getCharacterImage(formData.characterClass);
  const selectedSkills = SKILL_FIELDS.filter((skill) => formData.skillProficiencies.includes(skill.index));
  const features = textLines(formData.featuresAndTraits);
  const attacks = formData.attacks.filter((attack) => attack.name);

  if (authLoading) {
    return (
      <div className="character-page">
        <LoadingPage>Loading character...</LoadingPage>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Gate>Sign in to view character sheets.</Gate>;
  }

  if (isLoading) {
    return (
      <div className="character-page">
        <LoadingPage>Loading character...</LoadingPage>
      </div>
    );
  }

  if (error || !character) {
    return (
      <div className="character-page">
        <div className="character-shell">
          <div className="character-error">{error || "Character not found."}</div>
          <Link to="/campaigns" className="character-btn-link character-btn-secondary">
            <ArrowLeft aria-hidden="true" />
            Campaigns
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="character-page">
      <div className="character-shell">
        <header className="character-header">
          <div className="character-header-copy">
            <p className="character-eyebrow">Character Overview</p>
            <h1 className="character-title">{formData.name || "Unnamed Character"}</h1>
            <p className="character-subtitle">
              Level {formData.level || 1} {raceName} {className}
            </p>
          </div>

          <div className="character-action-group">
            <Link to="/campaigns" className="character-btn-link character-btn-secondary">
              <ArrowLeft aria-hidden="true" />
              Campaigns
            </Link>
            {isOwner && (
              <Link to={`/characters/${id}/edit`} className="character-btn-link">
                <Edit3 aria-hidden="true" />
                Edit
              </Link>
            )}
          </div>
        </header>

        <div className="character-divider" />

        <div className="character-overview-grid">
          <aside className="character-overview-portrait">
            <img src={portraitUrl} alt="" />
            <div className="character-overview-portrait-stats">
              <OverviewStat label="AC" value={formData.armorClass || 10} />
              <OverviewStat label="HP" value={`${formData.hp.current}/${formData.hp.max}`} />
              <OverviewStat label="Speed" value={formData.speed || 30} />
              <OverviewStat label="Prof." value={`+${proficiencyBonus(formData.level)}`} />
            </div>
          </aside>

          <main className="character-overview-content">
            <OverviewSection icon={Sparkles} title="Ability Scores">
              <div className="character-overview-abilities">
                {ABILITY_FIELDS.map((ability) => (
                  <div className="character-overview-ability" key={ability.key}>
                    <span>{ability.short}</span>
                    <strong>{formData.attributes[ability.key]}</strong>
                    <small>{formatModifier(formData.attributes[ability.key])}</small>
                  </div>
                ))}
              </div>
            </OverviewSection>

            <OverviewSection icon={Shield} title="Training">
              <div className="character-overview-list-grid">
                <OverviewList title="Skills" items={selectedSkills.map((skill) => `${skill.name} (${skill.ability})`)} empty="No skill proficiencies listed." />
                <OverviewList title="Languages" items={textLines(formData.languages)} empty="No languages listed." />
                <OverviewList title="Weapons" items={textLines(formData.weaponProficiencies)} empty="No weapon proficiencies listed." />
                <OverviewList title="Armor" items={textLines(formData.armorProficiencies)} empty="No armor proficiencies listed." />
              </div>
            </OverviewSection>

            <OverviewSection icon={HeartPulse} title="Combat">
              <div className="character-overview-stat-row">
                <OverviewStat label="Initiative" value={formData.initiative >= 0 ? `+${formData.initiative}` : formData.initiative} />
                <OverviewStat label="Temp HP" value={formData.temporaryHp || 0} />
                <OverviewStat label="Hit Dice" value={formData.hitDice || "None"} />
                <OverviewStat label="Passive" value={formData.passivePerception || 10} />
              </div>
              <OverviewList
                title="Attacks and Spellcasting"
                items={attacks.map((attack) => [attack.name, attack.attackBonus, attack.damageAndType].filter(Boolean).join(" | "))}
                empty="No attacks listed."
              />
            </OverviewSection>

            <OverviewSection icon={Map} title="Campaign Links">
              {linkedCampaigns.length > 0 ? (
                <div className="character-overview-campaign-links">
                  {linkedCampaigns.map((campaign) => (
                    <Link className="character-overview-campaign-link" to={`/campaigns/${campaign._id}`} key={campaign._id}>
                      <strong>{campaign.title || "Untitled Campaign"}</strong>
                      <span>{campaign.status || "Planning"}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="character-overview-empty-text">This character is not selected for any campaign you can access.</p>
              )}
            </OverviewSection>

            <OverviewSection icon={Swords} title="Story">
              <div className="character-overview-list-grid">
                <OverviewList title="Traits" items={textLines(formData.personalityTraits)} empty="No traits listed." />
                <OverviewList title="Ideals" items={textLines(formData.ideals)} empty="No ideals listed." />
                <OverviewList title="Bonds" items={textLines(formData.bonds)} empty="No bonds listed." />
                <OverviewList title="Flaws" items={textLines(formData.flaws)} empty="No flaws listed." />
                <OverviewList title="Features" items={features} empty="No features listed." wide />
              </div>
            </OverviewSection>
          </main>
        </div>
      </div>
    </div>
  );
}

function OverviewSection({ icon: Icon, title, children }) {
  return (
    <section className="character-editor-section character-overview-section">
      <div className="character-section-head">
        <span className="character-section-icon">
          <Icon aria-hidden="true" />
        </span>
        <h2 className="character-section-title">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function OverviewStat({ label, value }) {
  return (
    <div className="character-overview-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function OverviewList({ title, items, empty, wide = false }) {
  return (
    <div className={wide ? "character-overview-list is-wide" : "character-overview-list"}>
      <h3>{title}</h3>
      {items.length > 0 ? (
        <ul>
          {items.map((item, index) => (
            <li key={`${title}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>{empty}</p>
      )}
    </div>
  );
}

export default CharacterOverview;
