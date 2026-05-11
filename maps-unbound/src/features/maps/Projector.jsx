import { useEffect, useRef, useState } from "react";

// Dedicated projector view. No website chrome, just the Godot iframe in projector mode
// and a fullscreen toggle that auto-hides when the mouse is idle (like YouTube).
//
// The DM's main Godot iframe broadcasts state via BroadcastChannel('maps_unbound').
// Our iframe loads `?mode=projector` and listens to the same channel automatically
// (logic lives in the GDScript).
function Projector() {
    const iframeRef = useRef(null);
    const [showControls, setShowControls] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const idleTimerRef = useRef(null);

    // Track real fullscreen state so the icon reflects reality.
    useEffect(() => {
        const onChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener("fullscreenchange", onChange);
        return () => document.removeEventListener("fullscreenchange", onChange);
    }, []);

    // Mouse-idle auto-hide. We have to listen on BOTH the parent document AND
    // the iframe's contentWindow, because mouse moves over the iframe don't bubble
    // up to the parent.
    useEffect(() => {
        const resetIdleTimer = () => {
            setShowControls(true);
            clearTimeout(idleTimerRef.current);
            idleTimerRef.current = setTimeout(() => {
                setShowControls(false);
            }, 2500);
        };
        resetIdleTimer();

        // Parent document listeners (catches mouse over the button itself, etc.)
        document.addEventListener("mousemove", resetIdleTimer);
        document.addEventListener("mousedown", resetIdleTimer);
        document.addEventListener("keydown", resetIdleTimer);

        // Iframe content listeners — wait for iframe to load before attaching.
        const iframe = iframeRef.current;
        let iframeDoc = null;
        const attachIframeListeners = () => {
            try {
                iframeDoc = iframe?.contentWindow?.document;
                if (!iframeDoc) return;
                iframeDoc.addEventListener("mousemove", resetIdleTimer);
                iframeDoc.addEventListener("mousedown", resetIdleTimer);
                iframeDoc.addEventListener("keydown", resetIdleTimer);
            } catch (err) {
                // Cross-origin iframe would throw — but ours is same-origin so it's fine.
                console.warn("Could not attach iframe activity listeners:", err.message);
            }
        };
        if (iframe) {
            iframe.addEventListener("load", attachIframeListeners);
            // In case it's already loaded by the time this effect runs.
            if (iframe.contentDocument?.readyState === "complete") {
                attachIframeListeners();
            }
        }

        return () => {
            document.removeEventListener("mousemove", resetIdleTimer);
            document.removeEventListener("mousedown", resetIdleTimer);
            document.removeEventListener("keydown", resetIdleTimer);
            if (iframe) {
                iframe.removeEventListener("load", attachIframeListeners);
            }
            if (iframeDoc) {
                try {
                    iframeDoc.removeEventListener("mousemove", resetIdleTimer);
                    iframeDoc.removeEventListener("mousedown", resetIdleTimer);
                    iframeDoc.removeEventListener("keydown", resetIdleTimer);
                } catch {
                    // Ignore — iframe may already be detached
                }
            }
            clearTimeout(idleTimerRef.current);
        };
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.().catch((err) => {
                console.warn("Could not enter fullscreen:", err.message);
            });
        } else {
            document.exitFullscreen?.();
        }
    };

    return (
        <div style={s.root}>
            <iframe
                ref={iframeRef}
                src="/maps-unbound-godot.html?mode=projector"
                title="Map Projector"
                style={s.iframe}
            />
            <button
                type="button"
                onClick={toggleFullscreen}
                style={{
                    ...s.fullscreenBtn,
                    opacity: showControls ? 1 : 0,
                    pointerEvents: showControls ? "auto" : "none",
                }}
                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
                {isFullscreen ? (
                    // Exit fullscreen icon (4 inward arrows)
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="4 14 10 14 10 20" />
                        <polyline points="20 10 14 10 14 4" />
                        <line x1="14" y1="10" x2="21" y2="3" />
                        <line x1="3" y1="21" x2="10" y2="14" />
                    </svg>
                ) : (
                    // Enter fullscreen icon (4 outward arrows)
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 3 21 3 21 9" />
                        <polyline points="9 21 3 21 3 15" />
                        <line x1="21" y1="3" x2="14" y2="10" />
                        <line x1="3" y1="21" x2="10" y2="14" />
                    </svg>
                )}
            </button>
        </div>
    );
}

const s = {
    root: {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "#000",
        overflow: "hidden",
        margin: 0,
        padding: 0,
    },
    iframe: {
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        border: "none",
        display: "block",
    },
    fullscreenBtn: {
        position: "absolute",
        top: 20,
        right: 20,
        zIndex: 100,
        width: 60,
        height: 60,
        borderRadius: "50%",
        border: "1px solid rgba(212,175,55,0.5)",
        background: "rgba(8,6,3,0.85)",
        backdropFilter: "blur(10px)",
        color: "#f0e0a0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow: "0 4px 20px rgba(0,0,0,0.7)",
        transition: "opacity 0.3s ease",
    },
};

export default Projector;