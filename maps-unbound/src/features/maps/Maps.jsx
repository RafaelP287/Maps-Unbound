import React, { useRef, useEffect } from 'react';

function Maps({ initializeDice, rollDice, isDiceReady }) {
    const canvasRef = useRef();

    useEffect(() => {
        if (canvasRef.current) {
            const handleResize = () => {
                if (canvasRef.current) {
                    // Get the actual navbar height
                    const navbar = document.querySelector('nav');
                    const navbarHeight = navbar ? navbar.offsetHeight : 0;
                    
                    canvasRef.current.width = window.innerWidth;
                    canvasRef.current.height = window.innerHeight - navbarHeight;
                }
            };
            
            handleResize();
            window.addEventListener('resize', handleResize);
            
            // Prevent zoom on touch devices
            const preventZoom = (e) => {
                if (e.touches.length > 1) {
                    e.preventDefault();
                }
            };
            
            const preventDoubleTapZoom = (e) => {
                e.preventDefault();
            };
            
            document.addEventListener('touchmove', preventZoom, { passive: false });
            document.addEventListener('dblclick', preventDoubleTapZoom);
            
            return () => {
                window.removeEventListener('resize', handleResize);
                document.removeEventListener('touchmove', preventZoom);
                document.removeEventListener('dblclick', preventDoubleTapZoom);
            };
        }
    }, []);

    const handleInit = () => {
        initializeDice(canvasRef.current);
    };

    return (
        <div style={{ 
            width: '100%', 
            height: 'calc(100vh - 52px)', // Subtract navbar height (it's about 52px based on your styles)
            background: '#1a1a1a',
            overflow: 'hidden',
            position: 'relative',
            userSelect: 'none',
            WebkitUserSelect: 'none'
        }}>
            {/* Controls */}
            <div style={{ 
                position: 'absolute', 
                top: 20,
                left: 20,
                zIndex: 10, 
                display: 'flex',
                gap: '10px',
                flexDirection: 'column'
            }}>
                <button 
                    onClick={handleInit}
                    style={{
                        padding: '10px 20px',
                        cursor: 'pointer',
                        background: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        touchAction: 'manipulation'
                    }}
                >
                    Initialize Engine
                </button>
            </div>

            {/* Full screen canvas for dice */}
            <canvas 
                ref={canvasRef} 
                style={{ 
                    width: '100%', 
                    height: '100%',
                    display: 'block',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    touchAction: 'none'
                }} 
            />

            {/* Dice Tray at Bottom */}
            {isDiceReady && (
                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0, 0, 0, 0.7)',
                    backdropFilter: 'blur(10px)',
                    padding: '20px',
                    borderRadius: '15px 15px 0 0',
                    display: 'flex',
                    gap: '15px',
                    zIndex: 10,
                    boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.5)',
                    touchAction: 'manipulation'
                }}>
                    <DiceButton type="d4" rollDice={rollDice} />
                    <DiceButton type="d6" rollDice={rollDice} />
                    <DiceButton type="d8" rollDice={rollDice} />
                    <DiceButton type="d10" rollDice={rollDice} label="d10" />
                    <DiceButton type="d10x" rollDice={rollDice} label="d%" />
                    <DiceButton type="d12" rollDice={rollDice} />
                    <DiceButton type="d20" rollDice={rollDice} />
                </div>
            )}
        </div>
    );
}

function DiceButton({ type, rollDice, label }) {
    const handleClick = () => {
        rollDice(type);
    };

    return (
        <button
            onClick={handleClick}
            style={{
                width: '70px',
                height: '70px',
                background: 'linear-gradient(135deg, #d4af37 0%, #f4e5b0 100%)',
                border: '3px solid #8b7355',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#2c1810',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3), inset 0 2px 4px rgba(255, 255, 255, 0.3)',
                textShadow: '1px 1px 2px rgba(255, 255, 255, 0.5)',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent'
            }}
            onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-5px) scale(1.05)';
                e.target.style.boxShadow = '0 6px 12px rgba(212, 175, 55, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0) scale(1)';
                e.target.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3), inset 0 2px 4px rgba(255, 255, 255, 0.3)';
            }}
        >
            {label || type}
        </button>
    );
}

export default Maps;