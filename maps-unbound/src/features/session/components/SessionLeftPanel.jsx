// Left sidebar: sheets/stat blocks browser and detail panel for selected entity.
import { useMemo, useState } from "react";

function SessionLeftPanel({ isCollapsed, onToggle, turns = [], entities = [] }) {
    const sourceEntities = entities.length > 0 ? entities : turns;
    const normalizedEntities = useMemo(
        () => sourceEntities.map((turn, idx) => ({
            ...turn,
            entityId: `${turn.kind}-${turn.name}-${idx}`,
        })),
        [sourceEntities]
    );
    const players = normalizedEntities.filter((turn) => turn.kind === "Player");
    const npcs = normalizedEntities.filter((turn) => turn.kind === "NPC");
    const enemies = normalizedEntities.filter((turn) => turn.kind === "Enemy");
    const [activeTab, setActiveTab] = useState("players");
    const [selectedEntityId, setSelectedEntityId] = useState(null);

    const entityById = useMemo(() => {
        const entries = [];
        normalizedEntities.forEach((turn) => {
            entries.push({
                ...turn,
            });
        });
        return Object.fromEntries(entries.map((entry) => [entry.entityId, entry]));
    }, [normalizedEntities]);

    const selectedEntity = selectedEntityId ? entityById[selectedEntityId] : null;
    const getEntitySummary = (entity) => {
        if (!entity) {
            return "";
        }
        if (entity.kind === "Enemy") {
            return [entity.creatureType, entity.cr].filter(Boolean).join(" · ");
        }
        return [entity.className, entity.level ? `Level ${entity.level}` : ""].filter(Boolean).join(" · ");
    };
    const getEntityFacts = (entity) => {
        if (!entity) {
            return [];
        }
        return [
            entity.hp !== undefined && entity.hp !== null && entity.hp !== "" ? { label: "HP", value: entity.hp } : null,
            entity.initiative !== undefined && entity.initiative !== null && entity.initiative !== ""
                ? { label: "Initiative", value: entity.initiative }
                : null,
            entity.level !== undefined && entity.level !== null && entity.level !== ""
                ? { label: "Level", value: entity.level }
                : null,
            entity.cr ? { label: "CR", value: entity.cr } : null,
        ].filter(Boolean);
    };
    const selectedEntityFacts = getEntityFacts(selectedEntity);

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
                            <p className="session-dm__panel-title">Sheets & Reference</p>
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
                                {getEntitySummary(selectedEntity) && (
                                    <span className="session-dm__detail-sub">{getEntitySummary(selectedEntity)}</span>
                                )}
                            </div>
                            {selectedEntityFacts.length > 0 ? (
                                <div className="session-dm__detail-stats">
                                    {selectedEntityFacts.map((fact) => (
                                        <div key={fact.label} className="session-dm__detail-card">
                                            <span className="session-dm__detail-label">{fact.label}</span>
                                            <span className="session-dm__detail-value">{fact.value}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="session-dm__detail-block">
                                    <span className="session-dm__section-title">Reference</span>
                                    <p className="session-dm__panel-subtitle">
                                        No additional session data has been recorded for this entity yet.
                                    </p>
                                </div>
                            )}
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
                                    {players.length > 0 ? (
                                        <div className="session-dm__sheet-list">
                                            {players.map((player) => {
                                                const id = player.entityId;
                                                return (
                                                    <button
                                                        key={player.entityId}
                                                        type="button"
                                                        className="session-dm__sheet session-dm__sheet-button"
                                                        onClick={() => setSelectedEntityId(id)}
                                                    >
                                                        <div className="session-dm__sheet-main">
                                                            <span className="session-dm__sheet-name">{player.name}</span>
                                                            <span className="session-dm__sheet-detail">
                                                                {getEntitySummary(player)}
                                                            </span>
                                                        </div>
                                                        <div className="session-dm__sheet-stats">
                                                            {getEntityFacts(player).map((fact) => (
                                                                <span key={fact.label} className="session-dm__sheet-stat">
                                                                    {fact.label} {fact.value}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="session-dm__panel-subtitle">
                                            No campaign-linked character sheets are available yet.
                                        </p>
                                    )}
                                </div>
                            )}
                            {activeTab === "npcs" && (
                                <div className="session-dm__section">
                                    <div className="session-dm__sheet-list">
                                        {npcs.map((npc) => {
                                            const id = npc.entityId;
                                            return (
                                                <button
                                                    key={npc.entityId}
                                                    type="button"
                                                    className="session-dm__sheet session-dm__sheet-button"
                                                    onClick={() => setSelectedEntityId(id)}
                                                >
                                                    <div className="session-dm__sheet-main">
                                                        <span className="session-dm__sheet-name">{npc.name}</span>
                                                        <span className="session-dm__sheet-detail">
                                                            {getEntitySummary(npc)}
                                                        </span>
                                                    </div>
                                                    <div className="session-dm__sheet-stats">
                                                        {getEntityFacts(npc).map((fact) => (
                                                            <span key={fact.label} className="session-dm__sheet-stat">
                                                                {fact.label} {fact.value}
                                                            </span>
                                                        ))}
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
                                            const id = enemy.entityId;
                                            return (
                                                <button
                                                    key={enemy.entityId}
                                                    type="button"
                                                    className="session-dm__sheet session-dm__sheet-button"
                                                    onClick={() => setSelectedEntityId(id)}
                                                >
                                                    <div className="session-dm__sheet-main">
                                                        <span className="session-dm__sheet-name">{enemy.name}</span>
                                                        <span className="session-dm__sheet-detail">
                                                            {getEntitySummary(enemy)}
                                                        </span>
                                                    </div>
                                                    <div className="session-dm__sheet-stats">
                                                        {getEntityFacts(enemy).map((fact) => (
                                                            <span key={fact.label} className="session-dm__sheet-stat">
                                                                {fact.label} {fact.value}
                                                            </span>
                                                        ))}
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
