import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";

// Import Hooks, Data, Libs
import useSfx from "./hooks/useSfx";
import useImagePreloader from "./hooks/useImagePreloader";
import { loadPuzzles } from "./data/loadPuzzles";
import { GRADIENT, BASE_WHEEL_PX, ZOOM_WHEEL_PX, WEDGES, FALLBACK, VOWELS, LETTERS, BONUS_PRIZES, VOWEL_COST, SOLVE_BONUS, SOLVE_REVEAL_INTERVAL, TEAM_NAME_MAX, MAX_TEAMS } from "./lib/constants";
import { cls, isLetter, normalizeAnswer, nextIdx, parseIntSafe, makeTeamNamesArray, selectRandomPuzzles } from "./lib/utils";

// Import Components
import PersistentHeader from "./components/PersistentHeader";
import SetupPanel from "./components/SetupPanel";
import WinScreen from "./components/WinScreen";
import ConfettiCanvas from "./components/ConfettiCanvas";
import TeamCard from "./components/TeamCard";

// Import Modals
import VowelModal from "./Modals/VowelModal";
import SolveModal from "./Modals/SolveModal";
import MysterySpinnerModal from "./Modals/MysterySpinnerModal";
import StatsModal from "./Modals/StatsModal";
import { BonusLetterModal, BonusSolveInline, BonusWinnerSelectorModal, BonusReadyModal, BonusResultModal } from "./Modals/BonusModals";

