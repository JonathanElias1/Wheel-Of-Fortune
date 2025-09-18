import React, { useEffect, useMemo, useRef, useState } from "react";

/* Wheel of Jon-Tune — full component (updated)
   - MYSTERY wedge remains MYSTERY permanently and is never converted to cash
   - Mystery landings never award cash (only prize items)
   - Mystery spinner always returns a prize (never converts to cash)
   - T-SHIRT wedge is NOT converted to cash after being won (preserved)
   - Supports up to 100 teams (inputs and generation adjusted)
*/

const GRADIENT = "bg-[radial-gradient(110%_110%_at_0%_0%,#5b7fff_0%,#21bd84_100%)]";
const BASE_WHEEL_PX = 500;
const VOWEL_COST = 800;
// NEW: max chars for team names
const TEAM_NAME_MAX = 15;
// limit teams
const MAX_TEAMS = 100;

const WEDGES = [
  { t: "cash", v: 1200, c: "#00AADD" },
  { t: "wild", label: "MYSTERY", c: "#E6007E" },
  { t: "cash", v: 300, c: "#E23759" },
  { t: "cash", v: 700, c: "#D15C22" },
  { t: "lose", label: "LOSE A TURN", c: "#B1A99E" },
  { t: "cash", v: 650, c: "#EDD302" },
  { t: "bankrupt", label: "BANKRUPT", c: "#222222" },
  { t: "tshirt", label: "T-SHIRT", c: "#c386f8", v: 0, prize: { type: "tshirt", label: "T-SHIRT", color: "#c386f8" }, size: 0.4 },
  { t: "bankrupt", label: "BANKRUPT", c: "#222222" },
  { t: "cash", v: 600, c: "#E23759" },
  { t: "cash", v: 250, c: "#D15C22" },
  { t: "cash", v: 400, c: "#8C4399" },
  { t: "cash", v: 800, c: "#C9237B" },
  { t: "bankrupt", label: "BANKRUPT", c: "#222222" },
  { t: "cash", v: 100, c: "#00AADD" },
  { t: "cash", v: 550, c: "#95C85A" },
  { t: "cash", v: 700, c: "#6F2597" },
  { t: "bankrupt", label: "BANKRUPT", c: "#222222" },
  { t: "cash", v: 150, c: "#E23759" },
  { t: "cash", v: 500, c: "#C9237B" },
  { t: "cash", v: 350, c: "#8C4399" },
  { t: "cash", v: 200, c: "#D15C22" },
  { t: "bankrupt", label: "BANKRUPT", c: "#222222" },
  { t: "cash", v: 300, c: "#4F9F4F" },
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
      a.loop = false;
      a.pause();
      try {
        a.currentTime = 0;
      } catch (e) {}
      const p = a.play();
      if (p !== undefined) p.catch((e) => console.error(`Failed to play sound: ${k}`, e));
    } catch (e) {
      console.error(`Failed to play sound: ${k}`, e);
    }
  };
  const stop = (k) => {
    const a = ref.current[k];
    if (!a) return;
    try {
      a.loop = false;
      a.pause();
      try {
        a.currentTime = 0;
      } catch (e) {}
    } catch (e) {
      console.error(`Failed to stop sound: ${k}`, e);
    }
  };
  const loop = (k) => {
    const a = ref.current[k];
    if (!a) return;
    try {
      a.pause();
      try {
        a.currentTime = 0;
      } catch (e) {}
      a.loop = true;
      const p = a.play();
      if (p !== undefined) p.catch((e) => console.error(`Failed to loop sound: ${k}`, e));
    } catch (e) {
      console.error(`Failed to loop sound: ${k}`, e);
    }
  };
  const stopLoop = (k) => {
    const a = ref.current[k];
    if (!a) return;
    try {
      a.loop = false;
      a.pause();
      try {
        a.currentTime = 0;
      } catch (e) {}
    } catch (e) {
      console.error(`Failed to stopLoop sound: ${k}`, e);
    }
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
  { category: "PLACE", answer: "JIMMYJONS" },
  { category: "PHRASE", answer: "HAPPY BIRTHDAY JON" },
  { category: "CLASSIC PHRASE", answer: "JON SAVED MY LIFE" },
  { category: "RELIGIOUS STUFF", answer: "JONELUJAH" },
  { category: "POLITICS", answer: "JONTRARIAN" },
  { category: "MOVIE QUOTE", answer: "LOOK THE PROBLEM IS OVER" },
  { category: "CULINARY", answer: "JON FOOD" },
  { category: "WORD", answer: "MNEMONIC" },
  { category: "SHOWS", answer: "JON SNOW" },
  { category: "EVENT", answer: "JONCON" },
  { category: "WORD", answer: "LYMPH" },
  { category: "MUSIC", answer: "THIS IS THE RHYTHM OF THE NIGHT" },
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
  if (!len || len <= 0) return 0;
  return (i + 1) % len;
}

