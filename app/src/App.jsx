import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";

// Hooks
import useSfx from "./hooks/useSfx";
import useImagePreloader from "./hooks/useImagePreloader";

// Data
import loadPuzzles from "./data/loadPuzzles";

// Constants
import { 
  WEDGES, VOWELS, LETTERS, BASE_WHEEL_PX, ZOOM_WHEEL_PX, 
  VOWEL_COST, SOLVE_BONUS, BONUS_PRIZES, SOLVE_REVEAL_INTERVAL,
  MAX_TEAMS, TEAM_NAME_MAX, GRADIENT, FALLBACK 
} from "./lib/constants";

// Utils
import { 
  cls, isLetter, normalizeAnswer, nextIdx, 
  parseIntSafe, makeTeamNamesArray, selectRandomPuzzles, shuffle 
} from "./lib/utils";

// Components
import PersistentHeader from "./components/PersistentHeader";
import SetupPanel from "./components/SetupPanel";
import WheelCanvas from "./components/WheelCanvas";
import ControlsPanel from "./components/ControlsPanel";
import LetterGrid from "./components/LetterGrid";
import TeamCard from "./components/TeamCard";
import BoardDisplay from "./components/BoardDisplay";
import WinScreen from "./components/WinScreen";
import ConfettiCanvas from "./components/ConfettiCanvas";

// Modals
import VowelModal from "./Modals/VowelModal";
import SolveModal from "./Modals/SolveModal";
import MysterySpinnerModal from "./Modals/MysterySpinnerModal";
import StatsModal from "./Modals/StatsModal";
import {
  BonusLetterModal,
  BonusSolveInline,
  BonusWinnerSelectorModal,
  BonusReadyModal,
  BonusResultModal,
  BonusSpinnerModal
} from "./Modals/BonusModals";

