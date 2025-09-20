import React, { useEffect, useRef } from 'react';
import { cls } from '../lib/utils';
import { VOWELS, LETTERS, BONUS_PRIZES } from '../lib/constants';

export const BonusLetterModal = ({ 
  bonusLetterType, 
  bonusConsonants, 
  bonusVowel, 
  handleBackFromVowel, 
  unselectConsonant, 
  unselectVowel, 
  handleBonusLetter, 
  stageVowel, 
  setShowBonusLetterModal, 
  revealBonusLetters,
  bonusLetters,
  setBonusLetters
}) => {
  const GIVEN = ["R", "S", "T", "L", "N", "E"];
  const isSelectingConsonants = bonusLetterType === "consonant";
  const consonantLimit = 3;

  const pickableLetters = LETTERS.filter((letter) => {
    if (isSelectingConsonants) {
      return !VOWELS.has(letter) && !GIVEN.includes(letter) && !bonusConsonants.includes(letter);
    } else {
      return VOWELS.has(letter) && !GIVEN.includes(letter) && !bonusVowel;
    }
  });

  const canPickMore = isSelectingConsonants ? bonusConsonants.length < consonantLimit : !bonusVowel;
  
  const columns = isSelectingConsonants ? 6 : Math.min(6, pickableLetters.length || 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg text-center">
        <h2 className="text-2xl font-bold mb-4 text-black">
          {isSelectingConsonants ? `Choose Consonant ${bonusConsonants.length + 1}/${consonantLimit}` : "Choose 1 Vowel"}
        </h2>
        <p className="text-sm text-gray-600 mb-4">Given: {GIVEN.join(", ")}</p>
        <div className="mb-4">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Selected</div>
          <div className="flex gap-2 justify-center">
            {isSelectingConsonants ? (
              bonusConsonants.length > 0 ? (
                bonusConsonants.map((c) => (
                  <button key={c} onClick={() => unselectConsonant(c)} title={`Remove ${c}`} className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-600 text-white font-bold hover:opacity-90">
                    {c}
                  </button>
                ))
              ) : (
                <div className="text-sm text-gray-400">None selected yet</div>
              )
            ) : bonusVowel ? (
              <button onClick={unselectVowel} title={`Remove ${bonusVowel}`} className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-600 text-white font-bold hover:opacity-90">
                {bonusVowel}
              </button>
            ) : (
              <div className="text-sm text-gray-400"></div>
            )}
          </div>
        </div>
        {isSelectingConsonants && bonusConsonants.length >= consonantLimit && (
          <div className="text-sm text-red-500 mb-2">Maximum {consonantLimit} consonants selected.</div>
        )}
        <div className="flex justify-center mb-2">
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(pickableLetters.length, columns)}, 52px)`, justifyItems: "center", alignItems: "center" }}>
            {pickableLetters.map((letter) => {
              const disabled = !canPickMore;
              const onClickHandler = () => {
                if (disabled) return;
                if (isSelectingConsonants) {
                  handleBonusLetter(letter);
                } else {
                  stageVowel(letter);
                }
              };
              return (
                <button
                  key={letter}
                  onClick={onClickHandler}
                  disabled={disabled}
                  className={cls("w-12 h-12 rounded-lg text-sm font-bold flex items-center justify-center", disabled ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-blue-500 text-white hover:bg-blue-600")}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-center gap-3">
          {!isSelectingConsonants && (
            <>
              <button onClick={handleBackFromVowel} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-800 font-semibold hover:bg-gray-200">
                Back
              </button>
              <button
                onClick={() => {
                  if (!bonusVowel) return;
                  setShowBonusLetterModal(false);
                  revealBonusLetters(new Set([...(bonusLetters || []), bonusVowel]));
                }}
                disabled={!bonusVowel}
                className={cls("px-4 py-2 rounded-xl font-semibold", !bonusVowel ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-green-600 text-white hover:bg-green-700")}
              >
                Confirm
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const BonusSolveInline = ({ showBonusSolveModal, bonusPrize, bonusCountdown, bonusGuess, setBonusGuess, handleBonusSolve }) => {
  const inputRef = useRef(null);
  useEffect(() => {
    if (showBonusSolveModal) {
      setTimeout(() => {
        const el = document.querySelector("#bonus-inline-solve-input");
        if (el) el.focus();
      }, 40);
    }
  }, [showBonusSolveModal]);

  return (
    <div className="w-full max-w-3xl mx-auto mt-6 p-6 bg-white rounded-2xl shadow-lg">
      <h2 className="text-xl sm:text-2xl font-bold text-black text-center">Solve to win {bonusPrize}!</h2>
      <div className="flex flex-col items-center gap-3 mt-3">
        <div className="text-3xl font-black text-red-500">{bonusCountdown}</div>
        <p className="text-sm text-gray-600 text-center">Press Enter or click Submit when done.</p>
        <input 
            id="bonus-inline-solve-input" 
            ref={inputRef} type="text" 
            value={bonusGuess} 
            onChange={(e) => setBonusGuess(e.target.value)} 
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); handleBonusSolve(); }}} 
            placeholder="Enter your guess" 
            className="w-full px-4 py-3 rounded-lg border-2 border-blue-300 text-lg" 
            autoFocus 
        />
        <div className="flex items-center gap-3">
          <button onClick={handleBonusSolve} className="px-6 py-2 rounded-lg bg-purple-600 text-white font-semibold">Submit</button>
        </div>
      </div>
    </div>
  );
};

export const BonusWinnerSelectorModal = ({ bonusWinnerSpinning, selectedBonusWinner, startBonusWinnerSelector }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
    <div className="bg-white rounded-xl p-8 w-full max-w-lg text-center">
      <h2 className="text-3xl font-bold mb-6 text-black">TIE BREAKER!</h2>
      <p className="text-lg text-gray-700 mb-6">Selecting bonus round player...</p>
      <div className="mb-6">
        <div className="relative w-32 h-32 mx-auto bg-gradient-to-br from-blue-400 to-green-400 rounded-full flex items-center justify-center">
          <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center">
            <div className="text-xl font-black text-blue-600">{bonusWinnerSpinning ? (selectedBonusWinner || "?") : selectedBonusWinner}</div>
          </div>
        </div>
      </div>
      {!bonusWinnerSpinning && !selectedBonusWinner && (
        <button onClick={startBonusWinnerSelector} className="px-6 py-3 rounded-xl bg-blue-500 text-white font-bold hover:bg-blue-600">Select Player</button>
      )}
      {selectedBonusWinner && !bonusWinnerSpinning && (
        <p className="text-xl text-green-600 font-bold">{selectedBonusWinner} plays the bonus round!</p>
      )}
    </div>
  </div>
);

export const BonusReadyModal = ({ bonusPrize, displayBonusPlayer, pressReadyStartBonus, readyDisabled, bonusActive }) => (
  <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70">
    <div className="bg-white rounded-2xl p-8 w-full max-w-lg text-center shadow-xl">
      <h1 className="text-4xl font-black mb-2">BONUS ROUND</h1>
      <p className="text-2xl font-semibold mb-6">Solve to win <span className="uppercase">{bonusPrize}!</span><br />Good luck <span className="font-black">{displayBonusPlayer}</span>!</p>
      <p className="text-xl md:text-2xl font-semibold text-gray-700 mb-6">R S T L N E are given</p>
      <p className="text-xl md:text-2xl font-semibold text-gray-700 mb-6">Press <strong>READY</strong>. The 20 second countdown will start immediately.</p>
      <div className="flex items-center justify-center gap-4">
        <button onClick={pressReadyStartBonus} disabled={readyDisabled || bonusActive} className={cls("px-10 py-4 rounded-xl text-2xl font-extrabold text-white", (readyDisabled || bonusActive) ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700")}>READY</button>
      </div>
    </div>
  </div>
);

export const BonusResultModal = ({ result, bonusResultHideTimeoutRef, sfx, setBonusResult, setPhase, bonusPrize, board }) => {
  const btnRef = useRef(null);
  useEffect(() => {
    const t = setTimeout(() => btnRef.current?.focus(), 40);
    return () => clearTimeout(t);
  }, []);

  const handleContinue = () => {
    if (bonusResultHideTimeoutRef.current) {
      clearTimeout(bonusResultHideTimeoutRef.current);
      bonusResultHideTimeoutRef.current = null;
    }
    try { sfx.stop("solve"); } catch (e) {}
    setBonusResult(null);
    setPhase("done");
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/80">
      <div className={cls("bg-white rounded-3xl p-10 w-full max-w-3xl text-center shadow-2xl", result === "win" ? "border-4 border-green-400" : "border-4 border-red-400")}>
        {result === "win" ? (
          <>
            <h2 className="text-5xl font-extrabold mb-4 text-green-700">Congratulations!</h2>
            <div className="mb-4">
              <p className="text-2xl text-black">You solved the bonus puzzle and won a</p>
              <div className="font-extrabold text-3xl mt-2">{bonusPrize}</div>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-5xl font-extrabold mb-4 text-red-700">Too bad!</h2>
            <p className="text-2xl text-black mb-2">You did not solve the bonus puzzle in time.</p>
            <p className="text-xl font-bold text-black mt-2">The answer was: <span className="uppercase">{board.map((b) => b.ch).join("")}</span></p>
          </>
        )}
        <p className="text-sm text-gray-600 mt-4">Press <strong>Enter</strong> or <strong>Space</strong> or click Continue.</p>
        <div className="mt-8 flex justify-center gap-4">
          <button
            ref={btnRef}
            onClick={handleContinue}
            className="px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xl shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-300"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export const BonusSpinnerModal = ({ bonusSpinnerRef, displayBonusPlayer, spinBonusWheel, bonusSpinnerSpinning, bonusPrize }) => (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80">
      <div className="bg-white rounded-3xl p-8 w-full max-w-2xl text-center shadow-2xl">
        <h1 className="text-4xl font-black mb-4 text-black">BONUS ROUND</h1>
        <p className="text-xl font-semibold mb-6 text-gray-700">
          Good luck: <span className="text-blue-600">{displayBonusPlayer}</span>!
        </p>
        <p className="text-lg text-gray-600 mb-6">Spin the wheel to see what prize you're playing for!</p>
        
        <div className="flex justify-center mb-6">
          <canvas 
            ref={bonusSpinnerRef}
            className="drop-shadow-2xl"
            style={{ width: '400px', height: '400px' }}
          />
        </div>
        
        <button
          onClick={spinBonusWheel}
          disabled={bonusSpinnerSpinning || bonusPrize}
          className={`px-8 py-4 rounded-2xl text-xl font-extrabold text-white transition-all duration-300 ${
            bonusSpinnerSpinning || bonusPrize
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 hover:scale-105 shadow-lg'
          }`}
        >
          {bonusSpinnerSpinning ? 'SPINNING...' : bonusPrize ? `YOU'RE PLAYING FOR: ${bonusPrize}` : 'SPIN FOR PRIZE'}
        </button>
        
        {bonusPrize && (
          <div className="mt-6 p-4 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-xl">
            <div className="text-2xl font-black text-gray-800 mb-2"> CONGRATULATIONS! </div>
            <div className="text-lg text-gray-700">You're playing for: <span className="font-bold text-purple-600">{bonusPrize}</span></div>
          </div>
        )}
      </div>
    </div>
);