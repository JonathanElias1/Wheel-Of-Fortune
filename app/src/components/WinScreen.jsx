import React, { useEffect, useRef } from 'react';
import { cls } from '../lib/utils';
import { GRADIENT, SOLVE_BONUS } from '../lib/constants';

const WinScreen = ({ winner, onClose }) => {
    const bouncerRef = useRef(null);
    useEffect(() => {
        const bouncer = bouncerRef.current;
        if (!bouncer) return;
        let animationFrameId = null;
        let impulseInterval = null;
        // ... (paste the entire useEffect animation logic for the bouncer here)
        const rand = (min, max) => min + Math.random() * (max - min);
        // ...
        animationFrameId = requestAnimationFrame(animate);
        return () => {
          if (animationFrameId) cancelAnimationFrame(animationFrameId);
          if (impulseInterval) clearInterval(impulseInterval);
        };
    }, [winner]);
    
    return (
        <div className={cls("fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden backdrop-blur-sm", GRADIENT)}>
            <div style={{ position: "absolute", inset: 0 }} />
            <img ref={bouncerRef} src="/images/winner-icon.png" alt="Bouncing icon" className="absolute top-0 left-0 rounded-lg shadow-lg pointer-events-none" />
            <div className="relative z-10 text-center">
                <h1 className="text-8xl font-black text-white animate-pulse [text-shadow:0_8px_16px_rgba(0,0,0,0.5)]"
                   style={{ fontFamily: "'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto" }}
                > WINNER!</h1>
                <p className="text-6xl text-white mt-6 font-bold [text-shadow:0_4px_8px_rgba(0,0,0,0.5)]">{winner}</p>
                <p className="text-2xl text-white mt-4 font-semibold animate-bounce">Solved the puzzle! (+${SOLVE_BONUS}!)</p>
                <p className="text-sm text-white/90 mt-4 opacity-95">Press <strong>Enter</strong> or <strong>Spacebar</strong> to skip</p>
            </div>
        </div>
    );
};

export default WinScreen;