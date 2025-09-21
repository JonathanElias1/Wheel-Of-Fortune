// src/components/letterGrid.jsx

import React from 'react';

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const VOWELS = new Set(["A", "E", "I", "O", "U"]);

// Helper function for conditional class names
const cls = (...xs) => xs.filter(Boolean).join(" ");

export default function LetterGrid({
  letters,
  awaitingConsonant,
  isRevealingLetters,
  guessLetter,
  wheelPx
}) {

  const message = awaitingConsonant ? "Click a consonant" : "Spin, buy a vowel, or solve";

  return (
    <div className="w-full max-w-2xl p-2">
      <div className="flex flex-wrap justify-center gap-3">
        {LETTERS.map((L) => {
          const disabled = isRevealingLetters || letters.has(L) || VOWELS.has(L) || !awaitingConsonant;

          // Make button size responsive to the wheel's size for better scaling
          const sizePx = Math.max(50, Math.round(wheelPx * 0.052));
          const fontPx = Math.max(20, Math.round(wheelPx * 0.028));

          return (
            <button
              key={L}
              onClick={() => guessLetter(L)}
              disabled={disabled}
              aria-label={`Guess ${L}`}
              style={{
                width: `${sizePx}px`,
                height: `${sizePx}px`,
                fontSize: `${fontPx}px`,
                lineHeight: 1,
              }}
              className={cls(
                "rounded-md font-extrabold flex items-center justify-center",
                disabled ? "bg-gray-700/50 text-gray-400 cursor-not-allowed" : "bg-white/10 hover:bg-white/20"
              )}
            >
              {L}
            </button>
          );
        })}
      </div>
      <div className="text-center mt-2 text-sm opacity-75">{message}</div>
    </div>
  );
}