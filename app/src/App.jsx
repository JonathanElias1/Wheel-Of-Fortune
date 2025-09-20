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
  const [showVowelModal, setShowVowelModal] = useState(false);
  const [showSolveModal, setShowSolveModal] = useState(false);
  const [solveGuess, setSolveGuess] = useState("");
  const [isRevealingLetters, setIsRevealingLetters] = useState(false);
  const [showMysterySpinner, setShowMysterySpinner] = useState(false);

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
  
  // Setup state
  const [tempTeamCount, setTempTeamCount] = useState(String(teamCount));
  const [tempRoundsCount, setTempRoundsCount] = useState(String(roundsCount));
  
  const [winners, setWinners] = useState([]);
  const [mysteryPrize, setMysteryPrize] = useState(null);
  const [wonSpecialWedges, setWonSpecialWedges] = useState([]);
  
  // --- REFS ---
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
  
  // --- REFS FOR CANVASES ---
  const canvasRef = useRef(null);
  const zoomCanvasRef = useRef(null);
  const bonusSpinnerRef = useRef(null);

  // --- CUSTOM HOOKS ---
  const sfx = useSfx();
  const imagesLoaded = useImagePreloader();

  // --- GAME STATS ---
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

  // --- DERIVED STATE & MEMOS ---
  const isSolved = () => board.every((b) => b.shown);
  const allVowelsGuessed = Array.from(VOWELS).every((vowel) => letters.has(vowel));
  const canSpin = !spinning && !awaitingConsonant && !isSolved() && !bonusRound && !isRevealingLetters;
  const canBuyVowel = (teams[active]?.round ?? 0) >= VOWEL_COST && !spinning && !isSolved() && hasSpun && !allVowelsGuessed && !bonusRound && !isRevealingLetters;
  const canSolve = ( (!spinning || showMysterySpinner) && hasSpun && !isSolved() && !bonusRound && !isRevealingLetters );

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
        toks.push({ type: "space" }); i++; continue;
      }
      const cells = [];
      while (i < board.length && board[i].ch !== " ") {
        cells.push(board[i]); i++;
      }
      toks.push({ type: "word", cells });
    }
    return toks;
  }, [board]);
  
  // --- GAME LOGIC FUNCTIONS ---
  
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
      const baseFontSize = r * 0.12;
      ctx.font = `bold ${baseFontSize}px Impact, Arial Black, sans-serif`;
      const textRadius = r * 0.6;
      ctx.fillText(label, textRadius, 0);
      ctx.restore();
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
      ctx.save();
      ctx.rotate(startAngle + sectionAngle / 2);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px Arial Black, Impact, sans-serif';
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
  
  function angleForWedgeIndex(idx) {
    const two = Math.PI * 2;
    const totalSize = currentWedges.reduce((sum, w) => sum + (w.size || 1), 0) || 1;
    const baseArc = two / totalSize;
    let accumulated = 0;
    for (let i = 0; i < idx; i++) {
      accumulated += (currentWedges[i].size || 1) * baseArc;
    }
    const wedgeArc = (currentWedges[idx]?.size || 1) * baseArc;
    const mid = accumulated + wedgeArc / 2;
    const pointerAngle = (3 * Math.PI) / 2 % two;
    return (two - mid + pointerAngle) % two;
  }

  const startCharge = async () => {
    if (isRevealingLetters || finishingRef.current || !canSpin || isCharging) return;
    setIsCharging(true);
    isChargingRef.current = true;
    setSnapChargeToZero(true);
    setSpinPower(0);
    chargeSnapshotRef.current = 0;
    chargeDirRef.current = 1;
    try { await sfx.unlock(); } catch (e) {}
    try { await sfx.loop("chargeUp"); } catch (e) {}
    requestAnimationFrame(() => {
      setSnapChargeToZero(false);
      if (chargeIntervalRef.current) clearInterval(chargeIntervalRef.current);
      chargeIntervalRef.current = setInterval(() => {
        setSpinPower((prev) => {
          let next = prev + 5.7 * chargeDirRef.current;
          if (next >= 100) { next = 100; chargeDirRef.current = -1; }
          else if (next <= 0) { next = 0; chargeDirRef.current = 1; }
          chargeSnapshotRef.current = next;
          return next;
        });
      }, 16);
    });
  };

  const endCharge = () => {
    if (chargeIntervalRef.current) {
      clearInterval(chargeIntervalRef.current);
      chargeIntervalRef.current = null;
    }
    const wasCharging = isChargingRef.current;
    isChargingRef.current = false;
    try { sfx.stopLoop("chargeUp"); } catch (e) {}
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
    if (finishingRef.current || isRevealingLetters || spinning || awaitingConsonant || isSolved() || bonusRound) return;
    setLanded(null);
    setHasSpun(true);
    setSpinning(true);
    setZoomed(true);
    try { sfx.play("spin"); } catch (e) {}
    setGameStats((prev) => ({ ...prev, totalSpins: prev.totalSpins + 1 }));
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
          try { sfx.stop("spin"); } catch (e) {}
          const i = wedgeIndexForAngle(a);
          const w = currentWedges[i] || currentWedges[0];
          setLanded(w);
          handleLanding(w);
          setTimeout(() => { setSpinning(false); setZoomed(false); }, 2500);
        }
      };
      requestAnimationFrame(tick);
    });
  }

  function handleLanding(w) {
    if (!w) { landedOwnerRef.current = null; passTurn(); return; }
    landedOwnerRef.current = active;
    
    if (w.t === "wild") {
      try { sfx.play("wild"); } catch {}
      let currentPrize = 0;
      let spinCount = 0;
      const maxSpins = 20 + Math.floor(Math.random() * 10);
      setShowMysterySpinner(true);
      if (mysterySpinRef.current) clearInterval(mysterySpinRef.current);
      mysterySpinRef.current = setInterval(() => {
        setMysteryPrize(BONUS_PRIZES[currentPrize]);
        currentPrize = (currentPrize + 1) % BONUS_PRIZES.length;
        spinCount++;
        if (spinCount >= maxSpins) {
          clearInterval(mysterySpinRef.current);
          const finalPrize = BONUS_PRIZES[Math.floor(Math.random() * BONUS_PRIZES.length)];
          setMysteryPrize(finalPrize);
          setLanded({ t: "prize", label: finalPrize, prize: { type: String(finalPrize).toLowerCase(), label: finalPrize, color: "#E6007E" }, });
          setTimeout(() => { setShowMysterySpinner(false); setAwaitingConsonant(true); }, 900);
        }
      }, 100);
    } else if (w.t === "cash" || w.t === "prize" || w.t === "tshirt") {
      try { sfx.play(w.t === "tshirt" ? "tshirt" : "cashDing2"); } catch (e) {}
      setAwaitingConsonant(true);
    } else if (w.t === "bankrupt") {
      landedOwnerRef.current = null;
      setGameStats((prev) => ({ ...prev, bankrupts: prev.bankrupts + 1 }));
      setTeams((ts) => ts.map((t, i) => (i === active ? { ...t, round: 0, holding: [] } : t)));
      try { sfx.play("bankrupt"); } catch (e) {}
      passTurn();
    } else if (w.t === "lose") {
      landedOwnerRef.current = null;
      setGameStats((prev) => ({ ...prev, loseTurns: prev.loseTurns + 1 }));
      try { sfx.play("buzzer"); } catch (e) {}
      passTurn();
    }
  }

  function guessLetter(ch) {
    if (isRevealingLetters || !awaitingConsonant || VOWELS.has(ch) || letters.has(ch)) return;
    setLetters((S) => new Set(S).add(ch));
    const hitIndices = board.reduce((acc, cell, index) => (cell.ch === ch ? [...acc, index] : acc), []);
    if (hitIndices.length > 0) {
      setIsRevealingLetters(true);
      setGameStats((prev) => ({ ...prev, correctGuesses: prev.correctGuesses + 1 }));
      const w = landed || { t: "cash", v: 0 };
      const wedgeValue = (w.t === "cash" && typeof w.v === "number") ? w.v : 0;
      setTeams((ts) => ts.map((t, i) => (i === active ? { ...t, round: t.round + wedgeValue * hitIndices.length } : t)));
      
      const pushHolding = (label) => {
        setTeams((prev) => prev.map((t, i) => (i !== active) ? t : { ...t, holding: [...(t.holding || []), String(label).toUpperCase()] }));
      };
      if (landed?.t === "tshirt") pushHolding("T-SHIRT");
      else if (landed?.t === "prize" && landed.prize?.label) pushHolding(landed.prize.label);
      
      hitIndices.forEach((boardIndex, i) => {
        setTimeout(() => {
          try { sfx.play("ding"); } catch (e) {}
          setBoard((b) => b.map((cell, idx) => (idx === boardIndex ? { ...cell, shown: true } : cell)));
        }, i * 750);
      });
      if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);
      revealTimeoutRef.current = setTimeout(() => setIsRevealingLetters(false), hitIndices.length * 750 + 50);
      setAwaitingConsonant(false);
    } else {
      setGameStats((prev) => ({ ...prev, incorrectGuesses: prev.incorrectGuesses + 1 }));
      try { sfx.play("wrongLetter"); } catch (e) {}
      setAwaitingConsonant(false);
      passTurn();
    }
  }

  function handleBuyVowel(ch) {
    if (isRevealingLetters || !ch || !VOWELS.has(ch) || letters.has(ch)) return;
    setShowVowelModal(false);
    if ((teams[active]?.round ?? 0) < VOWEL_COST) { try { sfx.play("buzzer"); } catch (e) {}; return; }
    setGameStats((prev) => ({ ...prev, vowelsBought: prev.vowelsBought + 1 }));
    setLetters((S) => new Set(S).add(ch));
    setTeams((ts) => ts.map((t, i) => (i === active ? { ...t, round: t.round - VOWEL_COST } : t)));
    const hitIndices = board.reduce((acc, cell, index) => (cell.ch === ch ? [...acc, index] : acc), []);
    if (hitIndices.length > 0) {
      setIsRevealingLetters(true);
      setGameStats((prev) => ({ ...prev, correctGuesses: prev.correctGuesses + 1 }));
      hitIndices.forEach((boardIndex, i) => {
        setTimeout(() => {
          try { sfx.play("ding"); } catch (e) {}
          setBoard((b) => b.map((cell, idx) => (idx === boardIndex ? { ...cell, shown: true } : cell)));
        }, i * 750);
      });
      if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);
      revealTimeoutRef.current = setTimeout(() => setIsRevealingLetters(false), hitIndices.length * 750 + 50);
    } else {
      setGameStats((prev) => ({ ...prev, incorrectGuesses: prev.incorrectGuesses + 1 }));
      try { sfx.play("wrongLetter"); } catch (e) {}
    }
  }

  function handleSolve() {
    setShowSolveModal(false);
    if (isRevealingLetters || !solveGuess) return;
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
    if (!solved || finishingRef.current) return;
    finishingRef.current = true;
    setIsRevealingLetters(true);
    setGameStats((prev) => ({ ...prev, puzzlesSolved: (prev.puzzlesSolved || 0) + 1 }));

    let resolvedLanded = lastWedge || landed;
    if (mysterySpinRef.current) clearInterval(mysterySpinRef.current);
    if (showMysterySpinner) {
      const finalPrize = mysteryPrize || BONUS_PRIZES[Math.floor(Math.random() * BONUS_PRIZES.length)];
      setMysteryPrize(finalPrize);
      setShowMysterySpinner(false);
      resolvedLanded = { t: "prize", label: finalPrize, prize: { type: String(finalPrize).toLowerCase(), label: finalPrize, color: "#E6007E" } };
      setLanded(resolvedLanded);
    }

    setTeams((prevTs) => {
      const updated = prevTs.map((t, i) => {
        if (i !== active) return { ...t, round: 0, holding: [] };
        const updatedTeam = { ...t, total: t.total + t.round + SOLVE_BONUS, round: 0 };
        const holdingArr = Array.isArray(t.holding) ? t.holding : (t.holding ? [t.holding] : []);
        if (holdingArr.length > 0) {
          updatedTeam.prizes = [...(updatedTeam.prizes || []), ...holdingArr.map(h => String(h).toUpperCase())];
        }
        if (resolvedLanded?.t === "prize" && resolvedLanded.prize?.label && landedOwnerRef.current === active) {
            const prizeLabel = String(resolvedLanded.prize.label).toUpperCase();
            if (!(updatedTeam.prizes || []).includes(prizeLabel)) updatedTeam.prizes.push(prizeLabel);
        }
        updatedTeam.holding = [];
        return updatedTeam;
      });
      const max = updated.length ? Math.max(...updated.map((t) => t.total)) : -Infinity;
      const winnerNames = updated.filter((t) => t.total === max).map((t) => t.name);
      winnersRef.current = winnerNames;
      setWinners(winnerNames);
      setRoundWinner(winnerNames[0]);
      return updated;
    });

    const hideIndices = board.map((c, i) => ({ ...c, i })).filter(c => isLetter(c.ch) && !c.shown).map(c => c.i);
    const revealTime = hideIndices.length * SOLVE_REVEAL_INTERVAL;
    
    hideIndices.forEach((boardIndex, i) => {
      setTimeout(() => {
        try { sfx.play("ding"); } catch (e) {}
        setBoard((b) => b.map((cell, idx) => (idx === boardIndex ? { ...cell, shown: true } : cell)));
      }, i * SOLVE_REVEAL_INTERVAL);
    });

    if (winShowTimeoutRef.current) clearTimeout(winShowTimeoutRef.current);
    winShowTimeoutRef.current = setTimeout(() => {
      setShowWinScreen(true);
      try { sfx.play("solve"); } catch (e) {}
      if (winHideTimeoutRef.current) clearTimeout(winHideTimeoutRef.current);
      winHideTimeoutRef.current = setTimeout(() => {
        setShowWinScreen(false);
        nextPuzzle();
      }, 10000);
    }, revealTime + 300);
  }

  const passTurn = () => {
    if (!teams || teams.length === 0) return;
    setActive((a) => nextIdx(a, teams.length));
    setAwaitingConsonant(false);
  };

  function nextPuzzle() {
    finishingRef.current = false;
    setIsRevealingLetters(false);
    setWonSpecialWedges([]);
    setMysteryPrize(null);
    landedOwnerRef.current = null;
    const next = idx + 1;

    if (next >= selectedPuzzles.length) {
      setPhase("bonus");
      const randomBonusIndex = bonusPuzzles.length ? Math.floor(Math.random() * bonusPuzzles.length) : 0;
      const bonusPuzzle = bonusPuzzles[randomBonusIndex] || FALLBACK[0];
      setBoard(normalizeAnswer(bonusPuzzle.answer));
      setCategory(bonusPuzzle.category || "PHRASE");
      setBonusRound(true);
      if (winners.length > 1) {
        setShowBonusSelector(true);
      }
      return;
    }
    setIdx(next);
    const p = selectedPuzzles[next] || FALLBACK[0];
    setBoard(normalizeAnswer(p.answer));
    setCategory(p.category || "PHRASE");
    setLetters(new Set());
    setLanded(null);
    setAwaitingConsonant(false);
    setActive((a) => nextIdx(a, teams.length));
    setTeams((ts) => ts.map((t) => ({ ...t, round: 0, holding: [] })));
    setAngle(0);
    setHasSpun(false);
  }

  function restartAll() {
    // ... Reset all state variables to initial values
  }

  function backToSetup() {
    // ... Reset state for returning to setup screen
    setPhase("setup");
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }
  
  // Bonus Round Functions
  function spinBonusWheel() { /* ... */ }
  function handleBonusLetter(letter) { /* ... */ }
  // ... etc
  
  // --- EFFECTS ---
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
      if (phase === "bonus" && bonusSpinnerRef.current && !bonusPrize) {
        drawBonusWheel();
      }
  }, [angle, wheelPx, phase, isFullscreen, isCharging, spinPower, zoomed, currentWedges, bonusSpinnerAngle, bonusPrize]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (isRevealingLetters || phase !== "play" || showVowelModal || showSolveModal || showWinScreen) return;
      const k = (e.key || "").toLowerCase();
      if (k === "v" && canBuyVowel) setShowVowelModal(true);
      if (k === "enter" && canSolve) setShowSolveModal(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, canBuyVowel, canSolve, showVowelModal, showSolveModal, showWinScreen, isRevealingLetters]);

  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === "Escape") { /* ... close all modals ... */ }
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);
  
  useEffect(() => {
    if (phase === "play" && hasSpun && board.length > 0 && isSolved() && !finishingRef.current) {
      setTimeout(() => { if (!finishingRef.current) finishPuzzle(true, landed); }, 750);
    }
  }, [board, phase, hasSpun, landed]);

  useEffect(() => {
    if (!showWinScreen) return;
    const onSkipKey = (e) => {
      if (e.key === "Enter" || e.key === " " || e.code === "Space") {
        if (winHideTimeoutRef.current) clearTimeout(winHideTimeoutRef.current);
        setShowWinScreen(false);
        nextPuzzle();
      }
    };
    window.addEventListener("keydown", onSkipKey);
    return () => window.removeEventListener("keydown", onSkipKey);
  }, [showWinScreen, sfx]);

  // --- RENDER LOGIC ---

  const startGameFromSetup = async () => {
    try { await sfx.unlock(); } catch (e) {}
    try { sfx.play("startGame"); } catch (e) {}
    applyTempTeamCount();
    applyTempRoundsCount();
    
    const finalTeamCount = parseIntSafe(tempTeamCount) || teamCount;
    const finalRounds = parseIntSafe(tempRoundsCount) || roundsCount;

    const names = makeTeamNamesArray(finalTeamCount, teamNames);
    setTeams(names.map((name) => ({ name, total: 0, round: 0, prizes: [], holding: [] })));
    setTeamNames(names);
    
    const count = Math.max(1, Math.min(finalRounds, puzzles.length || FALLBACK.length));
    const chosen = selectRandomPuzzles(puzzles.length ? puzzles : FALLBACK, count);
    setSelectedPuzzles(chosen);
    setIdx(0);
    const first = chosen[0] || FALLBACK[0];
    setBoard(normalizeAnswer(first.answer));
    setCategory(first.category || "PHRASE");
    
    setPhase("play");
  };

  if (phase === "setup") {
    return (
      <div className={cls("min-h-screen h-screen text-white flex items-center justify-center p-4 sm:p-6", GRADIENT)}>
        <PersistentHeader sfx={sfx} phase={phase} isFullscreen={isFullscreen} toggleFullscreen={toggleFullscreen} />
        <SetupPanel
          sfx={sfx} imagesLoaded={imagesLoaded} tempTeamCount={tempTeamCount} setTempTeamCount={setTempTeamCount}
          applyTempTeamCount={applyTempTeamCount} tempRoundsCount={tempRoundsCount} setTempRoundsCount={setTempRoundsCount}
          applyTempRoundsCount={applyTempRoundsCount} teamNames={teamNames} setTeamNames={setTeamNames}
          teamCount={teamCount} startGameFromSetup={startGameFromSetup} VOWEL_COST={VOWEL_COST}
        />
      </div>
    );
  }

  // Other phases (bonus, done) would go here...

  return (
    <div className={cls("min-h-screen h-screen text-white flex flex-col items-center p-4", zoomed ? "overflow-hidden" : "overflow-auto", GRADIENT)}>
      <PersistentHeader
        sfx={sfx} phase={phase} backToSetup={backToSetup} toggleFullscreen={toggleFullscreen} isFullscreen={isFullscreen}
        zoomed={zoomed} spinning={spinning} showSolveModal={showSolveModal} showWinScreen={showWinScreen}
        awaitingConsonant={awaitingConsonant}
      />
      <div className={cls("w-full h-full flex flex-col", (zoomed || showWinScreen) && "invisible", (isRevealingLetters || finishingRef.current) && "pointer-events-none select-none")}>
        <main className="w-full max-w-7xl mx-auto flex-1 flex flex-col lg:flex-row items-center lg:items-center gap-4 min-h-0">
          <div className="flex flex-col items-center justify-around gap-4 w-full lg:w-1/2 h-full py-4 relative">
            <div className="relative flex items-center justify-center">
              <canvas ref={canvasRef} style={{ width: `${wheelPx}px`, height: `${wheelPx}px`, display: "block" }} />
              <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full bg-no-repeat pointer-events-none" style={{ width: "20%", height: "20%", backgroundImage: "url(/images/hub-image.png)", backgroundSize: "110%", backgroundPosition: "10% -30px" }} aria-hidden="true" />
            </div>
            <div className="flex justify-center flex-wrap gap-4 items-center">
              <button onMouseDown={startCharge} onMouseUp={endCharge} onMouseLeave={endCharge} onTouchStart={startCharge} onTouchEnd={endCharge} disabled={!canSpin}
                className={cls("rounded-xl font-bold text-xl px-8 py-4", !canSpin ? "bg-gray-700/60 text-gray-400 cursor-not-allowed" : "text-white")}
              >
                SPIN (Hold)
              </button>
              <button onClick={() => setShowVowelModal(true)} disabled={!canBuyVowel} className={cls("px-6 py-3 rounded-xl font-bold text-lg", !canBuyVowel ? "bg-gray-700/60 text-gray-400 cursor-not-allowed" : "bg-blue-500 text-white")}>
                BUY VOWEL (${VOWEL_COST})
              </button>
              <button onClick={() => setShowSolveModal(true)} disabled={!canSolve} className={cls("px-6 py-3 rounded-xl font-bold text-lg", !canSolve ? "bg-gray-700/60 text-gray-400 cursor-not-allowed" : "bg-purple-500 text-white")}>
                SOLVE
              </button>
            </div>
            <div className="w-full max-w-2xl p-2">
              <div className="flex flex-wrap justify-center gap-3">
                {LETTERS.map((L) => (
                  <button key={L} onClick={() => guessLetter(L)} disabled={isRevealingLetters || letters.has(L) || VOWELS.has(L) || !awaitingConsonant}
                    className={cls("rounded-md font-extrabold flex items-center justify-center w-12 h-12 text-xl", (isRevealingLetters || letters.has(L) || VOWELS.has(L) || !awaitingConsonant) ? "bg-gray-700/50 text-gray-400 cursor-not-allowed" : "bg-white/10 hover:bg-white/20")}
                  >
                    {L}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-4 w-full lg:w-1/2 h-full justify-center">
            <h2 className="text-2xl font-bold tracking-widest uppercase text-center">{category}</h2>
            <div className="flex flex-wrap justify-center gap-2 p-4 rounded-xl backdrop-blur-md bg-white/10 w-full">
              {wordTokens.map((tok, i) => tok.type === "space" ? <div key={i} className="w-4 h-10 sm:h-14" /> : (
                <div key={i} className="flex gap-2">
                  {tok.cells.map((cell, j) => (
                    <div key={`${i}-${j}`} className={cls("w-8 h-12 sm:w-10 sm:h-16 text-2xl sm:text-3xl font-bold flex items-center justify-center rounded-md", cell.shown ? "bg-yellow-300 text-black" : "bg-blue-950/80", !isLetter(cell.ch) && "bg-transparent")}>
                      {isLetter(cell.ch) ? (cell.shown ? cell.ch : "") : cell.ch}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="w-full overflow-y-auto" style={{ maxHeight: "min(48vh, calc(100vh - 360px))" }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
                {teams.map((t, i) => <TeamCard key={i} t={t} i={i} active={active} phase={phase} />)}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Modals & Overlays */}
      <div className={cls("fixed inset-0 z-50 flex items-center justify-center", !zoomed && "hidden pointer-events-none")}>
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative">
          <canvas ref={zoomCanvasRef} style={{ width: `${wheelPx}px`, height: `${wheelPx}px` }} />
          {landed && (
            <div className="absolute inset-0 flex items-center justify-center text-8xl font-black uppercase text-white [text-shadow:0_4px_8px_rgba(0,0,0,0.8)]">
              {landed.t === "cash" ? `$${landed.v}` : landed.label}
            </div>
          )}
        </div>
      </div>

      {showVowelModal && <VowelModal {...{ handleBuyVowel, letters, isRevealingLetters, setShowVowelModal }} />}
      {showSolveModal && <SolveModal {...{ solveGuess, setSolveGuess, handleSolve, setShowSolveModal }} />}
      {showMysterySpinner && <MysterySpinnerModal mysteryPrize={mysteryPrize} />}
      {showStats && <StatsModal {...{ setShowStats, gameStats, teams }} />}
      {showWinScreen && <WinScreen winner={roundWinner || "Winner"} onClose={() => { setShowWinScreen(false); nextPuzzle(); }} />}
      <ConfettiCanvas trigger={showWinScreen || bonusResult === 'win'} />
    </div>
  );
}