// src/components/controlsPanel.jsx

import React from 'react';

const VOWEL_COST = 200; // You can also pass this as a prop if it's dynamic

// Helper function for conditional class names
const cls = (...xs) => xs.filter(Boolean).join(" ");

export default function ControlsPanel({
  canSpin,
  canBuyVowel,
  canSolve,
  isCharging,
  spinPower,
  snapChargeToZero,
  startCharge,
  endCharge,
  setShowVowelModal,
  setShowSolveModal
}) {
  // Logic for the spin button's charging effect
  const baseBgColor = isCharging ? "#16a34a" : "#22c55e";
  const fillBgColor = "rgba(4,120,87,0.95)";

  return (
    <div className="flex justify-center flex-wrap gap-4 items-center">
      {/* Spin Button */}
      <button
        onMouseDown={startCharge}
        onMouseUp={endCharge}
        onMouseLeave={endCharge}
        onTouchStart={(e) => {
          e.preventDefault();
          startCharge();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          endCharge();
        }}
        disabled={!canSpin}
        style={
          canSpin
            ? {
                backgroundImage: `linear-gradient(to right, ${fillBgColor} ${spinPower}%, ${baseBgColor} ${spinPower}%)`,
                transition: snapChargeToZero ? "none" : "background-image 80ms linear",
              }
            : {}
        }
        className={cls(
          "rounded-xl font-bold text-xl px-8 py-4 transition-colors custom-hover",
          !canSpin ? "bg-gray-700/60 text-gray-400 cursor-not-allowed" : "text-white hover:brightness-110"
        )}
      >
        <span className="select-none">SPIN (Hold)</span>
      </button>

      {/* Buy Vowel Button */}
      <button
        onClick={() => setShowVowelModal(true)}
        disabled={!canBuyVowel}
        className={cls(
          "px-6 py-3 rounded-xl font-bold text-lg custom-hover",
          !canBuyVowel ? "bg-gray-700/60 text-gray-400 cursor-not-allowed" : "bg-blue-500 text-white hover:bg-blue-600"
        )}
      >
        BUY VOWEL (${VOWEL_COST})
      </button>

      {/* Solve Button */}
      <button
        onClick={() => setShowSolveModal(true)}
        disabled={!canSolve}
        className={cls(
          "px-6 py-3 rounded-xl font-bold text-lg custom-hover",
          !canSolve ? "bg-gray-700/60 text-gray-400 cursor-not-allowed" : "bg-purple-500 text-white hover:bg-purple-600"
        )}
      >
        SOLVE
      </button>
    </div>
  );
}