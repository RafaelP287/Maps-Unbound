import { ChevronRight } from "lucide-react";

// ─── InitiativeStrip ───────────────────────────────────────────────────────
// BG3-style horizontal portrait strip overlaying the top of the map canvas
// during combat. Each cell shows just a portrait + name. Clicking a portrait
// bubbles the combatant up to the parent so the left "Sheets & Reference"
// panel can switch to their full character sheet.
//
// Phase 1 props:
//   combatants — array of LiveCombat.combatants
//   activeIndex — index of the combatant whose turn it is (-1 = none)
//   round — current round number
//   onNextTurn() — DM clicked Next Turn button
//   onSelectCombatant(combatant) — DM clicked a portrait
//   useTestData — render fake combatants for visual prototyping
//
function InitiativeStrip({
    combatants = [],
    activeIndex = -1,
    round = 1,
    onNextTurn,
    onSelectCombatant,
    useTestData = false,
    isDM = false,
}) {
    // ─── Test data for visual prototyping ─────────────────────────────────
    const TEST_COMBATANTS = [
        { id: "t1", name: "Bob", kind: "Player", hp: 28, maxHp: 32, portraitUrl: "" },
        { id: "t2", name: "Goblin", kind: "Enemy", hp: 0, maxHp: 7, portraitUrl: "" },
        { id: "t3", name: "Sara", kind: "Player", hp: 0, maxHp: 24, portraitUrl: "" },
        { id: "t4", name: "Brom", kind: "NPC", hp: 14, maxHp: 18, portraitUrl: "" },
        { id: "t5", name: "Bandit", kind: "Enemy", hp: 11, maxHp: 12, portraitUrl: "" },
    ];

    // Pull active combatant's id BEFORE filtering so we can remap activeIdx
    // after hidden ones are stripped (otherwise the gold ring lands on the
    // wrong cell).
    const activeId = combatants[activeIndex]?.id;
    const visibleCombatants = isDM
        ? combatants
        : combatants.filter((c) => !c.hiddenFromInitiative);
    const list = useTestData ? TEST_COMBATANTS : visibleCombatants;
    const activeIdx = useTestData
        ? 0
        : visibleCombatants.findIndex((c) => c.id === activeId);

    if (list.length === 0) return null;

    // First letters of each word, max 2.
    const initialsFor = (name = "") =>
        name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join("") || "?";

    // Background color for kind-based fallback circles.
    const fallbackBg = (kind) => {
        if (kind === "Player") return "linear-gradient(145deg, #2a4a72, #1a3050)";
        if (kind === "NPC") return "linear-gradient(145deg, #524a30, #2e2a1a)";
        return "linear-gradient(145deg, #6a2828, #3a1818)";
    };

    return (
        <div className="initiative-strip" role="toolbar" aria-label="Combat initiative">
            {/* Round indicator */}
            <div className="initiative-strip__round">
                <span className="initiative-strip__round-label">Round</span>
                <span className="initiative-strip__round-number">{round}</span>
            </div>

            {/* Combatant portraits */}
            <div className="initiative-strip__list">
                {list.map((combatant, idx) => {
                    const isActive = idx === activeIdx;
                    const isDead = (combatant.hp ?? 0) <= 0;

                    return (
                        <button
                            key={combatant.id}
                            type="button"
                            className={[
                                "initiative-strip__cell",
                                isActive ? "is-active" : "",
                                isDead ? "is-dead" : "",
                                combatant.kind === "Player" ? "is-player" : "",
                                combatant.kind === "NPC" ? "is-npc" : "",
                                combatant.kind === "Enemy" ? "is-enemy" : "",
                            ]
                                .filter(Boolean)
                                .join(" ")}
                            onClick={() => onSelectCombatant?.(combatant)}
                            title={`${combatant.name} (${combatant.hp}/${combatant.maxHp})`}
                        >
                            <div
                                className="initiative-strip__portrait"
                                style={{
                                    background: combatant.portraitUrl
                                        ? `url(${combatant.portraitUrl}) center/cover`
                                        : fallbackBg(combatant.kind),
                                }}
                            >
                                {!combatant.portraitUrl && (
                                    <span className="initiative-strip__initials">
                                        {initialsFor(combatant.name)}
                                    </span>
                                )}
                            </div>
                            <div className="initiative-strip__name" title={combatant.name}>
                                {combatant.name}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Next turn button */}
            {isDM && (
                <button
                    type="button"
                    className="initiative-strip__next-btn"
                    onClick={() => onNextTurn?.()}
                    title="End current turn, advance to next combatant"
                    aria-label="Next Turn"
                >
                    <ChevronRight size={20} />
                </button>
            )}
        </div>
    );
}

export default InitiativeStrip;
