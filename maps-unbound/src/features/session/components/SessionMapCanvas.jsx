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
    onCombatStart,
    onCombatEnd,
    onSceneNameChange,
    onTurnsChange,
    playerCharacterNames = [],
    combatEntityPool = {},
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

    const getParticipantKey = (kind, name) => `${kind}:${String(name || "").trim().toLowerCase()}`;

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
        kind,
        name: seed.name ?? suggestedName(kind, list),
        initiative: seed.initiative ?? 10,
        hp: seed.hp ?? defaultHpByKind(kind),
        sourceLabel: seed.sourceLabel ?? "Custom",
        ...defaultDetailByKind(kind),
        ...seed,
    });

    const openCombatSetup = () => {
        const seededFromTurns = turns.map((turn) =>
            createParticipant(turn.kind || "Enemy", [], {
                name: turn.name || "",
                initiative: typeof turn.initiative === "number" ? turn.initiative : 10,
                hp: typeof turn.hp === "number" ? turn.hp : defaultHpByKind(turn.kind || "Enemy"),
                sourceLabel: "Current Combat",
                className: turn.className,
                level: turn.level,
                creatureType: turn.creatureType,
                cr: turn.cr,
            })
        );

        const seededFromPlayers = (combatEntityPool.players || []).map((player) =>
            createParticipant("Player", [], {
                id: nextRowId(),
                name: player.name,
                initiative: 10,
                hp: player.hp ?? defaultHpByKind("Player"),
                sourceLabel: "Campaign Player",
                className: player.className,
                level: player.level,
            })
        );

        const startingRows = seededFromTurns.length > 0 ? seededFromTurns : seededFromPlayers;
        setDraftParticipants(startingRows.length > 0 ? startingRows : [createParticipant("Enemy", [])]);
        setCombatSetupError("");
        setIsCombatSetupOpen(true);
    };

    const applyCombatSetup = () => {
        const activeRows = draftParticipants.filter((row) => row.name.trim());
        if (activeRows.length === 0) {
            setCombatSetupError("Add at least one participant before starting combat.");
            return;
        }

        const seenParticipants = new Set();
        const duplicateParticipant = activeRows.find((row) => {
            const key = getParticipantKey(row.kind, row.name);
            if (!row.name.trim()) {
                return false;
            }
            if (seenParticipants.has(key)) {
                return true;
            }
            seenParticipants.add(key);
            return false;
        });
        if (duplicateParticipant) {
            setCombatSetupError(`${duplicateParticipant.name.trim()} is already in this encounter.`);
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
            className: row.className ?? defaultDetailByKind(row.kind).className,
            level: row.level ?? defaultDetailByKind(row.kind).level,
            creatureType: row.creatureType ?? defaultDetailByKind(row.kind).creatureType,
            cr: row.cr ?? defaultDetailByKind(row.kind).cr,
        }));

        if (onTurnsChange) {
            onTurnsChange(computedTurns);
        }

        setIsCombatState(true);
        if (onCombatStateChange) {
            onCombatStateChange(true);
        }
        if (onCombatStart) {
            onCombatStart({
                turns: computedTurns,
                round: 1,
                mapName: selectedMap?.name || "",
            });
        }
        setIsCombatSetupOpen(false);
    };

    const addCustomEntity = (kind, name) => {
        const trimmedName = String(name || "").trim();
        if (!trimmedName) {
            setCombatSetupError("New entities need a name before they can be added.");
            return false;
        }

        const participantKey = getParticipantKey(kind, trimmedName);
        const exists = draftParticipants.some((row) => getParticipantKey(row.kind, row.name) === participantKey);
        if (exists) {
            setCombatSetupError(`${trimmedName} is already in this encounter.`);
            return false;
        }

        setDraftParticipants((prev) => [
            ...prev,
            createParticipant(kind, prev, {
                name: trimmedName,
                sourceLabel: "Custom Entity",
            }),
        ]);
        setCombatSetupError("");
        return true;
    };

    const addParticipantFromPool = (kind, entry) => {
        const participantName = entry.name || "";
        const participantKey = getParticipantKey(kind, participantName);
        const exists = draftParticipants.some((row) => getParticipantKey(row.kind, row.name) === participantKey);
        if (participantName.trim() && exists) {
            setCombatSetupError(`${participantName} is already in this encounter.`);
            return;
        }

        setDraftParticipants((prev) => [
            ...prev,
            createParticipant(kind, prev, {
                name: entry.name || suggestedName(kind, prev),
                hp: entry.hp ?? defaultHpByKind(kind),
                sourceLabel: kind === "Player" ? "Campaign Player" : "Campaign Roster",
                className: entry.className,
                level: entry.level,
                creatureType: entry.creatureType,
                cr: entry.cr,
            }),
        ]);
        setCombatSetupError("");
    };

    const updateParticipantKind = (id, kind) => {
        setDraftParticipants((prev) =>
            prev.map((item) =>
                item.id === id
                    ? {
                        ...item,
                        kind,
                        hp: defaultHpByKind(kind),
                        sourceLabel: "Custom",
                        ...defaultDetailByKind(kind),
                    }
                    : item
            )
        );
        setCombatSetupError("");
    };

    const updateParticipantName = (id, name) => {
        setDraftParticipants((prev) =>
            prev.map((item) => (item.id === id ? { ...item, name } : item))
        );
        setCombatSetupError("");
    };

    const updateParticipantInitiative = (id, initiative) => {
        setDraftParticipants((prev) =>
            prev.map((item) => (item.id === id ? { ...item, initiative } : item))
        );
        setCombatSetupError("");
    };

    const updateParticipantHp = (id, hp) => {
        setDraftParticipants((prev) =>
            prev.map((item) => (item.id === id ? { ...item, hp } : item))
        );
        setCombatSetupError("");
    };

    const removeParticipant = (id) => {
        setDraftParticipants((prev) => prev.filter((item) => item.id !== id));
        setCombatSetupError("");
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
                <button type="button" className="session-dm__map-btn">Roll Dice</button>
                <button type="button" className="session-dm__map-btn">Ping</button>
                <button type="button" className="session-dm__map-btn">Hitbox</button>
                <button
                    type="button"
                    className={[
                        "session-dm__map-btn",
                        isCombatState ? "session-dm__map-btn--danger" : "",
                    ].filter(Boolean).join(" ")}
                    onClick={() => {
                        if (isCombatState) {
                            if (onCombatEnd) {
                                onCombatEnd({
                                    turns,
                                    round: turns.length > 0 ? round + 1 : 0,
                                    mapName: selectedMap?.name || "",
                                });
                            }
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
                    {isCombatState ? "End Combat" : "Start Combat"}
                </button>
            </div>
            <EncounterOverlay
                isOpen={isCombatSetupOpen}
                draftParticipants={draftParticipants}
                combatSetupError={combatSetupError}
                onClose={() => setIsCombatSetupOpen(false)}
                onAddCustomEntity={addCustomEntity}
                onAddParticipantFromPool={addParticipantFromPool}
                entityPool={combatEntityPool}
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