export default function App() {
  // --- STATE MANAGEMENT ---
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

  // Wheel state
  const [spinning, setSpinning] = useState(false);
  const [angle, setAngle] = useState(0);
  const [landed, setLanded] = useState(null);
  const [awaitingConsonant, setAwaitingConsonant] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const [spinPower, setSpinPower] = useState(0);
  const [isCharging, setIsCharging] = useState(false);
  const [snapChargeToZero, setSnapChargeToZero] = useState(false);

  // Screen state
  const [zoomed, setZoomed] = useState(false);
  const [wheelPx, setWheelPx] = useState(BASE_WHEEL_PX);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWinScreen, setShowWinScreen] = useState(false);
  const [roundWinner, setRoundWinner] = useState(null);

  // Modal states
  const [showVowelModal, setShowVowelModal] = useState(false);
  const [showSolveModal, setShowSolveModal] = useState(false);
  const [solveGuess, setSolveGuess] = useState("");
  const [isRevealingLetters, setIsRevealingLetters] = useState(false);
  const [showMysterySpinner, setShowMysterySpinner] = useState(false);
  const [mysteryPrize, setMysteryPrize] = useState(null);
  const [showStats, setShowStats] = useState(false);

  // Bonus round state
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
  const [showBonusSpinner, setShowBonusSpinner] = useState(false);
  const [bonusSpinnerAngle, setBonusSpinnerAngle] = useState(0);
  const [bonusSpinnerSpinning, setBonusSpinnerSpinning] = useState(false);
  const [bonusWinnerSpinning, setBonusWinnerSpinning] = useState(false);
  const [selectedBonusWinner, setSelectedBonusWinner] = useState("");
  const [bonusResult, setBonusResult] = useState(null);
  const [bonusWinnerName, setBonusWinnerName] = useState(null);
  const [bonusReadyModalVisible, setBonusReadyModalVisible] = useState(false);
  const [bonusRevealing, setBonusRevealing] = useState(false);
  
  // Game settings
  const [roundsCount, setRoundsCount] = useState(5);
  const [selectedPuzzles, setSelectedPuzzles] = useState(FALLBACK);
  const [readyDisabled, setReadyDisabled] = useState(false);
  const [tempTeamCount, setTempTeamCount] = useState(String(teamCount));
  const [tempRoundsCount, setTempRoundsCount] = useState(String(roundsCount));
  const [winners, setWinners] = useState([]);
  const [wonSpecialWedges, setWonSpecialWedges] = useState([]);

  // Refs
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
  const bonusSpinRef = useRef(null);
  const bonusWinnerSpinRef = useRef(null);
  const winnersRef = useRef([]);
  const landedOwnerRef = useRef(null);
  const canvasRef = useRef(null);
  const zoomCanvasRef = useRef(null);
  const bonusSpinnerRef = useRef(null);

  // Hooks
  const sfx = useSfx();
  const imagesLoaded = useImagePreloader();

  // Game stats initialization
  const initializeGameStats = useCallback(() => {
    const puzzlesCount = (puzzles && puzzles.length) || FALLBACK.length;
    const puzzlesStarted = Math.max(1, Math.min(roundsCount, puzzlesCount));
    const firstPuzzle = (selectedPuzzles && selectedPuzzles[0]) || (puzzles && puzzles[0]) || FALLBACK[0];
    const initialCategory = firstPuzzle?.category || "PHRASE";

    return {
      totalSpins: 0, bankrupts: 0, loseTurns: 0, puzzlesSolved: 0, vowelsBought: 0,
      correctGuesses: 0, incorrectGuesses: 0, gameStartTime: Date.now(), teamStats: {},
      wedgeStats: {}, puzzlesStarted, maxComeback: 0, turnStartTime: null,
      totalTurnTime: 0, turnCount: 0, vowelSuccesses: 0, vowelFailures: 0,
      wedgeLandingStats: {}, incorrectLetters: {},
      categoryStats: { [initialCategory]: { attempted: 1, solved: 0 } },
    };
  }, [roundsCount, puzzles, selectedPuzzles]);

  const [gameStats, setGameStats] = useState(initializeGameStats);

  // Derived state
  const isSolved = () => board.every((b) => b.shown);
  const allVowelsGuessed = Array.from(VOWELS).every((vowel) => letters.has(vowel));
  const canSpin = !spinning && !awaitingConsonant && !isSolved() && !bonusRound && !isRevealingLetters;
  const canBuyVowel = (teams[active]?.round ?? 0) >= VOWEL_COST && !spinning && !isSolved() && 
                      hasSpun && !allVowelsGuessed && !bonusRound && !isRevealingLetters;
  const canSolve = (!spinning || showMysterySpinner) && hasSpun && !isSolved() && 
                   !bonusRound && !isRevealingLetters;

  const displayBonusPlayer = useMemo(() => {
    if (bonusWinnerSpinning) return selectedBonusWinner || "?";
    if (Array.isArray(winners) && winners.length) return winners[0];
    if (Array.isArray(winnersRef.current) && winnersRef.current.length) return winnersRef.current[0];
    const max = teams.length ? Math.max(...teams.map((t) => t.total)) : -Infinity;
    const top = teams.find((t) => t.total === max);
    return top?.name || teams[active]?.name || "Team";
  }, [bonusWinnerSpinning, selectedBonusWinner, winners, teams, active]);

  const wordTokens = useMemo(() => {
    const toks = [];
    let i = 0;
    while (i < board.length) {
      if (board[i].ch === " ") {
        toks.push({ type: "space" });
        i++;
        continue;
      }
      const cells = [];
      while (i < board.length && board[i].ch !== " ") {
        cells.push(board[i]);
        i++;
      }
      toks.push({ type: "word", cells });
    }
    return toks;
  }, [board]);

  // ===== GAME LOGIC FUNCTIONS =====

  function applyTempTeamCount() {
    const n = parseIntSafe(tempTeamCount);
    const final = Number.isFinite(n) ? Math.min(MAX_TEAMS, Math.max(2, n)) : teamCount;
    setTeamCount(final);
    setTeamNames((arr) => makeTeamNamesArray(final, arr));
    setTempTeamCount(String(final));
  }

  function applyTempRoundsCount() {
    const n = parseIntSafe(tempRoundsCount);
    const maxRounds = Math.max(1, puzzles.length || FALLBACK.length);
    const final = Number.isFinite(n) ? Math.min(Math.max(1, n), maxRounds) : roundsCount;
    setRoundsCount(final);
    setTempRoundsCount(String(final));
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      document.exitFullscreen?.();
    }
  }

  function drawWheel(rot = 0) {
    const canvas = zoomed ? zoomCanvasRef.current : canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const W = wheelPx;
    const H = wheelPx;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    canvas.style.display = "block";
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2;
    const cy = H / 2;
    const pHeight = 40;
    const pWidth = 30;
    const r = W / 2 - pHeight - 5;
    const totalSize = currentWedges.reduce((sum, w) => sum + (w.size || 1), 0);
    const baseArc = (Math.PI * 2) / totalSize;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    let currentAngle = 0;
    for (let i = 0; i < currentWedges.length; i++) {
      const w = currentWedges[i];
      const wedgeSize = w.size || 1;
      const arc = baseArc * wedgeSize;
      const a0 = currentAngle;
      const a1 = a0 + arc;
      const mid = a0 + arc / 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, a0, a1);
      ctx.closePath();
      ctx.fillStyle = w.c;
      ctx.fill();
      const label = w.t === "cash" ? `$${w.v}` : (w.label || w.t.toUpperCase().replace("-", " "));
      ctx.save();
      ctx.rotate(mid);
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      const darkBackgrounds = ["#222222", "#E6007E", "#6F2597", "#8C4399", "#E23759"];
      ctx.fillStyle = darkBackgrounds.includes(w.c) ? "#fff" : "#000";
      ctx.shadowColor = "rgba(0,0,0,0.3)";
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      const baseFontSize = r * 0.12;
      let fontSize = baseFontSize;
      if (w.size && w.size < 1) {
        fontSize = baseFontSize * (0.3 + w.size * 0.3);
      } else if (w.t === "lose" || w.t === "bankrupt") {
        fontSize = baseFontSize * 0.8;
      } else if (w.t === "wild" || w.v === 950) {
        fontSize = baseFontSize * 0.9;
      }
      ctx.font = `bold ${fontSize}px Impact, Arial Black, sans-serif`;
      const textRadius = r * 0.6;
      const isLeftHalf = mid > Math.PI / 2 && mid < (3 * Math.PI) / 2;
      if (isLeftHalf) {
        ctx.rotate(Math.PI);
        ctx.fillText(label, -textRadius, 0);
      } else {
        ctx.fillText(label, textRadius, 0);
      }
      ctx.restore();
      
      if (w.prize) {
        ctx.save();
        ctx.rotate(mid);
        const prizeWidth = r * 0.8 * (w.size || 1);
        const prizeHeight = r * 0.15;
        const prizeRadius = r * 0.5;
        ctx.fillStyle = w.prize.color;
        ctx.fillRect(-prizeWidth / 2, -prizeHeight / 2 + prizeRadius, prizeWidth, prizeHeight);
        ctx.fillStyle = "#fff";
        ctx.font = `bold ${prizeHeight * 0.7}px Impact, Arial, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(w.prize.label, 0, prizeRadius);
        ctx.restore();
      }
      
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a0) * r, Math.sin(a0) * r);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#fff";
      ctx.stroke();
      currentAngle = a1;
    }
    ctx.restore();
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#333";
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.moveTo(0, -r - 5);
    ctx.lineTo(-pWidth / 2, -r - pHeight);
    ctx.lineTo(pWidth / 2, -r - pHeight);
    ctx.closePath();
    ctx.fillStyle = "#ffd700";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  }

  function drawBonusWheel() {
    const canvas = bonusSpinnerRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = 400;
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 40;
    canvas.width = size;
    canvas.height = size;
    ctx.clearRect(0, 0, size, size);
    const sectionAngle = (Math.PI * 2) / BONUS_PRIZES.length;
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7'];
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((bonusSpinnerAngle * Math.PI) / 180);
    BONUS_PRIZES.forEach((prize, index) => {
      const startAngle = index * sectionAngle;
      const endAngle = (index + 1) * sectionAngle;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = colors[index % colors.length];
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.save();
      ctx.rotate(startAngle + sectionAngle / 2);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px Arial Black, Impact, sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.shadowBlur = 3;
      ctx.fillText(prize, radius * 0.3, 0);
      ctx.restore();
    });
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(centerX, 30);
    ctx.lineTo(centerX - 15, 60);
    ctx.lineTo(centerX + 15, 60);
    ctx.closePath();
    ctx.fillStyle = '#ffd700';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function wedgeIndexForAngle(a) {
    const two = Math.PI * 2;
    const normalizedAngle = ((a % two) + two) % two;
    const pointerAngle = (3 * Math.PI) / 2 % two;
    const wheelPositionAtPointer = (two - normalizedAngle + pointerAngle) % two;
    const totalSize = currentWedges.reduce((sum, w) => sum + (w.size || 1), 0) || 1;
    const baseArc = two / totalSize;
    let accumulatedAngle = 0;
    for (let i = 0; i < currentWedges.length; i++) {
      const wedgeSize = currentWedges[i].size || 1;
      const wedgeArc = baseArc * wedgeSize;
      if (wheelPositionAtPointer >= accumulatedAngle && wheelPositionAtPointer < accumulatedAngle + wedgeArc) {
        return i;
      }
      accumulatedAngle += wedgeArc;
    }
    return 0;
  }

  function angleForWedgeIndex(idx, wedges = currentWedges) {
    const two = Math.PI * 2;
    const totalSize = wedges.reduce((sum, w) => sum + (w.size || 1), 0) || 1;
    const baseArc = two / totalSize;
    let accumulated = 0;
    for (let i = 0; i < idx; i++) {
      accumulated += (wedges[i].size || 1) * baseArc;
    }
    const wedgeArc = (wedges[idx]?.size || 1) * baseArc;
    const mid = accumulated + wedgeArc / 2;
    const pointerAngle = (3 * Math.PI) / 2 % two;
    const normalizedAngle = (two - mid + pointerAngle) % two;
    return normalizedAngle;
  }

  const startCharge = async () => {
    if (isRevealingLetters || finishingRef.current) return;
    if (!canSpin || isCharging) return;
    
    setIsCharging(true);
    isChargingRef.current = true;
    setSnapChargeToZero(true);
    setSpinPower(0);
    chargeSnapshotRef.current = 0;
    chargeDirRef.current = 1;

    try {
      await sfx.unlock();
    } catch (e) {}
    
    try {
      await sfx.loop("chargeUp");
    } catch (e) {
      try { sfx.play("chargeUp"); } catch (e2) {}
    }
    
    requestAnimationFrame(() => {
      setSnapChargeToZero(false);
      const stepMs = 16;
      const stepDelta = 5.7;
      if (chargeIntervalRef.current) {
        clearInterval(chargeIntervalRef.current);
        chargeIntervalRef.current = null;
      }
      chargeIntervalRef.current = setInterval(() => {
        setSpinPower((prev) => {
          let next = prev + stepDelta * chargeDirRef.current;
          if (next >= 100) {
            next = 100;
            chargeDirRef.current = -1;
          } else if (next <= 0) {
            next = 0;
            chargeDirRef.current = 1;
          }
          chargeSnapshotRef.current = next;
          return next;
        });
      }, stepMs);
    });
  };

  const endCharge = () => {
    if (chargeIntervalRef.current) {
      clearInterval(chargeIntervalRef.current);
      chargeIntervalRef.current = null;
    }
    
    const wasCharging = isChargingRef.current;
    isChargingRef.current = false;
    
    try { sfx.stopLoop("chargeUp"); } catch (e) {
      try { sfx.stop("chargeUp"); } catch (e2) {}
    }
    
    if (!wasCharging) return;
    
    const power = Math.max(1, Math.round(chargeSnapshotRef.current || 0));
    chargeSnapshotRef.current = 0;
    
    setIsCharging(false);
    setSnapChargeToZero(true);
    setSpinPower(0);
    
    requestAnimationFrame(() => setSnapChargeToZero(false));
    
    onSpin(power);
  };

  function animateAngle(from, to, ms, easing = "out", onDone) {
    const start = performance.now();
    const ease = easing === "inout" ? (x) => 0.5 * (1 - Math.cos(Math.PI * Math.min(1, x))) : (x) => 1 - Math.pow(1 - Math.min(1, x), 3);
    const step = (t) => {
      const p = Math.min(1, (t - start) / ms);
      const a = from + (to - from) * ease(p);
      setAngle(a);
      if (p < 1) requestAnimationFrame(step);
      else onDone && onDone();
    };
    requestAnimationFrame(step);
  }

  function onSpin(power = 10) {
    if (finishingRef.current || isRevealingLetters) return;
    if (spinning || awaitingConsonant || isSolved() || bonusRound) return;
    setLanded(null);
    setHasSpun(true);
    setSpinning(true);
    setZoomed(true);
    
    try { sfx.play("spin"); } catch (e) {console.error("spin play failed", e);}
    
    const currentTeamNameForStats = teams[active]?.name ?? `Team ${active + 1}`;
    setGameStats((prev) => {
      const prevTeam = prev.teamStats[currentTeamNameForStats] || {};
      const newWedgeStats = { ...prev.wedgeStats };
      if (!newWedgeStats[power]) newWedgeStats[power] = 0;
      newWedgeStats[power]++;
      
      return {
        ...prev,
        totalSpins: prev.totalSpins + 1,
        wedgeStats: newWedgeStats,
        turnStartTime: prev.turnStartTime || Date.now(),
        teamStats: {
          ...prev.teamStats,
          [currentTeamNameForStats]: {
            ...prevTeam,
            spins: (prevTeam.spins || 0) + 1,
            totalTurns: (prevTeam.totalTurns || 0) + 1,
          },
        },
      };
    });
    
    const baseTurns = 3;
    const powerTurns = Math.round((power / 100) * 6);
    const randomTurns = Math.floor(Math.random() * 2);
    const extraTurns = baseTurns + powerTurns + randomTurns;
    const duration = 1800 + power * 25;
    const pre = angle - 0.35;
    animateAngle(angle, pre, 140, "inout", () => {
      const stopAt = Math.random() * Math.PI * 2;
      const final = pre + extraTurns * Math.PI * 2 + stopAt;
      const start = performance.now();
      const tick = (t) => {
        const p = Math.min(1, (t - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        const a = pre + (final - pre) * eased;
        setAngle(a);
        if (p < 1) {
          requestAnimationFrame(tick);
        } else {
          try {
            sfx.stop("spin");
          } catch (e) {}
          if (!currentWedges || currentWedges.length === 0) {
            setLanded(null);
            setSpinning(false);
            setZoomed(false);
            return;
          }
          const i = wedgeIndexForAngle(a);
          const w = currentWedges[i] || currentWedges[0];
          setLanded(w);
          handleLanding(w);
          setTimeout(() => {
            setSpinning(false);
            setZoomed(false);
          }, 2500);
        }
      };
      requestAnimationFrame(tick);
    });
  }

  function handleLanding(w) {
    if (!w) {
      landedOwnerRef.current = null;
      passTurn();
      return;
    }
    landedOwnerRef.current = active;
    
    const wedgeType = w.t;
    const currentTeamName = teams[active]?.name ?? `Team ${active + 1}`;
    
    setGameStats(prev => {
      const prevTeam = prev.teamStats[currentTeamName] || {};
      const prevWedgeLandings = prevTeam.wedgeLandings || {};
      
      return {
        ...prev,
        wedgeLandingStats: {
          ...prev.wedgeLandingStats,
          [wedgeType]: (prev.wedgeLandingStats[wedgeType] || 0) + 1
        },
        teamStats: {
          ...prev.teamStats,
          [currentTeamName]: {
            ...prevTeam,
            wedgeLandings: {
              ...prevWedgeLandings,
              [wedgeType]: (prevWedgeLandings[wedgeType] || 0) + 1
            }
          }
        }
      };
    });
    
    if (w.t === "wild") {
      try { sfx.play("wild"); } catch {}
      const prizes = BONUS_PRIZES;
      let currentPrize = 0;
      let spinCount = 0;
      const maxSpins = 20 + Math.floor(Math.random() * 10);
      setShowMysterySpinner(true);
      if (mysterySpinRef.current) {
        clearInterval(mysterySpinRef.current);
        mysterySpinRef.current = null;
      }
      mysterySpinRef.current = setInterval(() => {
        setMysteryPrize(prizes[currentPrize]);
        currentPrize = (currentPrize + 1) % prizes.length;
        spinCount++;
        if (spinCount >= maxSpins) {
          clearInterval(mysterySpinRef.current);
          mysterySpinRef.current = null;
          const finalPrize = prizes[Math.floor(Math.random() * prizes.length)];
          setMysteryPrize(finalPrize);
          const mysteryIndex = currentWedges.findIndex((x) => x.t === "wild");
          if (mysteryIndex !== -1) {
            const targetAngle = angleForWedgeIndex(mysteryIndex, currentWedges);
            setAngle(targetAngle);
          }
          
          if (String(finalPrize).toUpperCase().includes("T-SHIRT")) {
            try { sfx.play("tshirt"); } catch (e) {}
          }
          setLanded({
            t: "prize",
            label: finalPrize,
            prize: { type: String(finalPrize).toLowerCase(), label: finalPrize, color: "#E6007E" },
          });
          
          setTimeout(() => {
            setShowMysterySpinner(false);
            setAwaitingConsonant(true);
          }, 900);
        }
      }, 100);
    } else if (w.t === "cash" || w.t === "prize" || w.t === "freeplay") {
      try { sfx.play("cashDing2"); } catch (e) {}
      setAwaitingConsonant(true);
    } else if (w.t === "tshirt") {
      try { sfx.play("tshirt"); } catch (e) {}
      setAwaitingConsonant(true);
    } else if (w.t === "bankrupt") {
      landedOwnerRef.current = null;
      const currentTeamName = teams[active]?.name ?? `Team ${active + 1}`;
      
      setGameStats((prev) => {
        const prevTeam = prev.teamStats[currentTeamName] || {};
        return {
          ...prev,
          bankrupts: prev.bankrupts + 1,
          teamStats: {
            ...prev.teamStats,
            [currentTeamName]: { ...prevTeam, bankrupts: (prevTeam.bankrupts || 0) + 1 },
          },
        };
      });
      
      setTeams((ts) => ts.map((t, i) => (i === active ? { ...t, round: 0, holding: [] } : t)));
      try { sfx.play("bankrupt"); } catch (e) {}
      passTurn();
    } else if (w.t === "lose") {
      landedOwnerRef.current = null;
      const currentTeamName = teams[active]?.name ?? `Team ${active + 1}`;
      setGameStats((prev) => {
        const prevTeam = prev.teamStats[currentTeamName] || {};
        return {
          ...prev,
          loseTurns: prev.loseTurns + 1,
          teamStats: {
            ...prev.teamStats,
            [currentTeamName]: { ...prevTeam, loseTurns: (prevTeam.loseTurns || 0) + 1 },
          },
        };
      });
      try { sfx.play("buzzer"); } catch (e) {}
      passTurn();
    }
  }

  function guessLetter(ch) {
    if (isRevealingLetters) return;
    if (!awaitingConsonant) return;
    if (VOWELS.has(ch) || letters.has(ch)) return;
    setLetters((S) => new Set(S).add(ch));
    const hitIndices = board.reduce((acc, cell, index) => (cell.ch === ch ? [...acc, index] : acc), []);
    const currentTeamName = teams[active]?.name ?? `Team ${active + 1}`;
    if (hitIndices.length > 0) {
      setIsRevealingLetters(true);
      setGameStats((prev) => {
        const prevTeam = prev.teamStats[currentTeamName] || {};
        const newConsecutive = (prevTeam.consecutiveCorrect || 0) + 1;
        return {
          ...prev,
          correctGuesses: prev.correctGuesses + 1,
          teamStats: {
            ...prev.teamStats,
            [currentTeamName]: {
              ...prevTeam,
              correctGuesses: (prevTeam.correctGuesses || 0) + 1,
              consecutiveCorrect: newConsecutive,
              maxConsecutive: Math.max(prevTeam.maxConsecutive || 0, newConsecutive),
              totalTurns: (prevTeam.totalTurns || 0) + 1,
            },
          },
        };
      });
      
      const w = landed || { t: "cash", v: 0 };
      const wedgeValue = (w.t === "cash" && typeof w.v === "number") ? w.v : 0;
      
      setTeams((ts) => ts.map((t, i) => (i === active ? { ...t, round: t.round + wedgeValue * hitIndices.length } : t)));
      
      const pushHolding = (label) => {
        const normalized = String(label).toUpperCase();
        setTeams((prev) =>
          prev.map((t, i) => {
            if (i !== active) return t;
            const existing = Array.isArray(t.holding) ? t.holding : (t.holding ? [t.holding] : []);
            return { ...t, holding: [...existing, normalized] };
          })
        );
      };
      if (landed?.t === "tshirt") {
        pushHolding("T-SHIRT");
      } else if (landed?.t === "prize" && landed.prize?.label) {
        pushHolding(landed.prize.label);
      } else if (landed?.t === "cash" && typeof landed.label === "string" && landed.label.toUpperCase().includes("T-SHIRT")) {
        pushHolding("T-SHIRT");
      }
      hitIndices.forEach((boardIndex, i) => {
        setTimeout(() => {
          try { sfx.play("ding"); } catch (e) {}
          setBoard((currentBoard) => currentBoard.map((cell, idx) => (idx === boardIndex ? { ...cell, shown: true } : cell)));
        }, i * 750);
      });
      if (revealTimeoutRef.current) {
        clearTimeout(revealTimeoutRef.current);
        revealTimeoutRef.current = null;
      }
      const totalRevealTime = hitIndices.length * 750;
      revealTimeoutRef.current = setTimeout(() => {
        setIsRevealingLetters(false);
        revealTimeoutRef.current = null;
      }, totalRevealTime + 50);
      setAwaitingConsonant(false);
    } else {
      setGameStats((prev) => {
        const prevTeam = prev.teamStats[currentTeamName] || {};
        return {
          ...prev,
          incorrectGuesses: prev.incorrectGuesses + 1,
          incorrectLetters: {
            ...prev.incorrectLetters,
            [ch]: (prev.incorrectLetters[ch] || 0) + 1
          },
          teamStats: {
            ...prev.teamStats,
            [currentTeamName]: {
              ...prevTeam,
              incorrectGuesses: (prevTeam.incorrectGuesses || 0) + 1,
              consecutiveCorrect: 0,
              totalTurns: (prevTeam.totalTurns || 0) + 1,
            },
          },
        };
      });
      try { sfx.play("wrongLetter"); } catch (e) {}
      setAwaitingConsonant(false);
      passTurn();
    }
  }

  function handleBuyVowel(ch) {
    if (isRevealingLetters) return;
    setShowVowelModal(false);
    if (!ch || !VOWELS.has(ch) || ch.length !== 1) return;
    if (letters.has(ch)) return;
    const canAfford = (teams[active]?.round ?? 0) >= VOWEL_COST;
    if (!canAfford) {
      try { sfx.play("buzzer"); } catch (e) {}
      return;
    }
    const currentTeamName = teams[active]?.name ?? `Team ${active + 1}`;
    setGameStats((prev) => {
      const prevTeam = prev.teamStats[currentTeamName] || {};
      return {
        ...prev,
        vowelsBought: prev.vowelsBought + 1,
        teamStats: {
          ...prev.teamStats,
          [currentTeamName]: { ...prevTeam, vowelsBought: (prevTeam.vowelsBought || 0) + 1 },
        },
      };
    });
    setLetters((S) => new Set(S).add(ch));
    setTeams((ts) => ts.map((t, i) => (i === active ? { ...t, round: t.round - VOWEL_COST } : t)));
    const hitIndices = board.reduce((acc, cell, index) => (cell.ch === ch ? [...acc, index] : acc), []);
    if (hitIndices.length > 0) {
      setIsRevealingLetters(true);
      setGameStats((prev) => {
        const prevTeam = prev.teamStats[currentTeamName] || {};
        return {
          ...prev,
          correctGuesses: prev.correctGuesses + 1,
          vowelSuccesses: prev.vowelSuccesses + 1,
          teamStats: {
            ...prev.teamStats,
            [currentTeamName]: {
              ...prevTeam,
              correctGuesses: (prevTeam.correctGuesses || 0) + 1,
              vowelSuccesses: (prevTeam.vowelSuccesses || 0) + 1
            },
          },
        };
      });
      hitIndices.forEach((boardIndex, i) => {
        setTimeout(() => {
          try { sfx.play("ding"); } catch (e) {}
          setBoard((currentBoard) => currentBoard.map((cell, idx) => (idx === boardIndex ? { ...cell, shown: true } : cell)));
        }, i * 750);
      });
      if (revealTimeoutRef.current) {
        clearTimeout(revealTimeoutRef.current);
        revealTimeoutRef.current = null;
      }
      const totalRevealTime = hitIndices.length * 750;
      revealTimeoutRef.current = setTimeout(() => {
        setIsRevealingLetters(false);
        revealTimeoutRef.current = null;
      }, totalRevealTime + 50);
    } else {
      setGameStats((prev) => {
        const prevTeam = prev.teamStats[currentTeamName] || {};
        return {
          ...prev,
          incorrectGuesses: prev.incorrectGuesses + 1,
          vowelFailures: prev.vowelFailures + 1,
          teamStats: {
            ...prev.teamStats,
            [currentTeamName]: {
              ...prevTeam,
              incorrectGuesses: (prevTeam.incorrectGuesses || 0) + 1,
              vowelFailures: (prevTeam.vowelFailures || 0) + 1,
              consecutiveCorrect: 0,
              totalTurns: (prevTeam.totalTurns || 0) + 1,
            },
          },
        };
      });
      try { sfx.play("wrongLetter"); } catch (e) {}
    }
  }

  function handleSolve() {
    setShowSolveModal(false);
    if (isRevealingLetters) return;
    if (!solveGuess) return;
    const answer = board.map((b) => b.ch).join("");
    if (solveGuess.toUpperCase().trim() === answer) {
      finishPuzzle(true, landed);
    } else {
      setGameStats((prev) => ({ ...prev, incorrectGuesses: prev.incorrectGuesses + 1 }));
      try { sfx.play("buzzer"); } catch (e) {}
      passTurn();
    }
    setSolveGuess("");
  }

  function finishPuzzle(solved, lastWedge) {
    if (solved) {
      if (finishingRef.current) return;
      finishingRef.current = true;
      setIsRevealingLetters(true);
      
      try {
        const solverName = teams[active]?.name;
        setGameStats((prev) => {
          const currentCategory = category || "PHRASE";
          const categoryData = prev.categoryStats[currentCategory] || { attempted: 0, solved: 0 };
          
          return {
            ...prev,
            puzzlesSolved: (prev.puzzlesSolved || 0) + 1,
            categoryStats: {
              ...prev.categoryStats,
              [currentCategory]: {
                ...categoryData,
                solved: categoryData.solved + 1
              }
            },
            teamStats: {
              ...prev.teamStats,
              [solverName]: {
                ...(prev.teamStats[solverName] || {}),
                puzzlesSolved: ((prev.teamStats[solverName] || {}).puzzlesSolved || 0) + 1,
              },
            },
          };
        });
      } catch (err) {
        setGameStats((prev) => ({ ...prev, puzzlesSolved: (prev.puzzlesSolved || 0) + 1 }));
      }
      
      let resolvedLanded = lastWedge || landed;
      
      try {
        if (mysterySpinRef.current) {
          clearInterval(mysterySpinRef.current);
          mysterySpinRef.current = null;
        }
        if (bonusSpinRef.current) {
          clearInterval(bonusSpinRef.current);
          bonusSpinRef.current = null;
        }
      } catch (e) {}
      
      if (showMysterySpinner) {
        const finalPrize = mysteryPrize || BONUS_PRIZES[Math.floor(Math.random() * BONUS_PRIZES.length)];
        setMysteryPrize(finalPrize);
        setShowMysterySpinner(false);
        
        resolvedLanded = {
          t: "prize",
          label: finalPrize,
          prize: { type: String(finalPrize).toLowerCase(), label: finalPrize, color: "#E6007E" },
        };
        setLanded(resolvedLanded);
        if (String(finalPrize).toUpperCase().includes("T-SHIRT")) {
          try { sfx.play("tshirt"); } catch (e) {}
        }
      } else {
        resolvedLanded = landed || lastWedge || resolvedLanded;
      }
      
      setTeams((prevTs) => {
        const specialWedgesWon = [];
        const updated = prevTs.map((t, i) => {
          if (i !== active) return { ...t, round: 0, holding: [] };
          
          const updatedTeam = { ...t, total: t.total + t.round + SOLVE_BONUS, round: 0 };
          
          const holdingArr = Array.isArray(t.holding) ? t.holding : t.holding ? [t.holding] : [];
          if (holdingArr.length > 0) {
            const normalizedHolding = holdingArr.map((h) => String(h).toUpperCase());
            updatedTeam.prizes = [...(updatedTeam.prizes || []), ...normalizedHolding];
            normalizedHolding.forEach((h) => {
              if (h === "T-SHIRT") specialWedgesWon.push("tshirt");
              else specialWedgesWon.push("mystery");
            });
          }
          
          if (
            resolvedLanded &&
            resolvedLanded.t === "prize" &&
            resolvedLanded.prize &&
            resolvedLanded.prize.label &&
            landedOwnerRef.current === active
          ) {
            const prizeLabel = String(resolvedLanded.prize.label).toUpperCase();
            updatedTeam.prizes = updatedTeam.prizes || [];
            if (!updatedTeam.prizes.includes(prizeLabel)) {
              updatedTeam.prizes.push(prizeLabel);
              if (prizeLabel === "T-SHIRT") {
                specialWedgesWon.push("tshirt");
              } else {
                specialWedgesWon.push("mystery");
              }
            }
          }
          
          updatedTeam.holding = [];
          return updatedTeam;
        });
        
        setWonSpecialWedges(specialWedgesWon);
        
        const solverScore = teams[active]?.total || 0;
        const maxOtherScore = Math.max(...teams.filter((_, i) => i !== active).map(t => t.total));
        const deficit = maxOtherScore - solverScore;
        
        if (deficit > 0) {
          const currentTeamName = teams[active]?.name ?? `Team ${active + 1}`;
          setGameStats(prev => {
            const prevTeam = prev.teamStats[currentTeamName] || {};
            return {
              ...prev,
              maxComeback: Math.max(prev.maxComeback, deficit),
              teamStats: {
                ...prev.teamStats,
                [currentTeamName]: {
                  ...prevTeam,
                  biggestComeback: Math.max(prevTeam.biggestComeback || 0, deficit),
                  solveWhenBehind: (prevTeam.solveWhenBehind || 0) + 1
                }
              }
            };
          });
        }
        
        const max = updated.length ? Math.max(...updated.map((t) => t.total)) : -Infinity;
        const topTeams = updated.filter((t) => t.total === max);
        const winnerNames = topTeams.map((t) => t.name);
        winnersRef.current = winnerNames;
        setWinners(winnerNames);
        setRoundWinner(winnerNames[0]);
        
        return updated;
      });
      
      const hideIndices = board
        .map((cell, idx) => ({ ...cell, idx }))
        .filter((c) => isLetter(c.ch) && !c.shown)
        .map((c) => c.idx);
      
      if (hideIndices.length === 0) {
        if (winShowTimeoutRef.current) clearTimeout(winShowTimeoutRef.current);
        winShowTimeoutRef.current = setTimeout(() => {
          setShowWinScreen(true);
          try { sfx.play("solve"); } catch (e) {}
          if (winHideTimeoutRef.current) clearTimeout(winHideTimeoutRef.current);
          winHideTimeoutRef.current = setTimeout(() => {
            winHideTimeoutRef.current = null;
            setShowWinScreen(false);
            setRoundWinner(null);
            setIsRevealingLetters(false);
            finishingRef.current = false;
            nextPuzzle();
          }, 10000);
          winShowTimeoutRef.current = null;
        }, 250);
        return;
      }
      
      hideIndices.forEach((boardIndex, i) => {
        setTimeout(() => {
          try { sfx.play("ding"); } catch (e) {}
          setBoard((currentBoard) => currentBoard.map((cell, idx) => (idx === boardIndex ? { ...cell, shown: true } : cell)));
        }, i * SOLVE_REVEAL_INTERVAL);
      });
      
      const totalRevealTime = hideIndices.length * SOLVE_REVEAL_INTERVAL;
      const WIN_SHOW_DELAY = 300;
      
      if (winShowTimeoutRef.current) clearTimeout(winShowTimeoutRef.current);
      winShowTimeoutRef.current = setTimeout(() => {
        try { sfx.play("solve"); } catch (e) {}
        setShowWinScreen(true);
        if (winHideTimeoutRef.current) clearTimeout(winHideTimeoutRef.current);
        winHideTimeoutRef.current = setTimeout(() => {
          winHideTimeoutRef.current = null;
          setShowWinScreen(false);
          setRoundWinner(null);
          setIsRevealingLetters(false);
          finishingRef.current = false;
          nextPuzzle();
        }, 10000);
        winShowTimeoutRef.current = null;
      }, totalRevealTime + WIN_SHOW_DELAY);
    } else {
      setTeams((ts) => ts.map((t) => ({ ...t, round: 0, holding: [] })));
    }
  }

  const passTurn = () => {
    if (!teams || teams.length === 0) {
      setAwaitingConsonant(false);
      return;
    }
    
    const startTs = gameStats?.turnStartTime;
    const currentTeamName = teams[active]?.name ?? `Team ${active + 1}`;
    
    if (startTs && Number.isFinite(startTs)) {
      const turnDuration = Date.now() - startTs;
      
      setGameStats((prev) => {
        const prevTeam = prev.teamStats?.[currentTeamName] || {};
        const newTeamTotalTurnTime = (prevTeam.totalTurnTime || 0) + turnDuration;
        const newTeamCompletedTurns = (prevTeam.completedTurns || 0) + 1;
        
        return {
          ...prev,
          totalTurnTime: (prev.totalTurnTime || 0) + turnDuration,
          turnCount: (prev.turnCount || 0) + 1,
          turnStartTime: null,
          teamStats: {
            ...prev.teamStats,
            [currentTeamName]: {
              ...prevTeam,
              totalTurnTime: newTeamTotalTurnTime,
              completedTurns: newTeamCompletedTurns,
              avgTurnTime: Math.round(newTeamTotalTurnTime / newTeamCompletedTurns),
            },
          },
        };
      });
    } else {
      setGameStats((prev) => ({ ...prev, turnStartTime: Date.now() }));
    }
    
    setActive((a) => nextIdx(a, teams.length));
    setAwaitingConsonant(false);
  };

  function nextPuzzle() {
    finishingRef.current = false;
    setWonSpecialWedges([]);
    setMysteryPrize(null);
    landedOwnerRef.current = null;
    
    const next = idx + 1;
    
    if (next >= selectedPuzzles.length) {
      console.log("BONUS FLOW: Entering bonus round setup");
      let topTeams = [];
      
      if (winnersRef.current && winnersRef.current.length > 0) {
        topTeams = teams.filter((t) => winnersRef.current.includes(t.name));
      } else if (winners && winners.length > 0) {
        topTeams = teams.filter((t) => winners.includes(t.name));
      } else if (teams && teams.length > 0) {
        const maxTotal = Math.max(...teams.map((t) => t.total));
        const finalWinners = teams.filter((t) => t.total === maxTotal).map((t) => t.name);
        winnersRef.current = finalWinners;
        setWinners(finalWinners);
        topTeams = teams.filter((t) => finalWinners.includes(t.name));
      } else {
        setPhase("done");
        return;
      }
      
      const randomBonusIndex = bonusPuzzles && bonusPuzzles.length ? Math.floor(Math.random() * bonusPuzzles.length) : 0;
      const bonusPuzzle = (bonusPuzzles && bonusPuzzles[randomBonusIndex]) || FALLBACK[0];
      
      if (topTeams.length > 0) {
        console.log("BONUS FLOW: Setting up bonus puzzle for teams:", topTeams.map(t => t.name));
        setBoard(normalizeAnswer(bonusPuzzle.answer));
        setCategory(bonusPuzzle.category || "PHRASE");
        setBonusRound(true);
        setPhase("bonus");
        if (topTeams.length > 1) {
          console.log("BONUS FLOW: Multiple winners, showing bonus selector");
          setShowBonusSelector(true);
        } else {
          console.log("BONUS FLOW: Single winner, going directly to bonus");
          const single = topTeams[0].name;
          winnersRef.current = [single];
          setWinners([single]);
        }
        return;
      } else {
        setPhase("done");
        return;
      }
    }
    
    setIdx(next);
    const p = selectedPuzzles[next] || FALLBACK[0];
    setBoard(normalizeAnswer(p.answer));
    setCategory(p.category || "PHRASE");
    
    setGameStats(prev => {
      const categoryData = prev.categoryStats[p.category || "PHRASE"] || { attempted: 0, solved: 0 };
      return {
        ...prev,
        categoryStats: {
          ...prev.categoryStats,
          [p.category || "PHRASE"]: {
            ...categoryData,
            attempted: categoryData.attempted + 1
          }
        }
      };
    });
    
    setLetters(new Set());
    setLanded(null);
    setAwaitingConsonant(false);
    setActive((a) => nextIdx(a, teams.length));
    setTeams((ts) => ts.map((t) => ({ ...t, round: 0, holding: [] })));
    setAngle(0);
    setHasSpun(false);
  }

  function startBonusWinnerSelector() {
    setBonusWinnerSpinning(true);
    let spinCount = 0;
    const maxSpins = 20 + Math.floor(Math.random() * 15);
    const topTeams = teams.filter((t) => winners.includes(t.name));
    if (!topTeams || topTeams.length === 0) {
      setBonusWinnerSpinning(false);
      return;
    }
    if (bonusWinnerSpinRef.current) {
      clearInterval(bonusWinnerSpinRef.current);
      bonusWinnerSpinRef.current = null;
    }
    bonusWinnerSpinRef.current = setInterval(() => {
      const idx = topTeams.length ? (spinCount % topTeams.length) : 0;
      setSelectedBonusWinner(topTeams[idx]?.name ?? "?");
      spinCount++;
      if (spinCount >= maxSpins) {
        clearInterval(bonusWinnerSpinRef.current);
        bonusWinnerSpinRef.current = null;
        const finalWinner = topTeams[Math.floor(Math.random() * topTeams.length)]?.name ?? topTeams[0]?.name ?? null;
        setSelectedBonusWinner(finalWinner);
        setBonusWinnerSpinning(false);
        setWinners(finalWinner ? [finalWinner] : []);
        setTimeout(() => {
          setShowBonusSelector(false);
        }, 1200);
      }
    }, 150);
  }

  function spinBonusWheel() {
    if (bonusSpinnerSpinning) return;
    
    setBonusSpinnerSpinning(true);
    try {
      sfx.play("spin");
    } catch (e) {}
    
    const spins = Math.floor(Math.random() * 5) + 8;
    const finalRotation = Math.floor(Math.random() * 360);
    const totalRotation = spins * 360 + finalRotation;
    
    const startTime = performance.now();
    const duration = 4000;
    const startAngle = bonusSpinnerAngle;
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentAngle = startAngle + totalRotation * easeOut;
      
      setBonusSpinnerAngle(currentAngle);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        const normalizedRotation = (360 - (finalRotation % 360)) % 360;
        const prizeIndex = Math.floor(normalizedRotation / (360 / BONUS_PRIZES.length));
        const selectedPrize = BONUS_PRIZES[prizeIndex % BONUS_PRIZES.length];
        
        setBonusPrize(selectedPrize);
        setBonusSpinnerSpinning(false);
        
        try {
          sfx.stop("spin");
        } catch (e) {}
        
        setShowBonusSpinner(false);
        setBonusHideBoard(true);
        setBonusPrize(selectedPrize);
        setShowBonusLetterModal(true);
        setBonusLetterType("consonant");
      }
    };
    
    requestAnimationFrame(animate);
  }

  function handleBonusLetter(letter) {
    if (bonusLetterType === "consonant") {
      setBonusConsonants((prev) => {
        if (prev.includes(letter) || VOWELS.has(letter)) return prev;
        const next = [...prev, letter];
        if (next.length >= 3) {
          setBonusLetterType("vowel");
        }
        setBonusLetters((bl) => new Set([...bl, letter]));
        return next;
      });
      return;
    } else if (bonusLetterType === "vowel" && !bonusVowel) {
      if (VOWELS.has(letter) && !bonusLetters.has(letter)) {
        const newBonusLetters = new Set(bonusLetters);
        newBonusLetters.add(letter);
        setBonusVowel(letter);
        setBonusLetters(newBonusLetters);
        setShowBonusLetterModal(false);
        revealBonusLetters(newBonusLetters);
      }
    }
  }

  function revealBonusLetters(overrideAllBonusLetters = null) {
    console.log("revealBonusLetters: instant reveal (no animation/no sounds)");
    try { sfx.stop("ding"); } catch (e) {}
    try { sfx.stop("wrongLetter"); } catch (e) {}
    try { sfx.stopLoop("chargeUp"); } catch (e) {}
    try { sfx.stop("chargeUp"); } catch (e) {}
    setBonusRevealing(false);
    const allBonusLetters = overrideAllBonusLetters ?? new Set([...bonusLetters, ...bonusConsonants, ...(bonusVowel ? [bonusVowel] : [])]);
    setBoard((current) =>
      current.map((cell) => (isLetter(cell.ch) && allBonusLetters.has(cell.ch)) ? { ...cell, shown: true } : cell)
    );
    setShowBonusLetterModal(false);
    setBonusAwaitingReady(true);
    setBonusHideBoard(true);
    setShowBonusSolveModal(false);
    setBonusActive(false);
    setBonusCountdown(20);
    setBonusReadyModalVisible(true);
  }

  function pressReadyStartBonus() {
    if (readyDisabled || bonusActive) return;
    setReadyDisabled(true);
    setBonusHideBoard(false);
    setBonusAwaitingReady(false);
    setShowBonusSolveModal(true);
    setBonusActive(true);
    setBonusCountdown(20);
    setBonusReadyModalVisible(false);
    setTimeout(() => {
      const el = document.querySelector("#bonus-inline-solve-input");
      if (el) el.focus();
    }, 60);
    setTimeout(() => setReadyDisabled(false), 1500);
  }

  function handleBonusSolve() {
    setShowBonusSolveModal(false);
    setBonusActive(false);
    if (bonusResultHideTimeoutRef.current) {
      clearTimeout(bonusResultHideTimeoutRef.current);
      bonusResultHideTimeoutRef.current = null;
    }
    const answer = board.map((b) => b.ch).join("");
    const correct = bonusGuess.toUpperCase().trim() === answer;
    const winnerIndex = teams.findIndex((t) => winners.includes(t.name));
    if (correct) {
      setBoard((currentBoard) => currentBoard.map((c) => ({ ...c, shown: true })));
      if (winnerIndex !== -1) {
        setTeams((prev) => prev.map((t, i) => (i === winnerIndex ? { ...t, prizes: [...t.prizes, bonusPrize] } : t)));
        setBonusWinnerName(winners[0] || null);
      } else {
        setTeams((prev) => prev.map((t, i) => (i === active ? { ...t, prizes: [...t.prizes, bonusPrize] } : t)));
        setBonusWinnerName(teams[active]?.name || null);
      }
      try { sfx.play("solve"); } catch (e) {}
      setBonusResult("win");
    } else {
      try { sfx.play("buzzer"); } catch (e) {}
      setBonusResult("lose");
    }
    setBonusGuess("");
    bonusResultHideTimeoutRef.current = setTimeout(() => {
      bonusResultHideTimeoutRef.current = null;
      setBonusResult(null);
      setPhase("done");
    }, 7000);
  }

  function restartAll() {
    try { sfx.stop("solve"); } catch (e) {}
    if (winShowTimeoutRef.current) { clearTimeout(winShowTimeoutRef.current); winShowTimeoutRef.current = null; }
    if (winHideTimeoutRef.current) { clearTimeout(winHideTimeoutRef.current); winHideTimeoutRef.current = null; }
    if (bonusSpinRef.current) { clearInterval(bonusSpinRef.current); bonusSpinRef.current = null; }
    if (bonusWinnerSpinRef.current) { clearInterval(bonusWinnerSpinRef.current); bonusWinnerSpinRef.current = null; }
    if (mysterySpinRef.current) { clearInterval(mysterySpinRef.current); mysterySpinRef.current = null; }
    if (bonusResultHideTimeoutRef.current) { clearTimeout(bonusResultHideTimeoutRef.current); bonusResultHideTimeoutRef.current = null; }
    finishingRef.current = false;
    setIsRevealingLetters(false);
    
    const count = Math.max(1, Math.min(roundsCount, (puzzles && puzzles.length) || FALLBACK.length));
    const chosen = selectRandomPuzzles(puzzles && puzzles.length ? puzzles : FALLBACK, count);
    setSelectedPuzzles(chosen);
    setIdx(0);
    const first = chosen[0] || FALLBACK[0];
    setBoard(normalizeAnswer(first.answer));
    setCategory(first.category || "PHRASE");
    
    setGameStats(prev => {
      const categoryData = prev.categoryStats[first.category || "PHRASE"] || { attempted: 0, solved: 0 };
      return {
        ...prev,
        categoryStats: {
          ...prev.categoryStats,
          [first.category || "PHRASE"]: {
            ...categoryData,
            attempted: categoryData.attempted + 1
          }
        }
      };
    });
    
    setGameStats({
      totalSpins: 0,
      bankrupts: 0,
      loseTurns: 0,
      puzzlesSolved: 0,
      vowelsBought: 0,
      correctGuesses: 0,
      incorrectGuesses: 0,
      gameStartTime: Date.now(),
      teamStats: {},
      wedgeStats: {},
      puzzlesStarted: count,
      maxComeback: 0,
      turnStartTime: null,
      totalTurnTime: 0,
      turnCount: 0,
      vowelSuccesses: 0,
      vowelFailures: 0,
      wedgeLandingStats: {},
      categoryStats: {},
      incorrectLetters: {},
    });
    
    setLetters(new Set());
    setLanded(null);
    setAwaitingConsonant(false);
    setWonSpecialWedges([]);
    setCurrentWedges([...WEDGES]);
    setBonusResult(null);
    setBonusWinnerName(null);
    landedOwnerRef.current = null;
    
    const names = makeTeamNamesArray(teamCount, teamNames);
    setTeams(names.map((name) => ({ name, total: 0, round: 0, prizes: [], holding: [] })));
    
    setActive(0);
    setAngle(0);
    setZoomed(false);
    setWheelPx(BASE_WHEEL_PX);
    setPhase("play");
    setWinners([]);
    winnersRef.current = [];
    setHasSpun(false);
    setMysteryPrize(null);
    setWonSpecialWedges([]);
    setCurrentWedges([...WEDGES]);
    setBonusSpinning(false);
    setBonusPrize("");
    setBonusLetters(new Set(["R", "S", "T", "L", "N", "E"]));
    setBonusConsonants([]);
    setBonusVowel("");
    setBonusActive(false);
    setShowBonusLetterModal(false);
    setBonusLetterType("");
    setBonusGuess("");
    setShowBonusSolveModal(false);
    setBonusRound(false);
    setBonusCountdown(20);
    setBonusAwaitingReady(false);
    setBonusHideBoard(false);
    setBonusReadyModalVisible(false);
    setBonusResult(null);
    setBonusWinnerName(null);
  }

  function backToSetup() {
    try { sfx.stop("solve"); } catch (e) {}
    if (winShowTimeoutRef.current) { clearTimeout(winShowTimeoutRef.current); winShowTimeoutRef.current = null; }
    if (winHideTimeoutRef.current) { clearTimeout(winHideTimeoutRef.current); winHideTimeoutRef.current = null; }
    if (bonusSpinRef.current) { clearInterval(bonusSpinRef.current); bonusSpinRef.current = null; }
    if (bonusWinnerSpinRef.current) { clearInterval(bonusWinnerSpinRef.current); bonusWinnerSpinRef.current = null; }
    if (mysterySpinRef.current) { clearInterval(mysterySpinRef.current); mysterySpinRef.current = null; }
    if (bonusResultHideTimeoutRef.current) { clearTimeout(bonusResultHideTimeoutRef.current); bonusResultHideTimeoutRef.current = null; }
    finishingRef.current = false;
    setPhase("setup");
    landedOwnerRef.current = null;
    setWinners([]);
    winnersRef.current = [];
    setZoomed(false);
    setWheelPx(BASE_WHEEL_PX);
    setHasSpun(false);
    const names = makeTeamNamesArray(teamCount, teamNames);
    setTeams(names.map((name, i) => ({
      name: String(name || `Team ${i + 1}`).slice(0, TEAM_NAME_MAX),
      total: 0,
      round: 0,
      prizes: [],
      holding: [],
    })));
    setTeamNames(names);
    setIdx(0);
    const p = selectedPuzzles[0] || FALLBACK[0];
    setBoard(normalizeAnswer(p.answer));
    setCategory(p.category || "PHRASE");
    setLetters(new Set());
    setLanded(null);
    setAwaitingConsonant(false);
    setActive(0);
    setAngle(0);
    setMysteryPrize(null);
    setWonSpecialWedges([]);
    setCurrentWedges([...WEDGES]);
    setBonusRound(false);
    setBonusSpinning(false);
    setBonusPrize("");
    setBonusLetters(new Set(["R", "S", "T", "L", "N", "E"]));
    setBonusConsonants([]);
    setBonusVowel("");
    setBonusCountdown(20);
    setBonusActive(false);
    setShowBonusLetterModal(false);
    setBonusLetterType("");
    setBonusGuess("");
    setShowBonusSolveModal(false);
    setShowStats(false);
    setBonusResult(null);
    setBonusWinnerName(null);
    setBonusReadyModalVisible(false);
  }

  const startGameFromSetup = async () => {
    try { await sfx.unlock(); } catch (e) {}
    try { sfx.play("startGame"); } catch (e) {}
    
    const parsedTeams = parseIntSafe(tempTeamCount);
    const finalTeamCount = Number.isFinite(parsedTeams) ? Math.min(MAX_TEAMS, Math.max(2, parsedTeams)) : Math.min(MAX_TEAMS, Math.max(2, teamCount));
    
    const parsedRounds = parseIntSafe(tempRoundsCount);
    const maxRounds = Math.max(1, (puzzles && puzzles.length) || FALLBACK.length);
    const finalRounds = Number.isFinite(parsedRounds) ? Math.min(Math.max(1, parsedRounds), maxRounds) : Math.min(Math.max(1, roundsCount), maxRounds);
    
    setTeamCount(finalTeamCount);
    setTempTeamCount(String(finalTeamCount));
    setRoundsCount(finalRounds);
    setTempRoundsCount(String(finalRounds));
    
    const names = makeTeamNamesArray(finalTeamCount, teamNames);
    
    setTeams(names.map((name) => ({ name, total: 0, round: 0, prizes: [], holding: [] })));
    setTeamNames(names);
    setActive(0);
    setAngle(0);
    setHasSpun(false);
    setZoomed(false);
    setMysteryPrize(null);
    setWonSpecialWedges([]);
    setCurrentWedges([...WEDGES]);
    
    const count = Math.max(1, Math.min(finalRounds, (puzzles && puzzles.length) || FALLBACK.length));
    const chosen = selectRandomPuzzles(puzzles && puzzles.length ? puzzles : FALLBACK, count);
    
    setBonusResult(null);
    setBonusWinnerName(null);
    winnersRef.current = [];
    setWinners([]);
    
    setSelectedPuzzles(chosen);
    setIdx(0);
    const first = chosen[0] || FALLBACK[0];
    setBoard(normalizeAnswer(first.answer));
    setCategory(first.category || "PHRASE");
    
    setGameStats(prev => {
      const categoryData = prev.categoryStats[first.category || "PHRASE"] || { attempted: 0, solved: 0 };
      return {
        ...prev,
        categoryStats: {
          ...prev.categoryStats,
          [first.category || "PHRASE"]: {
            ...categoryData,
            attempted: categoryData.attempted + 1
          }
        }
      };
    });
    
    setPhase("play");
  };

  // ===== USEEFFECT HOOKS =====

  useEffect(() => {
    loadPuzzles().then((data) => {
      setPuzzles(data.main);
      setBonusPuzzles(data.bonus);
      setSelectedPuzzles(data.main && data.main.length ? data.main : FALLBACK);
      setIdx(0);
      const p = (data.main && data.main[0]) || FALLBACK[0];
      setBoard(normalizeAnswer(p.answer));
      setCategory(p.category || "PHRASE");
      setRoundsCount((rc) => Math.min(rc, Math.max(1, (data.main && data.main.length) || FALLBACK.length)));
    });
  }, []);

  useEffect(() => {
    const onBlur = () => endCharge();
    const onVis = () => {
      if (document.hidden) endCharge();
    };
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  useEffect(() => () => {
    if (chargeIntervalRef.current) clearInterval(chargeIntervalRef.current);
  }, []);

  useEffect(() => {
    return () => {
      if (bonusSpinRef.current) {
        clearInterval(bonusSpinRef.current);
        bonusSpinRef.current = null;
      }
      if (bonusWinnerSpinRef.current) {
        clearInterval(bonusWinnerSpinRef.current);
        bonusWinnerSpinRef.current = null;
      }
      if (mysterySpinRef.current) {
        clearInterval(mysterySpinRef.current);
        mysterySpinRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (revealTimeoutRef.current) {
        clearTimeout(revealTimeoutRef.current);
        revealTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (bonusResultHideTimeoutRef.current) {
        clearTimeout(bonusResultHideTimeoutRef.current);
        bonusResultHideTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!bonusResult) return;
    const onSkip = (e) => {
      const key = e.key || "";
      if (key === "Enter" || key === " " || e.code === "Space") {
        e.preventDefault();
        if (bonusResultHideTimeoutRef.current) {
          clearTimeout(bonusResultHideTimeoutRef.current);
          bonusResultHideTimeoutRef.current = null;
        }
        setBonusResult(null);
        setPhase("done");
      }
    };
    window.addEventListener("keydown", onSkip);
    return () => window.removeEventListener("keydown", onSkip);
  }, [bonusResult]);

  useEffect(() => {
    return () => {
      if (winShowTimeoutRef.current) clearTimeout(winShowTimeoutRef.current);
      if (winHideTimeoutRef.current) clearTimeout(winHideTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    const currentSize = zoomed ? ZOOM_WHEEL_PX : BASE_WHEEL_PX;
    const newSize = isFullscreen ? currentSize * 1.4 : currentSize;
    setWheelPx(newSize);
  }, [phase, isFullscreen, zoomed]);

  useEffect(() => {
    let interval;
    if (bonusActive && bonusCountdown > 0) {
      interval = setInterval(() => {
        setBonusCountdown((prev) => {
          if (prev <= 1) {
            setBonusActive(false);
            setTimeout(() => {
              if (!bonusResult) setBonusResult("lose");
              setTimeout(() => setPhase("done"), 2200);
            }, 500);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [bonusActive, bonusCountdown, bonusResult]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (isRevealingLetters) return;
      const k = (e.key || "").toLowerCase();
      if (bonusRound) {
        if (k === "enter" && bonusActive && !showBonusSolveModal) {
          setShowBonusSolveModal(true);
        }
        return;
      }
      if (phase !== "play" || showVowelModal || showSolveModal || showWinScreen) return;
      if (k === "f") toggleFullscreen();
      if (k === "v" && canBuyVowel) setShowVowelModal(true);
      if (k === "enter" && canSolve) setShowSolveModal(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [phase, canBuyVowel, canSolve, bonusRound, bonusActive, showBonusSolveModal, showVowelModal, showSolveModal, showWinScreen, isRevealingLetters]);

  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === "Escape") {
        setShowVowelModal(false);
        setShowSolveModal(false);
        setShowBonusSolveModal(false);
        setShowBonusLetterModal(false);
        setShowBonusSelector(false);
        setShowMysterySpinner(false);
        setShowStats(false);
        setBonusReadyModalVisible(false);
      }
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  useEffect(() => {
    if (phase === "bonus" && bonusSpinnerRef.current && !bonusPrize) {
      drawBonusWheel();
    }
    requestAnimationFrame(() => drawWheel(angle));
  }, [angle, wheelPx, phase, isFullscreen, isCharging, spinPower, zoomed, currentWedges, bonusSpinnerAngle, bonusPrize]);

  useEffect(() => {
    if (phase === "setup") setGameStats(initializeGameStats());
  }, [phase, initializeGameStats]);

  useEffect(() => {
    if (phase === "setup") {
      setTempTeamCount(String(teamCount));
      setTempRoundsCount(String(roundsCount));
    }
  }, [phase, teamCount, roundsCount]);

  useEffect(() => {
    if (phase === "play" && hasSpun && board.length > 0 && board.every((b) => b.shown) && !finishingRef.current) {
      setTimeout(() => {
        if (!finishingRef.current) finishPuzzle(true, landed);
      }, 750);
    }
  }, [board, phase, hasSpun, landed]);

  useEffect(() => {
    if (!showWinScreen) return;
    const onSkipKey = (e) => {
      const key = e.key || "";
      if (key === "Enter" || key === " " || key === "Spacebar" || e.code === "Space") {
        e.preventDefault();
        try {
          sfx.stop("solve");
        } catch (err) {}
        if (winShowTimeoutRef.current) {
          clearTimeout(winShowTimeoutRef.current);
          winShowTimeoutRef.current = null;
        }
        if (winHideTimeoutRef.current) {
          clearTimeout(winHideTimeoutRef.current);
          winHideTimeoutRef.current = null;
        }
        setShowWinScreen(false);
        setRoundWinner(null);
        setIsRevealingLetters(false);
        finishingRef.current = false;
        nextPuzzle();
      }
    };
    window.addEventListener("keydown", onSkipKey);
    return () => window.removeEventListener("keydown", onSkipKey);
  }, [showWinScreen, sfx]);

  // Game state and actions objects for passing to components
  const gameState = {
    phase, teams, active, board, category, letters, landed, spinning, zoomed,
    awaitingConsonant, hasSpun, isRevealingLetters, wheelPx, angle, currentWedges,
    spinPower, isCharging, snapChargeToZero, isFullscreen, showWinScreen,
    roundWinner, bonusRound, bonusPrize, bonusActive, bonusCountdown,
    mysteryPrize, showMysterySpinner, wordTokens, canSpin, canBuyVowel, canSolve,
    displayBonusPlayer, gameStats, winners, idx, selectedPuzzles, showVowelModal,
    showSolveModal, showBonusSolveModal, showBonusLetterModal, showMysterySpinner,
    showStats, bonusResult, bonusWinnerName, bonusLetters, bonusConsonants,
    bonusVowel, bonusLetterType, bonusGuess, solveGuess, bonusReadyModalVisible,
    bonusHideBoard, bonusAwaitingReady, bonusWinnerSpinning, selectedBonusWinner,
    showBonusSelector, showBonusSpinner, bonusSpinnerSpinning, bonusSpinnerAngle,
    bonusRevealing, readyDisabled, tempTeamCount, tempRoundsCount, teamNames,
    teamCount, roundsCount, finishingRef
  };

  const gameActions = {
    setShowVowelModal, setShowSolveModal, setShowStats, setShowBonusLetterModal,
    setShowBonusSolveModal, guessLetter, handleBuyVowel, handleSolve, startCharge,
    endCharge, toggleFullscreen, backToSetup, nextPuzzle, finishPuzzle,
    spinBonusWheel, handleBonusLetter, handleBonusSolve, startBonusWinnerSelector,
    setSolveGuess, setBonusGuess, setShowMysterySpinner, setShowBonusSelector,
    setBonusReadyModalVisible, pressReadyStartBonus, revealBonusLetters,
    applyTempTeamCount, applyTempRoundsCount, setTempTeamCount, setTempRoundsCount,
    setTeamNames, startGameFromSetup, restartAll, drawWheel, drawBonusWheel
  };

  // ===== RENDER LOGIC =====

  if (phase === "setup") {
    return (
      <div className={cls("min-h-screen h-screen text-white flex items-center justify-center p-4 sm:p-6", GRADIENT)}>
        <PersistentHeader {...gameState} {...gameActions} sfx={sfx} />
        <SetupPanel
          {...gameState}
          {...gameActions}
          sfx={sfx}
          imagesLoaded={imagesLoaded}
          VOWEL_COST={VOWEL_COST}
        />
      </div>
    );
  }

  if (phase === "bonus") {
    const bonusState = bonusActive ? "countdown" : (bonusPrize ? (bonusAwaitingReady ? "ready" : "letters") : "prize_spin");
    return (
      <div className={cls("fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-auto p-4", GRADIENT)}>
        <PersistentHeader {...gameState} {...gameActions} sfx={sfx} />
        
        {bonusState === "prize_spin" && !showBonusSelector && (
          <div className="max-w-7xl w-full mx-auto text-center py-8 flex flex-col items-center justify-center min-h-screen">
            <div className="mb-8">
              <h1 className="text-6xl font-black mb-4 text-white [text-shadow:0_8px_16px_rgba(0,0,0,0.5)]">🎉 BONUS ROUND 🎉</h1>
              <p className="text-3xl font-bold text-yellow-300 [text-shadow:0_4px_8px_rgba(0,0,0,0.5)]">Good luck: {displayBonusPlayer}!</p>
              <p className="text-xl text-white/90 mt-4">Spin the wheel to see what prize you're playing for!</p>
            </div>
            
            <div className="relative mb-8">
              <canvas
                ref={bonusSpinnerRef}
                className="drop-shadow-2xl"
                style={{ width: '400px', height: '400px' }}
              />
            </div>
            
            <button
              onClick={spinBonusWheel}
              disabled={bonusSpinnerSpinning || bonusPrize}
              className={`px-12 py-6 rounded-2xl text-2xl font-extrabold text-white transition-all duration-300 ${
                bonusSpinnerSpinning || bonusPrize
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 hover:scale-105 shadow-2xl animate-pulse'
              }`}
            >
              {bonusSpinnerSpinning ? 'SPINNING...' : bonusPrize ? `YOU'RE PLAYING FOR: ${bonusPrize}` : '🎰 SPIN FOR PRIZE 🎰'}
            </button>
          </div>
        )}
        
        {bonusState !== "prize_spin" && (
          <div className="max-w-6xl w-full mx-auto text-center py-8">
            <h1 className="text-5xl font-black mb-2">BONUS ROUND</h1>
            <p className="text-2xl mb-6">Good luck: {displayBonusPlayer}</p>
            
            {!bonusHideBoard && <BoardDisplay {...gameState} />}
            
            {bonusState === "letters" && bonusAwaitingReady && !bonusReadyModalVisible && (
              <div className="my-8 flex flex-col items-center gap-6">
                <div className="text-5xl font-black text-yellow-300">{bonusPrize}</div>
                <p className="text-lg">Letters revealed. Press READY when you're ready to begin the 20s countdown.</p>
                <button 
                  onClick={() => setBonusReadyModalVisible(true)} 
                  disabled={readyDisabled || bonusActive} 
                  className={cls("px-16 py-6 text-3xl rounded-2xl bg-green-500 text-white font-extrabold shadow-lg transition-transform focus:outline-none", 
                    (readyDisabled || bonusActive) ? "opacity-60 cursor-not-allowed transform-none" : "hover:bg-green-600 hover:scale-105 animate-pulse")}
                >
                  READY
                </button>
              </div>
            )}
            
            {bonusReadyModalVisible && <BonusReadyModal {...gameState} {...gameActions} />}
            {showBonusSolveModal && <BonusSolveInline {...gameState} {...gameActions} />}
          </div>
        )}
        
        {showBonusSelector && <BonusWinnerSelectorModal {...gameState} {...gameActions} />}
        {showBonusLetterModal && <BonusLetterModal {...gameState} {...gameActions} />}
        {bonusResult && <BonusResultModal result={bonusResult} {...gameActions} />}
        <ConfettiCanvas trigger={bonusResult === 'win'} />
      </div>
    );
  }

  if (phase === "done") {
    const sorted = [...teams].sort((a, b) => b.total - a.total);
    return (
      <div className={cls("min-h-screen h-screen text-white flex flex-col items-center justify-center p-4", GRADIENT)}>
        <PersistentHeader {...gameState} {...gameActions} sfx={sfx} />
        
        <div className="max-w-6xl w-full mx-auto p-6 bg-white/10 rounded-2xl backdrop-blur-md flex flex-col gap-6">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2 text-center">Game Over!</h1>
          
          <div className="text-4xl font-semibold text-center">
            {winners.length > 1 ? "Winners:" : "Winner:"}{" "}
            <span className="font-black text-yellow-300">{winners.join(", ")}</span>
          </div>
          
          <div className="overflow-y-auto teams-scroll max-h-[60vh] pr-4 space-y-3">
            {sorted.map((t, i) => {
              const prizeCounts = (t.prizes || []).reduce((acc, p) => {
                const k = String(p).toUpperCase();
                acc[k] = (acc[k] || 0) + 1;
                return acc;
              }, {});
              return (
                <div key={i} className={cls("px-4 py-3 rounded-xl", i === 0 ? "bg-white/20" : "bg-white/10")}>
                  <div className="flex items-center justify-between">
                    <div className="font-semibold flex items-center gap-3">
                      <span>{i + 1}. {t.name}</span>
                      {bonusWinnerName === t.name && <span className="text-xs uppercase px-2 py-1 rounded bg-yellow-300 text-black font-bold">BONUS WINNER</span>}
                    </div>
                    <div className="text-2xl font-black tabular-nums">${t.total.toLocaleString()}</div>
                  </div>
                  
                  {Object.keys(prizeCounts).length > 0 && (
                    <div className="mt-2 flex gap-2 flex-wrap">
                      {Object.entries(prizeCounts).map(([prize, cnt]) => (
                        <span key={`${prize}-${cnt}`} className={cls("px-2 py-1 text-xs font-bold rounded-md",
                          prize === "T-SHIRT" ? "bg-purple-600" :
                          prize === "PIN" ? "bg-red-600" :
                          prize === "STICKER" ? "bg-blue-600" :
                          prize === "MAGNET" ? "bg-gray-600" :
                          prize === "KEYCHAIN" ? "bg-orange-600" : "bg-green-600"
                        )}>
                          {prize}{cnt > 1 ? ` x${cnt}` : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="mt-2 flex gap-2 justify-center flex-wrap">
            <button onClick={restartAll} className="px-4 py-2 rounded-xl bg-white text-black font-semibold hover:opacity-90">Play Again <br/>(with same settings)</button>
            <button onClick={backToSetup} className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 font-semibold">Back to Setup</button>
            <button onClick={() => setShowStats(true)} className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 font-semibold">Statistics</button>
          </div>
        </div>
        
        {showStats && <StatsModal {...gameState} {...gameActions} />}
      </div>
    );
  }

  // Main game phase (play)
  const baseBgColor = isCharging ? "#16a34a" : "#22c55e";
  const fillBgColor = "rgba(4,120,87,0.95)";

  return (
    <div className={cls("min-h-screen h-screen text-white flex flex-col items-center p-4", 
                        zoomed ? "overflow-hidden" : "overflow-auto", GRADIENT)}>
      <PersistentHeader {...gameState} {...gameActions} sfx={sfx} />
      
      <div className={cls("w-full h-full flex flex-col", 
                          (zoomed || showWinScreen) && "invisible",
                          (isRevealingLetters || finishingRef.current) && "pointer-events-none select-none")}>
        <main className="w-full max-w-7xl mx-auto flex-1 flex flex-col lg:flex-row items-center lg:items-center gap-4 min-h-0">
          {/* Left column: wheel + controls */}
          <div className="flex flex-col items-center justify-around gap-4 w-full lg:w-1/2 h-full py-4 relative">
            <WheelCanvas 
              canvasRef={canvasRef}
              wheelPx={wheelPx}
              angle={angle}
              currentWedges={currentWedges}
              drawWheel={drawWheel}
            />
            <ControlsPanel 
              {...gameState} 
              {...gameActions} 
              baseBgColor={baseBgColor}
              fillBgColor={fillBgColor}
              VOWEL_COST={VOWEL_COST}
            />
            <LetterGrid {...gameState} {...gameActions} VOWELS={VOWELS} LETTERS={LETTERS} />
          </div>

          {/* Right column: board + teams */}
          <div className="flex flex-col gap-4 w-full lg:w-1/2 h-full justify-center">
            <BoardDisplay {...gameState} />
            <div className="w-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-500/60 teams-scroll" 
                 style={{ maxHeight: "min(48vh, calc(100vh - 360px))", paddingRight: "8px" }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
                {teams.map((t, i) => (
                  <TeamCard key={i} t={t} i={i} active={active} phase={phase} />
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Zoom overlay */}
      <div className={cls("fixed inset-0 z-50 flex items-center justify-center", !zoomed && "hidden pointer-events-none")}>
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative flex items-center justify-center z-10">
          <canvas ref={zoomCanvasRef} style={{ width: `${wheelPx}px`, height: `${wheelPx}px`, display: "block" }} />
          <div
            className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full bg-no-repeat pointer-events-none"
            style={{ width: "20%", height: "20%", backgroundImage: "url(hub-image.png)", backgroundSize: "110%", backgroundPosition: "10% -50px" }}
            aria-hidden="true"
          />
        </div>
        
        {landed && (
          <div className="absolute inset-0 flex items-center justify-center p-8 text-7xl sm:text-8xl lg:text-9xl font-black uppercase text-white [text-shadow:0_4px_8px_rgba(0,0,0,0.8)] pointer-events-none z-20">
            {landed?.t === "cash" && `${landed.v.toLocaleString()}`}
            {landed?.t === "bankrupt" && "BANKRUPT"}
            {landed?.t === "lose" && "LOSE A TURN"}
            {landed?.prize?.type === "tshirt" && "T-SHIRT PRIZE!"}
            {landed?.t !== "cash" && landed?.t !== "bankrupt" && landed?.t !== "lose" && !landed?.prize && landed.label}
          </div>
        )}
      </div>

      {/* Blocking overlay while revealing letters */}
      {(isRevealingLetters || finishingRef.current) && (
        <div
          className="fixed inset-0 z-[90] bg-transparent"
          aria-hidden="true"
          onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
          style={{ pointerEvents: "auto" }}
        />
      )}

      {/* Modals & overlays */}
      {showVowelModal && <VowelModal {...gameState} {...gameActions} VOWELS={VOWELS} VOWEL_COST={VOWEL_COST} />}
      {showSolveModal && <SolveModal {...gameState} {...gameActions} />}
      {showMysterySpinner && <MysterySpinnerModal mysteryPrize={mysteryPrize} />}
      {showBonusLetterModal && <BonusLetterModal {...gameState} {...gameActions} VOWELS={VOWELS} LETTERS={LETTERS} />}
      {showBonusSelector && <BonusWinnerSelectorModal {...gameState} {...gameActions} />}
      {bonusReadyModalVisible && <BonusReadyModal {...gameState} {...gameActions} />}
      {bonusResult && <BonusResultModal result={bonusResult} {...gameActions} sfx={sfx} />}
      {showBonusSolveModal && <BonusSolveInline {...gameState} {...gameActions} />}
      {showStats && <StatsModal {...gameState} {...gameActions} />}
      
      {showWinScreen && (
        <WinScreen 
          winner={winners[0] || roundWinner || "Winner"} 
          onClose={() => {
            try { sfx.stop("solve"); } catch {}
            setShowWinScreen(false);
            setRoundWinner(null);
            setIsRevealingLetters(false);
            finishingRef.current = false;
            nextPuzzle();
          }} 
        />
      )}
      
      <ConfettiCanvas trigger={showWinScreen || bonusResult === 'win'} />
    </div>
  );
}