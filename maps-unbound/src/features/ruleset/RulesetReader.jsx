/**
 * 5e Compendium — browses SRD data from the D&D 5e API (proxied via VITE_API_SERVER).
 *
 * Flow: pick category → load index list → filter client-side → fetch full JSON for selection.
 * Detail view (WikiArticle) formats API objects into chips, prose, and collapsible sections.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchJson, fetchResourceList, toAbsoluteUrl } from "./dnd5eApi.js";

/** Slugs passed to GET /api/2014/{endpoint} (matches dnd5eapi resource names). */
const RESOURCE_CATEGORIES = [
  { id: "spells", label: "Spells", endpoint: "spells" },
  { id: "classes", label: "Classes", endpoint: "classes" },
  { id: "subclasses", label: "Subclasses", endpoint: "subclasses" },
  { id: "monsters", label: "Monsters", endpoint: "monsters" },
  { id: "equipment", label: "Equipment", endpoint: "equipment" },
  { id: "magic-items", label: "Magic items", endpoint: "magic-items" },
  { id: "races", label: "Races", endpoint: "races" },
  { id: "subraces", label: "Subraces", endpoint: "subraces" },
  { id: "backgrounds", label: "Backgrounds", endpoint: "backgrounds" },
  { id: "feats", label: "Feats", endpoint: "feats" },
  { id: "features", label: "Class features", endpoint: "features" },
  { id: "conditions", label: "Conditions", endpoint: "conditions" },
  { id: "damage-types", label: "Damage types", endpoint: "damage-types" },
  { id: "skills", label: "Skills", endpoint: "skills" },
  { id: "languages", label: "Languages", endpoint: "languages" },
  { id: "traits", label: "Traits", endpoint: "traits" },
  { id: "weapon-properties", label: "Weapon properties", endpoint: "weapon-properties" },
  { id: "magic-schools", label: "Magic schools", endpoint: "magic-schools" },
  { id: "alignments", label: "Alignments", endpoint: "alignments" },
  { id: "ability-scores", label: "Ability scores", endpoint: "ability-scores" },
  { id: "proficiencies", label: "Proficiencies", endpoint: "proficiencies" },
  { id: "rules", label: "Rules (chapters)", endpoint: "rules" },
];

/** Dropdown options: "All" merges every RESOURCE_CATEGORIES list (each hit tagged with _categoryLabel). */
const CATEGORY_OPTIONS = [
  { id: "all", label: "All", endpoint: null },
  ...RESOURCE_CATEGORIES,
];

/** Max rows rendered after filter — full "All" index is huge; cap keeps the DOM responsive. */
const LIST_DISPLAY_CAP = 500;

/** API reference fields we skip when rendering generic key/value blocks (noise or redundant). */
const SKIP_TOP_LEVEL = new Set(["url", "index", "updated_at"]);

/** Monster ability scores (STR–CHA); used for the grid and to mark keys as "already shown" in WikiArticle. */
const ABILITY_KEYS = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
];

/** snake_case API key → Title Case label for UI. */
function humanizeKey(key) {
  return key
    .replace(/_/g, " ")
    .replace(/\b([a-z])/g, (c) => c.toUpperCase());
}

/** API often returns desc as string[]; join into one block for paragraphs. */
function formatDesc(desc) {
  if (desc == null) return null;
  if (Array.isArray(desc)) {
    return desc.filter(Boolean).join("\n\n");
  }
  if (typeof desc === "string") return desc;
  return null;
}

/** Nested link to another JSON resource on the same API (lazy-loaded in ExpandableApiData). */
function isApiPathString(v) {
  return typeof v === "string" && v.startsWith("/api/");
}

/** Shorthand for API reference objects { index, name, url }. */
function refName(obj) {
  if (obj && typeof obj === "object" && typeof obj.name === "string") return obj.name;
  return null;
}

