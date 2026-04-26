import { useEffect, useState } from "react";

// Reusable combat setup modal used by the map canvas.
function EncounterOverlay({
    isOpen,
    draftParticipants,
    combatSetupError,
    onClose,
    onAddCustomEntity,
    onAddParticipantFromPool,
    entityPool = {},
    onKindChange,
    onNameChange,
    onInitiativeChange,
    onHpChange,
    onRemove,
    onApply,
}) {
    const [newEntityKind, setNewEntityKind] = useState("NPC");
    const [newEntityName, setNewEntityName] = useState("");

    useEffect(() => {
        if (!isOpen) {
            setNewEntityKind("NPC");
            setNewEntityName("");
        }
    }, [isOpen]);

    if (!isOpen) {
        return null;
    }

    const selectedCounts = draftParticipants.reduce((acc, row) => {
        const key = `${row.kind}:${row.name.trim().toLowerCase()}`;
        if (!row.name.trim()) {
            return acc;
        }
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});

    return (
        <div className="session-dm__combat-setup-backdrop" role="dialog" aria-modal="true" aria-label="Combat setup">
            <div className="session-dm__combat-setup">
                <div className="session-dm__combat-setup-header">
                    <div>
                        <h3>Combat Setup</h3>
                        <p>Build initiative from your campaign roster, then adjust values before combat starts.</p>
                    </div>
                    <button
                        type="button"
                        className="session-dm__map-picker-close"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
                <div className="session-dm__combat-setup-pool">
                    {[
                        { key: "players", label: "Players", kind: "Player" },
                        { key: "npcs", label: "NPCs", kind: "NPC" },
                        { key: "enemies", label: "Enemies", kind: "Enemy" },
                    ].map((group) => (
                        <section key={group.key} className="session-dm__combat-pool-group">
                            <div className="session-dm__combat-pool-header">
                                <span className="session-dm__combat-pool-title">{group.label}</span>
                            </div>
                            <div className="session-dm__combat-pool-grid">
                                {(entityPool[group.key] || []).length > 0 ? (
                                    (entityPool[group.key] || []).map((entry, index) => (
                                        (() => {
                                            const entryName = entry.name || `${group.kind} ${index + 1}`;
                                            const entryKey = `${group.kind}:${entryName.trim().toLowerCase()}`;
                                            const selectedCount = selectedCounts[entryKey] || 0;

                                            return (
                                                <button
                                                    key={`${group.key}-${entry.name || index}`}
                                                    type="button"
                                                    className={[
                                                        "session-dm__combat-pool-card",
                                                        selectedCount > 0 ? "is-selected" : "",
                                                    ].join(" ")}
                                                    onClick={() => onAddParticipantFromPool(group.kind, entry)}
                                                    disabled={selectedCount > 0}
                                                >
                                                    <div className="session-dm__combat-pool-card-top">
                                                        <strong>{entryName}</strong>
                                                        {selectedCount > 0 && (
                                                            <span className="session-dm__combat-pool-badge">
                                                                In Encounter{selectedCount > 1 ? ` x${selectedCount}` : ""}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span>
                                                        {[
                                                            group.kind === "Enemy" ? entry.creatureType : entry.className,
                                                            entry.level ? `Level ${entry.level}` : null,
                                                            entry.cr || null,
                                                            entry.hp ? `HP ${entry.hp}` : null,
                                                        ].filter(Boolean).join(" • ") || "Add to initiative"}
                                                    </span>
                                                </button>
                                            );
                                        })()
                                    ))
                                ) : (
                                    <p className="session-dm__combat-pool-empty">No {group.label.toLowerCase()} available.</p>
                                )}
                            </div>
                        </section>
                    ))}
                </div>
                <div className="session-dm__combat-custom-editor">
                    <div className="session-dm__combat-pool-header">
                        <span className="session-dm__combat-pool-title">New Entity</span>
                    </div>
                    <div className="session-dm__combat-custom-row">
                        <select
                            className="session-dm__combat-select"
                            value={newEntityKind}
                            onChange={(event) => setNewEntityKind(event.target.value)}
                        >
                            <option value="NPC">NPC</option>
                            <option value="Enemy">Enemy</option>
                        </select>
                        <input
                            className="session-dm__combat-input"
                            type="text"
                            value={newEntityName}
                            placeholder="Entity name"
                            onChange={(event) => setNewEntityName(event.target.value)}
                        />
                        <button
                            type="button"
                            className="session-dm__ghost session-dm__ghost--small"
                            onClick={() => {
                                const added = onAddCustomEntity?.(newEntityKind, newEntityName);
                                if (added) {
                                    setNewEntityName("");
                                    setNewEntityKind("NPC");
                                }
                            }}
                        >
                            Add Entity
                        </button>
                    </div>
                </div>
                <div className="session-dm__combat-setup-selected-header">
                    <span className="session-dm__combat-pool-title">Initiative Order</span>
                    <div className="session-dm__combat-setup-selected-actions">
                        <span className="session-dm__combat-selected-count">
                            {draftParticipants.length} {draftParticipants.length === 1 ? "participant" : "participants"}
                        </span>
                    </div>
                </div>
                {draftParticipants.length > 0 && (
                    <div className="session-dm__combat-selected-strip">
                        {draftParticipants.map((row, index) => (
                            <button
                                key={`selected-${row.id}`}
                                type="button"
                                className="session-dm__combat-selected-chip"
                                onClick={() => onRemove(row.id)}
                                title={`Remove ${row.name || `${row.kind} ${index + 1}`}`}
                            >
                                <span>{row.name || `${row.kind} ${index + 1}`}</span>
                                <span className="session-dm__combat-selected-chip-remove">x</span>
                            </button>
                        ))}
                    </div>
                )}
                <div className="session-dm__combat-setup-list">
                    {draftParticipants.map((row) => (
                        <div className="session-dm__combat-row" key={row.id}>
                            <div className="session-dm__combat-row-main">
                                <div className="session-dm__combat-row-heading">
                                    <select
                                        className="session-dm__combat-select"
                                        value={row.kind}
                                        onChange={(event) => onKindChange(row.id, event.target.value)}
                                    >
                                        <option value="Player">Player</option>
                                        <option value="NPC">NPC</option>
                                        <option value="Enemy">Enemy</option>
                                    </select>
                                    <span className="session-dm__combat-row-source">{row.sourceLabel || "Custom"}</span>
                                </div>
                                <input
                                    className="session-dm__combat-input"
                                    type="text"
                                    value={row.name}
                                    placeholder="Name"
                                    onChange={(event) => onNameChange(row.id, event.target.value)}
                                />
                            </div>
                            <div className="session-dm__combat-row-stats">
                                <label className="session-dm__combat-number-label">
                                    Init
                                    <input
                                        className="session-dm__combat-number"
                                        type="number"
                                        value={row.initiative}
                                        onChange={(event) => onInitiativeChange(row.id, Number(event.target.value) || 0)}
                                    />
                                </label>
                                <label className="session-dm__combat-number-label">
                                    HP
                                    <input
                                        className="session-dm__combat-number"
                                        type="number"
                                        value={row.hp}
                                        onChange={(event) => onHpChange(row.id, Number(event.target.value) || 0)}
                                    />
                                </label>
                            </div>
                            <button
                                type="button"
                                className="session-dm__ghost session-dm__ghost--small"
                                onClick={() => onRemove(row.id)}
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                </div>
                {combatSetupError && <p className="session-dm__combat-error">{combatSetupError}</p>}
                <div className="session-dm__combat-footer">
                    <button
                        type="button"
                        className="session-dm__ghost"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button type="button" className="session-dm__pill is-alert" onClick={onApply}>
                        Start Combat
                    </button>
                </div>
            </div>
        </div>
    );
}

export default EncounterOverlay;