export default function App() {
  // --- STATE AND REFS ---
  const [phase, setPhase] = useState("setup");
  const [teamCount, setTeamCount] = useState(3);
  const [teamNames, setTeamNames] = useState(["Team 1", "Team 2", "Team 3"]);
  const [puzzles, setPuzzles] = useState(FALLBACK);
  const [bonusPuzzles, setBonusPuzzles] = useState([]);
  const [idx, setIdx] = useState(0);
  const [letters, setLetters] = useState(() => new Set());
  const [board, setBoard] = useState(() => normalizeAnswer(FALLBACK[0].answer));
  const [category, setCategory] = useState(FALLBACK[0].category || "PHRASE");
  const [teams, setTeams] = useState([
    { name: "Team 1", total: 0, round: 0, prizes: [], holding: [] },
    { name: "Team 2", total: 0, round: 0, prizes: [], holding: [] },
    { name: "Team 3", total: 0, round: 0, prizes: [], holding: [] },
  ]);
  const [active, setActive] = useState(0);
  const [currentWedges, setCurrentWedges] = useState([...WEDGES]);
  const [spinning, setSpinning] = useState(false);
  const [angle, setAngle] = useState(0);
  const [landed, setLanded] = useState(null);
  const [awaitingConsonant, setAwaitingConsonant] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const [spinPower, setSpinPower] = useState(0);
  const [isCharging, setIsCharging] = useState(false);
  const [snapChargeToZero, setSnapChargeToZero] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [wheelPx, setWheelPx] = useState(BASE_WHEEL_PX);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWinScreen, setShowWinScreen] = useState(false);
  const [roundWinner, setRoundWinner] = useState(null);
  const [showVowelModal, setShowVowelModal] = useState(false);
  const [showSolveModal, setShowSolveModal] = useState(false);
  const [solveGuess, setSolveGuess] = useState("");
  const [isRevealingLetters, setIsRevealingLetters] = useState(false);
  const [showMysterySpinner, setShowMysterySpinner] = useState(false);
  const [bonusRound, setBonusRound] = useState(false);
  const [bonusSpinning, setBonusSpinning] = useState(false);
  const [bonusPrize, setBonusPrize] = useState("");
  const [bonusLetters, setBonusLetters] = useState(new Set(["R", "S", "T", "L", "N", "E"]));
  const [bonusConsonants, setBonusConsonants] = useState([]);
  const [bonusVowel, setBonusVowel] = useState("");
  const [bonusCountdown, setBonusCountdown] = useState(20);
  const [bonusAwaitingReady, setBonusAwaitingReady] = useState(false);
  const [bonusHideBoard, setBonusHideBoard] = useState(false);
  const [bonusActive, setBonusActive] = useState(false);
  const [showBonusLetterModal, setShowBonusLetterModal] = useState(false);
  const [bonusLetterType, setBonusLetterType] = useState("");
  const [bonusGuess, setBonusGuess] = useState("");
  const [showBonusSolveModal, setShowBonusSolveModal] = useState(false);
  const [showBonusSelector, setShowBonusSelector] = useState(false);
  const [bonusSpinnerAngle, setBonusSpinnerAngle] = useState(0);
  const [bonusSpinnerSpinning, setBonusSpinnerSpinning] = useState(false);
  const [bonusWinnerSpinning, setBonusWinnerSpinning] = useState(false);
  const [selectedBonusWinner, setSelectedBonusWinner] = useState("");
  const [bonusResult, setBonusResult] = useState(null);
  const [bonusWinnerName, setBonusWinnerName] = useState(null);
  const [bonusReadyModalVisible, setBonusReadyModalVisible] = useState(false);
  const [bonusRevealing, setBonusRevealing] = useState(false);
  const [roundsCount, setRoundsCount] = useState(5);
  const [selectedPuzzles, setSelectedPuzzles] = useState(FALLBACK);
  const [readyDisabled, setReadyDisabled] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [tempTeamCount, setTempTeamCount] = useState(String(teamCount));
  const [tempRoundsCount, setTempRoundsCount] = useState(String(roundsCount));
  const [winners, setWinners] = useState([]);
  const [mysteryPrize, setMysteryPrize] = useState(null);
  const [wonSpecialWedges, setWonSpecialWedges] = useState([]);
  const chargeDirRef = useRef(1);
  const finishingRef = useRef(false);
  const chargeIntervalRef = useRef(null);
  const isChargingRef = useRef(false);
  const chargeSnapshotRef = useRef(0);
  const revealTimeoutRef = useRef(null);
  const bonusResultHideTimeoutRef = useRef(null);
  const winShowTimeoutRef = useRef(null);
  const winHideTimeoutRef = useRef(null);
  const mysterySpinRef = useRef(null);
  const bonusWinnerSpinRef = useRef(null);
  const winnersRef = useRef([]);
  const landedOwnerRef = useRef(null);
  const canvasRef = useRef(null);
  const zoomCanvasRef = useRef(null);
  const bonusSpinnerRef = useRef(null);

  // --- CUSTOM HOOKS ---
  const sfx = useSfx();
  const imagesLoaded = useImagePreloader();
  
  // --- GAME STATS ---
  const initializeGameStats = useCallback(() => {
    return {
      totalSpins: 0, bankrupts: 0, loseTurns: 0, puzzlesSolved: 0, vowelsBought: 0,
      correctGuesses: 0, incorrectGuesses: 0, gameStartTime: Date.now(), teamStats: {},
      wedgeStats: {}, puzzlesStarted: roundsCount, maxComeback: 0, turnStartTime: null,
      totalTurnTime: 0, turnCount: 0, vowelSuccesses: 0, vowelFailures: 0,
      wedgeLandingStats: {}, incorrectLetters: {}, categoryStats: {},
    };
  }, [roundsCount]);
  const [gameStats, setGameStats] = useState(initializeGameStats);

  // --- GAME LOGIC FUNCTIONS ---
  // All game logic functions are defined here...
  function backToSetup() { /* ... */ }
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      document.exitFullscreen?.();
    }
  }
  // ... and all other functions like onSpin, guessLetter, drawWheel, etc.
  
  // --- DERIVED STATE & MEMOS ---
  const isSolved = () => board.every((b) => b.shown);
  const allVowelsGuessed = Array.from(VOWELS).every((vowel) => letters.has(vowel));
  const canSpin = !spinning && !awaitingConsonant && !isSolved() && !bonusRound && !isRevealingLetters;
  const canBuyVowel = (teams[active]?.round ?? 0) >= VOWEL_COST && !spinning && !isSolved() && hasSpun && !allVowelsGuessed && !bonusRound && !isRevealingLetters;
  const canSolve = ( (!spinning || showMysterySpinner) && hasSpun && !isSolved() && !bonusRound && !isRevealingLetters );
  const wordTokens = useMemo(() => {
    const toks = [];
    let i = 0;
    while (i < board.length) {
      if (board[i].ch === " ") { toks.push({ type: "space" }); i++; continue; }
      const cells = [];
      while (i < board.length && board[i].ch !== " ") { cells.push(board[i]); i++; }
      toks.push({ type: "word", cells });
    }
    return toks;
  }, [board]);

  // --- USEEFFECT HOOKS ---
  useEffect(() => {
    loadPuzzles().then((data) => {
      setPuzzles(data.main);
      setBonusPuzzles(data.bonus);
      setSelectedPuzzles(data.main.length ? data.main : FALLBACK);
      const p = (data.main && data.main[0]) || FALLBACK[0];
      setBoard(normalizeAnswer(p.answer));
      setCategory(p.category || "PHRASE");
    });
  }, []);

  useEffect(() => {
      requestAnimationFrame(() => drawWheel(angle));
  }, [angle, wheelPx, isFullscreen, isCharging, spinPower, zoomed, currentWedges]);

  // ... All other useEffect hooks go here
  
  // --- RENDER LOGIC ---
  if (phase === 'setup') {
    return (
      <div className={cls("min-h-screen h-screen text-white flex items-center justify-center p-4 sm:p-6", GRADIENT)}>
        <PersistentHeader sfx={sfx} phase={phase} isFullscreen={isFullscreen} toggleFullscreen={toggleFullscreen} />
        <SetupPanel
          sfx={sfx} imagesLoaded={imagesLoaded} tempTeamCount={tempTeamCount} setTempTeamCount={setTempTeamCount}
          teamCount={teamCount} teamNames={teamNames} setTeamNames={setTeamNames}
          roundsCount={roundsCount} setRoundsCount={setRoundsCount}
          tempRoundsCount={tempRoundsCount} setTempRoundsCount={setTempRoundsCount}
          startGameFromSetup={async () => { /* startGame logic */ }}
          VOWEL_COST={VOWEL_COST}
        />
      </div>
    )
  }

  // ... Render logic for 'bonus' and 'done' phases
  
  const baseBgColor = isCharging ? "#16a34a" : "#22c55e";
  const fillBgColor = "rgba(4,120,87,0.95)";

  return (
    <div className={cls("min-h-screen h-screen text-white flex flex-col items-center p-4", zoomed ? "overflow-hidden" : "overflow-auto", GRADIENT)}>
      <PersistentHeader
        sfx={sfx}
        phase={phase}
        backToSetup={backToSetup}
        toggleFullscreen={toggleFullscreen}
        // ... all other necessary props for the header
      />
      <div className={cls("w-full h-full flex flex-col", (zoomed || showWinScreen) && "invisible")}>
        <main className="w-full max-w-7xl mx-auto flex-1 flex flex-col lg:flex-row items-center lg:items-center gap-4 min-h-0">
          {/* Main Game UI: Wheel, Board, Teams, Controls etc. */}
        </main>
      </div>
      {/* Zoom Overlay & All Modals */}
    </div>
  );
}
