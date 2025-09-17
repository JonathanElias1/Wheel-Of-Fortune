import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Wheel of Jon-Tune — host-driven party version (JSX)
 *
 * NOTE: This file contains the full updated component with:
 * - separate READY screen modal for the bonus round
 * - countdown starts immediately when READY is pressed
 * - inline solve panel under the board (not an overlay)
 */

const GRADIENT = "bg-[radial-gradient(110%_110%_at_0%_0%,#5b7fff_0%,#21bd84_100%)]";
const BASE_WHEEL_PX = 500;
const VOWEL_COST = 800;

const WEDGES = [
  { t: "cash", v: 2500, c: "#00AADD" },
  { t: "wild", label: "MYSTERY", c: "#E6007E" },
  { t: "cash", v: 600, c: "#E23759" },
  { t: "cash", v: 700, c: "#D15C22" },
  { t: "lose", label: "LOSE A TURN", c: "#B1A99E" },
  { t: "cash", v: 650, c: "#EDD302" },
  { t: "bankrupt", label: "BANKRUPT", c: "#222222" },
  { t: "tshirt", label: "T-SHIRT", c: "#c386f8", v: 0, prize: { type: "tshirt", label: "T-SHIRT", color: "#c386f8" }, size: 0.4 },
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
const BONUS_PRIZES = ["PIN", "STICKER", "T-SHIRT", "MAGNET", "KEYCHAIN"];

function useSfx() {
  const ref = useRef({});
  const [volume, setVolume] = useState(0.9);

  useEffect(() => {
    const base = "/";
    const created = [];

    const load = (k, file, customVolume) => {
      try {
        const a = new Audio(base + file);
        a.preload = "auto";
        a.volume = customVolume ?? volume;
        ref.current[k] = a;
        created.push({ key: k, audio: a });
      } catch (e) {
        console.error("Failed to create audio for", file, e);
      }
    };

    load("spin", "wof-spin.mp3", 1.0);
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
    load("chargeUp", "charge-up.mp3");
    load("startGame", "start-game.mp3");

    return () => {
      created.forEach(({ key, audio }) => {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch (e) {}
        if (ref.current[key] === audio) ref.current[key] = null;
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    Object.entries(ref.current).forEach(([key, a]) => {
      if (a && key !== "spin") {
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
      if (p !== undefined) p.catch((e) => console.error(`Failed to play sound: ${k}`, e));
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
    try {
      a.loop = true;
      a.currentTime = 0;
      const p = a.play();
      if (p !== undefined) p.catch((e) => console.error(`Failed to loop sound: ${k}`, e));
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
      loopTrack.play().catch((e) => console.error("Loop music failed to play.", e));
    };

    try {
      intro.removeEventListener("ended", handleIntroEnd);
    } catch (e) {}

    if (!themeOn) {
      try {
        intro.addEventListener("ended", handleIntroEnd);
        intro.currentTime = 0;
        await intro.play();
        setThemeOn(true);
      } catch (e) {
        console.error("Theme music failed to play.", e);
      }
    } else {
      intro.pause();
      intro.currentTime = 0;
      loopTrack.pause();
      loopTrack.currentTime = 0;
      try {
        intro.removeEventListener("ended", handleIntroEnd);
      } catch (e) {}
      setThemeOn(false);
    }
  };

  return { play, stop, loop, stopLoop, volume, setVolume, themeOn, toggleTheme };
}

const FALLBACK = [
  { category: "CELEBRATION", answer: "HAPPY BIRTHDAY JON" },
  { category: "CLASSIC PHRASE", answer: "JON SAVED MY LIFE" },
  { category: "RELIGIOUS STUFF", answer: "JONELUJAH" },
  { category: "POLITICS", answer: "JONTRARIAN" },
  { category: "MOVIE QUOTE", answer: "LOOK THE PROBLEM IS OVER" },
];

async function loadPuzzles() {
  try {
    const res = await fetch("/wof.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch");
    const js = await res.json();
    const mainPuzzles = Array.isArray(js.puzzles) && js.puzzles.length ? js.puzzles : FALLBACK;
    const bonusPuzzles = Array.isArray(js.bonusPuzzles) && js.bonusPuzzles.length ? js.bonusPuzzles : FALLBACK;
    return { main: mainPuzzles, bonus: bonusPuzzles };
  } catch (error) {
    console.error("Could not load or parse puzzles from wof.json:", error);
    return { main: FALLBACK, bonus: FALLBACK };
  }
}

const cls = (...xs) => xs.filter(Boolean).join(" ");
const isLetter = (ch) => /^[A-Z]$/.test(ch);

function normalizeAnswer(raw) {
  const chars = raw.toUpperCase().split("");
  return chars.map((ch) => ({ ch, shown: !isLetter(ch) }));
}

function nextIdx(i, len) {
  return (i + 1) % len;
}

function WinScreen({ winner }) {
  const bouncerRef = useRef(null);

  useEffect(() => {
    const bouncer = bouncerRef.current;
    if (!bouncer) return;

    let animationFrameId = null;
    let impulseInterval = null;

    // helper for random ranges
    const rand = (min, max) => min + Math.random() * (max - min);
    const randSign = () => (Math.random() < 0.5 ? -1 : 1);

    // toned-down starting size + calmer starting velocity & rotation
    const baseSize = 48 + Math.random() * 80;
    bouncer.style.width = `${baseSize}px`;
    bouncer.style.height = `${baseSize}px`;

    const pos = {
      x: Math.random() * Math.max(1, window.innerWidth - baseSize),
      y: Math.random() * Math.max(1, window.innerHeight - baseSize),
      vx: rand(2, 6) * randSign(), // calmer initial velocity
      vy: rand(2, 6) * randSign(),
      rot: rand(-0.5, 0.5),
      rotSpeed: rand(-0.04, 0.04),
      scale: 0.95 + Math.random() * 0.4,
    };

    // occasional gentle impulse to add playfulness without chaos
    impulseInterval = setInterval(() => {
      const impulsePower = Math.random() < 0.18 ? rand(3, 9) : rand(0.8, 3);
      pos.vx += impulsePower * randSign();
      pos.vy += impulsePower * randSign();
      pos.rotSpeed += rand(-0.18, 0.18);
      pos.scale = 0.9 + Math.random() * 0.6;

      // rarely teleport slightly (very subtle)
      if (Math.random() < 0.06) {
        pos.x = Math.min(window.innerWidth - baseSize, Math.max(0, pos.x + rand(-120, 120)));
        pos.y = Math.min(window.innerHeight - baseSize, Math.max(0, pos.y + rand(-120, 120)));
      }
    }, 400 + Math.random() * 600);

    const animate = () => {
      const imageSize = { width: bouncer.offsetWidth, height: bouncer.offsetHeight };

      // position update
      pos.x += pos.vx;
      pos.y += pos.vy;
      pos.rot += pos.rotSpeed;

      // small random jitter on every frame
      pos.x += rand(-0.4, 0.4);
      pos.y += rand(-0.4, 0.4);
      pos.rotSpeed *= 0.97; // stronger damping for calmer motion

      // bounce off walls with energy loss, gentle bounce
      if (pos.x <= 0 || pos.x >= window.innerWidth - imageSize.width) {
        pos.vx *= -0.7;
        pos.x = Math.max(0, Math.min(window.innerWidth - imageSize.width, pos.x));
        // slight rotation bump
        pos.rotSpeed += rand(-0.12, 0.12);
      }
      if (pos.y <= 0 || pos.y >= window.innerHeight - imageSize.height) {
        pos.vy *= -0.7;
        pos.y = Math.max(0, Math.min(window.innerHeight - imageSize.height, pos.y));
        pos.rotSpeed += rand(-0.12, 0.12);
      }

      // rotate and scale transform — subtle skew for character
      const scale = 0.95 + Math.sin(performance.now() / 220 + pos.x) * 0.08 + (Math.random() * 0.03);
      const skewX = Math.sin(pos.rot * 2) * 2; // degrees
      const skewY = Math.cos(pos.rot * 1.5) * 1.2;

      bouncer.style.transform = `translate(${Math.round(pos.x)}px, ${Math.round(pos.y)}px) rotate(${pos.rot.toFixed(2)}rad) scale(${(pos.scale * scale).toFixed(2)}) skew(${skewX.toFixed(1)}deg, ${skewY.toFixed(1)}deg)`;

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (impulseInterval) clearInterval(impulseInterval);
    };
  }, [winner]);

  return (
    <div className={cls("fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden backdrop-blur-sm", GRADIENT)}>
      <img ref={bouncerRef} src="winner-icon.png" alt="Bouncing icon" className="absolute top-0 left-0 rounded-lg shadow-lg pointer-events-none" />
      <div className="relative z-10 text-center">
        <h1 className="text-8xl font-black text-white animate-pulse [text-shadow:0_8px_16px_rgba(0,0,0,0.5)]">🎉 WINNER! 🎉</h1>
        <p className="text-6xl text-white mt-6 font-bold [text-shadow:0_4px_8px_rgba(0,0,0,0.5)]">{winner}</p>
        <p className="text-2xl text-white mt-4 font-semibold animate-bounce">Solved the puzzle! (+$300!)</p>
      </div>
    </div>
  );
}

export default function App() {
  const [phase, setPhase] = useState("setup");
  const [teamCount, setTeamCount] = useState(3);
  const [teamNames, setTeamNames] = useState(["Team A", "Team B", "Team C", "Team D"]);
  const [puzzles, setPuzzles] = useState(FALLBACK);
  const [bonusPuzzles, setBonusPuzzles] = useState([]);
  const [idx, setIdx] = useState(0);
  const [letters, setLetters] = useState(() => new Set());
  const [board, setBoard] = useState(() => normalizeAnswer(FALLBACK[0].answer));
  const [category, setCategory] = useState(FALLBACK[0].category || "PHRASE");

  const [teams, setTeams] = useState([
    { name: "Team A", total: 0, round: 0, prizes: [], holding: null },
    { name: "Team B", total: 0, round: 0, prizes: [], holding: null },
    { name: "Team C", total: 0, round: 0, prizes: [], holding: null },
  ]);
  const [active, setActive] = useState(0);
  const [currentWedges, setCurrentWedges] = useState([...WEDGES]);

  // wheel state
  const [spinning, setSpinning] = useState(false);
  const [angle, setAngle] = useState(0);
  const [landed, setLanded] = useState(null);
  const [awaitingConsonant, setAwaitingConsonant] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const [spinPower, setSpinPower] = useState(0);
  const [isCharging, setIsCharging] = useState(false);

  const chargeDirRef = useRef(1);

  const [chargeSession, setChargeSession] = useState(0);
  const [snapChargeToZero, setSnapChargeToZero] = useState(false);

  const [testTshirtMode, setTestTshirtMode] = useState(false);
  const [bonusPrep, setBonusPrep] = useState(false);

  const chargeIntervalRef = useRef(null);
  const chargeSnapshotRef = useRef(0);

  const [tshirtHolder, setTshirtHolder] = useState(null);
  const [mysteryPrize, setMysteryPrize] = useState(null);
  const [showMysterySpinner, setShowMysterySpinner] = useState(false);
  const [wonSpecialWedges, setWonSpecialWedges] = useState([]);

  const bonusPrepIntervalRef = useRef(null);
  const [testMode, setTestMode] = useState(false);

  const [readyDisabled, setReadyDisabled] = useState(false);

  const bonusSpinRef = useRef(null);
  const bonusWinnerSpinRef = useRef(null);

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
  const [bonusPrepCountdown, setBonusPrepCountdown] = useState(5);
  const [bonusActive, setBonusActive] = useState(false);
  const [showBonusLetterModal, setShowBonusLetterModal] = useState(false);
  const [bonusLetterType, setBonusLetterType] = useState("");
  const [bonusGuess, setBonusGuess] = useState("");
  const [showBonusSolveModal, setShowBonusSolveModal] = useState(false);
  const [showBonusSelector, setShowBonusSelector] = useState(false);
  const [bonusWinnerSpinning, setBonusWinnerSpinning] = useState(false);
  const [selectedBonusWinner, setSelectedBonusWinner] = useState("");
  const [bonusResult, setBonusResult] = useState(null);
  const [bonusWinnerName, setBonusWinnerName] = useState(null);

  // NEW: READY modal visibility separate from awaitingReady flag
  const [bonusReadyModalVisible, setBonusReadyModalVisible] = useState(false);

  // NEW: flag to indicate reveal animation in progress (prevents spinner flash)
  const [bonusRevealing, setBonusRevealing] = useState(false);

  // end screen
  const [winners, setWinners] = useState([]);
  const winnersRef = useRef([]);
  const [showStats, setShowStats] = useState(false);
  const [gameStats, setGameStats] = useState({
    totalSpins: 0,
    bankrupts: 0,
    loseTurns: 0,
    puzzlesSolved: 0,
    vowelsBought: 0,
    correctGuesses: 0,
    incorrectGuesses: 0,
    teamStats: {},
  });

  // sfx
  const sfx = useSfx();

  // Helper functions
  const isSolved = () => board.every((b) => b.shown);

  const allVowelsGuessed = Array.from(VOWELS).every((vowel) => letters.has(vowel));
  const canSpin = !spinning && !awaitingConsonant && !isSolved() && !bonusRound;
  const canBuyVowel =
    teams[active]?.round >= VOWEL_COST && !spinning && !isSolved() && hasSpun && !allVowelsGuessed && !bonusRound;
  const canSolve = !spinning && hasSpun && !isSolved() && !bonusRound;

  useEffect(() => {
    loadPuzzles().then((data) => {
      setPuzzles(data.main);
      setBonusPuzzles(data.bonus);
      setIdx(0);
      const p = data.main[0] || FALLBACK[0];
      setBoard(normalizeAnswer(p.answer));
      setCategory(p.category || "PHRASE");
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

  const canvasRef = useRef(null);
  const zoomCanvasRef = useRef(null);

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

  // bonus countdown effect — unchanged: runs while bonusActive true
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
      const k = e.key.toLowerCase();

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
  }, [phase, canBuyVowel, canSolve, bonusRound, bonusActive, showBonusSolveModal, showVowelModal, showSolveModal, showWinScreen]);

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
    requestAnimationFrame(() => drawWheel(angle));
  }, [angle, wheelPx, phase, isFullscreen, isCharging, spinPower, zoomed, currentWedges]);

  useEffect(() => () => {
    if (bonusPrepIntervalRef.current) {
      clearInterval(bonusPrepIntervalRef.current);
      bonusPrepIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (phase === "play" && hasSpun && board.length > 0 && board.every((b) => b.shown)) {
      setTimeout(() => {
        finishPuzzle(true, landed);
      }, 750);
    }
  }, [board]); // eslint-disable-line

  // ---------- Wheel rendering and utilities (same as before)
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

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const cx = W / 2;
    const cy = H / 2;
    const pHeight = 40;
    const pWidth = 30;
    const r = W / 2 - pHeight - 5;

    const wedgesToRender = testTshirtMode
      ? currentWedges.map((w) => (w.t === "tshirt" ? { ...w, size: 3 } : w))
      : currentWedges;

    const totalSize = wedgesToRender.reduce((sum, w) => sum + (w.size || 1), 0);
    const baseArc = (Math.PI * 2) / totalSize;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);

    let currentAngle = 0;
    for (let i = 0; i < wedgesToRender.length; i++) {
      const w = wedgesToRender[i];
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

  function wedgeIndexForAngle(a) {
    const two = Math.PI * 2;
    const normalizedAngle = ((a % two) + two) % two;

    const pointerAngle = (3 * Math.PI) / 2 % two;
    const wheelPositionAtPointer = (two - normalizedAngle + pointerAngle) % two;

    const wedgesToCheck = testTshirtMode
      ? currentWedges.map((w) => (w.t === "tshirt" ? { ...w, size: 3 } : w))
      : currentWedges;

    const totalSize = wedgesToCheck.reduce((sum, w) => sum + (w.size || 1), 0);
    const baseArc = two / totalSize;

    let accumulatedAngle = 0;

    for (let i = 0; i < wedgesToCheck.length; i++) {
      const wedgeSize = wedgesToCheck[i].size || 1;
      const wedgeArc = baseArc * wedgeSize;

      if (wheelPositionAtPointer >= accumulatedAngle && wheelPositionAtPointer < accumulatedAngle + wedgeArc) {
        return i;
      }
      accumulatedAngle += wedgeArc;
    }

    return 0;
  }

  function angleForWedgeIndex(idx, wedges = currentWedges, useTestMode = false) {
    const two = Math.PI * 2;
    const wedgesToCheck = useTestMode ? wedges.map((w) => (w.t === "tshirt" ? { ...w, size: 3 } : w)) : wedges;

    const totalSize = wedgesToCheck.reduce((sum, w) => sum + (w.size || 1), 0);
    const baseArc = two / totalSize;

    let accumulated = 0;
    for (let i = 0; i < idx; i++) {
      accumulated += (wedgesToCheck[i].size || 1) * baseArc;
    }
    const wedgeArc = (wedgesToCheck[idx].size || 1) * baseArc;
    const mid = accumulated + wedgeArc / 2;

    const pointerAngle = (3 * Math.PI) / 2 % two;
    const normalizedAngle = (two - mid + pointerAngle) % two;
    return normalizedAngle;
  }

  // ---------- Charge logic
  const startCharge = () => {
    if (!canSpin || isCharging) return;
    setIsCharging(true);

    setSnapChargeToZero(true);
    setSpinPower(0);
    chargeSnapshotRef.current = 0;
    chargeDirRef.current = 1;
    setChargeSession((s) => s + 1);

    try {
      sfx.play("chargeUp");
    } catch {}
    setTimeout(() => {
      try {
        sfx.loop("chargeUp");
      } catch {}
    }, 50);

    if (chargeIntervalRef.current) {
      clearInterval(chargeIntervalRef.current);
      chargeIntervalRef.current = null;
    }

    requestAnimationFrame(() => {
      setSnapChargeToZero(false);

      const stepMs = 16;
      const stepDelta = 1;
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

    try {
      sfx.stopLoop("chargeUp");
    } catch {}
    try {
      sfx.stop("chargeUp");
    } catch {}

    if (!isCharging) return;

    const power = Math.max(1, Math.round(chargeSnapshotRef.current));
    chargeSnapshotRef.current = 0;
    setIsCharging(false);

    setSnapChargeToZero(true);
    setSpinPower(0);
    requestAnimationFrame(() => setSnapChargeToZero(false));

    onSpin(power);
  };

  function onSpin(power = 10) {
    if (spinning || awaitingConsonant || isSolved()) return;

    setLanded(null);
    setHasSpun(true);
    setSpinning(true);
    setZoomed(true);
    sfx.play("spin");

    setGameStats((prev) => {
      const currentTeamName = teams[active]?.name;
      const prevTeam = prev.teamStats[currentTeamName] || {};
      return {
        ...prev,
        totalSpins: prev.totalSpins + 1,
        teamStats: {
          ...prev.teamStats,
          [currentTeamName]: {
            ...prevTeam,
            spins: (prevTeam.spins || 0) + 1,
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
    const ease =
      easing === "inout"
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
      sfx.play("wild");

      const prizes = ["PIN", "STICKER", "T-SHIRT", "MAGNET", "KEYCHAIN"];
      let currentPrize = 0;
      let spinCount = 0;
      const maxSpins = 20 + Math.floor(Math.random() * 10);

      setShowMysterySpinner(true);

      if (bonusSpinRef.current) {
        clearInterval(bonusSpinRef.current);
        bonusSpinRef.current = null;
      }

      bonusSpinRef.current = setInterval(() => {
        setMysteryPrize(prizes[currentPrize]);
        currentPrize = (currentPrize + 1) % prizes.length;
        spinCount++;

        if (spinCount >= maxSpins) {
          clearInterval(bonusSpinRef.current);
          bonusSpinRef.current = null;
          const finalPrize = prizes[Math.floor(Math.random() * prizes.length)];
          setMysteryPrize(finalPrize);

          const mysteryIndex = currentWedges.findIndex((x) => x.t === "wild");
          if (mysteryIndex !== -1) {
            const targetAngle = angleForWedgeIndex(mysteryIndex, currentWedges, testTshirtMode);
            setAngle(targetAngle);
          }

          const parsed = parseInt(finalPrize.replace(/[^0-9]/g, ""), 10);
          if (!isNaN(parsed) && parsed > 0) {
            setLanded({ t: "cash", v: parsed, c: "#E6007E", label: `$${parsed}` });
          } else {
            if (finalPrize.toUpperCase().includes("T-SHIRT")) {
              sfx.play("tshirt");
            }
            setLanded({ t: "prize", label: finalPrize, prize: { type: finalPrize.toLowerCase(), label: finalPrize, color: "#E6007E" } });
          }

          setTimeout(() => {
            setShowMysterySpinner(false);
            setAwaitingConsonant(true);
          }, 900);
        }
      }, 100);
    } else if (w.t === "cash" || w.t === "prize" || w.t === "freeplay") {
      sfx.play("cashDing2");
      setAwaitingConsonant(true);
    } else if (w.t === "tshirt") {
      sfx.play("tshirt");
      setAwaitingConsonant(true);
    } else if (w.t === "bankrupt") {
      const currentTeamName = teams[active].name;
      setGameStats((prev) => {
        const prevTeam = prev.teamStats[currentTeamName] || {};
        return {
          ...prev,
          bankrupts: prev.bankrupts + 1,
          teamStats: {
            ...prev.teamStats,
            [currentTeamName]: {
              ...prevTeam,
              bankrupts: (prevTeam.bankrupts || 0) + 1,
            },
          },
        };
      });

      setTeams((ts) => ts.map((t, i) => (i === active ? { ...t, round: 0, holding: null } : t)));
      sfx.play("bankrupt");
      if (tshirtHolder === active) setTshirtHolder(null);
      passTurn();
    } else if (w.t === "lose") {
      const currentTeamName = teams[active].name;
      setGameStats((prev) => {
        const prevTeam = prev.teamStats[currentTeamName] || {};
        return {
          ...prev,
          loseTurns: prev.loseTurns + 1,
          teamStats: {
            ...prev.teamStats,
            [currentTeamName]: {
              ...prevTeam,
              loseTurns: (prevTeam.loseTurns || 0) + 1,
            },
          },
        };
      });
      sfx.play("buzzer");
      passTurn();
    }
  }

  function guessLetter(ch) {
    if (!awaitingConsonant) return;
    if (VOWELS.has(ch) || letters.has(ch)) return;

    setLetters((S) => new Set(S).add(ch));
    const hitIndices = board.reduce((acc, cell, index) => (cell.ch === ch ? [...acc, index] : acc), []);

    const currentTeamName = teams[active].name;

    if (hitIndices.length > 0) {
      setGameStats((prev) => {
        const prevTeam = prev.teamStats[currentTeamName] || {};
        return {
          ...prev,
          correctGuesses: prev.correctGuesses + 1,
          teamStats: {
            ...prev.teamStats,
            [currentTeamName]: {
              ...prevTeam,
              correctGuesses: (prevTeam.correctGuesses || 0) + 1,
            },
          },
        };
      });

      const w = landed || { t: "cash", v: 0 };
      const wedgeValue = w.t === "cash" && typeof w.v === "number" ? w.v : 500;

      setTeams((ts) => ts.map((t, i) => (i === active ? { ...t, round: t.round + wedgeValue * hitIndices.length } : t)));

      if (landed?.t === "tshirt") {
        setTeams((prev) => prev.map((t, i) => (i === active ? { ...t, holding: "T-SHIRT" } : t)));
        setTshirtHolder(active);
      } else if ((landed?.t === "prize" || (landed?.t === "cash" && landed?.label?.includes && landed.label.toUpperCase().includes("T-SHIRT"))) && mysteryPrize) {
        setTeams((prev) => prev.map((t, i) => (i === active ? { ...t, holding: mysteryPrize } : t)));
      } else if (landed?.t === "prize" && landed.prize?.label) {
        setTeams((prev) => prev.map((t, i) => (i === active ? { ...t, holding: landed.prize.label } : t)));
      }

      hitIndices.forEach((boardIndex, i) => {
        setTimeout(() => {
          sfx.play("ding");
          setBoard((currentBoard) => currentBoard.map((cell, idx) => (idx === boardIndex ? { ...cell, shown: true } : cell)));
        }, i * 750);
      });

      setAwaitingConsonant(false);
    } else {
      setGameStats((prev) => {
        const prevTeam = prev.teamStats[currentTeamName] || {};
        return {
          ...prev,
          incorrectGuesses: prev.incorrectGuesses + 1,
          teamStats: {
            ...prev.teamStats,
            [currentTeamName]: {
              ...prevTeam,
              incorrectGuesses: (prevTeam.incorrectGuesses || 0) + 1,
            },
          },
        };
      });
      sfx.play("wrongLetter");
      setAwaitingConsonant(false);
      passTurn();
    }
  }

  function handleBuyVowel(ch) {
    setShowVowelModal(false);
    if (!ch || !VOWELS.has(ch) || ch.length !== 1) return;
    if (letters.has(ch)) return;

    const canAfford = teams[active]?.round >= VOWEL_COST;
    if (!canAfford) {
      sfx.play("buzzer");
      return;
    }

    const currentTeamName = teams[active].name;

    setGameStats((prev) => {
      const prevTeam = prev.teamStats[currentTeamName] || {};
      return {
        ...prev,
        vowelsBought: prev.vowelsBought + 1,
        teamStats: {
          ...prev.teamStats,
          [currentTeamName]: {
            ...prevTeam,
            vowelsBought: (prevTeam.vowelsBought || 0) + 1,
          },
        },
      };
    });

    setLetters((S) => new Set(S).add(ch));
    setTeams((ts) => ts.map((t, i) => (i === active ? { ...t, round: t.round - VOWEL_COST } : t)));

    const hitIndices = board.reduce((acc, cell, index) => (cell.ch === ch ? [...acc, index] : acc), []);

    if (hitIndices.length > 0) {
      setGameStats((prev) => {
        const prevTeam = prev.teamStats[currentTeamName] || {};
        return {
          ...prev,
          correctGuesses: prev.correctGuesses + 1,
          teamStats: {
            ...prev.teamStats,
            [currentTeamName]: {
              ...prevTeam,
              correctGuesses: (prevTeam.correctGuesses || 0) + 1,
            },
          },
        };
      });

      hitIndices.forEach((boardIndex, i) => {
        setTimeout(() => {
          sfx.play("ding");
          setBoard((currentBoard) => currentBoard.map((cell, idx) => (idx === boardIndex ? { ...cell, shown: true } : cell)));
        }, i * 750);
      });
    } else {
      setGameStats((prev) => {
        const prevTeam = prev.teamStats[currentTeamName] || {};
        return {
          ...prev,
          incorrectGuesses: prev.incorrectGuesses + 1,
          teamStats: {
            ...prev.teamStats,
            [currentTeamName]: {
              ...prevTeam,
              incorrectGuesses: (prevTeam.incorrectGuesses || 0) + 1,
            },
          },
        };
      });
      sfx.play("wrongLetter");
    }
  }

  function handleSolve() {
    setShowSolveModal(false);
    if (!solveGuess) return;

    const answer = board.map((b) => b.ch).join("");
    if (solveGuess.toUpperCase().trim() === answer) {
      finishPuzzle(true, landed);
    } else {
      setGameStats((prev) => ({ ...prev, incorrectGuesses: prev.incorrectGuesses + 1 }));
      sfx.play("buzzer");
      passTurn();
    }
    setSolveGuess("");
  }

  function finishPuzzle(solved, lastWedge) {
    if (solved) {
      setGameStats((prev) => ({ ...prev, puzzlesSolved: prev.puzzlesSolved + 1 }));
      setGameStats((prev) => {
        const currentTeamName = teams[active].name;
        const prevTeam = prev.teamStats[currentTeamName] || {};
        return {
          ...prev,
          teamStats: {
            ...prev.teamStats,
            [currentTeamName]: {
              ...prevTeam,
              puzzlesSolved: (prevTeam.puzzlesSolved || 0) + 1,
            },
          },
        };
      });

      setRoundWinner(teams[active].name);
      setShowWinScreen(true);

      setTeams((prevTs) => {
        const specialWedgesWon = [];
        const updated = prevTs.map((t, i) => {
          if (i === active) {
            const updatedTeam = {
              ...t,
              total: t.total + t.round + 300,
              round: 0,
            };

            if (t.holding) {
              if (!updatedTeam.prizes.includes(t.holding)) {
                updatedTeam.prizes = [...updatedTeam.prizes, t.holding];
              }
              if (t.holding === "T-SHIRT") specialWedgesWon.push("tshirt");
              else specialWedgesWon.push("mystery");
              updatedTeam.holding = null;
            } else {
              if (lastWedge?.t === "wild" && mysteryPrize && !updatedTeam.prizes.includes(mysteryPrize)) {
                updatedTeam.prizes.push(mysteryPrize);
                specialWedgesWon.push("mystery");
              }
              if (lastWedge?.t === "tshirt") {
                if (!updatedTeam.prizes.includes("T-SHIRT")) {
                  updatedTeam.prizes.push("T-SHIRT");
                  specialWedgesWon.push("tshirt");
                }
                setTshirtHolder(null);
              }
            }
            return updatedTeam;
          }
          return { ...t, round: 0, holding: null };
        });

        setWonSpecialWedges(specialWedgesWon);

        const max = Math.max(...updated.map((t) => t.total));
        const topTeams = updated.filter((t) => t.total === max);

        const winnerNames = topTeams.map((t) => t.name);
        winnersRef.current = winnerNames;
        setWinners(winnerNames);

        sfx.play("solve");

        return updated;
      });
    } else {
      setTeams((ts) => ts.map((t) => ({ ...t, round: 0, holding: null })));
    }

    setTimeout(() => {
      setShowWinScreen(false);
      setRoundWinner(null);
      nextPuzzle();
    }, solved ? 10000 : 1200);
  }

  function passTurn() {
    setActive((a) => nextIdx(a, teams.length));
    setAwaitingConsonant(false);
  }

  function nextPuzzle() {
    if (wonSpecialWedges.length > 0) {
      setCurrentWedges((prev) => {
        const newWedges = [...prev];
        setTshirtHolder(null);
        wonSpecialWedges.forEach((wedgeType) => {
          if (wedgeType === "tshirt") {
            const tshirtIndex = newWedges.findIndex((w) => w.t === "tshirt");
            if (tshirtIndex !== -1) {
              newWedges[tshirtIndex] = { t: "cash", v: 500, c: "#95C85A" };
            }
          } else if (wedgeType === "mystery") {
            const mysteryIndex = newWedges.findIndex((w) => w.t === "wild");
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

      const randomBonusIndex = Math.floor(Math.random() * bonusPuzzles.length);
      const bonusPuzzle = bonusPuzzles[randomBonusIndex] || FALLBACK[0];

      if (topTeams.length > 0) {
        setBoard(normalizeAnswer(bonusPuzzle.answer));
        setCategory(bonusPuzzle.category || "PHRASE");
        setBonusRound(true);
        setPhase("bonus");

        if (topTeams.length > 1) {
          setShowBonusSelector(true);
        } else {
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
    const p = puzzles[next] || FALLBACK[0];
    setBoard(normalizeAnswer(p.answer));
    setCategory(p.category || "PHRASE");
    setLetters(new Set());
    setLanded(null);
    setAwaitingConsonant(false);
    setActive((a) => nextIdx(a, teams.length));
    setTeams((ts) => ts.map((t) => ({ ...t, round: 0, holding: null })));
    setAngle(0);
    setHasSpun(false);
  }

  // Bonus Round Functions
  function startBonusWinnerSelector() {
    setBonusWinnerSpinning(true);
    let spinCount = 0;
    const maxSpins = 20 + Math.floor(Math.random() * 15);
    const topTeams = teams.filter((t) => winners.includes(t.name));

    if (bonusWinnerSpinRef.current) {
      clearInterval(bonusWinnerSpinRef.current);
      bonusWinnerSpinRef.current = null;
    }

    bonusWinnerSpinRef.current = setInterval(() => {
      setSelectedBonusWinner(topTeams[spinCount % topTeams.length].name);
      spinCount++;

      if (spinCount >= maxSpins) {
        clearInterval(bonusWinnerSpinRef.current);
        bonusWinnerSpinRef.current = null;
        const finalWinner = topTeams[Math.floor(Math.random() * topTeams.length)].name;
        setSelectedBonusWinner(finalWinner);
        setBonusWinnerSpinning(false);
        setWinners([finalWinner]);

        setTimeout(() => {
          setShowBonusSelector(false);
        }, 1200);
      }
    }, 150);
  }

  function startBonusRound() {
    setBonusPrize("");
    setBonusHideBoard(true);
    setBonusSpinning(true);
    sfx.play("spin");

    let spinCount = 0;
    const maxSpins = 30 + Math.floor(Math.random() * 20);

    if (bonusSpinRef.current) {
      clearInterval(bonusSpinRef.current);
      bonusSpinRef.current = null;
    }

    bonusSpinRef.current = setInterval(() => {
      // rotate display prize while spinning
      setBonusPrize(BONUS_PRIZES[spinCount % BONUS_PRIZES.length]);
      spinCount++;

      if (spinCount >= maxSpins) {
        clearInterval(bonusSpinRef.current);
        bonusSpinRef.current = null;
        const finalPrize = BONUS_PRIZES[Math.floor(Math.random() * BONUS_PRIZES.length)];
        // ensure final prize is set before we flip spinning flag
        setBonusPrize(finalPrize);
        setBonusSpinning(false);

        setTimeout(() => {
          // Open letter picking modal
          setShowBonusLetterModal(true);
          setBonusLetterType("consonant");
        }, 600);
      }
    }, 100);
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
        setBonusVowel(letter);
        setBonusLetters((prev) => new Set([...prev, letter]));
        setShowBonusLetterModal(false);

        // Reveal letters and then show READY modal (board kept hidden until READY)
        revealBonusLetters();
      }
    }
  }

  function revealBonusLetters() {
    // NEW: mark reveal as in-progress to prevent spinner flash
    setBonusRevealing(true);

    const allBonusLetters = new Set([...bonusLetters, ...bonusConsonants, bonusVowel]);

    const hitIndices = [];
    board.forEach((cell, index) => {
      if (allBonusLetters.has(cell.ch)) {
        hitIndices.push(index);
      }
    });

    if (hitIndices.length > 0) {
      hitIndices.forEach((boardIndex, i) => {
        setTimeout(() => {
          sfx.play("ding");
          setBoard((currentBoard) => currentBoard.map((cell, idx) => (idx === boardIndex ? { ...cell, shown: true } : cell)));
        }, i * 200);
      });

      setTimeout(() => {
        // After reveals finish, show READY modal and keep board hidden until READY pressed
        setBonusRevealing(false); // <-- clear reveal flag
        setShowBonusLetterModal(false);
        setBonusAwaitingReady(true);
        setBonusHideBoard(true);
        setShowBonusSolveModal(false);
        setBonusActive(false);
        setBonusCountdown(20);

        // show separate READY screen modal
        setBonusReadyModalVisible(true);
      }, hitIndices.length * 200 + 300);
    } else {
      setTimeout(() => {
        setBonusRevealing(false); // <-- clear reveal flag
        setShowBonusLetterModal(false);
        setBonusAwaitingReady(true);
        setBonusHideBoard(true);
        setShowBonusSolveModal(false);
        setBonusActive(false);
        setBonusCountdown(20);

        // show separate READY screen modal
        setBonusReadyModalVisible(true);
      }, 300);
    }
  }

  // Called when user presses the big READY button on the separate ready screen
  function pressReadyStartBonus() {
    if (readyDisabled || bonusActive) return;

    setReadyDisabled(true);

    // reveal board, show inline solve box, and **start countdown immediately**
    setBonusHideBoard(false);
    setBonusAwaitingReady(false);
    setShowBonusSolveModal(true);

    // Start the 20s countdown immediately (as requested)
    setBonusActive(true);
    setBonusCountdown(20);

    // hide the ready modal
    setBonusReadyModalVisible(false);

    // tiny delay to focus input in the inline solve panel
    setTimeout(() => {
      const el = document.querySelector("#bonus-inline-solve-input");
      if (el) el.focus();
    }, 60);

    setTimeout(() => setReadyDisabled(false), 1500);
  }

  function handleBonusSolve() {
    // Hide inline solve panel and stop active timer
    setShowBonusSolveModal(false);
    setBonusActive(false);

    const answer = board.map((b) => b.ch).join("");
    const correct = bonusGuess.toUpperCase().trim() === answer;
    const winnerIndex = teams.findIndex((t) => winners.includes(t.name));

    if (correct) {
      setBoard((currentBoard) => currentBoard.map((c) => ({ ...c, shown: true })));
      if (winnerIndex !== -1) {
        setTeams((prev) =>
          prev.map((t, i) => (i === winnerIndex ? { ...t, prizes: [...t.prizes, bonusPrize] } : t))
        );
        setBonusWinnerName(winners[0] || null);
      } else {
        // fallback: give prize to active
        setTeams((prev) => prev.map((t, i) => (i === active ? { ...t, prizes: [...t.prizes, bonusPrize] } : t)));
        setBonusWinnerName(teams[active]?.name || null);
      }
      sfx.play("solve");
      setBonusResult("win");
    } else {
      sfx.play("buzzer");
      setBonusResult("lose");
    }

    setBonusGuess("");
    setTimeout(() => {
      setPhase("done");
    }, 1800);
  }

  function restartAll() {
    setIdx(0);
    const p = puzzles[0] || FALLBACK[0];
    setBoard(normalizeAnswer(p.answer));
    setCategory(p.category || "PHRASE");
    setLetters(new Set());
    setLanded(null);
    setAwaitingConsonant(false);
    setTeams((ts) => ts.map((t) => ({ name: t.name, total: 0, round: 0, prizes: [], holding: null })));
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
    setBonusPrep(false);
    setBonusPrepCountdown(5);

    setBonusAwaitingReady(false);
    setBonusHideBoard(false);
    setBonusReadyModalVisible(false);

    setGameStats({
      totalSpins: 0,
      bankrupts: 0,
      loseTurns: 0,
      puzzlesSolved: 0,
      vowelsBought: 0,
      correctGuesses: 0,
      incorrectGuesses: 0,
      teamStats: {},
    });
    setBonusResult(null);
    setBonusWinnerName(null);
  }

  function backToSetup() {
    setPhase("setup");
    setWinners([]);
    winnersRef.current = [];
    setZoomed(false);
    setWheelPx(BASE_WHEEL_PX);
    setHasSpun(false);
    setTeams(teamNames.map((name, i) => ({ name: name || `Team ${i + 1}`, total: 0, round: 0, prizes: [], holding: null })));
    setIdx(0);
    const p = puzzles[0] || FALLBACK[0];
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

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      document.exitFullscreen?.();
    }
  }

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
          {t.prizes.map((prize, idx) => (
            <div
              key={`${prize}-${idx}`}
              className={cls(
                "px-2 py-1 text-xs font-bold rounded-md",
                prize === "T-SHIRT"
                  ? "bg-purple-600"
                  : prize === "PIN"
                    ? "bg-red-600"
                    : prize === "STICKER"
                      ? "bg-blue-600"
                      : prize === "MAGNET"
                        ? "bg-gray-600"
                        : prize === "KEYCHAIN"
                          ? "bg-orange-600"
                          : "bg-green-600"
              )}
            >
              {prize}
            </div>
          ))}
          {teams[i]?.holding && phase === "play" && (
            <div className="px-2 py-1 text-[10px] font-extrabold rounded-md bg-purple-700/80 text-white">
              HOLDING {teams[i].holding}
            </div>
          )}
        </div>
      </div>
      <div className="mt-1 text-2xl sm:text-3xl font-black tabular-nums fullscreen:text-4xl">${t.round.toLocaleString()}</div>
    </div>
  );

  // Modals (Vowel, Solve, Mystery, etc.) — same as before, kept for completeness
  const VowelModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-white rounded-xl p-6 w-full max-w-sm text-center">
        <h2 className="text-2xl font-bold mb-4 text-black">Buy a Vowel (${VOWEL_COST})</h2>
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
        <button onClick={() => setShowVowelModal(false)} className="mt-4 px-4 py-2 rounded-xl bg-gray-200 text-gray-800 font-semibold">
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
              <div className="text-2xl font-black text-purple-600">{mysteryPrize || "?"}</div>
            </div>
          </div>
        </div>
        <p className="text-lg text-gray-700">{mysteryPrize ? `You could win: ${mysteryPrize}!` : "Spinning for your mystery prize..."}</p>
        <p className="text-sm text-gray-500 mt-2">Solve the puzzle to claim your prize!</p>
      </div>
    </div>
  );

  const BonusLetterModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-white rounded-xl p-6 w-full max-w-md text-center">
        <h2 className="text-2xl font-bold mb-4 text-black">
          {bonusLetterType === "consonant" ? `Choose Consonant ${bonusConsonants.length + 1}/3` : "Choose 1 Vowel"}
        </h2>
        <p className="text-sm text-gray-600 mb-4">Given: R, S, T, L, N, E</p>
        <div className="grid grid-cols-6 gap-2 mb-4">
          {LETTERS.map((letter) => {
            const isVowel = VOWELS.has(letter);
            const isGiven = bonusLetters.has(letter);
            const isSelected = bonusConsonants.includes(letter) || bonusVowel === letter;
            const isDisabled = isGiven || isSelected || (bonusLetterType === "consonant" && isVowel) || (bonusLetterType === "vowel" && !isVowel);

            return (
              <button
                key={letter}
                onClick={() => handleBonusLetter(letter)}
                disabled={isDisabled}
                className={cls("w-10 h-10 rounded-lg text-sm font-bold",
                  isDisabled ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-blue-500 text-white hover:bg-blue-600")}
              >
                {letter}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  // INLINE Bonus Solve Panel (no overlay) — placed under board in the bonus phase render
  const BonusSolveInline = () => {
    const inputRef = useRef(null);

    useEffect(() => {
      if (showBonusSolveModal) {
        setTimeout(() => {
          const el = document.querySelector("#bonus-inline-solve-input");
          if (el) el.focus();
        }, 40);
      }
    }, [showBonusSolveModal]);

    const onInputChange = (e) => {
      setBonusGuess(e.target.value);
    };

    const onKeyDown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleBonusSolve();
      }
    };

    return (
      <div className="w-full max-w-3xl mx-auto mt-6 p-6 bg-white rounded-2xl shadow-lg">
        <h2 className="text-xl sm:text-2xl font-bold text-black text-center">Solve for {bonusPrize}!</h2>
        <div className="flex flex-col items-center gap-3 mt-3">
          <div className="text-3xl font-black text-red-500">{bonusCountdown}</div>
          <p className="text-sm text-gray-600 text-center">
            The 20s countdown already began when READY was pressed. Press Enter or click Submit when done.
          </p>
          <input
            id="bonus-inline-solve-input"
            ref={inputRef}
            type="text"
            value={bonusGuess}
            onChange={onInputChange}
            onKeyDown={onKeyDown}
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

  const BonusWinnerSelectorModal = () => (
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

  const BonusReadyModal = () => (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-white rounded-2xl p-8 w-full max-w-lg text-center shadow-xl">
        <h1 className="text-4xl font-black mb-2">BONUS ROUND</h1>
        <p className="text-2xl font-semibold mb-6">Solve for <span className="uppercase">{bonusPrize}</span>!</p>
        <div className="text-md text-gray-700 mb-6">
          Letters have been revealed. Press <strong>READY</strong> when you're ready — the 20s countdown will start immediately.
        </div>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={pressReadyStartBonus}
            disabled={readyDisabled || bonusActive}
            className={cls("px-10 py-4 rounded-xl text-2xl font-extrabold text-white", (readyDisabled || bonusActive) ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700")}
          >
            READY
          </button>
       
        </div>
      </div>
    </div>
  );

  const BonusResultModal = ({ result }) => (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80">
      <div className={cls("bg-white rounded-xl p-8 w-full max-w-md text-center", result === "win" ? "border-4 border-green-400" : "border-4 border-red-400")}>
        {result === "win" ? (
          <>
            <h2 className="text-3xl font-bold mb-4 text-green-700">Congratulations!</h2>
            <p className="text-lg text-black mb-2">You solved the bonus puzzle and won: <span className="font-extrabold">{bonusPrize}</span></p>
          </>
        ) : (
          <>
            <h2 className="text-3xl font-bold mb-4 text-red-700">Too bad!</h2>
            <p className="text-lg text-black mb-2">You did not solve the bonus puzzle in time.</p>
            <p className="text-md font-bold text-black mt-2">The word was: <span className="uppercase">{board.map((b) => b.ch).join("")}</span></p>
          </>
        )}
      </div>
    </div>
  );

  const StatsModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-white rounded-xl p-6 w-full max-w-4xl text-center max-h-[80vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6 text-black">Game Statistics</h2>
        <div className="mb-8">
          <h3 className="text-xl font-bold mb-4 text-black">Overall Game Stats</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-black">
            <div className="bg-gray-100 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{gameStats.totalSpins}</div>
              <div className="text-sm">Total Spins</div>
            </div>
            <div className="bg-gray-100 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{gameStats.puzzlesSolved}</div>
              <div className="text-sm">Puzzles Solved</div>
            </div>
            <div className="bg-gray-100 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{gameStats.vowelsBought}</div>
              <div className="text-sm">Vowels Bought</div>
            </div>
            <div className="bg-gray-100 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{gameStats.correctGuesses}</div>
              <div className="text-sm">Correct Guesses</div>
            </div>
            <div className="bg-gray-100 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{gameStats.incorrectGuesses}</div>
              <div className="text-sm">Wrong Guesses</div>
            </div>
            <div className="bg-gray-100 p-4 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">{gameStats.bankrupts}</div>
              <div className="text-sm">Bankrupts</div>
            </div>
            <div className="bg-gray-100 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{gameStats.loseTurns}</div>
              <div className="text-sm">Lose a Turn</div>
            </div>
            <div className="bg-gray-100 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {gameStats.correctGuesses + gameStats.incorrectGuesses === 0
                  ? 0
                  : Math.round((gameStats.correctGuesses / (gameStats.correctGuesses + gameStats.incorrectGuesses)) * 100)}%
              </div>
              <div className="text-sm">Accuracy</div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-xl font-bold mb-4 text-black">Team Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team, i) => (
              <div key={i} className="bg-gray-50 p-4 rounded-lg text-black">
                <h4 className="font-bold text-lg mb-3">{team.name}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Score:</span>
                    <span className="font-bold">${team.total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Puzzles Won:</span>
                    <span className="font-bold">{gameStats.teamStats[team.name]?.puzzlesSolved || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Correct Guesses:</span>
                    <span className="font-bold">{gameStats.teamStats[team.name]?.correctGuesses || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Wrong Guesses:</span>
                    <span className="font-bold">{gameStats.teamStats[team.name]?.incorrectGuesses || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vowels Bought:</span>
                    <span className="font-bold">{gameStats.teamStats[team.name]?.vowelsBought || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Spins:</span>
                    <span className="font-bold">{gameStats.teamStats[team.name]?.spins || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bankrupts:</span>
                    <span className="font-bold">{gameStats.teamStats[team.name]?.bankrupts || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Lose a Turn:</span>
                    <span className="font-bold">{gameStats.teamStats[team.name]?.loseTurns || 0}</span>
                  </div>
                  {team.prizes && team.prizes.length > 0 && (
                    <div>
                      <span className="text-xs font-semibold">Prizes: </span>
                      {team.prizes.map((prize, idx) => (
                        <span key={idx} className="inline-block px-1 py-0.5 text-xs bg-blue-200 rounded mr-1">
                          {prize}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <button onClick={() => setShowStats(false)} className="px-6 py-3 rounded-xl bg-blue-500 text-white font-bold">Close</button>
      </div>
    </div>
  );

  // ===== Phase renders =====
  if (phase === "bonus") {
    const bonusState = bonusActive ? "countdown" : (bonusPrize ? (bonusAwaitingReady ? "ready" : "letters") : "prize_spin");

    return (
      <div className={cls("fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-auto p-4", GRADIENT)}>
        <div className="max-w-6xl w-full mx-auto text-center py-8">
          <h1 className="text-5xl font-black mb-2">BONUS ROUND</h1>
          <p className="text-2xl mb-6">Playing for: {winners[0]}</p>

          {/* Puzzle Board - hide while waiting READY */}
          {bonusState !== "prize_spin" && !bonusHideBoard && (
            <div className="my-6">
              <h2 className="text-2xl font-bold tracking-widest uppercase text-center mb-3">{category}</h2>
              <div className="flex flex-wrap justify-center gap-2 p-4 rounded-xl backdrop-blur-md bg-white/10 w-full max-w-4xl mx-auto">
                {wordTokens.map((tok, i) => {
                  if (tok.type === "space") return <div key={i} className="w-4 h-10 sm:h-14 flex-shrink-0" />;
                  return (
                    <div key={i} className="flex gap-2">
                      {tok.cells.map((cell, j) => {
                        const isSpecial = !isLetter(cell.ch);
                        return (
                          <div
                            key={`${i}-${j}`}
                            className={cls(
                              "w-10 h-12 sm:w-12 sm:h-16 text-2xl sm:text-3xl font-extrabold flex items-center justify-center rounded-md select-none",
                              cell.shown ? "bg-yellow-300 text-black shadow-md" : "bg-blue-900/90 text-white",
                              isSpecial && "bg-transparent text-white"
                            )}
                          >
                            {isSpecial ? cell.ch : (cell.shown ? cell.ch : "")}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Prize Spinner */}
          {/* show spinner only when not selecting tie/letters/ready/countdown and not revealing letters */}
          {!showBonusSelector && !bonusAwaitingReady && !bonusActive && !bonusRevealing && (
            <div className="mt-8">
              <p className="text-xl mb-6">Spin the wheel to see what prize you're playing for!</p>

              <button
                onClick={startBonusRound}
                // disable while spinning, and also disable once a prize has finished landing
                disabled={bonusSpinning || (!!bonusPrize && !bonusSpinning)}
                className="px-8 py-4 rounded-xl bg-purple-500 text-white font-bold text-xl hover:bg-purple-600 disabled:bg-gray-500"
              >
                {bonusSpinning ? (
                  // show the rotating label while the prize is animating
                  bonusPrize || "Spinning..."
                ) : bonusPrize ? (
                  // show the landed prize after spin (disabled)
                  <span className="flex items-center gap-3">
                    <span className="text-sm opacity-90">Prize:</span>
                    <span className="text-lg font-black uppercase">{bonusPrize}</span>
                  </span>
                ) : (
                  "SPIN FOR PRIZE"
                )}
              </button>
            </div>
          )}

          {/* After letters are revealed, show READY modal (board kept hidden until READY) */}
          {bonusState === "letters" && bonusAwaitingReady && !bonusReadyModalVisible && (
            <div className="my-8 flex flex-col items-center gap-6">
              <div className="text-5xl font-black text-yellow-300">{bonusPrize}</div>
              <p className="text-lg">Letters revealed. Press READY when you're ready to begin the 20s countdown.</p>
              <button
                onClick={() => {
                  // also allow clicking inline to open the ready modal (same effect)
                  setBonusReadyModalVisible(true);
                }}
                disabled={readyDisabled || bonusActive}
                className={cls(
                  "px-16 py-6 text-3xl rounded-2xl bg-green-500 text-white font-extrabold shadow-lg transition-transform focus:outline-none",
                  (readyDisabled || bonusActive) ? "opacity-60 cursor-not-allowed transform-none" : "hover:bg-green-600 hover:scale-105 animate-pulse"
                )}
                aria-disabled={readyDisabled || bonusActive}
              >
                READY
              </button>
            </div>
          )}

          {/* The separate READY modal */}
          {bonusReadyModalVisible && <BonusReadyModal />}

          {/* After READY pressed -> show inline solve panel below board */}
          {showBonusSolveModal && <BonusSolveInline />}

          {/* If countdown active, show big timer + small instruction (panel still visible) */}
          {bonusState === "countdown" && (
            <div className="mt-6 flex flex-col items-center gap-4">
            
              {/* if inline solve hidden, show a button to open it */}
              {!showBonusSolveModal && !bonusHideBoard && <div className="mt-4"><button onClick={() => setShowBonusSolveModal(true)} className="px-6 py-3 rounded-xl bg-blue-500 text-white">Open Solve Box</button></div>}
            </div>
          )}

          {bonusState === "letters" && !bonusAwaitingReady && !bonusHideBoard && (
            <div className="mt-6">
              <div className="text-6xl font-black mb-4 text-yellow-300">{bonusPrize}</div>
              <h1 className="text-xl mb-2">Letters being revealed — R S T L N E are given</h1>
            </div>
          )}
        </div>

        {showBonusSelector && <BonusWinnerSelectorModal />}
        {showBonusLetterModal && <BonusLetterModal />}
        {bonusResult && <BonusResultModal result={bonusResult} />}
      </div>
    );
  }

  if (phase === "done") {
    const sorted = [...teams].sort((a, b) => b.total - a.total);
    return (
      <div className={cls("min-h-screen h-screen text-white flex flex-col items-center justify-center p-4", GRADIENT)}>
        <div className="max-w-6xl w-full mx-auto p-6 bg-white/10 rounded-2xl backdrop-blur-md">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-6 text-center">Game Over!</h1>
          <div className="text-lg font-semibold mb-3 text-center">
            {winners.length > 1 ? "Winners:" : "Winner:"} <span className="font-black text-yellow-300">{winners.join(", ")}</span>
          </div>
          <div className="mt-3 space-y-3">
            {sorted.map((t, i) => (
              <div key={i} className={cls("px-4 py-3 rounded-xl", i === 0 ? "bg-white/20" : "bg-white/10")}>
                <div className="flex items-center justify-between">
                  <div className="font-semibold flex items-center gap-3">
                    <span>{i + 1}. {t.name}</span>
                    {bonusWinnerName === t.name && <span className="text-xs uppercase px-2 py-1 rounded bg-yellow-300 text-black font-bold">BONUS WINNER</span>}
                  </div>
                  <div className="text-2xl font-black tabular-nums">${t.total.toLocaleString()}</div>
                </div>
                {t.prizes && t.prizes.length > 0 && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    <span className="text-sm opacity-80">Prizes won:</span>
                    {t.prizes.map((prize, idx) => (
                      <span
                        key={`${prize}-${idx}`}
                        className={cls(
                          "px-2 py-1 text-xs font-bold rounded-md",
                          prize === "T-SHIRT"
                            ? "bg-purple-600"
                            : prize === "PIN"
                              ? "bg-red-600"
                              : prize === "STICKER"
                                ? "bg-blue-600"
                                : prize === "MAGNET"
                                  ? "bg-gray-600"
                                  : prize === "KEYCHAIN"
                                    ? "bg-orange-600"
                                    : "bg-green-600"
                        )}
                      >
                        {prize}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-6 flex gap-2 justify-center flex-wrap">
            <button onClick={restartAll} className="px-4 py-2 rounded-xl bg-white text-black font-semibold hover:opacity-90">Play Again</button>
            <button onClick={backToSetup} className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 font-semibold">Back to Setup</button>
            <button onClick={() => setShowStats(true)} className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 font-semibold">Statistics</button>
          </div>
        </div>
        {showStats && <StatsModal />}
      </div>
    );
  }

  if (phase === "setup") {
    return (
      <div className={cls("min-h-screen h-screen text-white flex items-center justify-center p-4 sm:p-6", GRADIENT)}>
        <div className="max-w-7xl w-full mx-auto">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-6 text-center text-white [text-shadow:0_2px_4px_rgba(0,0,0,0.3)]">Wheel of Jon-Tune</h1>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white/10 rounded-2xl p-5 backdrop-blur-md">
              <h2 className="text-2xl font-bold tracking-tight mb-4 text-yellow-300">Game Setup</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm uppercase tracking-wider opacity-80" htmlFor="team-count-input">Number of Teams</label>
                  <input
                    id="team-count-input"
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
                    className="w-24 mt-1 px-3 py-2 rounded-xl bg-white/20 text-white font-semibold"
                  />
                </div>
                <div className="flex-1 w-full">
                  <div className="text-sm uppercase tracking-wider opacity-80">Team Names</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                    {Array.from({ length: teamCount }).map((_, i) => (
                      <input
                        key={i}
                        value={teamNames[i] || ""}
                        onChange={(e) => setTeamNames((arr) => { const n = [...arr]; n[i] = e.target.value; return n; })}
                        className="w-full px-3 py-2 rounded-xl bg-white/20 text-white font-semibold placeholder:text-white/50"
                        placeholder={`Team ${String.fromCharCode(65 + i)}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6 flex gap-2">
                <button onClick={() => {
                  sfx.play("startGame");
                  const n = Math.min(8, Math.max(2, teamCount));
                  const names = teamNames.slice(0, n).map((x, i) => x || `Team ${String.fromCharCode(65 + i)}`);
                  setTeams(names.map((name) => ({ name, total: 0, round: 0, prizes: [], holding: null })));
                  setActive(0);
                  setAngle(0);
                  setHasSpun(false);
                  setPhase("play");
                  setZoomed(false);
                  setMysteryPrize(null);
                  setWonSpecialWedges([]);
                  setCurrentWedges([...WEDGES]);
                  setGameStats({
                    totalSpins: 0,
                    bankrupts: 0,
                    loseTurns: 0,
                    puzzlesSolved: 0,
                    vowelsBought: 0,
                    correctGuesses: 0,
                    incorrectGuesses: 0,
                    teamStats: {},
                  });
                  setBonusResult(null);
                  setBonusWinnerName(null);
                  winnersRef.current = [];
                  setWinners([]);
                }} className="px-5 py-2 rounded-xl bg-white text-black font-bold hover:opacity-90 transition-opacity">Start Game</button>
                <button onClick={sfx.toggleTheme} className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 font-semibold transition-colors">{sfx.themeOn ? "Music Off" : "Music On"}</button>
              </div>
            </div>

            <div className="bg-white/10 rounded-2xl p-5 backdrop-blur-md">
              <h2 className="text-2xl font-bold tracking-tight mb-4 text-yellow-300">How to Play</h2>
              <div className="space-y-4 text-white/95">
                <div>
                  <h3 className="font-semibold text-lg">The Goal</h3>
                  <p className="text-sm opacity-80">Work with your team to solve the word puzzle and earn the most money!</p>
                </div>
                <div>

                  <p className="text-sm opacity-80">Work with your team to solve the word puzzle and earn the most money!</p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">On Your Turn</h3>
                  <ul className="list-disc list-inside mt-1 space-y-1.5 text-sm opacity-80 pl-2">
                    <li><strong>Spin the Wheel:</strong> Press and hold the SPIN button. Land on a dollar amount, then guess a consonant.</li>
                    <li><strong>Buy a Vowel:</strong> If you have at least ${VOWEL_COST}, you can pay to reveal a vowel.</li>
                    <li><strong>Solve the Puzzle:</strong> Think you know it? A correct solve wins your round bank plus a bonus!</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Watch Out For...</h3>
                  <ul className="list-disc list-inside mt-1 space-y-1.5 text-sm opacity-80 pl-2">
                    <li><strong className="text-red-400">Bankrupt:</strong> You lose all your money for the current round.</li>
                    <li><strong>Lose a Turn:</strong> Your turn ends immediately.</li>
                  </ul>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // ===== Main game layout =====
  const baseBgColor = isCharging ? "#16a34a" : "#22c55e";
  const fillBgColor = "rgba(4,120,87,0.95)";

  return (
    <div className={cls("min-h-screen h-screen text-white flex flex-col items-center p-4 overflow-hidden", GRADIENT)}>
      <div className={cls("w-full h-full flex flex-col", (zoomed || showWinScreen) && "invisible")}>
        <header className="w-full flex justify-between items-center max-w-7xl mx-auto">
          <div className="flex-1 flex justify-start">
            <button onClick={backToSetup} className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-sm font-semibold">← Setup</button>
          </div>
          <div className="flex-1 text-center" />
          <div className="flex-1 flex items-center justify-end gap-4">
            <button onClick={sfx.toggleTheme} className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-sm font-semibold hidden sm:block">{sfx.themeOn ? "Music Off" : "Music On"}</button>
            <input type="range" min="0" max="1" step="0.1" value={sfx.volume} onChange={(e) => sfx.setVolume(parseFloat(e.target.value))} />
            <button onClick={toggleFullscreen} className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-sm font-semibold">Full</button>
          </div>
        </header>

        <main className="w-full max-w-7xl mx-auto flex-1 flex flex-col lg:flex-row items-center lg:items-center gap-4 min-h-0">
          <div className="flex flex-col items-center justify-around gap-4 w-full lg:w-1/2 h-full py-4">
            <div className="relative flex items-center justify-center">
              <canvas ref={canvasRef} style={{ width: `${wheelPx}px`, height: `${wheelPx}px` }} />

              <div className="absolute w-[20%] h-[20%] rounded-full bg-no-repeat" style={{ backgroundImage: `url(hub-image.png)`, backgroundSize: '110%', backgroundPosition: '10% -30px' }}>
                <div aria-hidden="true" className="w-full h-full bg-green-500/50 rounded-full" style={{ clipPath: `inset(0 ${100 - spinPower}% 0 0)`, transition: snapChargeToZero ? "none" : "clip-path 80ms linear" }} />
              </div>
            </div>

            <div className="flex justify-center flex-wrap gap-4 items-center">
              <button
                onMouseDown={startCharge}
                onMouseUp={endCharge}
                onMouseLeave={endCharge}
                onTouchStart={(e) => { e.preventDefault(); startCharge(); }}
                onTouchEnd={(e) => { e.preventDefault(); endCharge(); }}
                disabled={!canSpin}
                style={canSpin ? { backgroundImage: `linear-gradient(to right, ${fillBgColor} ${spinPower}%, ${baseBgColor} ${spinPower}%)`, transition: snapChargeToZero ? "none" : "background-image 80ms linear" } : {}}
                className={cls("rounded-xl font-bold text-xl px-8 py-4 transition-colors", !canSpin ? "bg-gray-700/60 text-gray-400 cursor-not-allowed" : "text-white hover:brightness-110")}
              >
                <span className="select-none">SPIN (Hold)</span>
              </button>

              <button onClick={() => setShowVowelModal(true)} disabled={!canBuyVowel} className={cls("px-6 py-3 rounded-xl font-bold text-lg", !canBuyVowel ? "bg-gray-700/60 text-gray-400 cursor-not-allowed" : "bg-blue-500 text-white hover:bg-blue-600")}>
                BUY VOWEL (${VOWEL_COST})
              </button>
              <button onClick={() => setShowSolveModal(true)} disabled={!canSolve} className={cls("px-6 py-3 rounded-xl font-bold text-lg", !canSolve ? "bg-gray-700/60 text-gray-400 cursor-not-allowed" : "bg-purple-500 text-white hover:bg-purple-600")}>
                SOLVE
              </button>
            </div>

            <div className="w-full max-w-2xl p-2">
              <div className="flex flex-wrap justify-center gap-2">
                {LETTERS.map((ch) => (
                  <button key={ch} onClick={() => guessLetter(ch)} disabled={!awaitingConsonant || VOWELS.has(ch) || letters.has(ch)} className={cls("w-9 h-9 sm:w-10 sm:h-10 rounded-md font-bold",
                    VOWELS.has(ch) ? "bg-blue-800/60 text-blue-200" : letters.has(ch) ? "bg-gray-700/60 text-gray-400" : "bg-white/20 text-white",
                    awaitingConsonant && !VOWELS.has(ch) && !letters.has(ch) ? "hover:bg-white/30 hover:ring-2 hover:ring-white cursor-pointer" : "cursor-not-allowed"
                  )}>
                    {ch}
                  </button>
                ))}
              </div>
              <div className="text-center mt-2 text-sm opacity-75">{awaitingConsonant ? "Click a consonant or use keyboard" : "Spin, buy a vowel, or solve"}</div>
            </div>
          </div>

          <div className="flex flex-col gap-4 w-full lg:w-1/2 h-full justify-center">
            <h2 className="text-2xl font-bold tracking-widest uppercase text-center">{category}</h2>
            <div className="flex flex-wrap justify-center gap-2 p-4 rounded-xl backdrop-blur-md bg-white/10 w-full">
              {wordTokens.map((tok, i) => {
                if (tok.type === "space") return <div key={i} className="w-4 h-10 sm:h-14 flex-shrink-0 fullscreen:w-6" />;
                return (
                  <div key={i} className="flex gap-2">
                    {tok.cells.map((cell, j) => {
                      const isSpecial = !isLetter(cell.ch);
                      return (
                        <div key={`${i}-${j}`} className={cls("w-8 h-12 sm:w-10 sm:h-16 text-2xl sm:text-3xl font-bold flex items-center justify-center rounded-md", cell.shown ? "bg-yellow-300 text-black shadow-lg" : "bg-blue-950/80 text-white", isSpecial && "bg-transparent text-white")}>
                          {isSpecial ? cell.ch : (cell.shown ? cell.ch : "")}
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

      {/* Zoom overlay */}
      <div className={cls("fixed inset-0 z-50 flex items-center justify-center", !zoomed && "hidden pointer-events-none")}>
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative flex items-center justify-center z-10">
          <canvas ref={zoomCanvasRef} style={{ width: `${wheelPx}px`, height: `${wheelPx}px` }} />
          <div className="absolute w-[20%] h-[20%] rounded-full bg-no-repeat" style={{ backgroundImage: `url(hub-image.png)`, backgroundSize: '110%', backgroundPosition: '10% -50px' }} />
        </div>
        {landed && (
          <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-7xl sm:text-8xl lg:text-9xl font-black uppercase text-white [text-shadow:0_4px_8px_rgba(0,0,0,0.8)] pointer-events-none z-20">
            {landed?.t === "cash" && `$${landed.v.toLocaleString()}`}
            {landed?.t === "bankrupt" && "BANKRUPT"}
            {landed?.t === "lose" && "LOSE A TURN"}
            {landed?.prize?.type === "tshirt" && "T-SHIRT PRIZE!"}
            {landed?.t !== "cash" && landed?.t !== "bankrupt" && landed?.t !== "lose" && !landed?.prize && landed.label}
          </div>
        )}
      </div>

      {showWinScreen && <WinScreen winner={roundWinner} />}
      {showVowelModal && <VowelModal />}
      {showSolveModal && <SolveModal />}
      {showMysterySpinner && <MysterySpinnerModal />}
      {showBonusLetterModal && <BonusLetterModal />}
      {/* Bonus Solve is inline (not a modal) */}
      {showBonusSelector && <BonusWinnerSelectorModal />}
      {bonusResult && <BonusResultModal result={bonusResult} />}
      {showStats && <StatsModal />}
    </div>
  );
}

/* End of updated component */