/** Monsters use armor_class[] (value + armor pieces); flatten for chip text. */
function formatArmorClass(ac) {
  if (!Array.isArray(ac) || ac.length === 0) return null;
  return ac
    .map((entry) => {
      if (entry == null) return null;
      if (typeof entry === "number") return String(entry);
      const parts = [];
      if (entry.value != null) parts.push(entry.value);
      if (Array.isArray(entry.armor) && entry.armor.length) {
        parts.push(`(${entry.armor.map((a) => a.name).join(", ")})`);
      } else if (entry.type) {
        parts.push(`(${entry.type})`);
      }
      return parts.join(" ");
    })
    .filter(Boolean)
    .join("; ");
}

/** Speed may be a string or { walk, fly, ... }; normalize to one line. */
function formatSpeed(speed) {
  if (speed == null) return null;
  if (typeof speed === "string") return speed;
  if (typeof speed === "object") {
    return Object.entries(speed)
      .map(([k, v]) => `${humanizeKey(k)} ${v}`)
      .join(", ");
  }
  return String(speed);
}

/** Equipment cost object { quantity, unit } → "25 gp" style string. */
function formatCost(cost) {
  if (!cost || typeof cost !== "object") return null;
  const q = cost.quantity;
  const u = cost.unit;
  if (q != null && u) return `${q} ${u}`;
  return null;
}

/** Renders the pill row under the article title (spell level, AC, CR, etc.). */
function MetaChips({ items }) {
  if (!items?.length) return null;
  return (
    <div style={styles.chipRow}>
      {items.map(({ label, value }) => (
        <span key={label} style={styles.chip}>
          <span style={styles.chipLabel}>{label}</span> {value}
        </span>
      ))}
    </div>
  );
}

/** Derives high-signal facts from any resource type for MetaChips (best-effort by field presence). */
function buildMetaChips(data) {
  const chips = [];

  if (data.level != null && data.school) {
    chips.push({ label: "Level", value: data.level === 0 ? "Cantrip" : `${data.level}` });
    chips.push({ label: "School", value: refName(data.school) || String(data.school) });
  } else if (data.level != null && !data.school) {
    chips.push({ label: "Level", value: String(data.level) });
  }

  if (data.casting_time) chips.push({ label: "Casting time", value: data.casting_time });
  if (data.range) chips.push({ label: "Range", value: data.range });
  if (data.duration) chips.push({ label: "Duration", value: data.duration });
  if (data.ritual === true) chips.push({ label: "Ritual", value: "Yes" });
  if (data.concentration === true) chips.push({ label: "Concentration", value: "Yes" });

  if (data.size || data.type) {
    const typeLine = [data.size, data.type, data.subtype ? `(${data.subtype})` : null]
      .filter(Boolean)
      .join(" ");
    if (typeLine) chips.push({ label: "Type", value: typeLine });
  }
  if (data.alignment) chips.push({ label: "Alignment", value: data.alignment });

  const ac = formatArmorClass(data.armor_class);
  if (ac) chips.push({ label: "Armor class", value: ac });
  if (data.hit_points != null) chips.push({ label: "Hit points", value: String(data.hit_points) });
  if (data.hit_dice) chips.push({ label: "Hit dice", value: data.hit_dice });

  const spd = formatSpeed(data.speed);
  if (spd) chips.push({ label: "Speed", value: spd });

  if (data.challenge_rating != null) {
    chips.push({ label: "Challenge", value: String(data.challenge_rating) });
  }
  if (data.xp != null) chips.push({ label: "XP", value: String(data.xp) });
  if (data.proficiency_bonus != null) {
    chips.push({ label: "Proficiency", value: `+${data.proficiency_bonus}` });
  }

  if (data.hit_die) chips.push({ label: "Hit die", value: `d${data.hit_die}` });
  if (data.category_range) chips.push({ label: "Category", value: data.category_range });
  if (data.weapon_category) chips.push({ label: "Weapon", value: data.weapon_category });
  if (data.equipment_category) {
    chips.push({
      label: "Equipment",
      value: refName(data.equipment_category) || humanizeKey(String(data.equipment_category)),
    });
  }
  if (data.gear_category) {
    chips.push({ label: "Gear", value: refName(data.gear_category) || String(data.gear_category) });
  }

  const cost = formatCost(data.cost);
  if (cost) chips.push({ label: "Cost", value: cost });
  if (data.weight != null) chips.push({ label: "Weight", value: `${data.weight} lb.` });

  if (data.attack_type) chips.push({ label: "Attack", value: data.attack_type });

  return chips;
}

