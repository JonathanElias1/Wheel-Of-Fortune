import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Wheel of Jon-Tune — host-driven party version (JSX)
 * 
 * Keys (when playing):
 * S → Spin (or click center of wheel)
 * V → Buy vowel
 * Enter → Solve (only after first spin)
 * F → Fullscreen
 */

const GRADIENT = "bg-[radial-gradient(110%_110%_at_0%_0%,#5b7fff_0%,#21bd84_100%)]";
const BASE_WHEEL_PX = 500;

// Modified WEDGES array with size property for the T-shirt wedge
const WEDGES = [
  { t: "cash", v: 2500, c: "#00AADD" },
  { t: "wild", label: "MYSTERY", c: "#E6007E" },
  { t: "cash", v: 600, c: "#E23759" },
  { t: "cash", v: 700, c: "#D15C22" },
  { t: "lose", label: "LOSE A TURN", c: "#B1A99E" },
  { t: "cash", v: 650, c: "#EDD302" },
  { t: "bankrupt", label: "BANKRUPT", c: "#222222" },
  { t: "tshirt", label: "T-SHIRT", c: "#c386f8", v: 0, prize: {type: "tshirt", label: "T-SHIRT", color: "#c386f8"}, size: 0.4 }, // Small size
  { t: "bankrupt", label: "BANKRUPT", c: "#222222" },
  { t: "cash", v: 600, c: "#E23759" },
  { t: "cash", v: 950, c: "#D15C22" },
  { t: "cash", v: 500, c: "#8C4399" },
  { t: "cash", v: 900, c: "#C9237B" },
  { t: "bankrupt", label: "BANKRUPT", c: "#222222" },
  { t: "cash", v: 600, c: "#00AADD" },
  { t: "cash", v: 550, c: "#95C85A" },
  { t: "cash", v: 700, c: "#6F2597" },
  { t: "lose", label: "LOSE A TURN", c: "#B1A99E" },
  { t: "cash", v: 800, c: "#E23759" },
  { t: "cash", v: 500, c: "#C9237B" },
  { t: "cash", v: 650, c: "#8C4399" },
  { t: "cash", v: 900, c: "#D15C22" },
  { t: "bankrupt", label: "BANKRUPT", c: "#222222" },
  { t: "cash", v: 900, c: "#4F9F4F" },
];

const VOWELS = new Set(["A", "E", "I", "O", "U"]);
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const ZOOM_WHEEL_PX = BASE_WHEEL_PX * 1.5;

// -------------------- Sounds
function useSfx() {
  const ref = useRef({});
  const [volume, setVolume] = useState(0.9);

  useEffect(() => {
    const base = "/";
    const load = (k, file, customVolume) => {
      const a = new Audio(base + file);
      a.preload = "auto";
      a.volume = customVolume || volume;
      ref.current[k] = a;
    };

    load("spin", "wof-spin.mp3", 1.0); // Increased volume for spin
    load("ding", "wof-correct.mp3");
    load("buzzer", "wof-buzzer.mp3");
    load("themeOpen", "wof-theme-open.mp3");
    load("themeLoop", "wheel-theme.mp3");
    load("bankrupt", "wof-bankrupt.mp3");
    load("solve", "wof-solve.mp3");
    load("wild", "wof-wild.mp3");
    load("cashDing", "wof-ding.mp3");
     load("cashDing2", "cash-ding.mp3");
    load("tshirt", "tshirt-sound.mp3");
    load("wrongLetter", "wrong-letter.mp3");
    load("chargeUp", "charge-up.mp3"); // charge-up loop
  }, []);

  useEffect(() => {
    Object.entries(ref.current).forEach(([key, a]) => {
      if (a && key !== 'spin') { // Keep spin at higher fixed volume
        a.volume = volume;
      }
    });
  }, [volume]);

  const play = (k) => {
    const a = ref.current[k];
    if (!a) return;
    try {
      a.currentTime = 0;
      const p = a.play();
      if (p !== undefined) p.catch(e => console.error(`Failed to play sound: ${k}`, e));
    } catch (e) {
      console.error(`Failed to play sound: ${k}`, e);
    }
  };

  const stop = (k) => {
    const a = ref.current[k];
    if (!a) return;
    a.pause();
    a.currentTime = 0;
  };

  const loop = (k) => {
    const a = ref.current[k];
    if (!a) return;
    a.loop = true;
    try {
      a.currentTime = 0;
      a.play();
    } catch (e) {
      console.error(`Failed to loop sound: ${k}`, e);
    }
  };

  const stopLoop = (k) => {
    const a = ref.current[k];
    if (!a) return;
    a.loop = false;
    a.pause();
    a.currentTime = 0;
  };

  const [themeOn, setThemeOn] = useState(false);

  const toggleTheme = async () => {
    const intro = ref.current.themeOpen;
    const loopTrack = ref.current.themeLoop;
    if (!intro || !loopTrack) return;

    const handleIntroEnd = () => {
      loopTrack.currentTime = 0;
      loopTrack.loop = true;
      loopTrack.play().catch(e => console.error("Loop music failed to play.", e));
    };

    intro.removeEventListener('ended', handleIntroEnd);

    if (!themeOn) {
      try {
        intro.addEventListener('ended', handleIntroEnd);
        intro.currentTime = 0;
        await intro.play();
        setThemeOn(true);
      } catch (e) {
        console.error("Theme music failed to play.", e);
        alert("Error: Could not play music. Check the browser console for details.");
      }
    } else {
      intro.pause();
      intro.currentTime = 0;
      loopTrack.pause();
      loopTrack.currentTime = 0;
      intro.removeEventListener('ended', handleIntroEnd);
      setThemeOn(false);
    }
  };

  return { play, stop, loop, stopLoop, volume, setVolume, themeOn, toggleTheme };
}

