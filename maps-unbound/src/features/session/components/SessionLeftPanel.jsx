import { useMemo, useState } from "react";

function SessionLeftPanel({ isCollapsed, onToggle, turns = [] }) {
    const players = turns.filter((turn) => turn.kind === "Player");
    const npcs = turns.filter((turn) => turn.kind === "NPC");
    const enemies = turns.filter((turn) => turn.kind === "Enemy");
    const [activeTab, setActiveTab] = useState("players");
    const [selectedEntityId, setSelectedEntityId] = useState(null);

    const entityById = useMemo(() => {
        const entries = [];
        turns.forEach((turn) => {
            entries.push({
                ...turn,
                entityId: `${turn.kind}-${turn.name}`,
            });
        });
        return Object.fromEntries(entries.map((entry) => [entry.entityId, entry]));
    }, [turns]);

    const selectedEntity = selectedEntityId ? entityById[selectedEntityId] : null;

    return (
        <aside
            className={[
                "session-dm__left",
                "session-dm__panel",
                "session-dm__panel--collapsible",
                isCollapsed ? "is-collapsed" : "",
            ].filter(Boolean).join(" ")}
        >
            <button
                type="button"
                className="session-dm__collapse-btn session-dm__collapse-btn--panel"
                aria-pressed={isCollapsed}
                aria-label={isCollapsed ? "Expand left panel" : "Collapse left panel"}
                onClick={onToggle}
            >
                <span className="session-dm__collapse-icon" aria-hidden="true">
                    {isCollapsed ? ">" : "<"}
                </span>
            </button>
            {!isCollapsed && (
                <>
                    <div className="session-dm__panel-header">
                        <div>
                            <p className="session-dm__panel-title">Sheets & Stat Blocks</p>
                            <p className="session-dm__panel-subtitle">Quick reference cards</p>
                        </div>
                    </div>
                    {selectedEntity ? (
                        <div className="session-dm__detail">
                            <div className="session-dm__detail-header">
                                <button
                                    type="button"
                                    className="session-dm__ghost session-dm__ghost--small"
                                    onClick={() => setSelectedEntityId(null)}
                                >
                                    Back to list
                                </button>
                                <span className="session-dm__chip">{selectedEntity.kind}</span>
                            </div>
                            <div className="session-dm__detail-title">
                                <span className="session-dm__detail-name">{selectedEntity.name}</span>
                                {selectedEntity.kind === "Player" && (
                                    <span className="session-dm__detail-sub">
                                        {selectedEntity.className} · Level {selectedEntity.level}
                                    </span>
                                )}
                                {selectedEntity.kind === "NPC" && (
                                    <span className="session-dm__detail-sub">
                                        {selectedEntity.className} · Level {selectedEntity.level}
                                    </span>
                                )}
                                {selectedEntity.kind === "Enemy" && (
                                    <span className="session-dm__detail-sub">
                                        {selectedEntity.creatureType} · {selectedEntity.cr}
                                    </span>
                                )}
                            </div>
                            <div className="session-dm__detail-stats">
                                <div className="session-dm__detail-card">
                                    <span className="session-dm__detail-label">HP</span>
                                    <span className="session-dm__detail-value">{selectedEntity.hp}</span>
                                </div>
                                <div className="session-dm__detail-card">
                                    <span className="session-dm__detail-label">AC</span>
                                    <span className="session-dm__detail-value">16</span>
                                </div>
                                <div className="session-dm__detail-card">
                                    <span className="session-dm__detail-label">Speed</span>
                                    <span className="session-dm__detail-value">30</span>
                                </div>
                                <div className="session-dm__detail-card">
                                    <span className="session-dm__detail-label">Initiative</span>
                                    <span className="session-dm__detail-value">+4</span>
                                </div>
                            </div>
                            <div className="session-dm__detail-block">
                                <span className="session-dm__section-title">Traits</span>
                                <p className="session-dm__panel-subtitle">
                                    Quick trait summary, resistances, and notable passives.
                                </p>
                            </div>
                            <div className="session-dm__detail-block">
                                <span className="session-dm__section-title">Actions</span>
                                <ul className="session-dm__detail-list">
                                    <li>Multiattack (2)</li>
                                    <li>Shadow Step (Recharge 5-6)</li>
                                    <li>Tail Sweep (15 ft. cone)</li>
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="session-dm__tabs session-dm__tabs--full">
                                <button
                                    type="button"
                                    className={[
                                        "session-dm__tab",
                                        activeTab === "players" ? "is-active" : "",
                                    ].filter(Boolean).join(" ")}
                                    onClick={() => setActiveTab("players")}
                                >
                                    Players ({players.length})
                                </button>
                                <button
                                    type="button"
                                    className={[
                                        "session-dm__tab",
                                        activeTab === "enemies" ? "is-active" : "",
                                    ].filter(Boolean).join(" ")}
                                    onClick={() => setActiveTab("enemies")}
                                >
                                    Enemies ({enemies.length})
                                </button>
                                <button
                                    type="button"
                                    className={[
                                        "session-dm__tab",
                                        activeTab === "npcs" ? "is-active" : "",
                                    ].filter(Boolean).join(" ")}
                                    onClick={() => setActiveTab("npcs")}
                                >
                                    NPCs ({npcs.length})
                                </button>
                            </div>
                            {activeTab === "players" && (
                                <div className="session-dm__section">
                                    <div className="session-dm__sheet-list">
                                        {players.map((player) => {
                                            const id = `Player-${player.name}`;
                                            return (
                                                <button
                                                    key={player.name}
                                                    type="button"
                                                    className="session-dm__sheet session-dm__sheet-button"
                                                    onClick={() => setSelectedEntityId(id)}
                                                >
                                                    <div className="session-dm__sheet-main">
                                                        <span className="session-dm__sheet-name">{player.name}</span>
                                                        <span className="session-dm__sheet-detail">
                                                            {player.className} · L{player.level}
                                                        </span>
                                                    </div>
                                                    <div className="session-dm__sheet-stats">
                                                        <span className="session-dm__sheet-stat">HP {player.hp}</span>
                                                        <span className="session-dm__sheet-stat">AC 16</span>
                                                        <span className="session-dm__sheet-stat">Speed 30</span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            {activeTab === "npcs" && (
                                <div className="session-dm__section">
                                    <div className="session-dm__sheet-list">
                                        {npcs.map((npc) => {
                                            const id = `NPC-${npc.name}`;
                                            return (
                                                <button
                                                    key={npc.name}
                                                    type="button"
                                                    className="session-dm__sheet session-dm__sheet-button"
                                                    onClick={() => setSelectedEntityId(id)}
                                                >
                                                    <div className="session-dm__sheet-main">
                                                        <span className="session-dm__sheet-name">{npc.name}</span>
                                                        <span className="session-dm__sheet-detail">
                                                            {npc.className} · L{npc.level}
                                                        </span>
                                                    </div>
                                                    <div className="session-dm__sheet-stats">
                                                        <span className="session-dm__sheet-stat">HP {npc.hp}</span>
                                                        <span className="session-dm__sheet-stat">AC 13</span>
                                                        <span className="session-dm__sheet-stat">Speed 30</span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            {activeTab === "enemies" && (
                                <div className="session-dm__section">
                                    <div className="session-dm__sheet-list">
                                        {enemies.map((enemy) => {
                                            const id = `Enemy-${enemy.name}`;
                                            return (
                                                <button
                                                    key={enemy.name}
                                                    type="button"
                                                    className="session-dm__sheet session-dm__sheet-button"
                                                    onClick={() => setSelectedEntityId(id)}
                                                >
                                                    <div className="session-dm__sheet-main">
                                                        <span className="session-dm__sheet-name">{enemy.name}</span>
                                                        <span className="session-dm__sheet-detail">
                                                            {enemy.creatureType} · {enemy.cr}
                                                        </span>
                                                    </div>
                                                    <div className="session-dm__sheet-stats">
                                                        <span className="session-dm__sheet-stat">HP {enemy.hp}</span>
                                                        <span className="session-dm__sheet-stat">AC 17</span>
                                                        <span className="session-dm__sheet-stat">Speed 40</span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}
            {isCollapsed && (
                <div className="session-dm__collapsed-label" aria-hidden="true">
                    Sheets &amp; Stat Blocks
                </div>
            )}
        </aside>
    )
}

export default SessionLeftPanel;