/** STR–CHA grid for monsters (and anything else exposing those keys). */
function AbilityBlock({ data }) {
  const present = ABILITY_KEYS.filter((k) => data[k] != null);
  if (!present.length) return null;
  return (
    <div style={styles.abilityGrid}>
      {present.map((k) => (
        <div key={k} style={styles.abilityCell}>
          <span style={styles.abilityAbbr}>{k.slice(0, 3).toUpperCase()}</span>
          <span style={styles.abilityVal}>{data[k]}</span>
        </div>
      ))}
    </div>
  );
}

/** actions, special_abilities, etc.: { name, desc, damage? } — open by default if only one or two rows. */
function NamedBlocks({ title, entries }) {
  if (!Array.isArray(entries) || entries.length === 0) return null;
  return (
    <details style={styles.details} open={entries.length <= 2}>
      <summary style={styles.summary}>{title}</summary>
      <div style={styles.detailsBody}>
        {entries.map((entry, i) => (
          <div key={i} style={styles.namedBlock}>
            {entry.name && <h4 style={styles.h4}>{entry.name}</h4>}
            {formatDesc(entry.desc) && <p style={styles.prose}>{formatDesc(entry.desc)}</p>}
            {entry.attack_bonus != null && (
              <p style={styles.muted}>Attack bonus +{entry.attack_bonus}</p>
            )}
            {Array.isArray(entry.damage) && entry.damage.length > 0 && (
              <ul style={styles.ul}>
                {entry.damage.map((d, j) => (
                  <li key={j}>
                    {d.damage_dice && `${d.damage_dice} `}
                    {refName(d.damage_type) && `${refName(d.damage_type)}`}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </details>
  );
}

/** Proficiency rows nest the real name under .proficiency; plain refs use .name. */
function refListLabel(item) {
  if (item == null) return null;
  if (typeof item === "string") return item;
  if (typeof item === "object") {
    if (item.proficiency) return refName(item.proficiency);
    return refName(item);
  }
  return null;
}

/** Collapsed comma-list for classes, subclasses, races, proficiencies, etc. */
function RefList({ title, items }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  const names = items.map(refListLabel).filter(Boolean);
  if (!names.length) return null;
  return (
    <details style={styles.details}>
      <summary style={styles.summary}>
        {title} ({names.length})
      </summary>
      <p style={styles.prose}>{names.join(", ")}</p>
    </details>
  );
}

/** Fallback when ValueBlock hits max recursion depth or unknown shape. */
function JsonPreview({ data }) {
  return (
    <pre style={styles.pre}>
      {typeof data === "string" ? data : JSON.stringify(data, null, 2)}
    </pre>
  );
}

/** <details> that GETs a nested /api/2014/... path only after the user opens it (class levels, etc.). */
function ExpandableApiData({ title, path }) {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!open || payload || loading || err) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const json = await fetchJson(path);
        if (!cancelled) setPayload(json);
      } catch (e) {
        if (!cancelled) setErr(e.message || "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, path, payload, loading, err]);

  return (
    <details style={styles.details} onToggle={(e) => setOpen(e.target.open)}>
      <summary style={styles.summary}>{title}</summary>
      <div style={styles.detailsBody}>
        {loading && <p style={styles.muted}>Loading…</p>}
        {err && <p style={styles.errorText}>{err}</p>}
        {payload && <ValueBlock value={payload} depth={0} />}
      </div>
    </details>
  );
}

/**
 * Recursive value renderer for API JSON: strings, refs, arrays of named objects, nested dicts.
 * Strings starting with /api/ become ExpandableApiData.
 */
function ValueBlock({ value, depth }) {
  if (value == null) return null;
  if (depth > 6) return <JsonPreview data={value} />;

  if (typeof value === "string") {
    if (isApiPathString(value)) {
      return (
        <ExpandableApiData title={`Related data (${value})`} path={value} />
      );
    }
    return <p style={styles.prose}>{value}</p>;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return <p style={styles.prose}>{String(value)}</p>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    if (value.every((v) => typeof v === "string")) {
      return <p style={styles.prose}>{value.join(", ")}</p>;
    }
    if (value.every((v) => v && typeof v === "object" && typeof v.name === "string")) {
      return <NamedBlocks title="Entries" entries={value} />;
    }
    return (
      <ul style={styles.ul}>
        {value.map((v, i) => (
          <li key={i}>
            <ValueBlock value={v} depth={depth + 1} />
          </li>
        ))}
      </ul>
    );
  }

  if (typeof value === "object") {
    if (refName(value) && !value.desc && Object.keys(value).length <= 4) {
      return <span style={styles.prose}>{refName(value)}</span>;
    }
    const entries = Object.entries(value).filter(([k]) => !SKIP_TOP_LEVEL.has(k));
    if (entries.length === 0) return null;
    return (
      <dl style={styles.dl}>
        {entries.map(([k, v]) => (
          <div key={k} style={styles.dlRow}>
            <dt style={styles.dt}>{humanizeKey(k)}</dt>
            <dd style={styles.dd}>
              <ValueBlock value={v} depth={depth + 1} />
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  return null;
}

/**
 * Fields shown inside <details> in WikiArticle (heavy or secondary vs. title + main desc).
 * Excludes things already handled as chips, ability grid, or NamedBlocks (e.g. actions).
 */
const COLLAPSIBLE_KEYS = [
  "higher_level",
  "material",
  "components",
  "damage",
  "dc",
  "area_of_effect",
  "proficiencies",
  "proficiency_choices",
  "saving_throws",
  "damage_vulnerabilities",
  "damage_resistances",
  "damage_immunities",
  "condition_immunities",
  "senses",
  "languages",
  "special_abilities",
  "actions",
  "legendary_actions",
  "reactions",
  "starting_equipment",
  "starting_equipment_options",
  "multi_classing",
  "subclasses",
  "classes",
  "races",
  "traits",
  "subraces",
  "spellcasting",
  "contents",
  "properties",
  "usage",
  "throw_range",
  "two_handed_damage",
];

/**
 * Full detail panel: maps one API entity into wiki-style sections.
 * Tracks usedKeys so leftovers land in "More properties" without duplicating chips/blocks.
 */
function WikiArticle({ data }) {
  const name = data.name || data.index || "Entry";
  const shortDesc = data.short_description != null ? String(data.short_description) : null;
  const longDesc = formatDesc(data.desc);

  const usedKeys = new Set([
    "name",
    "index",
    "url",
    "updated_at",
    "desc",
    "short_description",
    ...ABILITY_KEYS,
  ]);

  const meta = buildMetaChips(data);
  // Every field rendered explicitly below is registered so restKeys stays accurate.
  [
    "level",
    "school",
    "casting_time",
    "range",
    "duration",
    "ritual",
    "concentration",
    "size",
    "type",
    "subtype",
    "alignment",
    "armor_class",
    "hit_points",
    "hit_dice",
    "speed",
    "challenge_rating",
    "xp",
    "proficiency_bonus",
    "hit_die",
    "category_range",
    "weapon_category",
    "equipment_category",
    "gear_category",
    "cost",
    "weight",
    "attack_type",
    "image",
    "class_levels",
  ].forEach((k) => usedKeys.add(k));

  const collapsiblePresent = COLLAPSIBLE_KEYS.filter(
    (k) => data[k] != null && !(Array.isArray(data[k]) && data[k].length === 0),
  );

  collapsiblePresent.forEach((k) => usedKeys.add(k));

  const namedActionKeys = ["special_abilities", "actions", "legendary_actions", "reactions"];
  /** Anything not yet shown — generic headings + ValueBlock. */
  const restKeys = Object.keys(data).filter(
    (k) => !usedKeys.has(k) && !SKIP_TOP_LEVEL.has(k),
  );

  const imagePath = typeof data.image === "string" ? data.image : null;

  return (
    <article style={styles.article}>
      <h2 style={styles.articleTitle}>{name}</h2>
      {data.index && <p style={styles.indexLine}>Index: {data.index}</p>}

      {/* Quick facts: casting time, CR, cost, etc. */}
      <MetaChips items={meta} />

      {imagePath && (
        <div style={styles.imageWrap}>
          <img
            src={toAbsoluteUrl(imagePath)}
            alt=""
            style={styles.monsterImg}
          />
        </div>
      )}

      <AbilityBlock data={data} />

      {shortDesc && <p style={styles.lede}>{shortDesc}</p>}
      {longDesc && <div style={styles.proseBlock}>{longDesc}</div>}

      {/* Combat / feature blocks (always prominent; small lists stay open) */}
      {namedActionKeys.map((key) => {
        const arr = data[key];
        if (!Array.isArray(arr) || arr.length === 0) return null;
        return <NamedBlocks key={key} title={humanizeKey(key)} entries={arr} />;
      })}

      {/* Secondary fields: spell components, saves, starting equipment, … */}
      {collapsiblePresent.map((key) => {
        const val = data[key];
        if (namedActionKeys.includes(key)) return null;
        if (key === "classes" || key === "subclasses" || key === "races" || key === "subraces") {
          return <RefList key={key} title={humanizeKey(key)} items={val} />;
        }
        return (
          <details key={key} style={styles.details}>
            <summary style={styles.summary}>{humanizeKey(key)}</summary>
            <div style={styles.detailsBody}>
              <ValueBlock value={val} depth={0} />
            </div>
          </details>
        );
      })}

      {/* Class level table is a separate URL; fetch only on expand */}
      {typeof data.class_levels === "string" && isApiPathString(data.class_levels) && (
        <ExpandableApiData title="Level progression (full table)" path={data.class_levels} />
      )}

      {/* Rare or version-specific keys not covered above */}
      {restKeys.length > 0 && (
        <details style={styles.details}>
          <summary style={styles.summary}>More properties</summary>
          <div style={styles.detailsBody}>
            {restKeys.map((key) => (
              <div key={key} style={{ marginBottom: "1rem" }}>
                <h4 style={styles.h4}>{humanizeKey(key)}</h4>
                <ValueBlock value={data[key]} depth={0} />
              </div>
            ))}
          </div>
        </details>
      )}

      <p style={styles.apiCredit}>
        Data from{" "}
        <a href="https://www.dnd5eapi.co" target="_blank" rel="noreferrer" style={styles.link}>
          D&D 5e API
        </a>{" "}
        (SRD content).
      </p>
    </article>
  );
}

function RulesetReader() {
  const [categoryId, setCategoryId] = useState("spells");
  const [list, setList] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState(null);
  const [search, setSearch] = useState("");
  /** Exact item.url from the API; identity for highlight + detail fetch. Toggle same row to clear. */
  const [selectedPath, setSelectedPath] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  const category = useMemo(
    () => CATEGORY_OPTIONS.find((c) => c.id === categoryId) || CATEGORY_OPTIONS[1],
    [categoryId],
  );

  // Load index: single endpoint, or parallel merge for "All" (failures per category become []).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setListLoading(true);
      setListError(null);
      setList([]);
      setSelectedPath(null);
      setDetail(null);
      try {
        if (categoryId === "all") {
          const chunks = await Promise.all(
            RESOURCE_CATEGORIES.map(async (c) => {
              try {
                const r = await fetchResourceList(c.endpoint);
                return r.map((item) => ({
                  ...item,
                  _categoryLabel: c.label,
                }));
              } catch {
                return [];
              }
            }),
          );
          if (!cancelled) setList(chunks.flat());
        } else {
          const c = RESOURCE_CATEGORIES.find((x) => x.id === categoryId);
          if (!c) {
            if (!cancelled) setList([]);
            return;
          }
          const results = await fetchResourceList(c.endpoint);
          if (!cancelled) setList(results);
        }
      } catch (e) {
        if (!cancelled) setListError(e.message || "Could not load list");
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [categoryId]);

  // Lazy-load full entity JSON when selectedPath changes (proxied fetchJson in dnd5eApi).
  useEffect(() => {
    if (!selectedPath) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setDetailLoading(true);
      setDetailError(null);
      setDetail(null);
      try {
        const json = await fetchJson(selectedPath);
        if (!cancelled) setDetail(json);
      } catch (e) {
        if (!cancelled) setDetailError(e.message || "Could not load entry");
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedPath]);

  // Client-side filter; in "All" mode also match _categoryLabel so you can type "spell", "monster", etc.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((item) => {
      const n = (item.name || "").toLowerCase();
      const idx = (item.index || "").toLowerCase();
      const cat = (item._categoryLabel || "").toLowerCase();
      return n.includes(q) || idx.includes(q) || cat.includes(q);
    });
  }, [list, search]);

  const displayed = useMemo(
    () => filtered.slice(0, LIST_DISPLAY_CAP),
    [filtered],
  );
  const hiddenMatchCount = filtered.length - displayed.length;

  /** Click row: select or deselect. Identity is item.url (stable from API lists). */
  const selectItem = useCallback((item) => {
    const u = item.url;
    if (!u) return;
    setSelectedPath((prev) => (prev === u ? null : u));
  }, []);

  return (
    <div style={styles.page}>
      {/* Page chrome */}
      <header style={styles.header}>
        <h1 style={styles.h1}>Compendium</h1>
        <p style={styles.subtitle}>
          Search spells, monsters, classes, gear, and other SRD reference entries.
        </p>
      </header>

      <div style={styles.toolbar} aria-label="Compendium filters">
        <label style={styles.label}>
          Category
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            style={styles.select}
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label style={{ ...styles.label, flex: 1, minWidth: "200px" }}>
          Search
          <input
            type="search"
            placeholder={
              categoryId === "all"
                ? "Search every category by name, index, or category…"
                : `Filter ${category.label.toLowerCase()}…`
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.input}
          />
        </label>
      </div>

      {/* ruleset-split: responsive grid — see index.css */}
      <div className="ruleset-split" style={styles.split}>
        <aside style={styles.listPane} aria-label="Search results">
          {listLoading && <p style={styles.muted}>Loading list…</p>}
          {listError && <p style={styles.errorText}>{listError}</p>}
          {!listLoading && !listError && (
            <>
              <p style={styles.listCount}>
                {categoryId === "all"
                  ? `${filtered.length} match${filtered.length === 1 ? "" : "es"} across all categories`
                  : `${filtered.length} of ${list.length} entries`}
                {hiddenMatchCount > 0 && (
                  <span style={styles.listCapNote}>
                    {" "}
                    (showing first {LIST_DISPLAY_CAP} — narrow your search for the rest)
                  </span>
                )}
              </p>
              <ul style={styles.list}>
                {displayed.map((item) => {
                  const path = item.url;
                  const active = Boolean(path && selectedPath === path);
                  return (
                    <li key={path || `${item._categoryLabel}-${item.index}`}>
                      <button
                        type="button"
                        className="ruleset-list-btn"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          selectItem(item);
                          // Drop focus after pointer activation to avoid persistent browser focus rings.
                          if (e.pointerType === "mouse" || e.pointerType === "touch") {
                            e.currentTarget.blur();
                          }
                        }}
                        style={{
                          ...styles.listBtn,
                          ...(active ? styles.listBtnActive : {}),
                        }}
                      >
                        <span style={styles.listName}>
                          {item.name}
                          {item._categoryLabel && (
                            <span style={styles.categoryTag}>{item._categoryLabel}</span>
                          )}
                        </span>
                        {item.level != null && (
                          <span style={styles.listMeta}>Lv. {item.level}</span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </aside>

        <section style={styles.detailPane} aria-live="polite">
          {!selectedPath && (
            <div style={styles.placeholder}>
              <p>Select an entry from the list to read the full article.</p>
            </div>
          )}
          {selectedPath && detailLoading && <p style={styles.muted}>Loading entry…</p>}
          {selectedPath && detailError && <p style={styles.errorText}>{detailError}</p>}
          {selectedPath && detail && !detailLoading && <WikiArticle data={detail} />}
        </section>
      </div>
    </div>
  );
}

/** Inline layout tokens (matches app CSS variables in index.css). */
const styles = {
  page: { maxWidth: "1100px", margin: "0 auto", padding: "2rem 1.25rem 3rem" },
  header: { marginBottom: "1.5rem", textAlign: "center" },
  h1: {
    fontFamily: "var(--font-display)",
    color: "var(--gold-light)",
    fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
    marginBottom: "0.5rem",
  },
  subtitle: { color: "var(--text-muted)", maxWidth: "36rem", margin: "0 auto", fontSize: "1rem" },
  link: { color: "var(--gold)", textDecoration: "underline" },
  toolbar: {
    display: "flex",
    flexWrap: "wrap",
    gap: "1rem",
    marginBottom: "1.5rem",
    alignItems: "flex-end",
  },
  label: { display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.85rem", color: "var(--text-muted)" },
  select: {
    minWidth: "200px",
    padding: "0.5rem 0.75rem",
    borderRadius: "var(--radius)",
    border: "1px solid var(--border)",
    background: "var(--panel-bg)",
    color: "var(--text-base)",
    fontFamily: "var(--font-body)",
  },
  input: {
    padding: "0.5rem 0.75rem",
    borderRadius: "var(--radius)",
    border: "1px solid var(--border)",
    background: "var(--bg-deep)",
    color: "var(--text-base)",
    fontFamily: "var(--font-body)",
    width: "100%",
  },
  split: {
    display: "grid",
    gridTemplateColumns: "minmax(240px, 320px) 1fr",
    gap: "1.5rem",
    alignItems: "start",
  },
  listPane: {
    background: "var(--panel-bg)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    padding: "1rem",
    maxHeight: "min(70vh, 640px)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  listCount: { fontSize: "0.8rem", color: "var(--text-faint)", marginBottom: "0.5rem" },
  list: { listStyle: "none", overflowY: "auto", flex: 1, margin: 0, padding: 0 },
  listBtn: {
    width: "100%",
    textAlign: "left",
    padding: "0.55rem 0.65rem",
    marginBottom: "4px",
    borderRadius: "var(--radius)",
    border: "none",
    background: "transparent",
    color: "var(--text-base)",
    cursor: "pointer",
    fontFamily: "var(--font-body)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: "0.5rem",
    outline: "none",
    boxShadow: "none",
  },
  listBtnActive: {
    border: "1px solid rgba(201, 168, 76, 0.45)",
    background: "rgba(201, 168, 76, 0.08)",
  },
  listName: { flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "0.2rem" },
  categoryTag: {
    fontSize: "0.68rem",
    color: "var(--text-faint)",
    fontStyle: "normal",
    fontFamily: "var(--font-heading)",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  listMeta: { fontSize: "0.75rem", color: "var(--gold)", flexShrink: 0 },
  listCapNote: { color: "var(--gold)", fontStyle: "normal" },
  code: {
    fontSize: "0.85em",
    color: "var(--gold-light)",
    background: "rgba(0,0,0,0.35)",
    padding: "0.1rem 0.35rem",
    borderRadius: "var(--radius-sm)",
  },
  detailPane: {
    background: "var(--panel-bg)",
    border: "1px solid rgba(201, 168, 76, 0.2)",
    borderRadius: "var(--radius-lg)",
    padding: "1.25rem 1.5rem",
    minHeight: "280px",
  },
  placeholder: { color: "var(--text-faint)", fontStyle: "italic", padding: "2rem 0", textAlign: "center" },
  article: {},
  articleTitle: {
    fontFamily: "var(--font-heading)",
    color: "var(--gold-light)",
    fontSize: "1.65rem",
    marginBottom: "0.35rem",
  },
  indexLine: { fontSize: "0.85rem", color: "var(--text-faint)", marginBottom: "0.75rem" },
  chipRow: { display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" },
  chip: {
    fontSize: "0.8rem",
    padding: "0.25rem 0.6rem",
    borderRadius: "999px",
    border: "1px solid var(--border)",
    background: "rgba(0,0,0,0.25)",
    color: "var(--text-base)",
  },
  chipLabel: { color: "var(--gold)", fontWeight: 600 },
  imageWrap: { margin: "1rem 0", textAlign: "center" },
  monsterImg: { maxWidth: "100%", maxHeight: "320px", borderRadius: "var(--radius)", border: "1px solid var(--border)" },
  abilityGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
    gap: "0.5rem",
    marginBottom: "1rem",
  },
  abilityCell: {
    textAlign: "center",
    padding: "0.5rem",
    borderRadius: "var(--radius)",
    border: "1px solid var(--border)",
    background: "var(--bg-deep)",
  },
  abilityAbbr: { display: "block", fontSize: "0.7rem", color: "var(--gold)", fontFamily: "var(--font-heading)" },
  abilityVal: { fontSize: "1.1rem" },
  lede: { fontSize: "1.05rem", color: "var(--text-muted)", marginBottom: "1rem" },
  proseBlock: {
    whiteSpace: "pre-wrap",
    marginBottom: "1rem",
    lineHeight: 1.65,
  },
  prose: { margin: 0, lineHeight: 1.65 },
  h4: {
    fontFamily: "var(--font-heading)",
    color: "var(--gold)",
    fontSize: "1rem",
    margin: "0 0 0.35rem",
  },
  details: {
    marginBottom: "0.65rem",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    background: "rgba(0,0,0,0.2)",
  },
  summary: {
    cursor: "pointer",
    padding: "0.65rem 1rem",
    fontFamily: "var(--font-heading)",
    color: "var(--gold-light)",
    listStylePosition: "outside",
  },
  detailsBody: { padding: "0 1rem 1rem" },
  namedBlock: { marginBottom: "1rem" },
  ul: { margin: "0.25rem 0 0 1.1rem", padding: 0 },
  dl: { margin: 0 },
  dlRow: { marginBottom: "0.75rem" },
  dt: { color: "var(--gold)", fontSize: "0.9rem", marginBottom: "0.2rem" },
  dd: { margin: 0 },
  pre: {
    fontSize: "0.78rem",
    overflow: "auto",
    maxHeight: "240px",
    background: "var(--bg-deep)",
    padding: "0.75rem",
    borderRadius: "var(--radius)",
    border: "1px solid var(--border)",
  },
  muted: { color: "var(--text-faint)", fontStyle: "italic" },
  errorText: { color: "#fca5a5" },
  apiCredit: { marginTop: "2rem", fontSize: "0.8rem", color: "var(--text-faint)" },
};

export default RulesetReader;