// -------------------- Puzzles
const FALLBACK = [  
    { category: "CELEBRATION", answer: "HAPPY BIRTHDAY JON" },
    { category: "CLASSIC PHRASE", answer: "JON SAVES" },
    { category: "RELIGION", answer: "JONELUJAH" },
     { category: "POLITICS", answer: "JONTRARIAN" },
    { category: "MOVIE QUOTE", answer: "LOOK THE PROBLEM IS OVER" },
    { category: "THING", answer: "SONY CAMERA" },
  
];

async function loadPuzzles() {
  try {
    const res = await fetch("/wof.json", { cache: "no-store" });
    if (!res.ok) throw new Error("http");
    const js = await res.json();
    const arr = Array.isArray(js?.puzzles) ? js.puzzles : js;
    return arr.length ? arr : FALLBACK;
  } catch {
    return FALLBACK;
  }
}

// -------------------- Helpers
const cls = (...xs) => xs.filter(Boolean).join(" ");
const isLetter = (ch) => /^[A-Z]$/.test(ch);

function normalizeAnswer(raw) {
  const chars = raw.toUpperCase().split("");
  return chars.map((ch) => ({ ch, shown: !isLetter(ch) }));
}

function nextIdx(i, len) {
  return (i + 1) % len;
}

// ==================== Main Component
export default function App() {
  const [phase, setPhase] = useState("setup");
  const [teamCount, setTeamCount] = useState(3);
  const [teamNames, setTeamNames] = useState(["Team A", "Team B", "Team C", "Team D"]);
  const [puzzles, setPuzzles] = useState(FALLBACK);
  const [idx, setIdx] = useState(0);
  const [letters, setLetters] = useState(() => new Set());
  const [board, setBoard] = useState(() => normalizeAnswer(FALLBACK[0].answer));
  const [category, setCategory] = useState(FALLBACK[0].category || "PHRASE");

  const [teams, setTeams] = useState([
    { name: "Team A", total: 0, round: 0, prizes: [] },
    { name: "Team B", total: 0, round: 0, prizes: [] },
    { name: "Team C", total: 0, round: 0, prizes: [] },
  ]);
  const [active, setActive] = useState(0);
  const [currentWedges, setCurrentWedges] = useState([...WEDGES]); // Track current wheel state

  // wheel state
  const [spinning, setSpinning] = useState(false);
  const [angle, setAngle] = useState(0);
  const [landed, setLanded] = useState(null);
  const [awaitingConsonant, setAwaitingConsonant] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const [spinPower, setSpinPower] = useState(0);
  const [isCharging, setIsCharging] = useState(false);
  const chargeRef = useRef(null);
  const [tshirtHolder, setTshirtHolder] = useState(null);
  const [mysteryPrize, setMysteryPrize] = useState(null);
  const [showMysterySpinner, setShowMysterySpinner] = useState(false);
  const [wonSpecialWedges, setWonSpecialWedges] = useState([]); // Track which special wedges were won this round

  // screen state
  const [zoomed, setZoomed] = useState(false);
  const [wheelPx, setWheelPx] = useState(BASE_WHEEL_PX);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWinScreen, setShowWinScreen] = useState(false);
  const [roundWinner, setRoundWinner] = useState(null);

  // Vowel/Solve modals
  const [showVowelModal, setShowVowelModal] = useState(false);
  const [showSolveModal, setShowSolveModal] = useState(false);
  const [solveGuess, setSolveGuess] = useState("");

  // end screen
  const [winners, setWinners] = useState([]);

  // sfx
  const sfx = useSfx();

  // load puzzles
  useEffect(() => {
    loadPuzzles().then((arr) => {
      setPuzzles(arr);
      setIdx(0);
      const p = arr[0] || FALLBACK[0];
      setBoard(normalizeAnswer(p.answer));
      setCategory(p.category || "PHRASE");
    });
  }, []);

  // wheel canvas
  const canvasRef = useRef(null);

  // Fullscreen listener
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  // Adjust wheel size for screen state
  useEffect(() => {
    const currentSize = zoomed ? ZOOM_WHEEL_PX : BASE_WHEEL_PX;
    const newSize = isFullscreen ? currentSize * 1.4 : currentSize;
    setWheelPx(newSize);
  }, [phase, isFullscreen, zoomed]);

  // keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (phase !== "play" || showVowelModal || showSolveModal || showWinScreen) return;

      const k = e.key.toLowerCase();
      if (k === "f") toggleFullscreen();
      if (k === "s") onSpin(50);
      if (k === "v" && canBuyVowel) setShowVowelModal(true);
      if (k === "enter" && canSolve) setShowSolveModal(true);

      const ch = e.key.toUpperCase();
      if (isLetter(ch) && !VOWELS.has(ch) && awaitingConsonant) {
        guessLetter(ch);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, awaitingConsonant, spinning, letters, hasSpun, showVowelModal, showSolveModal, showWinScreen]);

  // Repaint the wheel
  useEffect(() => {
    requestAnimationFrame(() => drawWheel(angle));
  }, [angle, wheelPx, phase, isFullscreen, isCharging, spinPower, zoomed, currentWedges]);

  // Auto-solve when board is full
  useEffect(() => {
    if (phase === 'play' && hasSpun && board.length > 0 && board.every(b => b.shown)) {
      setTimeout(() => {
        finishPuzzle(true, landed);
      }, 750);
    }
  }, [board]);

  // ---------- Setup
  function startGame() {
    const n = Math.min(8, Math.max(2, teamCount));
    const names = teamNames.slice(0, n).map((x, i) => x || `Team ${String.fromCharCode(65 + i)}`);
    setTeams(names.map((name) => ({ name, total: 0, round: 0, prizes: [] })));
    setActive(0);
    setAngle(0);
    setHasSpun(false);
    setPhase("play");
    setZoomed(false);
    setTshirtHolder(null);
  }

  // ---------- Wheel drawing with variable wedge sizes
  function drawWheel(rot = 0) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const W = wheelPx;
    const H = wheelPx;

    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px}`;

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const cx = W / 2;
    const cy = H / 2;
    const pHeight = 40;
    const pWidth = 30;
    const r = (W / 2) - pHeight - 5;

    // Calculate total arc space accounting for different sized wedges
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

      const label = w.t === "cash" ? `$${w.v}` : (w.label || w.t.toUpperCase().replace('-', ' '));

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
      
      // Adjust font size for small wedges
      if (w.size && w.size < 1) {
        fontSize = baseFontSize * (0.3 + w.size * 0.3); // Much smaller font for small wedges
      } else if (w.t === "lose" || w.t === "bankrupt") {
        fontSize = baseFontSize * 0.8;
      } else if (w.t === "wild" || w.v === 2500 || w.v === 950) {
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

      // Draw prize token on top of the wedge if it exists
      if (w.prize) {
        ctx.save();
        ctx.rotate(mid);
        const prizeWidth = r * 0.8 * (w.size || 1); // Scale prize token with wedge size
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

      // Draw the dividing line
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a0) * r, Math.sin(a0) * r);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#fff";
      ctx.stroke();

      currentAngle = a1;
    }

    ctx.restore();

    // Draw wheel border
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#333";
    ctx.stroke();
    ctx.restore();

    // Draw pointer
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

  function wedgeIndexForAngle(a) {
    const two = Math.PI * 2;
    const normalizedAngle = ((a % two) + two) % two;

    // The pointer is at the top of the wheel (at -π/2 or 3π/2)
    const pointerAngle = (3 * Math.PI / 2) % two;
    
    // Calculate which part of the wheel is at the pointer after rotation
    const wheelPositionAtPointer = (two - normalizedAngle + pointerAngle) % two;

    const totalSize = currentWedges.reduce((sum, w) => sum + (w.size || 1), 0);
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

    if (Math.abs(wheelPositionAtPointer - two) < 0.001) {
      return currentWedges.length - 1;
    }

    return 0;
  }

  const startCharge = () => {
    if (!canSpin) return;
    setIsCharging(true);
    sfx.loop("chargeUp"); // Start charge-up sound
    if (chargeRef.current) clearInterval(chargeRef.current);
    chargeRef.current = setInterval(() => {
      setSpinPower(p => Math.min(p + 1, 100));
    }, 20);
  };

  const endCharge = () => {
    clearInterval(chargeRef.current);
    sfx.stopLoop("chargeUp"); // Stop charge-up sound
    if (isCharging) {
      onSpin(spinPower);
      setSpinPower(0);
      setIsCharging(false);
    }
  };

  function onSpin(power = 10) {
    if (spinning || awaitingConsonant || isSolved()) return;

    setLanded(null);
    setHasSpun(true);
    setSpinning(true);
    setZoomed(true);
    sfx.play("spin");

    const baseTurns = 3;
    const powerTurns = Math.round((power / 100) * 5);
    const randomTurns = Math.floor(Math.random() * 2);
    const extraTurns = baseTurns + powerTurns + randomTurns;
    const duration = 2000 + power * 30;

    const pre = angle - 0.35;
    animateAngle(angle, pre, 180, "inout", () => {
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
          sfx.stop("spin");
          const i = wedgeIndexForAngle(a);
          const w = currentWedges[i];
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

  function animateAngle(from, to, ms, easing = "out", onDone) {
    const start = performance.now();
    const ease = easing === "inout" 
      ? (x) => 0.5 * (1 - Math.cos(Math.PI * Math.min(1, x)))
      : (x) => 1 - Math.pow(1 - Math.min(1, x), 3);

    const step = (t) => {
      const p = Math.min(1, (t - start) / ms);
      const a = from + (to - from) * ease(p);
      setAngle(a);
      if (p < 1) requestAnimationFrame(step);
      else onDone && onDone();
    };
    requestAnimationFrame(step);
  }

  function handleLanding(w) {
    if (w.t === "wild") {
      sfx.play("wild"); // Play sound immediately
      
      // Show mystery spinner
      const prizes = ["PIN", "STICKER", "T-SHIRT", "MAGNET", "KEYCHAIN"];
      let currentPrize = 0;
      let spinCount = 0;
      const maxSpins = 20 + Math.floor(Math.random() * 10);
      
      setShowMysterySpinner(true);
      
      const spinInterval = setInterval(() => {
        setMysteryPrize(prizes[currentPrize]);
        currentPrize = (currentPrize + 1) % prizes.length;
        spinCount++;
        
        if (spinCount >= maxSpins) {
          clearInterval(spinInterval);
          const finalPrize = prizes[Math.floor(Math.random() * prizes.length)];
          setMysteryPrize(finalPrize);
          
          setTimeout(() => {
            setShowMysterySpinner(false);
            setAwaitingConsonant(true);
          }, 1500);
        }
      }, 100);
      
    } else if (w.t === "cash" || w.t === "prize" || w.t === "freeplay") {
      sfx.play("cashDing2");
      setAwaitingConsonant(true);
    } else if (w.t === "tshirt") {
      sfx.play("tshirt");
      setAwaitingConsonant(true);
    } else if (w.t === "bankrupt") {
      if (active === tshirtHolder) {
        setTshirtHolder(null);
      }
      setTeams((ts) => ts.map((t, i) => (i === active ? { ...t, round: 0, prizes: [] } : t)));
      sfx.play("bankrupt");
      passTurn();
    } else if (w.t === "lose") {
      sfx.play("buzzer");
      passTurn();
    }
  }

  function guessLetter(ch) {
    if (!awaitingConsonant) return;
    if (VOWELS.has(ch) || letters.has(ch)) return;

    setLetters((S) => new Set(S).add(ch));
    const hitIndices = board.reduce(
      (acc, cell, index) => (cell.ch === ch ? [...acc, index] : acc),
      []
    );

    if (hitIndices.length > 0) {
      const w = landed || { t: "cash", v: 0 };
      const wedgeValue = (w.t === "cash" || w.t === "prize") ? w.v : 500;

      setTeams((ts) =>
        ts.map((t, i) =>
          i === active
            ? { ...t, round: t.round + wedgeValue * hitIndices.length }
            : t
        )
      );

      hitIndices.forEach((boardIndex, i) => {
        setTimeout(() => {
          sfx.play("ding");
          setBoard(currentBoard =>
            currentBoard.map((cell, idx) =>
              idx === boardIndex ? { ...cell, shown: true } : cell
            )
          );
        }, i * 750);
      });

      setAwaitingConsonant(false);
    } else {
      sfx.play("wrongLetter"); // wrong consonant
      setAwaitingConsonant(false);
      passTurn();
    }
  }

  function handleBuyVowel(ch) {
    setShowVowelModal(false);
    if (!ch || !VOWELS.has(ch) || ch.length !== 1) return;
    if (letters.has(ch)) return;

    setLetters((S) => new Set(S).add(ch));
    setTeams((ts) => ts.map((t, i) => (i === active ? { ...t, round: t.round - 250 } : t)));

    const hitIndices = board.reduce(
      (acc, cell, index) => (cell.ch === ch ? [...acc, index] : acc),
      []
    );

    if (hitIndices.length > 0) {
      hitIndices.forEach((boardIndex, i) => {
        setTimeout(() => {
          sfx.play("ding");
          setBoard(currentBoard =>
            currentBoard.map((cell, idx) =>
              idx === boardIndex ? { ...cell, shown: true } : cell
            )
          );
        }, i * 750);
      });
    } else {
      sfx.play("buzzer"); // wrong vowel (kept as buzzer)
    }
  }

  function handleSolve() {
    setShowSolveModal(false);
    if (!solveGuess) return;

    const answer = board.map((b) => b.ch).join("");
    if (solveGuess.toUpperCase().trim() === answer) {
      finishPuzzle(true, landed);
    } else {
      sfx.play("buzzer");
      passTurn();
    }
    setSolveGuess("");
  }

  const isSolved = () => board.every((b) => b.shown);

  function finishPuzzle(solved, lastWedge) {
    if (solved) {
      setRoundWinner(teams[active].name);
      setShowWinScreen(true);
      
      // Track which special wedges were won this round
      const specialWedgesWon = [];
      
      setTeams(ts => ts.map((t, i) => {
        if (i === active) {
          const updatedTeam = {
            ...t,
            total: t.total + t.round,
            round: 0,
          };
          
          // Add mystery prize if they landed on mystery (only if not already in prizes)
          if (lastWedge?.t === "wild" && mysteryPrize && !updatedTeam.prizes.includes(mysteryPrize)) {
            updatedTeam.prizes.push(mysteryPrize);
            specialWedgesWon.push("mystery");
          }
          
          // Add T-shirt if they landed on T-shirt wedge (only if not already in prizes)
          if (lastWedge?.t === "tshirt" && !updatedTeam.prizes.includes("T-SHIRT")) {
            updatedTeam.prizes.push("T-SHIRT");
            setTshirtHolder(i);
            specialWedgesWon.push("tshirt");
          }
          
          return updatedTeam;
        }
        return { ...t, round: 0 };
      }));
      
      setWonSpecialWedges(specialWedgesWon);
      sfx.play("solve");
    } else {
      setTeams((ts) => ts.map((t) => ({ ...t, round: 0 })));
    }

    setTimeout(() => {
      setShowWinScreen(false);
      setRoundWinner(null);
      nextPuzzle();
    }, solved ? 12000 : 1200);
  }

  function skipWinScreen() {
    setShowWinScreen(false);
    setRoundWinner(null);
    nextPuzzle();
  }

  function passTurn() {
    setActive((a) => nextIdx(a, teams.length));
    setAwaitingConsonant(false);
  }

  function nextPuzzle() {
    // Replace special wedges if they were won in the previous round
    if (wonSpecialWedges.length > 0) {
      setCurrentWedges(prev => {
        const newWedges = [...prev];
        
        wonSpecialWedges.forEach(wedgeType => {
          if (wedgeType === "tshirt") {
            // Replace T-shirt wedge with $500 wedge (full size)
            const tshirtIndex = newWedges.findIndex(w => w.t === "tshirt");
            if (tshirtIndex !== -1) {
              newWedges[tshirtIndex] = { t: "cash", v: 500, c: "#95C85A" };
            }
          } else if (wedgeType === "mystery") {
            // Replace mystery wedge with random $500-$2500 wedge
            const mysteryIndex = newWedges.findIndex(w => w.t === "wild");
            if (mysteryIndex !== -1) {
              const randomValue = Math.floor(Math.random() * 5) * 500 + 500;
              const colors = ["#95C85A", "#8C4399", "#C9237B", "#D15C22", "#E23759"];
              const randomColor = colors[Math.floor(Math.random() * colors.length)];
              newWedges[mysteryIndex] = { t: "cash", v: randomValue, c: randomColor };
            }
          }
        });
        
        return newWedges;
      });
      setWonSpecialWedges([]);
    }
    
    setMysteryPrize(null);
    const next = idx + 1;
    if (next >= puzzles.length) {
      const max = Math.max(...teams.map((t) => t.total));
      setWinners(teams.filter((t) => t.total === max).map((t) => t.name));
      setAwaitingConsonant(false);
      setSpinning(false);
      setPhase("done");
      return;
    }

    setIdx(next);
    const p = puzzles[next] || FALLBACK[0];
    setBoard(normalizeAnswer(p.answer));
    setCategory(p.category || "PHRASE");
    setLetters(new Set());
    setLanded(null);
    setAwaitingConsonant(false);
    setActive((a) => nextIdx(a, teams.length));
    setTeams((ts) => ts.map((t) => ({ ...t, round: 0 })));
    setAngle(0);
    setHasSpun(false);
  }

  function restartAll() {
    setIdx(0);
    const p = puzzles[0] || FALLBACK[0];
    setBoard(normalizeAnswer(p.answer));
    setCategory(p.category || "PHRASE");
    setLetters(new Set());
    setLanded(null);
    setAwaitingConsonant(false);
    setTeams((ts) => ts.map((t) => ({ name: t.name, total: 0, round: 0, prizes: [] })));
    setActive(0);
    setAngle(0);
    setZoomed(false);
    setWheelPx(BASE_WHEEL_PX);
    setPhase("play");
    setWinners([]);
    setHasSpun(false);
    setTshirtHolder(null);
    setMysteryPrize(null);
    setWonSpecialWedges([]);
    setCurrentWedges([...WEDGES]); // Reset to original wedges
  }

  function backToSetup() {
    setPhase("setup");
    setWinners([]);
    setZoomed(false);
    setWheelPx(BASE_WHEEL_PX);
    setHasSpun(false);
    setTeams(teamNames.map((name, i) => ({
      name: name || `Team ${i + 1}`,
      total: 0,
      round: 0,
      prizes: []
    })));
    setIdx(0);
    const p = puzzles[0] || FALLBACK[0];
    setBoard(normalizeAnswer(p.answer));
    setCategory(p.category || "PHRASE");
    setLetters(new Set());
    setLanded(null);
    setAwaitingConsonant(false);
    setActive(0);
    setAngle(0);
    setTshirtHolder(null);
    setMysteryPrize(null);
    setWonSpecialWedges([]);
    setCurrentWedges([...WEDGES]); // Reset to original wedges
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

  const allVowelsGuessed = Array.from(VOWELS).every(vowel => letters.has(vowel));
  const canSpin = !spinning && !awaitingConsonant && !isSolved();
  const canBuyVowel = teams[active]?.round >= 250 && !spinning && !isSolved() && hasSpun && !allVowelsGuessed;
  const canSolve = !spinning && hasSpun && !isSolved();

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

  const TeamCard = ({ t, i }) => (
    <div className={cls("rounded-2xl p-4 sm:p-5 backdrop-blur-md bg-white/10 fullscreen:p-6", i === active && "ring-4 ring-yellow-300")}>
      <div className="flex justify-between items-start">
        <div>
          <div className="text-xs uppercase tracking-widest opacity-90">{t.name}</div>
          <div className="text-xs opacity-70">Total: ${t.total.toLocaleString()}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {tshirtHolder === i && (
            <div className="px-2 py-1 text-xs font-bold bg-purple-500 rounded-md">HOLDING T-SHIRT</div>
          )}
          {t.prizes.map((prize, idx) => (
            <div key={`${prize}-${idx}`} className={cls("px-2 py-1 text-xs font-bold rounded-md", 
              prize === "T-SHIRT" ? "bg-purple-600" :
              prize === "PIN" ? "bg-red-600" :
              prize === "STICKER" ? "bg-blue-600" :
              prize === "MAGNET" ? "bg-gray-600" :
              prize === "KEYCHAIN" ? "bg-orange-600" :
              "bg-green-600"
            )}>{prize}</div>
          ))}
        </div>
      </div>
      <div className="mt-1 text-2xl sm:text-3xl font-black tabular-nums fullscreen:text-4xl">${t.round.toLocaleString()}</div>
    </div>
  );

  const VowelModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-white rounded-xl p-6 w-full max-w-sm text-center">
        <h2 className="text-2xl font-bold mb-4 text-black">Buy a Vowel ($250)</h2>
        <div className="flex justify-center gap-2 flex-wrap">
          {Array.from(VOWELS).map((vowel) => (
            <button
              key={vowel}
              onClick={() => handleBuyVowel(vowel)}
              disabled={letters.has(vowel)}
              className={cls("w-12 h-12 rounded-lg text-lg font-bold", letters.has(vowel) ? "bg-gray-400 text-gray-600" : "bg-blue-500 text-white")}
            >
              {vowel}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowVowelModal(false)}
          className="mt-4 px-4 py-2 rounded-xl bg-gray-200 text-gray-800 font-semibold"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  const SolveModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-white rounded-xl p-6 w-full max-w-md text-center">
        <h2 className="text-2xl font-bold mb-4 text-black">Solve the Puzzle</h2>
        <input
          type="text"
          value={solveGuess}
          onChange={(e) => setSolveGuess(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 text-lg font-semibold text-black mb-4"
          placeholder="Enter your guess"
          autoFocus
        />
        <div className="flex gap-2 justify-center">
          <button onClick={handleSolve} className="px-6 py-3 rounded-xl bg-purple-500 text-white font-bold">
            Submit
          </button>
          <button onClick={() => setShowSolveModal(false)} className="px-6 py-3 rounded-xl bg-gray-200 text-gray-800 font-bold">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  const MysterySpinnerModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-white rounded-xl p-8 w-full max-w-lg text-center">
        <h2 className="text-3xl font-bold mb-6 text-black">MYSTERY PRIZE!</h2>
        <div className="mb-6">
          <div className="relative w-32 h-32 mx-auto bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center animate-spin">
            <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center">
              <div className="text-2xl font-black text-purple-600">
                {mysteryPrize || "?"}
              </div>
            </div>
          </div>
        </div>
        <p className="text-lg text-gray-700">
          {mysteryPrize ? `You could win: ${mysteryPrize}!` : "Spinning for your mystery prize..."}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Solve the puzzle to claim your prize!
        </p>
      </div>
    </div>
  );

  if (phase === "done") {
    const sorted = [...teams].sort((a, b) => b.total - a.total);
    return (
      <div className={cls("min-h-screen h-screen text-white flex flex-col items-center justify-center p-4", GRADIENT)}>
        <div className="max-w-6xl w-full mx-auto p-6 bg-white/10 rounded-2xl backdrop-blur-md">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-6 text-center">Game Over!</h1>
          <div className="text-lg font-semibold mb-3 text-center">
            {winners.length > 1 ? "Winners:" : "Winner:"}{" "}
            <span className="font-black text-yellow-300">{winners.join(", ")}</span>
          </div>
          <div className="mt-3 space-y-3">
            {sorted.map((t, i) => (
              <div key={i} className={cls("px-4 py-3 rounded-xl", i === 0 ? "bg-white/20" : "bg-white/10")}>
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{i + 1}. {t.name}</div>
                  <div className="text-2xl font-black tabular-nums">${t.total.toLocaleString()}</div>
                </div>
                {t.prizes && t.prizes.length > 0 && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    <span className="text-sm opacity-80">Prizes won:</span>
                    {t.prizes.map((prize, idx) => (
                      <span key={`${prize}-${idx}`} className={cls("px-2 py-1 text-xs font-bold rounded-md", 
                        prize === "T-SHIRT" ? "bg-purple-600" :
                        prize === "PIN" ? "bg-red-600" :
                        prize === "STICKER" ? "bg-blue-600" :
                        prize === "MAGNET" ? "bg-gray-600" :
                        prize === "KEYCHAIN" ? "bg-orange-600" :
                        "bg-green-600"
                      )}>{prize}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-6 flex gap-2 justify-center">
            <button onClick={restartAll} className="px-4 py-2 rounded-xl bg-white text-black font-semibold hover:opacity-90">
              Play Again
            </button>
            <button onClick={backToSetup} className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 font-semibold">
              Back to Setup
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "setup") {
    return (
      <div className={cls("min-h-screen h-screen text-white flex items-center justify-center", GRADIENT)}>
        <div className="max-w-5xl w-full mx-auto p-6">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-4">Wheel of Jon-Tune — Setup</h1>
          <div className="bg-white/10 rounded-2xl p-5 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div>
                <div className="text-sm uppercase tracking-wider opacity-80">Number of Teams</div>
                <input
                  type="number"
                  min="2"
                  max="8"
                  value={teamCount}
                  onChange={(e) => {
                    const count = Math.max(2, Math.min(8, parseInt(e.target.value, 10) || 2));
                    setTeamCount(count);
                    const base = Array.from({ length: count }, (_, i) => `Team ${String.fromCharCode(65 + i)}`);
                    setTeamNames((arr) => base.map((name, i) => arr[i] || name));
                  }}
                  className="w-20 px-3 py-2 rounded-xl bg-white text-black font-semibold"
                />
              </div>
              <div className="flex-1 w-full">
                <div className="text-sm uppercase tracking-wider opacity-80">Team Names</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                  {Array.from({ length: teamCount }).map((_, i) => (
                    <input
                      key={i}
                      value={teamNames[i] || ""}
                      onChange={(e) =>
                        setTeamNames((arr) => {
                          const n = [...arr];
                          n[i] = e.target.value;
                          return n;
                        })
                      }
                      className="px-3 py-2 rounded-xl bg-white text-black font-semibold"
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <button onClick={startGame} className="px-4 py-2 rounded-xl bg-white text-black font-semibold hover:opacity-90">
                Start Game
              </button>
              <button onClick={sfx.toggleTheme} className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 font-semibold">
                {sfx.themeOn ? "Music Off" : "Music On"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main game layout
  return (
    <div className={cls("min-h-screen h-screen text-white flex flex-col items-center p-4 overflow-hidden", GRADIENT)}>
      <div className={cls("w-full h-full flex flex-col", (zoomed || showWinScreen) && "invisible")}>
        <header className="w-full flex justify-between items-center max-w-7xl mx-auto">
          <div className="flex-1 flex justify-start">
            <button onClick={backToSetup} className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-sm font-semibold">
              ← Setup
            </button>
          </div>
          <div className="flex-1" />
          <div className="flex-1 flex items-center justify-end gap-4">
            <button onClick={sfx.toggleTheme} className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-sm font-semibold hidden sm:block">
              {sfx.themeOn ? "Music Off" : "Music On"}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={sfx.volume}
              onChange={(e) => sfx.setVolume(parseFloat(e.target.value))}
            />
            <button onClick={toggleFullscreen} className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-sm font-semibold">
              Full
            </button>
          </div>
        </header>

        <main className="w-full max-w-7xl mx-auto flex-1 flex flex-col lg:flex-row items-center lg:items-center gap-4 min-h-0">
          <div className="flex flex-col items-center justify-around gap-4 w-full lg:w-1/2 h-full py-4">
            <div className="relative flex items-center justify-center">
              <canvas ref={canvasRef} style={{ width: `${wheelPx}px`, height: `${wheelPx}px` }} />
              <div className="absolute w-[20%] h-[20%] rounded-full bg-no-repeat" style={{ backgroundImage: `url(hub-image.png)`, backgroundSize: '110%', backgroundPosition: '10% -30px' }}>
                <div className="w-full h-full bg-green-500/50 rounded-full" style={{ clipPath: `inset(0 ${100 - spinPower}% 0 0)` }} />
              </div>
            </div>

            <div className="flex justify-center flex-wrap gap-4 items-center">
              <button
                onMouseDown={startCharge}
                onMouseUp={endCharge}
                onMouseLeave={endCharge}
                disabled={!canSpin}
                className={cls("relative overflow-hidden px-8 py-4 rounded-xl font-bold text-xl transition-colors", !canSpin ? "bg-gray-700/60 text-gray-400 cursor-not-allowed" : "bg-green-500 text-white hover:bg-green-600")}
              >
                <div className="absolute top-0 left-0 h-full bg-green-700 transition-all duration-100" style={{ width: `${spinPower}%` }}></div>
                <span className="relative">SPIN</span>
              </button>
              <button
                onClick={() => setShowVowelModal(true)}
                disabled={!canBuyVowel}
                className={cls("px-6 py-3 rounded-xl font-bold text-lg", !canBuyVowel ? "bg-gray-700/60 text-gray-400 cursor-not-allowed" : "bg-blue-500 text-white hover:bg-blue-600")}
              >
                BUY VOWEL ($250)
              </button>
              <button
                onClick={() => setShowSolveModal(true)}
                disabled={!canSolve}
                className={cls("px-6 py-3 rounded-xl font-bold text-lg", !canSolve ? "bg-gray-700/60 text-gray-400 cursor-not-allowed" : "bg-purple-500 text-white hover:bg-purple-600")}
              >
                SOLVE
              </button>
            </div>

            <div className="w-full max-w-2xl p-2">
              <div className="flex flex-wrap justify-center gap-2">
                {LETTERS.map((ch) => (
                  <button
                    key={ch}
                    onClick={() => guessLetter(ch)}
                    disabled={!awaitingConsonant || VOWELS.has(ch) || letters.has(ch)}
                    className={cls("w-9 h-9 sm:w-10 sm:h-10 rounded-md font-bold", VOWELS.has(ch) ? "bg-blue-800/60 text-blue-200" : letters.has(ch) ? "bg-gray-700/60 text-gray-400" : "bg-white/20 text-white", awaitingConsonant && !VOWELS.has(ch) && !letters.has(ch) ? "hover:bg-white/30 hover:ring-2 hover:ring-white cursor-pointer" : "cursor-not-allowed")}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 w-full lg:w-1/2 h-full justify-center">
            <h2 className="text-2xl font-bold tracking-widest uppercase text-center">{category}</h2>
            <div className="flex flex-wrap justify-center gap-2 p-4 rounded-xl backdrop-blur-md bg-white/10 w-full">
              {wordTokens.map((tok, i) => {
                if (tok.type === 'space') return <div key={i} className="w-4 h-10 sm:h-14 flex-shrink-0 fullscreen:w-6" />;
                return (
                  <div key={i} className="flex gap-2">
                    {tok.cells.map((cell, j) => {
                      const isSpecial = !isLetter(cell.ch);
                      return (
                        <div
                          key={`${i}-${j}`}
                          className={cls("w-8 h-12 sm:w-10 sm:h-16 text-2xl sm:text-3xl font-bold flex items-center justify-center rounded-md", cell.shown ? "bg-yellow-300 text-black shadow-lg" : "bg-blue-950/80 text-white", isSpecial && "bg-transparent text-white")}
                        >
                          {isSpecial ? cell.ch : cell.shown ? cell.ch : ""}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
              {teams.map((t, i) => <TeamCard key={i} t={t} i={i} />)}
            </div>
          </div>
        </main>
      </div>

      <div className={cls("fixed inset-0 z-50 flex items-center justify-center", !zoomed && "hidden pointer-events-none")}>
        <div className="absolute inset-0 bg-black/70"></div>
        <div className="relative flex items-center justify-center z-10">
          <canvas ref={zoomed ? canvasRef : null} style={{ width: `${wheelPx}px`, height: `${wheelPx}px` }} />
          <div className="absolute w-[20%] h-[20%] rounded-full bg-no-repeat" style={{ backgroundImage: `url(hub-image.png)`, backgroundSize: '110%', backgroundPosition: '10% -50px' }} />
        </div>
        {landed && (
          <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-7xl sm:text-8xl lg:text-9xl font-black uppercase text-white [text-shadow:0_4px_8px_rgba(0,0,0,0.8)] pointer-events-none z-20">
            {landed?.t === "cash" && `$${landed.v.toLocaleString()}`}
            {landed?.t === "bankrupt" && "BANKRUPT"}
            {landed?.t === "lose" && "LOSE A TURN"}
            {landed?.prize?.type === 'tshirt' && "T-SHIRT PRIZE!"}
            {landed?.t !== "cash" && landed?.t !== "bankrupt" && landed?.t !== "lose" && !landed?.prize && landed.label}
          </div>
        )}
      </div>

      {showWinScreen && <WinScreen winner={roundWinner} onSkip={skipWinScreen} />}
      {showVowelModal && <VowelModal />}
      {showSolveModal && <SolveModal />}
      {showMysterySpinner && <MysterySpinnerModal />}
    </div>
  );
}

// ==================== Win Screen Component
function WinScreen({ winner, onSkip }) {
  const bouncerRef = useRef(null);

  useEffect(() => {
    const bouncer = bouncerRef.current;
    if (!bouncer) return;

    let animationFrameId;
    const pos = {
      x: Math.random() * (window.innerWidth / 2),
      y: Math.random() * (window.innerHeight / 2),
      vx: 1.5,
      vy: 1.5,
    };

    const animate = () => {
      const imageSize = { width: bouncer.offsetWidth, height: bouncer.offsetHeight };
      pos.x += pos.vx;
      pos.y += pos.vy;

      if (pos.x <= 0 || pos.x >= window.innerWidth - imageSize.width) pos.vx *= -1;
      if (pos.y <= 0 || pos.y >= window.innerHeight - imageSize.height) pos.vy *= -1;

      bouncer.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/10 backdrop-blur-sm overflow-hidden"
      onClick={onSkip}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSkip?.()}
      aria-label="Dismiss win screen"
    >
      <img
        ref={bouncerRef}
        src="winner-icon.png"
        alt="Bouncing icon"
        className="absolute top-0 left-0 w-24 h-24 rounded-lg shadow-lg pointer-events-none"
      />
      <div className="relative z-10 text-center">
        <h1 className="text-6xl font-black text-yellow-300 animate-pulse">Congratulations!</h1>
        <p className="text-4xl text-white mt-4">{winner}</p>
        <p className="text-white/70 mt-3 text-sm">(Click, Enter, or Space to continue)</p>
      </div>
    </div>
  );
}
