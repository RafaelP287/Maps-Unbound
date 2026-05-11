import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

// Each row owns its own string state for the Init/HP inputs so the user can
// freely backspace/retype without the value snapping back to "0". Commit on
// blur or Enter.
function ParticipantRow({
    row,
    onKindChange,
    onNameChange,
    onInitiativeChange,
    onHpChange,
    onRemove,
}) {
    const [initStr, setInitStr] = useState(String(row.initiative ?? ""));
    const [hpStr, setHpStr] = useState(String(row.hp ?? ""));
    const [prevInit, setPrevInit] = useState(row.initiative);
    const [prevHp, setPrevHp] = useState(row.hp);

    // Resync local input state when parent value changes externally
    // (e.g., kind change reset HP). Standard React pattern — see
    // https://react.dev/reference/react/useState#storing-information-from-previous-renders
    if (row.initiative !== prevInit) {
        setPrevInit(row.initiative);
        setInitStr(String(row.initiative ?? ""));
    }
    if (row.hp !== prevHp) {
        setPrevHp(row.hp);
        setHpStr(String(row.hp ?? ""));
    }

    const commitInit = () => {
        const trimmed = initStr.trim();
        if (trimmed === "") {
            setInitStr(String(row.initiative ?? "0"));
            return;
        }
        const n = parseInt(trimmed, 10);
        if (Number.isFinite(n) && n !== row.initiative) onInitiativeChange(row.id, n);
        else setInitStr(String(row.initiative ?? "0"));
    };

    const commitHp = () => {
        const trimmed = hpStr.trim();
        if (trimmed === "") {
            setHpStr(String(row.hp ?? "0"));
            return;
        }
        const n = parseInt(trimmed, 10);
        if (Number.isFinite(n) && n >= 0 && n !== row.hp) onHpChange(row.id, n);
        else setHpStr(String(row.hp ?? "0"));
    };

    const handleEnter = (e) => {
        if (e.key === "Enter") e.currentTarget.blur();
    };

    return (
        <div className="session-dm__combat-row">
            <div className="session-dm__combat-row-main">
                <div className="session-dm__combat-row-heading">
                    <select
                        className="session-dm__combat-select"
                        value={row.kind}
                        onChange={(e) => onKindChange(row.id, e.target.value)}
                    >
                        <option value="Player">Player</option>
                        <option value="NPC">NPC</option>
                        <option value="Enemy">Enemy</option>
                    </select>
                    <span className="session-dm__combat-row-source">
                        {row.sourceLabel || "Custom"}
                    </span>
                </div>
                <input
                    className="session-dm__combat-input"
                    type="text"
                    value={row.name}
                    placeholder="Name"
                    onChange={(e) => onNameChange(row.id, e.target.value)}
                />
            </div>
            <div className="session-dm__combat-row-stats">
                <label className="session-dm__combat-number-label">
                    Init
                    <input
                        className="session-dm__combat-number session-dm__combat-number--init"
                        type="text"
                        inputMode="numeric"
                        maxLength={3}
                        value={initStr}
                        onChange={(e) => setInitStr(e.target.value.replace(/[^0-9-]/g, ""))}
                        onBlur={commitInit}
                        onKeyDown={handleEnter}
                    />
                </label>
                <label className="session-dm__combat-number-label">
                    HP
                    <input
                        className="session-dm__combat-number session-dm__combat-number--hp"
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        value={hpStr}
                        onChange={(e) => setHpStr(e.target.value.replace(/[^0-9]/g, ""))}
                        onBlur={commitHp}
                        onKeyDown={handleEnter}
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
    );
}
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
    onHiddenMapChange,
    onHiddenInitChange,
    onRemove,
    onApply,
}) {
    const [newEntityKind, setNewEntityKind] = useState("Enemy");
    const [newEntityName, setNewEntityName] = useState("");

    // Reset form state when modal closes. The cleanup function pattern avoids
    // the "set-state-in-effect" lint warning since the reset runs as cleanup
    // (i.e., when isOpen flips from true → false, the previous effect cleans up).
    useEffect(() => {
        if (!isOpen) return;
        return () => {
            setNewEntityKind("Enemy");
            setNewEntityName("");
        };
    }, [isOpen]);

    // Live-sorted view: highest initiative first, name as tiebreaker.
    // Must be declared before any early-return so hooks fire in the same order every render.
    const sortedParticipants = useMemo(
        () =>
            [...draftParticipants].sort((a, b) => {
                if ((b.initiative ?? 0) !== (a.initiative ?? 0))
                    return (b.initiative ?? 0) - (a.initiative ?? 0);
                return (a.name || "").localeCompare(b.name || "");
            }),
        [draftParticipants]
    );

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
            <div className="session-dm__combat-setup session-dm__combat-setup--sticky">
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
                                                    {entry.portraitUrl && (
                                                        <div className="session-dm__combat-pool-portrait">
                                                            <img src={entry.portraitUrl} alt="" />
                                                        </div>
                                                    )}
                                                    <div className="session-dm__combat-pool-card-body">
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
                                                    </div>
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
                            <option value="Enemy">Enemy</option>
                            <option value="NPC">NPC</option>
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
                {sortedParticipants.length > 0 && (
                    <div className="session-dm__combat-selected-strip">
                        {sortedParticipants.map((row, index) => (
                            <div
                                key={`selected-${row.id}`}
                                className="session-dm__combat-selected-chip"
                            >
                                <div className="session-dm__combat-selected-chip-top">
                                    <span className="session-dm__combat-selected-chip-name">
                                        {row.name || `${row.kind} ${index + 1}`}
                                    </span>
                                    <button
                                        type="button"
                                        className="session-dm__combat-selected-chip-remove"
                                        onClick={() => onRemove(row.id)}
                                        title={`Remove ${row.name || `${row.kind} ${index + 1}`}`}
                                    >
                                        x
                                    </button>
                                </div>
                                {row.kind !== "Player" && (
                                    <div className="session-dm__combat-chip-toggles">
                                        <button
                                            type="button"
                                            className={[
                                                "session-dm__combat-chip-toggle-btn",
                                                row.hiddenFromMap ? "is-hidden" : "is-visible",
                                            ].join(" ")}
                                            onClick={() => onHiddenMapChange?.(row.id, !row.hiddenFromMap)}
                                            title={row.hiddenFromMap ? "Players can't see this on the map" : "Players can see this on the map"}
                                        >
                                            {row.hiddenFromMap ? <EyeOff size={12} /> : <Eye size={12} />}
                                            <span>Map</span>
                                        </button>
                                        <button
                                            type="button"
                                            className={[
                                                "session-dm__combat-chip-toggle-btn",
                                                row.hiddenFromInitiative ? "is-hidden" : "is-visible",
                                            ].join(" ")}
                                            onClick={() => onHiddenInitChange?.(row.id, !row.hiddenFromInitiative)}
                                            title={row.hiddenFromInitiative ? "Players can't see this in the strip" : "Players can see this in the strip"}
                                        >
                                            {row.hiddenFromInitiative ? <EyeOff size={12} /> : <Eye size={12} />}
                                            <span>Init</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
               <div className="session-dm__combat-setup-list">
                    {sortedParticipants.map((row) => (
                        <ParticipantRow
                            key={row.id}
                            row={row}
                            onKindChange={onKindChange}
                            onNameChange={onNameChange}
                            onInitiativeChange={onInitiativeChange}
                            onHpChange={onHpChange}
                            onRemove={onRemove}
                        />
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
