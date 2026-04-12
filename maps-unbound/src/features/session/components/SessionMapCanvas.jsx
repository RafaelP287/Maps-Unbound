// Map canvas area:
// - map selection
// - combat setup/teardown
// - compact turn strip + round/advance controls while in combat
import { useRef, useState } from "react";
import EncounterOverlay from "./EncounterOverlay";
import TurnRecord from "./TurnRecord";

const MAP_OPTIONS = Object.entries(
    import.meta.glob("../map_placeholder/*.{jpg,jpeg,png,webp}", { eager: true, import: "default" })
).map(([path, src]) => ({
    id: path,
    src,
    name: path
        .split("/")
        .pop()
        .replace(/\.[^/.]+$/, "")
        .replace(/\s*\(digital\)\s*/i, " ")
        .trim(),
}));

function SessionMapCanvas({
    turns = [],
    round = 0,
    onAdvanceTurn,
    onCombatStateChange,
    onSceneNameChange,
    onTurnsChange,
    playerCharacterNames = [],
}) {
    const [isCombatState, setIsCombatState] = useState(false);
    const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
    const [isCombatSetupOpen, setIsCombatSetupOpen] = useState(false);
    const [combatSetupError, setCombatSetupError] = useState("");
    const [draftParticipants, setDraftParticipants] = useState([]);
    const [selectedMap, setSelectedMap] = useState(null);
    const rowIdRef = useRef(0);

    const nextRowId = () => {
        rowIdRef.current += 1;
        return rowIdRef.current;
    };

    const defaultHpByKind = (kind) => {
        if (kind === "Player") {
            return 35;
        }
        if (kind === "NPC") {
            return 20;
        }
        return 26;
    };

    const defaultDetailByKind = (kind) => {
        if (kind === "Enemy") {
            return { creatureType: "Creature", cr: "CR 1" };
        }
        if (kind === "NPC") {
            return { className: "NPC", level: 1 };
        }
        return { className: "Adventurer", level: 1 };
    };

    const suggestedName = (kind, list) => {
        if (kind === "Player") {
            const used = new Set(list.filter((item) => item.kind === "Player").map((item) => item.name));
            const nextPlayer = playerCharacterNames.find((name) => name && !used.has(name));
            if (nextPlayer) {
                return nextPlayer;
            }
        }
        const count = list.filter((item) => item.kind === kind).length + 1;
        return `${kind} ${count}`;
    };

    const createParticipant = (kind, list, seed = {}) => ({
        id: seed.id ?? nextRowId(),
        include: seed.include ?? true,
        kind,
        name: seed.name ?? suggestedName(kind, list),
        initiative: seed.initiative ?? 10,
        hp: seed.hp ?? defaultHpByKind(kind),
    });

    const openCombatSetup = () => {
        const seededFromTurns = turns.map((turn) =>
            createParticipant(turn.kind || "Enemy", [], {
                include: true,
                name: turn.name || "",
                initiative: typeof turn.initiative === "number" ? turn.initiative : 10,
                hp: typeof turn.hp === "number" ? turn.hp : defaultHpByKind(turn.kind || "Enemy"),
            })
        );

        const seededFromPlayers = playerCharacterNames.map((name) =>
            createParticipant("Player", [], {
                id: nextRowId(),
                include: true,
                name,
                initiative: 10,
                hp: defaultHpByKind("Player"),
            })
        );

        const startingRows = seededFromTurns.length > 0 ? seededFromTurns : seededFromPlayers;
        setDraftParticipants(startingRows.length > 0 ? startingRows : [createParticipant("Enemy", [])]);
        setCombatSetupError("");
        setIsCombatSetupOpen(true);
    };

    const applyCombatSetup = () => {
        const activeRows = draftParticipants.filter((row) => row.include && row.name.trim());
        if (activeRows.length === 0) {
            setCombatSetupError("Add at least one included participant before starting combat.");
            return;
        }

        const sortedRows = [...activeRows].sort((a, b) => {
            if (b.initiative !== a.initiative) {
                return b.initiative - a.initiative;
            }
            return a.name.localeCompare(b.name);
        });

        const computedTurns = sortedRows.map((row, idx) => ({
            order: idx + 1,
            initiative: Number(row.initiative) || 0,
            name: row.name.trim(),
            kind: row.kind,
            hp: Number(row.hp) || defaultHpByKind(row.kind),
            isActive: idx === 0,
            isNext: idx === 1,
            ...defaultDetailByKind(row.kind),
        }));

        if (onTurnsChange) {
            onTurnsChange(computedTurns);
        }

        setIsCombatState(true);
        if (onCombatStateChange) {
            onCombatStateChange(true);
        }
        setIsCombatSetupOpen(false);
    };

    const addParticipant = (kind) => {
        setDraftParticipants((prev) => [...prev, createParticipant(kind, prev)]);
    };

    const toggleParticipantInclude = (id, include) => {
        setDraftParticipants((prev) =>
            prev.map((item) => (item.id === id ? { ...item, include } : item))
        );
    };

    const updateParticipantKind = (id, kind) => {
        setDraftParticipants((prev) =>
            prev.map((item) =>
                item.id === id ? { ...item, kind, hp: defaultHpByKind(kind) } : item
            )
        );
    };

    const updateParticipantName = (id, name) => {
        setDraftParticipants((prev) =>
            prev.map((item) => (item.id === id ? { ...item, name } : item))
        );
    };

    const updateParticipantInitiative = (id, initiative) => {
        setDraftParticipants((prev) =>
            prev.map((item) => (item.id === id ? { ...item, initiative } : item))
        );
    };

    const updateParticipantHp = (id, hp) => {
        setDraftParticipants((prev) =>
            prev.map((item) => (item.id === id ? { ...item, hp } : item))
        );
    };

    const removeParticipant = (id) => {
        setDraftParticipants((prev) => prev.filter((item) => item.id !== id));
    };

    return (
        <main className={["session-dm__map", isCombatState ? "is-combat-state" : ""].filter(Boolean).join(" ")}>
            {selectedMap && (
                <img
                    className="session-dm__map-image"
                    src={selectedMap.src}
                    alt={`${selectedMap.name} map`}
                />
            )}
            {!selectedMap && (
                <div className="session-dm__map-overlay">
                    <div>
                        <h2>{isCombatState ? "Combat State" : "Map Canvas"}</h2>
                        <p>
                            {isCombatState
                                ? "Initiative is live. Keep turns visible and track movement."
                                : "Choose a map to fill the canvas."}
                        </p>
                    </div>
                </div>
            )}
            {isCombatState && (
                <TurnRecord turns={turns} round={round} onAdvanceTurn={onAdvanceTurn} />
            )}
            <div className="session-dm__map-controls" aria-label="Map quick tools">
                <button
                    type="button"
                    className="session-dm__map-btn"
                    onClick={() => setIsMapPickerOpen(true)}
                >
                    Maps
                </button>
                <button
                    type="button"
                    className="session-dm__map-btn"
                    onClick={() => {
                        if (isCombatState) {
                            setIsCombatState(false);
                            if (onTurnsChange) {
                                onTurnsChange([]);
                            }
                            if (onCombatStateChange) {
                                onCombatStateChange(false);
                            }
                            return;
                        }
                        openCombatSetup();
                    }}
                    aria-pressed={isCombatState}
                >
                    Combat
                </button>
                <button type="button" className="session-dm__map-btn">Roll Dice</button>
                <button type="button" className="session-dm__map-btn">Ping</button>
                <button type="button" className="session-dm__map-btn">Hitbox</button>
            </div>
            <EncounterOverlay
                isOpen={isCombatSetupOpen}
                draftParticipants={draftParticipants}
                combatSetupError={combatSetupError}
                onClose={() => setIsCombatSetupOpen(false)}
                onAddParticipant={addParticipant}
                onToggleInclude={toggleParticipantInclude}
                onKindChange={updateParticipantKind}
                onNameChange={updateParticipantName}
                onInitiativeChange={updateParticipantInitiative}
                onHpChange={updateParticipantHp}
                onRemove={removeParticipant}
                onApply={applyCombatSetup}
            />
            {isMapPickerOpen && (
                <div className="session-dm__map-picker-backdrop" role="dialog" aria-modal="true" aria-label="Choose map">
                    <div className="session-dm__map-picker">
                        <div className="session-dm__map-picker-header">
                            <h3>Choose Map</h3>
                            <button type="button" className="session-dm__map-picker-close" onClick={() => setIsMapPickerOpen(false)}>
                                Close
                            </button>
                        </div>
                        <div className="session-dm__map-picker-grid">
                            {MAP_OPTIONS.map((option) => (
                                <button
                                    key={option.id}
                                    type="button"
                                    className={[
                                        "session-dm__map-option",
                                        selectedMap?.id === option.id ? "is-selected" : "",
                                    ].filter(Boolean).join(" ")}
                                    onClick={() => {
                                        setSelectedMap(option);
                                        if (onSceneNameChange) {
                                            onSceneNameChange(option.name);
                                        }
                                        setIsMapPickerOpen(false);
                                    }}
                                >
                                    <img src={option.src} alt={option.name} />
                                    <span>{option.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </main>
    )
}

export default SessionMapCanvas;
