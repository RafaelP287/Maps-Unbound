import { useEffect, useMemo, useRef, useState } from "react";

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

function SessionMapCanvas({ showTurnOrder = false, turns = [], onCombatStateChange }) {
    const [isCombatState, setIsCombatState] = useState(false);
    const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
    const [selectedMap, setSelectedMap] = useState(null);
    const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 });
    const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDraggingMap, setIsDraggingMap] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
    const viewportRef = useRef(null);

    useEffect(() => {
        if (!selectedMap || !viewportRef.current) {
            return undefined;
        }

        const element = viewportRef.current;
        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) {
                return;
            }
            setViewportSize({
                width: entry.contentRect.width,
                height: entry.contentRect.height,
            });
        });

        observer.observe(element);
        return () => observer.disconnect();
    }, [selectedMap]);

    const mapDisplay = useMemo(() => {
        if (!imageNaturalSize.width || !imageNaturalSize.height || !viewportSize.width || !viewportSize.height) {
            return { width: 0, height: 0, maxX: 0, maxY: 0 };
        }

        const coverScale = Math.max(
            viewportSize.width / imageNaturalSize.width,
            viewportSize.height / imageNaturalSize.height
        );
        const width = imageNaturalSize.width * coverScale;
        const height = imageNaturalSize.height * coverScale;

        return {
            width,
            height,
            maxX: Math.max(0, (width - viewportSize.width) / 2),
            maxY: Math.max(0, (height - viewportSize.height) / 2),
        };
    }, [imageNaturalSize.height, imageNaturalSize.width, viewportSize.height, viewportSize.width]);

    const clampPan = (x, y) => ({
        x: Math.min(mapDisplay.maxX, Math.max(-mapDisplay.maxX, x)),
        y: Math.min(mapDisplay.maxY, Math.max(-mapDisplay.maxY, y)),
    });

    useEffect(() => {
        setPan((prev) => clampPan(prev.x, prev.y));
    }, [mapDisplay.maxX, mapDisplay.maxY]);

    return (
        <main className={["session-dm__map", isCombatState ? "is-combat-state" : ""].filter(Boolean).join(" ")}>
            {selectedMap && (
                <div
                    ref={viewportRef}
                    className={["session-dm__map-viewport", isDraggingMap ? "is-dragging" : ""].filter(Boolean).join(" ")}
                    onPointerDown={(event) => {
                        event.currentTarget.setPointerCapture(event.pointerId);
                        dragStartRef.current = {
                            x: event.clientX,
                            y: event.clientY,
                            panX: pan.x,
                            panY: pan.y,
                        };
                        setIsDraggingMap(true);
                    }}
                    onPointerMove={(event) => {
                        if (!isDraggingMap) {
                            return;
                        }
                        const deltaX = event.clientX - dragStartRef.current.x;
                        const deltaY = event.clientY - dragStartRef.current.y;
                        setPan(clampPan(dragStartRef.current.panX + deltaX, dragStartRef.current.panY + deltaY));
                    }}
                    onPointerUp={(event) => {
                        event.currentTarget.releasePointerCapture(event.pointerId);
                        setIsDraggingMap(false);
                    }}
                    onPointerLeave={() => setIsDraggingMap(false)}
                >
                    <img
                        className="session-dm__map-image"
                        src={selectedMap.src}
                        alt={`${selectedMap.name} map`}
                        draggable={false}
                        onLoad={(event) => {
                            const target = event.currentTarget;
                            setImageNaturalSize({
                                width: target.naturalWidth,
                                height: target.naturalHeight,
                            });
                            setPan({ x: 0, y: 0 });
                        }}
                        style={{
                            width: mapDisplay.width ? `${mapDisplay.width}px` : undefined,
                            height: mapDisplay.height ? `${mapDisplay.height}px` : undefined,
                            left: `calc(50% + ${pan.x}px)`,
                            top: `calc(50% + ${pan.y}px)`,
                        }}
                    />
                </div>
            )}
            <button
                type="button"
                className="session-dm__map-btn session-dm__map-btn--map"
                onClick={() => setIsMapPickerOpen(true)}
            >
                Map
            </button>
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
            {showTurnOrder && (
                <aside className="session-dm__map-turns" aria-label="Turn order overlay">
                    <div className="session-dm__map-turns-list">
                        {turns.map((turn) => (
                            <div
                                key={`${turn.order}-${turn.name}`}
                                className={[
                                    "session-dm__map-turn",
                                    turn.isActive ? "is-active" : "",
                                ].filter(Boolean).join(" ")}
                            >
                                <span className="session-dm__map-turn-name">{turn.name}</span>
                            </div>
                        ))}
                    </div>
                </aside>
            )}
            <button
                type="button"
                className="session-dm__map-btn session-dm__map-btn--combat"
                onClick={() => {
                    setIsCombatState((prev) => {
                        const nextValue = !prev;
                        if (onCombatStateChange) {
                            onCombatStateChange(nextValue);
                        }
                        return nextValue;
                    });
                }}
                aria-pressed={isCombatState}
            >
                {isCombatState ? "End Combat" : "Combat"}
            </button>
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
