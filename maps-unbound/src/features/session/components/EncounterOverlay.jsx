// Reusable combat setup modal used by the map canvas.
function EncounterOverlay({
    isOpen,
    draftParticipants,
    combatSetupError,
    onClose,
    onAddParticipant,
    onToggleInclude,
    onKindChange,
    onNameChange,
    onInitiativeChange,
    onHpChange,
    onRemove,
    onApply,
}) {
    if (!isOpen) {
        return null;
    }

    return (
        <div className="session-dm__combat-setup-backdrop" role="dialog" aria-modal="true" aria-label="Combat setup">
            <div className="session-dm__combat-setup">
                <div className="session-dm__combat-setup-header">
                    <div>
                        <h3>Combat Setup</h3>
                        <p>Choose who is in combat and set initiative to determine turn order.</p>
                    </div>
                    <button
                        type="button"
                        className="session-dm__map-picker-close"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
                <div className="session-dm__combat-setup-actions">
                    <button
                        type="button"
                        className="session-dm__ghost session-dm__ghost--small"
                        onClick={() => onAddParticipant("Player")}
                    >
                        Add Player
                    </button>
                    <button
                        type="button"
                        className="session-dm__ghost session-dm__ghost--small"
                        onClick={() => onAddParticipant("NPC")}
                    >
                        Add NPC
                    </button>
                    <button
                        type="button"
                        className="session-dm__ghost session-dm__ghost--small"
                        onClick={() => onAddParticipant("Enemy")}
                    >
                        Add Enemy
                    </button>
                </div>
                <div className="session-dm__combat-setup-list">
                    {draftParticipants.map((row) => (
                        <div className="session-dm__combat-row" key={row.id}>
                            <label className="session-dm__combat-check">
                                <input
                                    type="checkbox"
                                    checked={row.include}
                                    onChange={(event) => onToggleInclude(row.id, event.target.checked)}
                                />
                                In
                            </label>
                            <select
                                className="session-dm__combat-select"
                                value={row.kind}
                                onChange={(event) => onKindChange(row.id, event.target.value)}
                            >
                                <option value="Player">Player</option>
                                <option value="NPC">NPC</option>
                                <option value="Enemy">Enemy</option>
                            </select>
                            <input
                                className="session-dm__combat-input"
                                type="text"
                                value={row.name}
                                placeholder="Name"
                                onChange={(event) => onNameChange(row.id, event.target.value)}
                            />
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