function WinScreen({ winner }) {
  const bouncerRef = useRef(null);
  useEffect(() => {
    const bouncer = bouncerRef.current;
    if (!bouncer) return;
    let animationFrameId = null;
    let impulseInterval = null;
    const rand = (min, max) => min + Math.random() * (max - min);
    const randSign = () => (Math.random() < 0.5 ? -1 : 1);
    const baseSize = 48 + Math.random() * 80;
    bouncer.style.width = `${baseSize}px`;
    bouncer.style.height = `${baseSize}px`;
    const pos = {
      x: Math.random() * Math.max(1, window.innerWidth - baseSize),
      y: Math.random() * Math.max(1, window.innerHeight - baseSize),
      vx: rand(2, 6) * randSign(),
      vy: rand(2, 6) * randSign(),
      rot: rand(-0.5, 0.5),
      rotSpeed: rand(-0.04, 0.04),
      scale: 0.95 + Math.random() * 0.4,
    };
    impulseInterval = setInterval(() => {
      const impulsePower = Math.random() < 0.18 ? rand(3, 9) : rand(0.8, 3);
      pos.vx += impulsePower * randSign();
      pos.vy += impulsePower * randSign();
      pos.rotSpeed += rand(-0.18, 0.18);
      pos.scale = 0.9 + Math.random() * 0.6;
      if (Math.random() < 0.06) {
        pos.x = Math.min(window.innerWidth - baseSize, Math.max(0, pos.x + rand(-120, 120)));
        pos.y = Math.min(window.innerHeight - baseSize, Math.max(0, pos.y + rand(-120, 120)));
      }
    }, 400 + Math.random() * 600);
    const animate = () => {
      const imageSize = { width: bouncer.offsetWidth, height: bouncer.offsetHeight };
      pos.x += pos.vx;
      pos.y += pos.vy;
      pos.rot += pos.rotSpeed;
      pos.x += rand(-0.4, 0.4);
      pos.y += rand(-0.4, 0.4);
      pos.rotSpeed *= 0.97;
      if (pos.x <= 0 || pos.x >= window.innerWidth - imageSize.width) {
        pos.vx *= -0.7;
        pos.x = Math.max(0, Math.min(window.innerWidth - imageSize.width, pos.x));
        pos.rotSpeed += rand(-0.12, 0.12);
      }
      if (pos.y <= 0 || pos.y >= window.innerHeight - imageSize.height) {
        pos.vy *= -0.7;
        pos.y = Math.max(0, Math.min(window.innerHeight - imageSize.height, pos.y));
        pos.rotSpeed += rand(-0.12, 0.12);
      }
      const scale = 0.95 + Math.sin(performance.now() / 220 + pos.x) * 0.08 + (Math.random() * 0.03);
      const skewX = Math.sin(pos.rot * 2) * 2;
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
        <p className="text-sm text-white/90 mt-4 opacity-95">Press <strong>Enter</strong> or <strong>Spacebar</strong> to skip</p>
      </div>
    </div>
  );
}

export default function App() {
  const [phase, setPhase] = useState("setup");
  const [teamCount, setTeamCount] = useState(3);
  // default team names as Team 1/2/3 for scalability
  const [teamNames, setTeamNames] = useState(["Team 1", "Team 2", "Team 3"]);
  const [puzzles, setPuzzles] = useState(FALLBACK);
  const [bonusPuzzles, setBonusPuzzles] = useState([]);
  const [idx, setIdx] = useState(0);
  const [letters, setLetters] = useState(() => new Set());
  const [board, setBoard] = useState(() => normalizeAnswer(FALLBACK[0].answer));
  const [category, setCategory] = useState(FALLBACK[0].category || "PHRASE");
  const wheelContainerRef = useRef(null);
  const zoomContainerRef = useRef(null);
  const [teams, setTeams] = useState([
    { name: "Team 1", total: 0, round: 0, prizes: [], holding: [] },
    { name: "Team 2", total: 0, round: 0, prizes: [], holding: [] },
    { name: "Team 3", total: 0, round: 0, prizes: [], holding: [] },
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
  const finishingRef = useRef(false);

  const [testTshirtMode, setTestTshirtMode] = useState(false);
  const [bonusPrep, setBonusPrep] = useState(false);
  const chargeIntervalRef = useRef(null);
  const chargeSnapshotRef = useRef(0);
  const revealTimeoutRef = useRef(null);
  const bonusResultHideTimeoutRef = useRef(null);
  const winShowTimeoutRef = useRef(null);
  const winHideTimeoutRef = useRef(null);
  const [tshirtHolder, setTshirtHolder] = useState(null);
  const [mysteryPrize, setMysteryPrize] = useState(null);
  const [showMysterySpinner, setShowMysterySpinner] = useState(false);
  const [wonSpecialWedges, setWonSpecialWedges] = useState([]); // kept for stats but NOT used to convert wedges
  const bonusPrepIntervalRef = useRef(null);
  const [testMode, setTestMode] = useState(false);
  const [readyDisabled, setReadyDisabled] = useState(false);
  const bonusSpinRef = useRef(null);
  const bonusWinnerSpinRef = useRef(null);
  // dedicated ref for the MYSTERY spinner so we don't collide with bonus round spins
  const mysterySpinRef = useRef(null);

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
  const [isRevealingLetters, setIsRevealingLetters] = useState(false);

  

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
  const [bonusReadyModalVisible, setBonusReadyModalVisible] = useState(false);
  const [bonusRevealing, setBonusRevealing] = useState(false);
  const [roundsCount, setRoundsCount] = useState(5);
  const [selectedPuzzles, setSelectedPuzzles] = useState(FALLBACK);

// ---- free-typing setup helpers ----
  const [tempTeamCount, setTempTeamCount] = useState(String(teamCount));
  const [tempRoundsCount, setTempRoundsCount] = useState(String(roundsCount));

  const chargeLoopTimeoutRef = useRef(null);

// keep temps synced when phase/teamCount/roundsCount change (so returning to setup shows real current values)
  useEffect(() => {
    if (phase === "setup") {
      setTempTeamCount(String(teamCount));
      setTempRoundsCount(String(roundsCount));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, teamCount, roundsCount]);

  const parseIntSafe = (str) => {
    const n = parseInt((str || "").trim(), 10);
    return Number.isFinite(n) ? n : NaN;
  };

// Helper to build/pad/truncate a normalized array of team names
function makeTeamNamesArray(desiredCount, sourceNames = []) {
  const out = Array.from({ length: desiredCount }, (_, i) => {
    const raw = sourceNames[i];
    if (raw && String(raw).trim().length > 0) return String(raw).slice(0, TEAM_NAME_MAX);
    return `Team ${i + 1}`;
  });
  return out;
}

// replace existing applyTempTeamCount
function applyTempTeamCount() {
  const n = parseIntSafe(tempTeamCount);
  // clamp to allowed range 2..MAX_TEAMS; fall back to previous teamCount if invalid
  const final = Number.isFinite(n) ? Math.min(MAX_TEAMS, Math.max(2, n)) : teamCount;
  setTeamCount(final);

  // ensure teamNames length matches final and trim names to TEAM_NAME_MAX
  setTeamNames((arr) => {
    const next = makeTeamNamesArray(final, arr);
    return next;
  });

  setTempTeamCount(String(final));
}


// replace existing applyTempRoundsCount (keeps same semantics)
function applyTempRoundsCount() {
  const n = parseIntSafe(tempRoundsCount);
  const maxRounds = Math.max(1, puzzles.length || FALLBACK.length);
  const final = Number.isFinite(n) ? Math.min(Math.max(1, n), maxRounds) : roundsCount;
  setRoundsCount(final);
  setTempRoundsCount(String(final));
}

// ---- end helpers ----

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

  const sfx = useSfx();

  const displayBonusPlayer = useMemo(() => {
    if (bonusWinnerSpinning) return selectedBonusWinner || "?";
    if (Array.isArray(winners) && winners.length) return winners[0];
    if (Array.isArray(winnersRef.current) && winnersRef.current.length) return winnersRef.current[0];
    const max = teams.length ? Math.max(...teams.map((t) => t.total)) : -Infinity;
    const top = teams.find((t) => t.total === max);
    return top?.name || teams[active]?.name || "Team";
  }, [bonusWinnerSpinning, selectedBonusWinner, winners, teams, active]);

  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  };

  const selectRandomPuzzles = (pool, n) => {
    if (!Array.isArray(pool) || pool.length === 0) return FALLBACK.slice(0, n);
    const count = Math.max(1, Math.min(n, pool.length));
    const shuffled = shuffle(pool);
    return shuffled.slice(0, count);
  };

  const isSolved = () => board.every((b) => b.shown);
  const allVowelsGuessed = Array.from(VOWELS).every((vowel) => letters.has(vowel));
  const canSpin = !spinning && !awaitingConsonant && !isSolved() && !bonusRound && !isRevealingLetters;
  const canBuyVowel = (teams[active]?.round ?? 0) >= VOWEL_COST && !spinning && !isSolved() && hasSpun && !allVowelsGuessed && !bonusRound && !isRevealingLetters;
  // allow solve while mystery spinner is shown so solver can claim the final mystery prize immediately
  const canSolve = ( (!spinning || showMysterySpinner) && hasSpun && !isSolved() && !bonusRound && !isRevealingLetters );

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  if (chargeLoopTimeoutRef.current) clearTimeout(chargeLoopTimeoutRef.current);
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
    requestAnimationFrame(() => drawWheel(angle));
  }, [angle, wheelPx, phase, isFullscreen, isCharging, spinPower, zoomed, currentWedges]);

  useEffect(() => () => {
    if (bonusPrepIntervalRef.current) {
      clearInterval(bonusPrepIntervalRef.current);
      bonusPrepIntervalRef.current = null;
    }
  }, []);

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
    const wedgesToRender = testTshirtMode ? currentWedges.map((w) => (w.t === "tshirt" ? { ...w, size: 3 } : w)) : currentWedges;
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

  function wedgeIndexForAngle(a) {
    const two = Math.PI * 2;
    const normalizedAngle = ((a % two) + two) % two;
    const pointerAngle = (3 * Math.PI) / 2 % two;
    const wheelPositionAtPointer = (two - normalizedAngle + pointerAngle) % two;
    const wedgesToCheck = testTshirtMode ? currentWedges.map((w) => (w.t === "tshirt" ? { ...w, size: 3 } : w)) : currentWedges;
    const totalSize = wedgesToCheck.reduce((sum, w) => sum + (w.size || 1), 0) || 1;
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
    const totalSize = wedgesToCheck.reduce((sum, w) => sum + (w.size || 1), 0) || 1;
    const baseArc = two / totalSize;
    let accumulated = 0;
    for (let i = 0; i < idx; i++) {
      accumulated += (wedgesToCheck[i].size || 1) * baseArc;
    }
    const wedgeArc = (wedgesToCheck[idx]?.size || 1) * baseArc;
    const mid = accumulated + wedgeArc / 2;
    const pointerAngle = (3 * Math.PI) / 2 % two;
    const normalizedAngle = (two - mid + pointerAngle) % two;
    return normalizedAngle;
  }

  
     const startCharge = () => {
    if (isRevealingLetters || finishingRef.current) return;
    if (!canSpin || isCharging) return;
    setIsCharging(true);
    setSnapChargeToZero(true);
    setSpinPower(0);
    chargeSnapshotRef.current = 0;
    chargeDirRef.current = 1;
    setChargeSession((s) => s + 1);
    
    // Clear any existing timeout first
    if (chargeLoopTimeoutRef.current) {
      clearTimeout(chargeLoopTimeoutRef.current);
      chargeLoopTimeoutRef.current = null;
    }
    
    try {
      sfx.play("chargeUp");
    } catch {}
    
    chargeLoopTimeoutRef.current = setTimeout(() => {
      // Only start looping if we're still charging
      if (isCharging) {
        try {
          sfx.loop("chargeUp");
        } catch {}
      }
      chargeLoopTimeoutRef.current = null;
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
  }

  const endCharge = () => {
  // Clear the charge loop timeout to prevent delayed loop start
  if (chargeLoopTimeoutRef.current) {
    clearTimeout(chargeLoopTimeoutRef.current);
    chargeLoopTimeoutRef.current = null;
  }
  
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
    if (finishingRef.current || isRevealingLetters) return;
    if (spinning || awaitingConsonant || isSolved() || bonusRound) return;
    setLanded(null);
    setHasSpun(true);
    setSpinning(true);
    setZoomed(true);
    sfx.play("spin");
    const currentTeamNameForStats = teams[active]?.name ?? `Team ${active + 1}`;
    setGameStats((prev) => {
      const prevTeam = prev.teamStats[currentTeamNameForStats] || {};
      return {
        ...prev,
        totalSpins: prev.totalSpins + 1,
        teamStats: {
          ...prev.teamStats,
          [currentTeamNameForStats]: { ...prevTeam, spins: (prevTeam.spins || 0) + 1 },
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
          // defensive: ensure currentWedges exists
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

  function handleLanding(w) {
    if (!w) {
      passTurn();
      return;
    }
    if (w.t === "wild") {
      sfx.play("wild");
      const prizes = ["PIN", "STICKER", "T-SHIRT", "MAGNET", "KEYCHAIN"];
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
            const targetAngle = angleForWedgeIndex(mysteryIndex, currentWedges, testTshirtMode);
            setAngle(targetAngle);
          }

          // IMPORTANT: always treat mystery final as a PRIZE (no cash)
          if (String(finalPrize).toUpperCase().includes("T-SHIRT")) {
            sfx.play("tshirt");
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
      sfx.play("cashDing2");
      setAwaitingConsonant(true);
    } else if (w.t === "tshirt") {
      sfx.play("tshirt");
      setAwaitingConsonant(true);
    } else if (w.t === "bankrupt") {
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
      sfx.play("bankrupt");
      if (tshirtHolder === active) setTshirtHolder(null);
      passTurn();
    } else if (w.t === "lose") {
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
      sfx.play("buzzer");
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
        return {
          ...prev,
          correctGuesses: prev.correctGuesses + 1,
          teamStats: {
            ...prev.teamStats,
            [currentTeamName]: { ...prevTeam, correctGuesses: (prevTeam.correctGuesses || 0) + 1 },
          },
        };
      });

      // NEW: Determine wedge value ONLY when it's a cash wedge.
      // Mystery/prize/tshirt should not award money per letter.
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
        setTshirtHolder(active);
      } else if (landed?.t === "prize" && landed.prize?.label) {
        pushHolding(landed.prize.label);
      } else if (landed?.t === "cash" && typeof landed.label === "string" && landed.label.toUpperCase().includes("T-SHIRT")) {
        pushHolding("T-SHIRT");
      }
      hitIndices.forEach((boardIndex, i) => {
        setTimeout(() => {
          sfx.play("ding");
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
          teamStats: {
            ...prev.teamStats,
            [currentTeamName]: { ...prevTeam, incorrectGuesses: (prevTeam.incorrectGuesses || 0) + 1 },
          },
        };
      });
      sfx.play("wrongLetter");
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
      sfx.play("buzzer");
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
          teamStats: {
            ...prev.teamStats,
            [currentTeamName]: { ...prevTeam, correctGuesses: (prevTeam.correctGuesses || 0) + 1 },
          },
        };
      });
      hitIndices.forEach((boardIndex, i) => {
        setTimeout(() => {
          sfx.play("ding");
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
          teamStats: {
            ...prev.teamStats,
            [currentTeamName]: { ...prevTeam, incorrectGuesses: (prevTeam.incorrectGuesses || 0) + 1 },
          },
        };
      });
      sfx.play("wrongLetter");
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
      sfx.play("buzzer");
      passTurn();
    }
    setSolveGuess("");
  }

  function finishPuzzle(solved, lastWedge) {
    if (solved) {
      if (finishingRef.current) return;
      finishingRef.current = true;
      setIsRevealingLetters(true);

      // E: increment puzzlesSolved in gameStats and per-team puzzlesSolved
      try {
        const solverName = teams[active]?.name;
        setGameStats((prev) => ({
          ...prev,
          puzzlesSolved: (prev.puzzlesSolved || 0) + 1,
          teamStats: {
            ...prev.teamStats,
            [solverName]: {
              ...(prev.teamStats[solverName] || {}),
              puzzlesSolved: ((prev.teamStats[solverName] || {}).puzzlesSolved || 0) + 1,
            },
          },
        }));
      } catch (err) {
        // defensive - don't crash if teams/active not available for some reason
        setGameStats((prev) => ({ ...prev, puzzlesSolved: (prev.puzzlesSolved || 0) + 1 }));
      }

      // Resolve spinner if needed and capture the final landed wedge locally
      let resolvedLanded = lastWedge || landed;

      // C: defensively clear any running mystery/bonus intervals so we don't leak or double-finalize
      try {
        if (mysterySpinRef.current) {
          clearInterval(mysterySpinRef.current);
          mysterySpinRef.current = null;
        }
        if (bonusSpinRef.current) {
          clearInterval(bonusSpinRef.current);
          bonusSpinRef.current = null;
        }
      } catch (e) {
        // ignore
      }

      if (showMysterySpinner) {
        // If we were mid-mystery-spin, decide final prize now
        const finalPrize = mysteryPrize || BONUS_PRIZES[Math.floor(Math.random() * BONUS_PRIZES.length)];
        setMysteryPrize(finalPrize);
        setShowMysterySpinner(false);

        // IMPORTANT: Always treat finalPrize as a PRIZE (no numeric cash results)
        resolvedLanded = {
          t: "prize",
          label: finalPrize,
          prize: { type: String(finalPrize).toLowerCase(), label: finalPrize, color: "#E6007E" },
        };
        setLanded(resolvedLanded);
        if (String(finalPrize).toUpperCase().includes("T-SHIRT")) {
          try {
            sfx.play("tshirt");
          } catch (e) {}
        }
      } else {
        // ensure we use the freshest landed available
        resolvedLanded = landed || lastWedge || resolvedLanded;
      }

      // Update teams: move any 'holding' into prizes AND also award resolvedLanded prize directly to solver
      setTeams((prevTs) => {
        const specialWedgesWon = [];
        const updated = prevTs.map((t, i) => {
          if (i !== active) return { ...t, round: 0, holding: [] };

          // solver team receives round bank + $300 bonus (preserved behavior)
          const extraFromCash = resolvedLanded && resolvedLanded.t === "cash" && typeof resolvedLanded.v === "number" ? resolvedLanded.v : 0;
          const updatedTeam = { ...t, total: t.total + t.round + extraFromCash + 300, round: 0 };

          // move earned holding -> prizes
          const holdingArr = Array.isArray(t.holding) ? t.holding : t.holding ? [t.holding] : [];
          if (holdingArr.length > 0) {
            const normalizedHolding = holdingArr.map((h) => String(h).toUpperCase());
            updatedTeam.prizes = [...(updatedTeam.prizes || []), ...normalizedHolding];
            normalizedHolding.forEach((h) => {
              if (h === "T-SHIRT") specialWedgesWon.push("tshirt");
              else specialWedgesWon.push("mystery");
            });
          }

          // ALSO: if resolvedLanded is a prize (mystery) and solver hasn't already received it via holding, award it now
          if (resolvedLanded && resolvedLanded.t === "prize" && resolvedLanded.prize && resolvedLanded.prize.label) {
            const prizeLabel = String(resolvedLanded.prize.label).toUpperCase();
            updatedTeam.prizes = updatedTeam.prizes || [];
            if (!updatedTeam.prizes.includes(prizeLabel)) {
              updatedTeam.prizes.push(prizeLabel);
              // keep special wedge bookkeeping consistent: T-SHIRT is a tshirt wedge; others count as mystery
              if (prizeLabel === "T-SHIRT") {
                specialWedgesWon.push("tshirt");
              } else {
                specialWedgesWon.push("mystery");
              }
            }
          }

          updatedTeam.holding = []; // clear holding after awarding
          return updatedTeam;
        });

        // record special wedges for stats/record but DO NOT convert/replace any wedges
        setWonSpecialWedges(specialWedgesWon);
        const max = updated.length ? Math.max(...updated.map((t) => t.total)) : -Infinity;
        const topTeams = updated.filter((t) => t.total === max);
        const winnerNames = topTeams.map((t) => t.name);
        winnersRef.current = winnerNames;
        setWinners(winnerNames);

        return updated;
      });

      // If the resolvedLanded included a tshirt prize that we just awarded to the solver via the prizes push
      // ensure tshirtHolder is correctly set to the solver index
      if (resolvedLanded && resolvedLanded.t === "prize" && resolvedLanded.prize && String(resolvedLanded.prize.label).toUpperCase().includes("T-SHIRT")) {
        try {
          setTshirtHolder(active);
        } catch (e) {}
      }

      // Reveal remaining letters (the logic below mirrors earlier behavior)
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
        }, i * 500);
      });

      const totalRevealTime = hideIndices.length * 500;
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
      }, totalRevealTime + 250);
    } else {
      // not solved: clear round bank / holding for all teams
      setTeams((ts) => ts.map((t) => ({ ...t, round: 0, holding: [] })));
    }
  }


  function passTurn() {
    if (!teams || teams.length === 0) {
      setAwaitingConsonant(false);
      return;
    }
    setActive((a) => nextIdx(a, teams.length));
    setAwaitingConsonant(false);
  }

  function nextPuzzle() {
    finishingRef.current = false;

    // IMPORTANT CHANGE: Do NOT convert T-SHIRT wedges to cash.
    // We keep MYSTERY (wild) and T-SHIRT wedges exactly as-is in currentWedges.
    // Clear tshirtHolder only when appropriate (we reset holder between puzzles).
    if (wonSpecialWedges.length > 0) {
      setTshirtHolder(null); // reset holder across puzzles
      setWonSpecialWedges([]); // keep for stats but do not mutate wedges
    }

    setMysteryPrize(null);
    const next = idx + 1;
    if (next >= selectedPuzzles.length) {
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

  function startBonusWinnerSelector() {
    setBonusWinnerSpinning(true);
    let spinCount = 0;
    const maxSpins = 20 + Math.floor(Math.random() * 15);
    const topTeams = teams.filter((t) => winners.includes(t.name));
    if (!topTeams || topTeams.length === 0) {
      // nothing to select
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

  function startBonusRound() {
    setBonusPrize("");
    setBonusHideBoard(true);
    setBonusSpinning(true);
    sfx.play("spin");

    let spinCount = 0;
    const maxSpins = 30 + Math.floor(Math.random() * 20);

    // clear any existing bonus spinner first
    if (bonusSpinRef.current) {
      clearInterval(bonusSpinRef.current);
      bonusSpinRef.current = null;
    }

    bonusSpinRef.current = setInterval(() => {
      setBonusPrize(BONUS_PRIZES[spinCount % BONUS_PRIZES.length]);
      spinCount++;

      if (spinCount >= maxSpins) {
        // stop this bonus spinner
        if (bonusSpinRef.current) {
          clearInterval(bonusSpinRef.current);
          bonusSpinRef.current = null;
        }

        const finalPrize = BONUS_PRIZES[Math.floor(Math.random() * BONUS_PRIZES.length)];
        setBonusPrize(finalPrize);
        setBonusSpinning(false);

        setTimeout(() => {
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
      sfx.play("solve");
      setBonusResult("win");
    } else {
      sfx.play("buzzer");
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
    setLetters(new Set());
    setLanded(null);
    setAwaitingConsonant(false);

    // rebuild teams from normalized teamNames (pad/truncate to teamCount)
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
    try { sfx.stop("solve"); } catch (e) {}
    if (winShowTimeoutRef.current) { clearTimeout(winShowTimeoutRef.current); winShowTimeoutRef.current = null; }
    if (winHideTimeoutRef.current) { clearTimeout(winHideTimeoutRef.current); winHideTimeoutRef.current = null; }
    if (bonusSpinRef.current) { clearInterval(bonusSpinRef.current); bonusSpinRef.current = null; }
    if (bonusWinnerSpinRef.current) { clearInterval(bonusWinnerSpinRef.current); bonusWinnerSpinRef.current = null; }
    if (mysterySpinRef.current) { clearInterval(mysterySpinRef.current); mysterySpinRef.current = null; }
    if (bonusResultHideTimeoutRef.current) { clearTimeout(bonusResultHideTimeoutRef.current); bonusResultHideTimeoutRef.current = null; }
    finishingRef.current = false;
    setPhase("setup");
    setWinners([]);
    winnersRef.current = [];
    setZoomed(false);
    setWheelPx(BASE_WHEEL_PX);
    setHasSpun(false);
    // normalize team names and ensure TEAM_NAME_MAX
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

  const TeamCard = ({ t, i }) => {
    const prizeCounts = (t.prizes || []).reduce((acc, p) => {
      const key = String(p).toUpperCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const holdingCounts = (t.holding || []).reduce((acc, h) => {
      const k = String(h).toUpperCase();
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
    return (
 <div className={cls(
      "rounded-2xl p-3 sm:p-4 backdrop-blur-md bg-white/10 fullscreen:p-6 flex flex-col justify-between min-h-[84px]",
      i === active && "ring-4 ring-yellow-300"
    )}>
        <div className="flex justify-between items-start">
          <div>
            <div className="text-xs uppercase tracking-widest opacity-90">{t.name}</div>
            <div className="text-xs opacity-70">Total: ${t.total.toLocaleString()}</div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {Object.entries(prizeCounts).map(([prizeLabel, count]) => (
              <div key={`${prizeLabel}-${count}`} className={cls(
                "px-2 py-1 text-xs font-bold rounded-md",
                prizeLabel === "T-SHIRT" ? "bg-purple-600" :
                prizeLabel === "PIN" ? "bg-red-600" :
                prizeLabel === "STICKER" ? "bg-blue-600" :
                prizeLabel === "MAGNET" ? "bg-gray-600" :
                prizeLabel === "KEYCHAIN" ? "bg-orange-600" : "bg-green-600"
              )}>
                {prizeLabel}{count > 1 ? ` x${count}` : ""}
              </div>
            ))}
            {Array.isArray(t.holding) && t.holding.length > 0 && phase === "play" && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {Object.entries(holdingCounts).map(([label, cnt]) => (
                  <div key={`holding-${label}`} className="px-2 py-1 text-[10px] font-extrabold rounded-md bg-purple-700/80 text-white">HOLDING {label}{cnt > 1 ? ` x${cnt}` : ""}</div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="mt-1 text-2xl sm:text-3xl font-black tabular-nums fullscreen:text-4xl">${t.round.toLocaleString()}</div>
      </div>
    );
  };

  const PersistentHeader = () => {
    const isPostSpinConsonantOverlay = !!awaitingConsonant && !!zoomed && landed != null;
    const isBonusPrizeSpin = phase === "bonus" && !bonusActive && !bonusRevealing && !bonusAwaitingReady && !showBonusSelector;
    const shouldHideHeader = !!showSolveModal || !!spinning || isPostSpinConsonantOverlay || !!showWinScreen || !!bonusReadyModalVisible || !!bonusResult || !!showStats || !!showBonusLetterModal || !!showBonusSelector || isBonusPrizeSpin || !!showBonusSolveModal || !!bonusSpinning || !!showMysterySpinner;
    if (shouldHideHeader) return null;
    return (
      <div className="fixed top-4 left-4 right-4 z-[80] flex items-center justify-between gap-3 pointer-events-auto">
        <div className="flex items-center gap-3">
          <button onClick={backToSetup} className="px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-semibold">← Setup</button>
        </div>
        <div className="flex items-center gap-3 ml-4 mr-4 justify-end">
          <button onClick={sfx.toggleTheme} className="px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-semibold" aria-pressed={sfx.themeOn} title={sfx.themeOn ? "Turn music off" : "Turn music on"}>
            {sfx.themeOn ? "Music Off" : "Music On"}
          </button>
          <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg">
            <label htmlFor="global-volume" className="sr-only">Volume</label>
            <input id="global-volume" type="range" min="0" max="1" step="0.01" value={sfx.volume} onChange={(e) => sfx.setVolume(parseFloat(e.target.value))} className="w-36" aria-label="Global volume" />
          </div>
          <button onClick={toggleFullscreen} className="px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-semibold" title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"} aria-pressed={isFullscreen}>
            Full
          </button>
        </div>
      </div>
    );
  };

  const VowelModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-white rounded-xl p-6 w-full max-w-sm text-center">
        <h2 className="text-2xl font-bold mb-4 text-black">Buy a Vowel (${VOWEL_COST})</h2>
        <div className="flex justify-center gap-2 flex-wrap">
          {Array.from(VOWELS).map((vowel) => (
            <button key={vowel} onClick={() => handleBuyVowel(vowel)} disabled={isRevealingLetters || letters.has(vowel)} className={cls("w-12 h-12 rounded-lg text-lg font-bold", letters.has(vowel) ? "bg-gray-400 text-gray-600" : "bg-blue-500 text-white")}>
              {vowel}
            </button>
          ))}
        </div>
        <button onClick={() => setShowVowelModal(false)} className="mt-4 px-4 py-2 rounded-xl bg-gray-200 text-gray-800 font-semibold">Cancel</button>
      </div>
    </div>
  );

  const SolveModal = () => {
    const inputRef = useRef(null);
    useEffect(() => {
      const t = setTimeout(() => inputRef.current?.focus(), 40);
      return () => clearTimeout(t);
    }, []);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
        <div className="bg-white rounded-xl p-6 w-full max-w-md text-center">
          <h2 className="text-2xl font-bold mb-4 text-black">Solve the Puzzle</h2>
          <form onSubmit={(e) => { e.preventDefault(); handleSolve(); }}>
            <input ref={inputRef} type="text" value={solveGuess} onChange={(e) => setSolveGuess(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); handleSolve(); } }} className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 text-lg font-semibold text-black mb-4" placeholder="Enter your guess" autoFocus />
            <div className="flex gap-2 justify-center">
              <button type="submit" className="px-6 py-3 rounded-xl bg-purple-500 text-white font-bold">Submit</button>
              <button type="button" onClick={() => { setSolveGuess(""); setShowSolveModal(false); }} className="px-6 py-3 rounded-xl bg-gray-200 text-gray-800 font-bold">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

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

  const BonusLetterModal = () => {
    const GIVEN = ["R", "S", "T", "L", "N", "E"];
    const isSelectingConsonants = bonusLetterType === "consonant";
    const pickableLetters = LETTERS.filter((letter) => {
      if (isSelectingConsonants) {
        return !VOWELS.has(letter) && !GIVEN.includes(letter) && !bonusConsonants.includes(letter);
      } else {
        return VOWELS.has(letter) && !GIVEN.includes(letter) && !bonusVowel;
      }
    });
    const unselectConsonant = (ch) => {
      setBonusConsonants((prev) => prev.filter((c) => c !== ch));
      setBonusLetters((prev) => {
        const next = new Set(prev);
        next.delete(ch);
        return next;
      });
    };
    const unselectVowel = () => {
      if (!bonusVowel) return;
      const removed = bonusVowel;
      setBonusVowel("");
      setBonusLetters((prev) => {
        const next = new Set(prev);
        next.delete(removed);
        return next;
      });
    };
    const pickContainerClass = isSelectingConsonants ? "grid grid-cols-6 gap-2 mb-4" : "flex justify-center gap-6 mb-4";
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
        <div className="bg-white rounded-xl p-6 w-full max-w-md text-center">
          <h2 className="text-2xl font-bold mb-4 text-black">{isSelectingConsonants ? `Choose Consonant ${bonusConsonants.length + 1}/3` : "Choose 1 Vowel"}</h2>
          <p className="text-sm text-gray-600 mb-4">Given: {GIVEN.join(", ")}</p>
          <div className="mb-4">
            <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Selected</div>
            <div className="flex gap-2justify-center">
              {isSelectingConsonants ? (
                bonusConsonants.length > 0 ? (
                  bonusConsonants.map((c) => (
                    <button key={c} onClick={() => unselectConsonant(c)} title={`Remove ${c}`} className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-500 text-white font-bold hover:opacity-90">{c}</button>
                  ))
                ) : (<div className="text-sm text-gray-400">None yet</div>)
              ) : (
                <>
                  {bonusVowel ? (
                    <button onClick={unselectVowel} title={`Remove ${bonusVowel}`} className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-500 text-white font-bold hover:opacity-90">{bonusVowel}</button>
                  ) : (<div className="text-sm text-gray-400">None yet</div>)}
                </>
              )}
            </div>
          </div>
          <div className={pickContainerClass}>
            {pickableLetters.length > 0 ? (
              pickableLetters.map((letter) => (
                <button key={letter} onClick={() => handleBonusLetter(letter)} className="w-10 h-10 rounded-lg text-sm font-bold bg-blue-500 text-white hover:bg-blue-600">{letter}</button>
              ))
            ) : (
              <div className="col-span-6 text-sm text-gray-500 py-6">No letters left to pick in this category.</div>
            )}
          </div>
        </div>
      </div>
    );
  };

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
        e.stopPropagation();
        handleBonusSolve();
      }
    };
    return (
      <div className="w-full max-w-3xl mx-auto mt-6 p-6 bg-white rounded-2xl shadow-lg">
        <h2 className="text-xl sm:text-2xl font-bold text-black text-center">Solve to win {bonusPrize}!</h2>
        <div className="flex flex-col items-center gap-3 mt-3">
          <div className="text-3xl font-black text-red-500">{bonusCountdown}</div>
          <p className="text-sm text-gray-600 text-center">The 20s countdown already began when READY was pressed. Press Enter or click Submit when done.</p>
          <input id="bonus-inline-solve-input" ref={inputRef} type="text" value={bonusGuess} onChange={onInputChange} onKeyDown={onKeyDown} placeholder="Enter your guess" className="w-full px-4 py-3 rounded-lg border-2 border-blue-300 text-lg" autoFocus />
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
        <p className="text-2xl font-semibold mb-6">Solve to win <span className="uppercase">{bonusPrize}!</span><br />Good luck <span className="font-black">{displayBonusPlayer}</span>!</p>
        <p className="text-xl md:text-2xl font-semibold text-gray-700 mb-6">R S T L N E are given</p>
        <div className="text-xl md:text-2xl font-semibold text-gray-700 mb-6">Press <strong>READY</strong> when you're ready. The 20 second countdown will start immediately.</div>
        <div className="flex items-center justify-center gap-4">
          <button onClick={pressReadyStartBonus} disabled={readyDisabled || bonusActive} className={cls("px-10 py-4 rounded-xl text-2xl font-extrabold text-white", (readyDisabled || bonusActive) ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700")}>READY</button>
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
            <p className="text-lg text-black mb-2">You solved the bonus puzzle and won a <span className="font-extrabold">{bonusPrize}</span></p>
          </>
        ) : (
          <>
            <h2 className="text-3xl font-bold mb-4 text-red-700">Too bad!</h2>
            <p className="text-lg text-black mb-2">You did not solve the bonus puzzle in time.</p>
            <p className="text-md font-bold text-black mt-2">The word was: <span className="uppercase">{board.map((b) => b.ch).join("")}</span></p>
          </>
        )}
        <p className="text-sm text-gray-600 mt-4">Press <strong>Enter</strong> or <strong>Space</strong> to continue.</p>
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
              <div className="text-2xl font-bold text-green-600">{gameStats.correctGuesses + gameStats.incorrectGuesses === 0 ? 0 : Math.round((gameStats.correctGuesses / (gameStats.correctGuesses + gameStats.incorrectGuesses)) * 100)}%</div>
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
                  <div className="flex justify-between"><span>Total Score:</span><span className="font-bold">${team.total.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Puzzles Won:</span><span className="font-bold">{gameStats.teamStats[team.name]?.puzzlesSolved || 0}</span></div>
                  <div className="flex justify-between"><span>Correct Guesses:</span><span className="font-bold">{gameStats.teamStats[team.name]?.correctGuesses || 0}</span></div>
                  <div className="flex justify-between"><span>Wrong Guesses:</span><span className="font-bold">{gameStats.teamStats[team.name]?.incorrectGuesses || 0}</span></div>
                  <div className="flex justify-between"><span>Vowels Bought:</span><span className="font-bold">{gameStats.teamStats[team.name]?.vowelsBought || 0}</span></div>
                  <div className="flex justify-between"><span>Spins:</span><span className="font-bold">{gameStats.teamStats[team.name]?.spins || 0}</span></div>
                  <div className="flex justify-between"><span>Bankrupts:</span><span className="font-bold">{gameStats.teamStats[team.name]?.bankrupts || 0}</span></div>
                  <div className="flex justify-between"><span>Lose a Turn:</span><span className="font-bold">{gameStats.teamStats[team.name]?.loseTurns || 0}</span></div>
                  {team.prizes && team.prizes.length > 0 && (
                    <div>
                      <span className="text-xs font-semibold">Prizes: </span>
                      {team.prizes.map((prize, idx) => (<span key={idx} className="inline-block px-1 py-0.5 text-xs bg-blue-200 rounded mr-1">{prize}</span>))}
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

  // Render branches
  if (phase === "bonus") {
    const bonusState = bonusActive ? "countdown" : (bonusPrize ? (bonusAwaitingReady ? "ready" : "letters") : "prize_spin");
    return (
      <div className={cls("fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-auto p-4", GRADIENT)}>
        <PersistentHeader />
        <div className="max-w-6xl w-full mx-auto text-center py-8">
          <h1 className="text-5xl font-black mb-2">BONUS ROUND</h1>
          <p className="text-2xl mb-6">Good luck: {displayBonusPlayer}</p>
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
                          <div key={`${i}-${j}`} className={cls("w-10 h-12 sm:w-12 sm:h-16 text-2xl sm:text-3xl font-extrabold flex items-center justify-center rounded-md select-none", cell.shown ? "bg-yellow-300 text-black shadow-md" : "bg-blue-900/90 text-white", isSpecial && "bg-transparent text-white")}>
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
          {!showBonusSelector && !bonusAwaitingReady && !bonusActive && !bonusRevealing && (
            <div className="mt-8">
              <p className="text-xl mb-6">Click the button to see what prize you're playing for!</p>
              <button onClick={startBonusRound} disabled={bonusSpinning || (!!bonusPrize && !bonusSpinning)} className="px-8 py-4 rounded-xl bg-purple-500 text-white font-bold text-xl hover:bg-purple-600 disabled:bg-gray-500">
                {bonusSpinning ? (bonusPrize || "Spinning...") : bonusPrize ? (<span className="flex items-center gap-3"><span className="text-sm opacity-90">Prize:</span><span className="text-lg font-black uppercase">{bonusPrize}</span></span>) : ("SPIN FOR PRIZE")}
              </button>
            </div>
          )}
          {bonusState === "letters" && bonusAwaitingReady && !bonusReadyModalVisible && (
            <div className="my-8 flex flex-col items-center gap-6">
              <div className="text-5xl font-black text-yellow-300">{bonusPrize}</div>
              <p className="text-lg">Letters revealed. Press READY when you're ready to begin the 20s countdown.</p>
              <button onClick={() => { setBonusReadyModalVisible(true); }} disabled={readyDisabled || bonusActive} className={cls("px-16 py-6 text-3xl rounded-2xl bg-green-500 text-white font-extrabold shadow-lg transition-transform focus:outline-none", (readyDisabled || bonusActive) ? "opacity-60 cursor-not-allowed transform-none" : "hover:bg-green-600 hover:scale-105 animate-pulse")} aria-disabled={readyDisabled || bonusActive}>READY</button>
            </div>
          )}
          {bonusReadyModalVisible && <BonusReadyModal />}
          {showBonusSolveModal && <BonusSolveInline />}
          {bonusState === "countdown" && (
            <div className="mt-6 flex flex-col items-center gap-4">
              {!showBonusSolveModal && !bonusHideBoard && <div className="mt-4"><button onClick={() => setShowBonusSolveModal(true)} className="px-6 py-3 rounded-xl bg-blue-500 text-white">Open Solve Box</button></div>}
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
        <PersistentHeader />

        <div className="max-w-6xl w-full mx-auto p-6 bg-white/10 rounded-2xl backdrop-blur-md flex flex-col gap-6">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2 text-center">Game Over!</h1>

          <div className="text-lg font-semibold text-center">
            {winners.length > 1 ? "Winners:" : "Winner:"}{" "}
            <span className="font-black text-yellow-300">{winners.join(", ")}</span>
          </div>

          {/* make the list scrollable and bounded so many teams don't blow out the page */}
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

          {/* bottom actions remain visible below the scrolling list */}
          <div className="mt-2 flex gap-2 justify-center flex-wrap">
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
    // helper used inside render to interpret tempTeamCount for live rendering
    const liveCount = (() => {
      const n = parseIntSafe(tempTeamCount);
      return Number.isFinite(n) ? Math.max(2, Math.min(MAX_TEAMS, n)) : Math.max(2, Math.min(MAX_TEAMS, teamCount));
    })();

    // Start-handler that applies typed values, sanitizes names, and initializes teams/puzzles
    const startGameFromSetup = () => {
      sfx.play("startGame");

      // Compute final team count & rounds deterministically from temp values (avoid relying on async setState)
      const parsedTeams = parseIntSafe(tempTeamCount);
      const finalTeamCount = Number.isFinite(parsedTeams) ? Math.min(MAX_TEAMS, Math.max(2, parsedTeams)) : Math.min(MAX_TEAMS, Math.max(2, teamCount));

      const parsedRounds = parseIntSafe(tempRoundsCount);
      const maxRounds = Math.max(1, (puzzles && puzzles.length) || FALLBACK.length);
      const finalRounds = Number.isFinite(parsedRounds) ? Math.min(Math.max(1, parsedRounds), maxRounds) : Math.min(Math.max(1, roundsCount), maxRounds);

      // Persist these sanitized values to state
      setTeamCount(finalTeamCount);
      setTempTeamCount(String(finalTeamCount));
      setRoundsCount(finalRounds);
      setTempRoundsCount(String(finalRounds));

      // Ensure teamNames array is the right length and trimmed
      const names = makeTeamNamesArray(finalTeamCount, teamNames);

      // Now initialize teams and everything else (no need for timeout)
      setTeams(names.map((name) => ({ name, total: 0, round: 0, prizes: [], holding: [] })));
      setTeamNames(names);
      setActive(0);
      setAngle(0);
      setHasSpun(false);
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

      // select puzzles based on finalRounds
      const count = Math.max(1, Math.min(finalRounds, (puzzles && puzzles.length) || FALLBACK.length));
      const chosen = selectRandomPuzzles(puzzles && puzzles.length ? puzzles : FALLBACK, count);
      setSelectedPuzzles(chosen);
      setIdx(0);
      const first = chosen[0] || FALLBACK[0];
      setBoard(normalizeAnswer(first.answer));
      setCategory(first.category || "PHRASE");
      setPhase("play");
    };


    return (
      <div className={cls("min-h-screen h-screen text-white flex items-center justify-center p-4 sm:p-6", GRADIENT)}>
        <PersistentHeader />
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
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={3}
                    value={tempTeamCount}
                    onChange={(e) => {
                      // strip any non-digit characters as the user types
                      setTempTeamCount(e.target.value.replace(/\D/g, ""));
                    }}
                    onBlur={() => applyTempTeamCount()}
                    className="w-24 mt-1 px-3 py-2 rounded-xl bg-white/20 text-white font-semibold"
                    placeholder="e.g. 3"
                  />
                  {/* live-validation */}
                  {(() => {
                    const n = parseIntSafe(tempTeamCount);
                    if (Number.isFinite(n) && n <= 1) {
                      return <div className="text-xs text-red-400 mt-1">Invalid — teams must be at least 2.</div>;
                    }
                    if (!Number.isFinite(n) && tempTeamCount.trim() !== "") {
                      return <div className="text-xs text-yellow-300 mt-1">Typing non-numeric characters — numbers only.</div>;
                    }
                    return null;
                  })()}
                </div>

                <div>
                  <label className="text-sm uppercase tracking-wider opacity-80" htmlFor="rounds-count-input">Number of Main Rounds</label>
                  <input
                    id="rounds-count-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={3}
                    value={tempRoundsCount}
                    onChange={(e) => {
                      setTempRoundsCount(e.target.value.replace(/\D/g, ""));
                    }}
                    onBlur={() => applyTempRoundsCount()}
                    className="w-24 mt-1 px-3 py-2 rounded-xl bg-white/20 text-white font-semibold"
                    placeholder={`1 - ${Math.max(1, puzzles.length || FALLBACK.length)}`}
                  />
                  {(() => {
                    const r = parseIntSafe(tempRoundsCount);
                    if (Number.isFinite(r) && r <= 0) {
                      return <div className="text-xs text-red-400 mt-1">Invalid — rounds must be at least 1.</div>;
                    }
                    if (!Number.isFinite(r) && tempRoundsCount.trim() !== "") {
                      return <div className="text-xs text-yellow-300 mt-1">Typing non-numeric characters — numbers only.</div>;
                    }
                    return <div className="text-xs text-white/70 mt-1">Bonus round is always a single extra round</div>;
                  })()}
                </div>

                <div className="flex-1 w-full">
                  <div className="text-sm uppercase tracking-wider opacity-80">Team Names</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1 max-h-96 overflow-y-auto pr-2">
                    {Array.from({ length: liveCount }).map((_, i) => (
                      <input
                        key={i}
                        value={teamNames[i] || ""}
                        onChange={(e) =>
                          setTeamNames((arr) => {
                            const n = [...arr];
                            // enforce max length while typing
                            n[i] = e.target.value.slice(0, TEAM_NAME_MAX);
                            return n;
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-white/20 text-white font-semibold placeholder:text-white/50"
                        placeholder={`Team ${i + 1}`}
                      />
                    ))}
                  </div>
                  <div className="text-xs text-white/60 mt-2">Max name length: {TEAM_NAME_MAX} characters. Max teams: {MAX_TEAMS}.</div>
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <button
                  onClick={startGameFromSetup}
                  className="px-5 py-2 rounded-xl bg-white text-black font-bold hover:opacity-90 transition-opacity"
                >
                  Start Game
                </button>

                <button onClick={sfx.toggleTheme} className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 font-semibold transition-colors">
                  {sfx.themeOn ? "Music Off" : "Music On"}
                </button>
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
   
  // Main play UI
  const baseBgColor = isCharging ? "#16a34a" : "#22c55e";
  const fillBgColor = "rgba(4,120,87,0.95)";

  return (
   <div
    className={cls(
      "min-h-screen h-screen text-white flex flex-col items-center p-4",
      zoomed ? "overflow-hidden" : "overflow-auto",
      GRADIENT
    )}
  >
      <PersistentHeader />

      {/* central content (can be hidden when zoomed / win screen) */}
      <div
        className={cls(
          "w-full h-full flex flex-col",
          (zoomed || showWinScreen) && "invisible",
          (isRevealingLetters || finishingRef.current) && "pointer-events-none select-none"
        )}
      >
        <main className="w-full max-w-7xl mx-auto flex-1 flex flex-col lg:flex-row items-center lg:items-center gap-4 min-h-0">
          {/* Left column: wheel + controls */}
          <div className="flex flex-col items-center justify-around gap-4 w-full lg:w-1/2 h-full py-4">
            <div className="relative flex items-center justify-center">
              <canvas ref={canvasRef} style={{ width: `${wheelPx}px`, height: `${wheelPx}px` }} />
              <div
                className="absolute w-[20%] h-[20%] rounded-full bg-no-repeat"
                style={{ backgroundImage: "url(hub-image.png)", backgroundSize: "110%", backgroundPosition: "10% -30px" }}
              >
                <div
                  aria-hidden="true"
                  className="w-full h-full bg-green-500/50 rounded-full"
                  style={{ clipPath: `inset(0 ${100 - spinPower}% 0 0)`, transition: snapChargeToZero ? "none" : "clip-path 80ms linear" }}
                />
              </div>
            </div>

            <div className="flex justify-center flex-wrap gap-4 items-center">
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
                  "rounded-xl font-bold text-xl px-8 py-4 transition-colors",
                  !canSpin ? "bg-gray-700/60 text-gray-400 cursor-not-allowed" : "text-white hover:brightness-110"
                )}
              >
                <span className="select-none">SPIN (Hold)</span>
              </button>

              <button
                onClick={() => setShowVowelModal(true)}
                disabled={!canBuyVowel}
                className={cls(
                  "px-6 py-3 rounded-xl font-bold text-lg",
                  !canBuyVowel ? "bg-gray-700/60 text-gray-400 cursor-not-allowed" : "bg-blue-500 text-white hover:bg-blue-600"
                )}
              >
                BUY VOWEL (${VOWEL_COST})
              </button>

              <button
                onClick={() => setShowSolveModal(true)}
                disabled={!canSolve}
                className={cls(
                  "px-6 py-3 rounded-xl font-bold text-lg",
                  !canSolve ? "bg-gray-700/60 text-gray-400 cursor-not-allowed" : "bg-purple-500 text-white hover:bg-purple-600"
                )}
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
                    disabled={isRevealingLetters || !awaitingConsonant || VOWELS.has(ch) || letters.has(ch)}
                    className={cls(
                      "w-9 h-9 sm:w-10 sm:h-10 rounded-md font-bold",
                      VOWELS.has(ch) ? "bg-blue-800/60 text-blue-200" : letters.has(ch) ? "bg-gray-700/60 text-gray-400" : "bg-white/20 text-white",
                      awaitingConsonant && !VOWELS.has(ch) && !letters.has(ch) ? "hover:bg-white/30 hover:ring-2 hover:ring-white cursor-pointer" : "cursor-not-allowed"
                    )}
                  >
                    {ch}
                  </button>
                ))}
              </div>
              <div className="text-center mt-2 text-sm opacity-75">{awaitingConsonant ? "Click a consonant" : "Spin, buy a vowel, or solve"}</div>
            </div>
          </div>

          {/* Right column: board + teams */}
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
                        <div
                          key={`${i}-${j}`}
                          className={cls(
                            "w-8 h-12 sm:w-10 sm:h-16 text-2xl sm:text-3xl font-bold flex items-center justify-center rounded-md",
                            cell.shown ? "bg-yellow-300 text-black shadow-lg" : "bg-blue-950/80 text-white",
                            isSpecial && "bg-transparent text-white"
                          )}
                        >
                          {isSpecial ? cell.ch : cell.shown ? cell.ch : ""}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Teams: make scrollable so many teams don't blow out the page height */}
            <div
      className="w-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-500/60 teams-scroll"
      style={{
        // maxHeight uses min() to be adaptive; string values required for units/calc()
        maxHeight: "min(48vh, calc(100vh - 360px))",
        paddingRight: "8px",
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
        {teams.map((t, i) => (
          <TeamCard key={i} t={t} i={i} />
        ))}
      </div>
    </div>
          </div>
        </main>
      </div>

      {/* Zoom overlay / popup wheel */}
      <div className={cls("fixed inset-0 z-50 flex items-center justify-center", !zoomed && "hidden pointer-events-none")}>
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative flex items-center justify-center z-10">
          <canvas ref={zoomCanvasRef} style={{ width: `${wheelPx}px`, height: `${wheelPx}px` }} />
          <div className="absolute w-[20%] h-[20%] rounded-full bg-no-repeat" style={{ backgroundImage: "url(hub-image.png)", backgroundSize: "110%", backgroundPosition: "10% -50px" }} />
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

      {/* Blocking overlay while revealing letters */}
      {(isRevealingLetters || finishingRef.current) && (
        <div
          className="fixed inset-0 z-[90] bg-transparent"
          aria-hidden="true"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          style={{ pointerEvents: "auto" }}
        />
      )}

      {showVowelModal && <VowelModal />}
      {showSolveModal && <SolveModal />}
      {showMysterySpinner && <MysterySpinnerModal />}
      {showWinScreen && <WinScreen winner={roundWinner} />}
      {showBonusLetterModal && <BonusLetterModal />}
      {showBonusSelector && <BonusWinnerSelectorModal />}
      {bonusReadyModalVisible && <BonusReadyModal />}
      {showBonusSolveModal && <BonusSolveInline />}
      {bonusResult && <BonusResultModal result={bonusResult} />}
      {showStats && <StatsModal />}
    </div>
  );
}
