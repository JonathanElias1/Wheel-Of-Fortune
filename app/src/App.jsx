import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
const GRADIENT = "bg-[radial-gradient(110%_110%_at_0%_0%,#5b7fff_0%,#21bd84_100%)]";
const BASE_WHEEL_PX = 500;
// --- bonus wheel orientation (used by draw + pick) ---
const BONUS_START_DEG = -90; 
const BONUS_CW = true;       
const SPIN_MIN_TURNS = 12;        
const SPIN_MAX_TURNS = 18;      
const SPIN_DURATION_MS = 5200;    
const SPIN_SETTLE_MS = 700;       
const POST_LAND_PAUSE_MS = 450;   
const PRIZE_INDEX_CORRECTION = 0; 
const VOWEL_COST = 200;
const TEAM_NAME_MAX = 15;
const MAX_TEAMS = 100;
const SOLVE_BONUS = 300;
const WEDGES = [
  { t: "cash", v: 400, c: "#00AADD" },
  { t: "wild", label: "MYSTERY", c: "#E6007E" },
  { t: "cash", v: 150, c: "#E23759" },
  { t: "cash", v: 300, c: "#D15C22" },
  { t: "lose", label: "LOSE A TURN", c: "#B1A99E" },
  { t: "cash", v: 250, c: "#EDD302" },
  { t: "bankrupt", label: "BANKRUPT", c: "#222222" },
  { t: "tshirt", label: "T-SHIRT", c: "#c386f8", v: 0, prize: { type: "tshirt", label: "T-SHIRT", color: "#c386f8" }, size: 0.4 },
  { t: "bankrupt", label: "BANKRUPT", c: "#222222" },
  { t: "cash", v: 200, c: "#E23759" },
  { t: "cash", v: 100, c: "#D15C22" },
  { t: "cash", v: 175, c: "#8C4399" },
  { t: "cash", v: 350, c: "#C9237B" },
  { t: "bankrupt", label: "BANKRUPT", c: "#222222" },
  { t: "cash", v: 50, c: "#00AADD" },
  { t: "cash", v: 225, c: "#95C85A" },
  { t: "cash", v: 300, c: "#6F2597" },
  { t: "bankrupt", label: "BANKRUPT", c: "#222222" },
  { t: "cash", v: 75, c: "#E23759" },
  { t: "cash", v: 200, c: "#C9237B" },
  { t: "cash", v: 150, c: "#8C4399" },
  { t: "cash", v: 100, c: "#D15C22" },
  { t: "lose", label: "LOSE A TURN", c: "#B1A99E" },
  { t: "cash", v: 125, c: "#4F9F4F" },
];
const VOWELS = new Set(["A", "E", "I", "O", "U", "J"]);
const LETTERS = "ABCDEFGHIKLMNOPQRSTUVWXYZ".split("");
const ZOOM_WHEEL_PX = BASE_WHEEL_PX * 1.5;
const BONUS_PRIZES = ["PIN", "STICKER", "T-SHIRT", "MAGNET", "KEYCHAIN"];
const SOLVE_REVEAL_INTERVAL = 650;
function useImagePreloader() {
  const [imagesLoaded, setImagesLoaded] = useState(false);
  
  useEffect(() => {
    // List of all images used in your game add any others below
    const imagePaths = [
      '/images/hub-image.png',
      '/images/winner-icon.png'
    ];
    
    if (imagePaths.length === 0) {
      setImagesLoaded(true);
      return;
    }
    
    let loadedCount = 0;
    const totalImages = imagePaths.length;
    
    const onImageLoad = () => {
      loadedCount++;
      if (loadedCount === totalImages) {
        setImagesLoaded(true);
      }
    };
    
    const onImageError = (path) => {
      console.warn(`Failed to load image: ${path}`);
      loadedCount++; // Still count as "loaded" to prevent hanging
      if (loadedCount === totalImages) {
        setImagesLoaded(true);
      }
    };
    
    // Preload all images
    imagePaths.forEach(path => {
      const img = new Image();
      img.onload = onImageLoad;
      img.onerror = () => onImageError(path);
      img.src = path;
    });
    
  }, []);
  
  return imagesLoaded;
}
function useSfx() {
  const audioCtxRef = useRef(null);
  const bufferMapRef = useRef({});       // key -> AudioBuffer
  const activeNodesRef = useRef({});     // key -> Set of active source nodes (one-shots)
  const loopNodesRef = useRef({});       // key -> persistent loop node info { node, gainNode }
  const masterGainRef = useRef(null);
 const loadedRef = useRef(false);  
  const [volume, setVolume] = useState(0.9);
  const [themeOn, setThemeOn] = useState(false);
  const [loaded, setLoaded] = useState(false); // true when initial decode settled
  
  // list of files to decode (key -> filename)
  const base = "/";
  const FILES = {
    spin: "sounds/wof-spin.mp3",
    ding: "sounds/wof-correct.mp3",
    buzzer: "sounds/wof-buzzer.mp3",
    themeOpen: "sounds/wof-theme-open.mp3",
    themeLoop: "sounds/wheel-theme.mp3",
    bankrupt: "sounds/wof-bankrupt.mp3",
    solve: "sounds/wof-solve.mp3",
    wild: "sounds/wof-wild.mp3",
    cashDing: "sounds/wof-ding.mp3",
    cashDing2: "sounds/cash-ding.mp3",
    tshirt: "sounds/tshirt-sound.mp3",
    wrongLetter: "sounds/wrong-letter.mp3",
    chargeUp: "sounds/charge-up.mp3",
    startGame: "sounds/start-game.mp3",
  };
  // Create AudioContext + masterGain once
  useEffect(() => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) {
        console.warn("Web Audio API not supported in this browser.");
        return;
      }
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const gain = ctx.createGain();
      gain.gain.value = volume;
      gain.connect(ctx.destination);
      masterGainRef.current = gain;
    } catch (e) {
      console.warn("Failed to create AudioContext:", e);
      audioCtxRef.current = null;
      masterGainRef.current = null;
    }
    return () => {
      // stop all nodes on unmount
      try {
        Object.values(loopNodesRef.current).forEach(({ node, gainNode }) => {
          try { node.stop(); } catch (e) {}
          try { gainNode.disconnect(); } catch (e) {}
        });
        Object.values(activeNodesRef.current).forEach((set) => {
          set.forEach((n) => { try { n.stop(); } catch (e) {} });
        });
        if (audioCtxRef.current && typeof audioCtxRef.current.close === "function") {
          audioCtxRef.current.close().catch(() => {});
        }
      } catch (e) {}
      bufferMapRef.current = {};
      loopNodesRef.current = {};
      activeNodesRef.current = {};
      audioCtxRef.current = null;
      masterGainRef.current = null;
    };
  }, []);
  // decode all files in parallel (non-blocking)
  useEffect(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const entries = Object.entries(FILES);
    const decodes = entries.map(async ([key, filename]) => {
      try {
        const res = await fetch(base + filename, { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed fetch ${filename}: ${res.status}`);
        const arr = await res.arrayBuffer();
        // decodeAudioData in modern browsers returns a promise
        const buf = await ctx.decodeAudioData(arr.slice(0));
        bufferMapRef.current[key] = buf;
      } catch (e) {
        console.warn(`Failed to load/decode ${filename} for key "${key}":`, e);
      }
    });
    Promise.allSettled(decodes).then(() => {
        loadedRef.current = true; 
      setLoaded(true);
    }).catch(() => {
       loadedRef.current = true;  
      setLoaded(true);
    });
    // no cleanup needed here (buffers live until unmount)
  }, [/* run once */]);
  // update master gain when volume changes
  useEffect(() => {
    try {
      if (masterGainRef.current) masterGainRef.current.gain.value = volume;
    } catch (e) {}
  }, [volume]);
    useEffect(() => {
    const handleVisibilityChange = () => {
      // When the page becomes visible again, try to unlock the audio
      if (document.visibilityState === 'visible') {
        unlock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // We can use an empty dependency array because unlock is stable
  // helper: ensure AudioContext is running (resume on user gesture if needed)
  const ensureCtxRunning = async () => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (ctx.state === "suspended") {
      try { await ctx.resume(); } catch (e) {}
    }
  };
  // Exposed helper to unlock from a user gesture — call from a click handler
const unlock = useCallback(async () => {
  const ctx = audioCtxRef.current;
  if (!ctx) return false;
  try {
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    return true;
  } catch (e) {
    console.warn("AudioContext resume failed:", e);
    return false;
  }
}, []);
  // play a one-shot (gapless, buffer-based)
  const play = async (key) => {
    const ctx = audioCtxRef.current;
    const buf = bufferMapRef.current[key];
    if (!ctx || !buf) return;
    await ensureCtxRunning();
    try {
      const node = ctx.createBufferSource();
      node.buffer = buf;
      node.loop = false;
      // connect via master gain
      node.connect(masterGainRef.current);
      // record active node so stop(key) can cancel it
      if (!activeNodesRef.current[key]) activeNodesRef.current[key] = new Set();
      activeNodesRef.current[key].add(node);
      node.onended = () => {
        try {
          activeNodesRef.current[key]?.delete(node);
        } catch (e) {}
      };
      node.start();
    } catch (e) {
      console.error("Failed to play buffer", key, e);
    }
  };
  // stop all currently playing one-shots for a key
  const stop = (key) => {
    try {
      const set = activeNodesRef.current[key];
      if (set) {
        set.forEach((n) => {
          try { n.stop(); } catch (e) {}
        });
        activeNodesRef.current[key] = new Set();
      }
    } catch (e) {
      console.error("Failed to stop playing nodes for", key, e);
    }
    // also stop persistent loop if exists
    if (loopNodesRef.current[key]) {
      try {
        loopNodesRef.current[key].node.stop();
        loopNodesRef.current[key].gainNode.disconnect();
      } catch (e) {}
      delete loopNodesRef.current[key];
    }
  };
  // start a persistent gapless loop for a key
  // Implementation: create BufferSource -> gain node -> masterGain
  // we keep the node reference in loopNodesRef so we can stop it later.
  const loop = async (key) => {
    const ctx = audioCtxRef.current;
    const buf = bufferMapRef.current[key];
    if (!ctx || !buf) return;
    await ensureCtxRunning();
    // if already looping for this key, leave it playing
    if (loopNodesRef.current[key] && loopNodesRef.current[key].playing) return;
    try {
      const node = ctx.createBufferSource();
      node.buffer = buf;
      node.loop = true;
      const g = ctx.createGain();
      g.gain.value = volume; // route through a per-loop gain (so we can fade)
      node.connect(g);
      g.connect(masterGainRef.current);
      node.start();
      loopNodesRef.current[key] = { node, gainNode: g, playing: true };
    } catch (e) {
      console.error("Failed to start loop for", key, e);
    }
  };
  // stop persistent loop for a key
  const stopLoop = (key) => {
    const rec = loopNodesRef.current[key];
    if (rec) {
      try {
        rec.node.stop();
      } catch (e) {}
      try {
        rec.gainNode.disconnect();
      } catch (e) {}
      delete loopNodesRef.current[key];
    }
  };
  // Theme/music toggle that plays intro then starts loop
  const toggleTheme = async () => {
    const introKey = "themeOpen";
    const loopKey = "themeLoop";
    if (!audioCtxRef.current) return;
    if (!themeOn) {
      const ctx = audioCtxRef.current;
      const introBuf = bufferMapRef.current[introKey];
      const loopBuf = bufferMapRef.current[loopKey];
      if (!introBuf && !loopBuf) return;
      await ensureCtxRunning();
      if (introBuf && loopBuf) {
        // play intro then start persistent loop
        try {
          // play intro as one-shot
          const introNode = ctx.createBufferSource();
          introNode.buffer = introBuf;
          introNode.loop = false;
          introNode.connect(masterGainRef.current);
          introNode.onended = () => {
            try { loop(loopKey); } catch (e) {}
          };
          // keep a reference so we can stop if toggled off during intro
          loopNodesRef.current.__themeIntro = { node: introNode, playing: true };
          introNode.start();
          setThemeOn(true);
        } catch (e) {
          console.error("Failed to play theme intro", e);
        }
      } else if (loopBuf) {
        await loop(loopKey);
        setThemeOn(true);
      }
    } else {
      // stop intro if running
      if (loopNodesRef.current.__themeIntro) {
        try { loopNodesRef.current.__themeIntro.node.stop(); } catch (e) {}
 const introNode = loopNodesRef.current.__themeIntro.node;
    if (introNode) {
      introNode.onended = null; // <-- The key fix!
      try { introNode.stop(); } catch (e) {}
    }
    delete loopNodesRef.current.__themeIntro;
  }
      stopLoop("themeLoop");
      setThemeOn(false);
    }
  };
  return {
    play,
    stop,
    loop,
    stopLoop,
    volume,
    setVolume,
    themeOn,
    toggleTheme,
    loaded,
    unlock,
  };
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
function WinScreen({ winner, onClose }) {
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
      // small wander
      pos.x += rand(-0.4, 0.4);
      pos.y += rand(-0.4, 0.4);
      pos.rotSpeed *= 0.97;
      // bounds
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
      bouncer.style.transform =
        `translate(${Math.round(pos.x)}px, ${Math.round(pos.y)}px) ` +
        `rotate(${pos.rot.toFixed(2)}rad) scale(${(pos.scale * scale).toFixed(2)}) ` +
        `skew(${skewX.toFixed(1)}deg, ${skewY.toFixed(1)}deg)`;
      animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);
    // 👇 NEW: tap/click anywhere to skip
    const handleTap = (e) => {
      e.preventDefault();
      onClose?.();
    };
    window.addEventListener("pointerdown", handleTap, { passive: false });
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (impulseInterval) clearInterval(impulseInterval);
      window.removeEventListener("pointerdown", handleTap);
    };
  }, [winner, onClose]);
  return (
   <div
  className={cls(
    "fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden backdrop-blur-sm",
    GRADIENT
  )}
  onClick={onClose}
  onTouchStart={(e) => { e.preventDefault(); onClose?.(); }}
  role="button"
  aria-label="Continue"
>
      <div style={{ position: "absolute", inset: 0 }} />
      <img
        ref={bouncerRef}
        src="images/winner-icon.png"
        alt="Bouncing icon"
        className="absolute top-0 left-0 rounded-lg shadow-lg pointer-events-none"
      />
      <div className="relative z-10 text-center">
        <h1
          className="text-5xl sm:text-6xl md:text-8xl font-black text-white animate-pulse [text-shadow:0_8px_16px_rgba(0,0,0,0.5)]"
          style={{ fontFamily: "'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto" }}
        >
          🎉 WINNER! 🎉
        </h1>
        <p className="text-3xl sm:text-4xl md:text-6xl text-white mt-6 font-bold [text-shadow:0_4px_8px_rgba(0,0,0,0.5)]">
          {winner}
        </p>
        <p className="text-xl md:text-2xl text-white mt-4 font-semibold animate-bounce">
          Solved the puzzle! (+${SOLVE_BONUS}!)
        </p>
        <p className="text-sm text-white/90 mt-4 opacity-95">
          Tap anywhere, or press <strong>Enter</strong>/<strong>Space</strong> to continue
        </p>
      </div>
    </div>
  );
}
function ConfettiCanvas({ trigger }) {
  const ref = useRef(null);
  const rafRef = useRef(null);
  useEffect(() => {
       // Only run the confetti animation if the trigger is true
    if (!trigger) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const DPR = window.devicePixelRatio || 1;
    const w = (canvas.width = window.innerWidth * DPR);
    const h = (canvas.height = window.innerHeight * DPR);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.scale(DPR, DPR);
    // generate particles
    const colors = ["#FFD700", "#FF5E5E", "#5EE3FF", "#9B8CFF", "#6EE7B7"];
    const particles = [];
    
    // MODIFIED: Increased particle count
    const count = 200; 
    for (let i = 0; i < count; i++) {
      particles.push({
        x: window.innerWidth / 2 + (Math.random() - 0.5) * 200,
        y: window.innerHeight / 3 + (Math.random() - 0.5) * 100,
        vx: (Math.random() - 0.5) * 8,
        vy: Math.random() * -6 - 2,
        size: 6 + Math.random() * 8,
        rotation: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        
        // MODIFIED: Increased particle lifespan for a longer effect
        life: 240 + Math.floor(Math.random() * 100), 
      });
    }
    let t = 0;
    const loop = () => {
      t++;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.18; // gravity
        p.rotation += p.vr;
        p.life--;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });
      if (particles.every((p) => p.life <= 0 || p.y > window.innerHeight + 50)) {
        // done
        return;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      // clear canvas
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    };
  }, [trigger]);
  return <canvas ref={ref} className="fixed inset-0 pointer-events-none z-[70]" />;
}
// Paste this code ABOVE your App component
const PersistentHeader = ({ sfx, phase, backToSetup, toggleFullscreen, awaitingConsonant, zoomed, landed, spinning, showSolveModal, showWinScreen, bonusReadyModalVisible, bonusResult, showStats, showBonusLetterModal, showBonusSelector, bonusActive, bonusRevealing, bonusAwaitingReady, isFullscreen, showBonusSolveModal, bonusSpinning, showMysterySpinner }) => {
  const isPostSpinConsonantOverlay = !!awaitingConsonant && !!zoomed && landed != null;
  const isBonusPrizeSpin = phase === "bonus" && !bonusActive && !bonusRevealing && !bonusAwaitingReady && !showBonusSelector;
  const shouldHideHeader = !!showSolveModal || !!spinning || isPostSpinConsonantOverlay || !!showWinScreen || !!bonusReadyModalVisible || !!bonusResult || !!showStats || !!showBonusLetterModal || !!showBonusSelector || isBonusPrizeSpin || !!showBonusSolveModal || !!bonusSpinning || !!showMysterySpinner || !!zoomed;
  if (shouldHideHeader) return null;
  return (
    <div className="fixed top-2 left-2 right-2 z-[100] flex items-center justify-between gap-2 pointer-events-auto">
      <div className="flex items-center gap-2">
        {phase !== "setup" && (
          <button
            onClick={backToSetup}
            className="px-3 py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10 text-sm font-semibold shadow-sm hover:scale-[1.02] hover:bg-white/20 transition transform custom-hover"
            aria-label="Back to setup"
          >
            ← Setup
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={sfx.toggleTheme}
          className="px-3 py-2 rounded-lg bg-gradient-to-r from-white/10 to-white/5 border border-white/10 text-sm font-semibold flex items-center gap-2 hover:scale-[1.03] hover:bg-white/20 transition custom-hover"
          aria-pressed={sfx.themeOn}
          title={sfx.themeOn ? "Turn music off" : "Turn music on"}
        >
          <span className="text-lg">{sfx.themeOn ? "🔊" : "🔈"}</span>
          <span className="hidden sm:inline">{sfx.themeOn ? "Music On" : "Music Off"}</span>
        </button>
        <div className="hidden sm:flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg">
          <label htmlFor="global-volume" className="sr-only">Volume</label>
          <input id="global-volume" type="range" min="0" max="1" step="0.01" value={sfx.volume} onChange={(e) => sfx.setVolume(parseFloat(e.target.value))} className="w-36 md:w-36" aria-label="Global volume" />
        </div>
        <button onClick={toggleFullscreen} className="hidden md:inline-flex px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-sm font-semibold hover:scale-[1.03] hover:bg-white/20 transition custom-hover" title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"} aria-pressed={isFullscreen}>
         
         <span className="hidden sm:inline">Fullscreen</span> 
                   
        </button>
      </div>
    </div>
  );
};
const sanitizeLetters = (s) => (s || "").replace(/[^A-Za-z ]+/g, "");
const allowLetterKey = (e) => {
  const k = e.key;
  if (k.length === 1 && !/[A-Za-z ]/.test(k) && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault();
  }
};
function BonusPrizeShuffler({
  displayBonusPlayer,
  bonusPrize,
  setBonusPrize,
  bonusSpinnerSpinning,
  setBonusSpinnerSpinning,
  sfx,
  setBonusHideBoard,
  setShowBonusLetterModal,
  setBonusLetterType,
  setPhase,
  setBonusRound,
}) {
  const [previewPrize, setPreviewPrize] = React.useState(null);
  const [isLocked, setIsLocked] = React.useState(false);   // <-- immediate UI lock
  const shuffleIntervalRef = React.useRef(null);
  const finishTimeoutRef = React.useRef(null);
  const pauseTimeoutRef = React.useRef(null);
  const mountedRef = React.useRef(true);
  const startRef = React.useRef(false); // <-- synchronous guard
  const PAUSE_AFTER_LAND_MS = 3000; // show final prize for 1s
  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // clear timers on unmount
      if (shuffleIntervalRef.current) {
        clearInterval(shuffleIntervalRef.current);
        shuffleIntervalRef.current = null;
      }
      if (finishTimeoutRef.current) {
        clearTimeout(finishTimeoutRef.current);
        finishTimeoutRef.current = null;
      }
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
        pauseTimeoutRef.current = null;
      }
      // reset entry guard so re-mount can work
      startRef.current = false;
      try { sfx?.stop?.("spin"); } catch (e) {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const startShuffle = () => {
    // Synchronous re-entry guard: prevent double-clicks immediately
    if (startRef.current) {
      console.log("[Shuffler] startShuffle ignored - already started");
      return;
    }
    // Defensive: respect external flags too
    if (bonusSpinnerSpinning || bonusPrize) {
      console.log("[Shuffler] startShuffle aborted (spinner running or prize already set)");
      return;
    }
    startRef.current = true;        // prevent re-entry synchronously
    setIsLocked(true);              // immediately disable button in UI
    console.log("[Shuffler] startShuffle -> starting spinning preview");
    // cleanup any previous timers (defensive)
    if (shuffleIntervalRef.current) {
      clearInterval(shuffleIntervalRef.current);
      shuffleIntervalRef.current = null;
    }
    if (finishTimeoutRef.current) {
      clearTimeout(finishTimeoutRef.current);
      finishTimeoutRef.current = null;
    }
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = null;
    }
    setPreviewPrize(BONUS_PRIZES[Math.floor(Math.random() * BONUS_PRIZES.length)]);
    setBonusSpinnerSpinning(true);
    try { sfx?.play?.("spin"); } catch (e) {}
    // flicker the preview quickly while "shuffling"
    shuffleIntervalRef.current = setInterval(() => {
      setPreviewPrize(BONUS_PRIZES[Math.floor(Math.random() * BONUS_PRIZES.length)]);
    }, 70);
    // after short duration choose final prize
    finishTimeoutRef.current = setTimeout(() => {
      // stop flicker
      if (shuffleIntervalRef.current) {
        clearInterval(shuffleIntervalRef.current);
        shuffleIntervalRef.current = null;
      }
      const finalPrize = BONUS_PRIZES[Math.floor(Math.random() * BONUS_PRIZES.length)];
      console.log("[Shuffler] finalPrize ->", finalPrize);
      // show the final prize locally (preview), do NOT set parent prize yet
      setPreviewPrize(finalPrize);
      // stop spin sound and play ding
      try { sfx?.stop?.("spin"); } catch (e) {}
      try { sfx?.play?.("ding"); } catch (e) {}
      // clear the spinning flag (keeps shuffler visible because we haven't set parent prize)
      setBonusSpinnerSpinning(false);
      // Pause so users can see the landed prize, then set parent prize & open consonants
      pauseTimeoutRef.current = setTimeout(() => {
        pauseTimeoutRef.current = null;
        // defensive phase/bonusRound ensure
        try {
          if (typeof setPhase === "function") setPhase("bonus");
          if (typeof setBonusRound === "function") setBonusRound(true);
        } catch (e) {
          console.warn("[Shuffler] error setting phase/bonusRound", e);
        }
        // 1) set the parent-level bonusPrize (this may flip other UI)
        try {
          setBonusPrize(finalPrize);
          console.log("[Shuffler] parent bonusPrize set ->", finalPrize);
        } catch (e) {
          console.warn("[Shuffler] failed to set parent bonusPrize", e);
        }
        // 2) open the consonant modal
        try {
          setBonusHideBoard(true);
          setBonusLetterType("consonant");
          // small micro-delay to avoid React batching oddities
          setTimeout(() => {
            setShowBonusLetterModal(true);
            console.log("[Shuffler] setShowBonusLetterModal(true)");
            // focus any input if present after a short wait
            setTimeout(() => {
              const el = document.querySelector("#bonus-inline-solve-input") || document.querySelector(".bonus-letter-initial-focus");
              if (el) el.focus?.();
            }, 40);
          }, 30);
        } catch (e) {
          console.warn("[Shuffler] failed to open consonant modal", e);
        }
        // Keep startRef true so further clicks are ignored; the parent state
        // (bonusPrize) will also keep the button disabled. No need to reset isLocked.
      }, PAUSE_AFTER_LAND_MS);
      finishTimeoutRef.current = null;
    }, 2400); // shuffle duration
  };
  const buttonLabel = bonusPrize
    ? `PRIZE SELECTED: ${bonusPrize}`
    : bonusSpinnerSpinning
    ? "SHUFFLING..."
    : "🎁 SELECT PRIZE 🎁";
  return (
    <div className="max-w-7xl w-full mx-auto text-center py-8 flex flex-col items-center justify-center min-h-screen">
      <div className="mb-8">
        <h1 className="text-6xl font-black mb-4 text-white [text-shadow:0_8px_16px_rgba(0,0,0,0.5)]">🎊 BONUS ROUND 🎊</h1>
        <p className="text-3xl font-bold text-yellow-300 [text-shadow:0_4px_8px_rgba(0,0,0,0.5)]">Good luck: {displayBonusPlayer}!</p>
        <p className="text-xl text-white/90 mt-4">Click the button to see what prize you're playing for!</p>
      </div>
      <div className="mb-8 h-32 flex items-center justify-center">
        <div aria-live="polite" aria-atomic="true" className="text-center">
          {bonusPrize ? (
            <div className="text-6xl font-black text-white">{bonusPrize}</div>
          ) : bonusSpinnerSpinning ? (
            <div className="text-6xl font-black text-white animate-pulse">{previewPrize || "..."}</div>
          ) : (
            <div className="text-4xl font-bold text-white/60">{previewPrize || "???"}</div>
          )}
        </div>
      </div>
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={startShuffle}
          disabled={isLocked || bonusSpinnerSpinning || !!bonusPrize}
          aria-busy={bonusSpinnerSpinning}
          className={`px-12 py-6 rounded-2xl text-2xl font-extrabold text-white transition-all duration-300 ${
            isLocked || bonusSpinnerSpinning || bonusPrize
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 hover:scale-105 shadow-2xl"
          }`}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
export default function App() {
  const [phase, setPhase] = useState("setup");
   const [roundWinnerIndex, setRoundWinnerIndex] = useState(null); // Add this line
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
  const spinButtonRef = useRef(null); // <-- ADD THIS LINE
const blockingOverlayRef = useRef(null);
 const mobileCanvasRef = useRef(null);
  const mobileSpinButtonRef = useRef(null);
// Desktop-specific refs
const desktopCanvasRef = useRef(null);
const desktopSpinButtonRef = useRef(null);
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
  const isChargingRef = useRef(false);
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
  
  const landedOwnerRef = useRef(null);
  
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
  const [bonusCountdown, setBonusCountdown] = useState(30);
  const [bonusAwaitingReady, setBonusAwaitingReady] = useState(false);
  const [bonusHideBoard, setBonusHideBoard] = useState(false);
  const [bonusPrepCountdown, setBonusPrepCountdown] = useState(5);
  const [bonusActive, setBonusActive] = useState(false);
  const [showBonusLetterModal, setShowBonusLetterModal] = useState(false);
  const [bonusLetterType, setBonusLetterType] = useState("");
  const [bonusGuess, setBonusGuess] = useState("");
  const [showBonusSolveModal, setShowBonusSolveModal] = useState(false);
  const [showBonusSelector, setShowBonusSelector] = useState(false);
  const [showBonusSpinner, setShowBonusSpinner] = useState(false);
const [bonusSpinnerAngle, setBonusSpinnerAngle] = useState(0);
const [bonusSpinnerSpinning, setBonusSpinnerSpinning] = useState(false);
const bonusSpinnerRef = useRef(null);
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
  
  function makeTeamNamesArray(desiredCount, sourceNames = []) {
    const out = Array.from({ length: desiredCount }, (_, i) => {
      const raw = sourceNames[i];
      if (raw && String(raw).trim().length > 0) return String(raw).slice(0, TEAM_NAME_MAX);
      return `Team ${i + 1}`;
    });
    return out;
  }
 function applyTempTeamCount() {
    const n = parseIntSafe(tempTeamCount);
    const final = Number.isFinite(n) ? Math.min(MAX_TEAMS, Math.max(2, n)) : teamCount;
    setTeamCount(final);
    setTeamNames((arr) => {
      const next = makeTeamNamesArray(final, arr);
      return next;
    });
    setTempTeamCount(String(final));
  }
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
    gameStartTime: Date.now(),
    teamStats: {},
    wedgeStats: {},
    puzzlesStarted: 0,
    maxComeback: 0,
    // NEW ENHANCED STATS
    turnStartTime: null,
    totalTurnTime: 0,
    turnCount: 0,
    vowelSuccesses: 0,
    vowelFailures: 0,
    wedgeLandingStats: {},
    categoryStats: {},
    incorrectLetters: {},
  });
// Remove the gameStats initialization from the useEffect and create a separate function
const initializeGameStats = useCallback(() => {
  const puzzlesCount = (puzzles && puzzles.length) || FALLBACK.length;
  const puzzlesStarted = Math.max(1, Math.min(roundsCount, puzzlesCount));
  const firstPuzzle = (selectedPuzzles && selectedPuzzles[0]) || (puzzles && puzzles[0]) || FALLBACK[0];
  const initialCategory = firstPuzzle?.category || "PHRASE";
  return {
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
    puzzlesStarted,
    maxComeback: 0,
    turnStartTime: null,
    totalTurnTime: 0,
    turnCount: 0,
    vowelSuccesses: 0,
    vowelFailures: 0,
    wedgeLandingStats: {},
    incorrectLetters: {},
    categoryStats: {
      [initialCategory]: {
        attempted: 1,
        solved: 0,
      },
    },
  };
}, [roundsCount, puzzles, selectedPuzzles]);
// Initialize/reset gameStats when entering setup (or when puzzles/rounds change)
useEffect(() => {
  if (phase === "setup") {
    setGameStats(initializeGameStats());
  }
}, [phase, initializeGameStats]);
  const sfx = useSfx();
const imagesLoaded = useImagePreloader(); // ADD THIS LINE
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
 
// NEW: This effect conditionally resizes the wheel ONLY on mobile screens.
  useEffect(() => {
    const updateWheelSize = () => {
      if (phase === 'play') {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        let newSize;
        // Check if we are on a "mobile" screen size (less than 1024px, Tailwind's 'lg' breakpoint)
        if (screenWidth < 1024) {
          // On mobile, use the compact sizing logic
          newSize = Math.min(
            screenWidth * 0.9,
            screenHeight * 0.45 
          );
        } else {
          // On desktop, use the original, large, fixed size
          newSize = BASE_WHEEL_PX;
        }
        // The zoom logic remains the same
        const potentialZoomSize = newSize * 1.5;
        const finalSize = zoomed 
          ? Math.min(potentialZoomSize, screenWidth * 0.95) 
          : newSize;
        setWheelPx(finalSize);
      } else {
        setWheelPx(BASE_WHEEL_PX);
      }
    };
    updateWheelSize();
    window.addEventListener('resize', updateWheelSize);
    return () => window.removeEventListener('resize', updateWheelSize);
  }, [phase, zoomed]);
    
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

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (phase === 'play' || phase === 'bonus') {
        e.preventDefault();
        e.returnValue = ''; // Required for legacy browsers
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [phase]);

  function drawWheel(rot = 0) {
     // NEW: Determine which canvas ref to use based on screen size
    const isMobile = window.innerWidth < 1024;
    
    const canvasToDraw = isMobile ? mobileCanvasRef.current : canvasRef.current;
const canvas = zoomed ? zoomCanvasRef.current : canvasToDraw;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const W = wheelPx;
    const H = wheelPx;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    // ensure display:block to avoid baseline gap shifts
    canvas.style.display = "block";
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2;
    const cy = H / 2;
    // const pHeight = 40;
    // const pWidth = 30;
    //UPDATES 11:54AM 
     const pHeight = W * 0.08; // Peg size relative to wheel size
    const pWidth = W * 0.06;
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
function drawBonusWheel() {
  const canvas = bonusSpinnerRef.current;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = 400; // This is your internal drawing size
  const displaySize = 800; // Let's try drawing on a larger internal canvas
  // Set canvas dimensions for high-resolution drawing
  canvas.width = displaySize;
  canvas.height = displaySize;
  // Scale down the canvas element via CSS for display, if it's not already handled.
  // In React, you'd typically apply this via a ref.style or Tailwind/CSS class.
  // Example for direct manipulation (consider if this is the right place in React):
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  
  // Scale the context to draw everything at the higher resolution
  ctx.scale(displaySize / size, displaySize / size);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 40;
  ctx.clearRect(0, 0, size, size);
  const sections = BONUS_PRIZES.length;
  if (!sections) return;
  const sectionAngle = 360 / sections;
  const dir = BONUS_CW ? 1 : -1;
  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7'];
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((bonusSpinnerAngle * Math.PI) / 180);
  ctx.translate(-cx, -cy);
  for (let i = 0; i < sections; i++) {
    const startDeg = BONUS_START_DEG + dir * i * sectionAngle;
    const endDeg   = startDeg + dir * sectionAngle;
    const start = (startDeg * Math.PI) / 180;
    const end   = (endDeg * Math.PI) / 180;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, end, !BONUS_CW);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();
    const midDeg = startDeg + dir * (sectionAngle / 2);
    const midRad = (midDeg * Math.PI) / 180;
    const label = BONUS_PRIZES[i];
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(midRad);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    // --- CHANGED FONT SIZE AND TYPE ---
    ctx.font = 'bold 19px Roboto, Arial, sans-serif'; // Increased font size, changed font family
    // --- SLIGHTLY ADJUSTED SHADOW FOR A SOFTER LOOK ---
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; // Slightly darker shadow
    ctx.shadowOffsetX = 3; // Increased offset for shadow
    ctx.shadowOffsetY = 3; // Increased offset for shadow
    ctx.shadowBlur = 6; // Increased blur for a softer shadow
    const textRadius = radius * 0.65;
    const normalizedMidRad = (midRad % (2 * Math.PI) + (2 * Math.PI)) % (2 * Math.PI);
    const isLeftHalf = normalizedMidRad > Math.PI / 2 && normalizedMidRad < (3 * Math.PI) / 2;
    if (isLeftHalf) {
      ctx.rotate(Math.PI);
      ctx.fillText(label, -textRadius, 0);
    } else {
      ctx.fillText(label, textRadius, 0);
    }
    
    ctx.restore();
  }
  ctx.restore();
  // Draw the center hub
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.1, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#00000022';
  ctx.stroke();
  
  // Draw the top pointer
  ctx.beginPath();
  ctx.moveTo(cx, 50);
  ctx.lineTo(cx - 15, 20);
  ctx.lineTo(cx + 15, 20);
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
// Make sure the function that calls startCharge can handle async (pointerdown handlers can call it)
const startCharge = async () => {
  if (isRevealingLetters || finishingRef.current) return;
  if (!canSpin || isCharging) return;
  // immediate sync flag flip
  setIsCharging(true);
  isChargingRef.current = true;
  setSnapChargeToZero(true);
  setSpinPower(0);
  chargeSnapshotRef.current = 0;
  chargeDirRef.current = 1;
  setChargeSession((s) => s + 1);
  // stop any leftover timeouts/intervals
  if (chargeLoopTimeoutRef.current) {
    clearTimeout(chargeLoopTimeoutRef.current);
    chargeLoopTimeoutRef.current = null;
  }
  // Ensure AudioContext is resumed (this must be in direct response to a user gesture)
  try {
    await sfx.unlock(); // resume audio context if suspended
  } catch (e) {}
  // Start the charge sound as a gapless loop. Prefer loop() (which creates a looped BufferSource)
  try {
    await sfx.loop("chargeUp");
  } catch (e) {
    // fallback to one-shot (shouldn't be necessary if loop works)
    try { sfx.play("chargeUp"); } catch (e2) {}
  }
  // Start the UI charge animation/interval
  requestAnimationFrame(() => {
    setSnapChargeToZero(false);
    const stepMs = 16;
    const stepDelta = 5.7;
    // clear existing to be safe
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
  // ensure no stale timeout remains
  if (chargeLoopTimeoutRef.current) {
    clearTimeout(chargeLoopTimeoutRef.current);
    chargeLoopTimeoutRef.current = null;
  }
  // stop UI interval
  if (chargeIntervalRef.current) {
    clearInterval(chargeIntervalRef.current);
    chargeIntervalRef.current = null;
  }
  // read & clear sync flag
  const wasCharging = isChargingRef.current;
  isChargingRef.current = false;
  // stop the looped charge sound
  try { sfx.stopLoop("chargeUp"); } catch (e) {
    try { sfx.stop("chargeUp"); } catch (e2) {}
  }
  // If we never actually started charging (race), just bail
  if (!wasCharging) return;
  // use the snapshot (keeps behavior deterministic even if React state lags)
  const power = Math.max(1, Math.round(chargeSnapshotRef.current || 0));
  chargeSnapshotRef.current = 0;
  setIsCharging(false);
  setSnapChargeToZero(true);
  setSpinPower(0);
  // small rAF to clear the snap flag
  requestAnimationFrame(() => setSnapChargeToZero(false));
  // finally begin the spin action
  onSpin(power);
};
// NEW: This useEffect now applies touch listeners to BOTH the mobile and desktop spin buttons
  useEffect(() => {
    const buttons = [spinButtonRef.current, mobileSpinButtonRef.current].filter(Boolean);
    if (buttons.length === 0) return;
    const handleTouchStart = (e) => {
      e.preventDefault();
      startCharge();
    };
    const handleTouchEnd = (e) => {
      e.preventDefault();
      endCharge();
    };
    buttons.forEach(button => {
        button.addEventListener('touchstart', handleTouchStart, { passive: false });
        button.addEventListener('touchend', handleTouchEnd, { passive: false });
        button.addEventListener('touchcancel', handleTouchEnd, { passive: false });
    });
    return () => {
      buttons.forEach(button => {
        button.removeEventListener('touchstart', handleTouchStart);
        button.removeEventListener('touchend', handleTouchEnd);
        button.removeEventListener('touchcancel', handleTouchEnd);
      });
    };
  }, [canSpin, startCharge, endCharge]);
  useEffect(() => {
    const overlay = blockingOverlayRef.current;
    if (!overlay) return;
    const blockEvent = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    // Add the listener with passive: false to fix the warning
    overlay.addEventListener('touchstart', blockEvent, { passive: false });
    // Cleanup
    return () => {
      overlay.removeEventListener('touchstart', blockEvent);
    };
  }, []);
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
        // ensure turnStartTime is set at the start of a turn (if it wasn't already)
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
       landedOwnerRef.current = null;
      passTurn();
      return;
    }
     landedOwnerRef.current = active;
    
    // Track wedge landing statistics
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
            const targetAngle = angleForWedgeIndex(mysteryIndex, currentWedges, testTshirtMode);
            setAngle(targetAngle);
          }
          // IMPORTANT: always treat mystery final as a PRIZE (no cash)
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
      if (tshirtHolder === active) setTshirtHolder(null);
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
       setRoundWinnerIndex(active);
      setIsRevealingLetters(true);
      // E: increment puzzlesSolved in gameStats and per-team puzzlesSolved
     try {
        const solverName = teams[active]?.name;
        setGameStats((prev) => {
          // Track category solve
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
      } catch (e) {}
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
		  try { sfx.play("tshirt"); } catch (e) {}
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
       const extraFromCash =
            resolvedLanded &&
            resolvedLanded.t === "cash" &&
            typeof resolvedLanded.v === "number" &&
            landedOwnerRef.current === active
              ? resolvedLanded.v
              : 0;
        const updatedTeam = { ...t, total: t.total + t.round + SOLVE_BONUS, round: 0 };
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
      // Track comeback statistics
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
        }, i * SOLVE_REVEAL_INTERVAL);
      });
      const totalRevealTime = hideIndices.length * SOLVE_REVEAL_INTERVAL;
const WIN_SHOW_DELAY=300
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
      // not solved: clear round bank / holding for all teams
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
      
      // FIX: Add a new counter for completed turns
      const newTeamCompletedTurns = (prevTeam.completedTurns || 0) + 1;
      return {
        ...prev,
        totalTurnTime: (prev.totalTurnTime || 0) + turnDuration,
        turnCount: (prev.turnCount || 0) + 1,
        turnStartTime: null, // Reset for the next turn
        teamStats: {
          ...prev.teamStats,
          [currentTeamName]: {
            ...prevTeam,
            totalTurnTime: newTeamTotalTurnTime,
            completedTurns: newTeamCompletedTurns, // Store the new turn count
            // FIX: Use the correct divisor
            avgTurnTime: Math.round(newTeamTotalTurnTime / newTeamCompletedTurns),
          },
        },
      };
    });
  } else {
    // This case likely happens at the start of a turn that doesn't involve a spin
    setGameStats((prev) => ({ ...prev, turnStartTime: Date.now() }));
  }
  // FIX: Ensure we're using the current active team to calculate the next one
  // This prevents stale state issues
  const nextActive = nextIdx(active, teams.length);
  console.log(`Passing turn: Team ${active + 1} -> Team ${nextActive + 1}`);
  
  // Rotate active player & reset awaiting state
  setActive(nextActive);
  setAwaitingConsonant(false);
};
    
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
    // Track category for statistics
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
// COMMENTED OUT THIS LINE   setActive(nextIdx(roundWinnerIndex, teams.length));
     setActive(nextIdx(active, teams.length)); //NEW CHANGE
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
  setShowBonusSpinner(true);
}
// Optional tunables (longer spin, no linger)
const SPIN_MIN_TURNS = 12;
const SPIN_MAX_TURNS = 18;
const SPIN_DURATION_MS = 5200;
function spinBonusWheel() {
  if (bonusSpinnerSpinning) return;
  // PREDETERMINE THE PRIZE
  const chosenPrizeIndex = Math.floor(Math.random() * BONUS_PRIZES.length);
  const chosenPrize = BONUS_PRIZES[chosenPrizeIndex];
  setBonusSpinnerSpinning(true);
  try { sfx.play("spin"); } catch (_) {}
  const spins = Math.floor(Math.random() * (SPIN_MAX_TURNS - SPIN_MIN_TURNS + 1)) + SPIN_MIN_TURNS;
// Calculate exact angle to land on chosen prize
  const sections = BONUS_PRIZES.length;
  const sectionAngle = 360 / sections;
  const targetAngle = chosenPrizeIndex * sectionAngle + sectionAngle / 2;
    // Add multiple rotations plus the target
  const totalRotation = spins * 360 + targetAngle;
  const startTime = performance.now();
  const startAngle = bonusSpinnerAngle;
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const animate = (now) => {
    const progress = Math.min((now - startTime) / SPIN_DURATION_MS, 1);
    const currentAngle = startAngle + totalRotation * easeOutCubic(progress);
    setBonusSpinnerAngle(currentAngle % 360);
    if (progress < 1) {
      requestAnimationFrame(animate);
      return;
    }
 // Just set the predetermined prize - no calculations needed!
    setBonusPrize(chosenPrize);
    
    try { sfx.stop("spin"); } catch (_) {}
    setBonusSpinnerSpinning(false);
  // Proceed to letter selection
    setTimeout(() => {
      setShowBonusSpinner(false);
      setBonusHideBoard(true);
      setShowBonusLetterModal(true);
      setBonusLetterType("consonant");
    }, 500);
  };
    requestAnimationFrame(animate);
}
function selectBonusPrizeAndSnap(currentAngle, setBonusPrize, setBonusSpinnerAngle) {
  const sections = BONUS_PRIZES.length;
  if (!sections) return;
  const sectionAngle = 360 / sections;
  // wheel’s absolute final angle normalized (0..359)
  const finalDeg = ((currentAngle % 360) + 360) % 360;
  // angle under the fixed 12 o’clock pointer using SAME origin as draw
  const angleUnderPointer = BONUS_CW
    ? (360 - finalDeg - BONUS_START_DEG + 360) % 360
    : (finalDeg - BONUS_START_DEG + 360) % 360;
  // center selection to avoid border off-by-one
  const prizeIndex = Math.floor((angleUnderPointer + sectionAngle / 2) / sectionAngle) % sections;
  const selectedPrize = BONUS_PRIZES[prizeIndex];
  setBonusPrize(selectedPrize);
  // snap instantly to exact center of the winning slice (no linger)
  const centeredUnderPointer = prizeIndex * sectionAngle + sectionAngle / 2;
  const desiredFinalDeg = BONUS_CW
    ? (360 - ((centeredUnderPointer + BONUS_START_DEG) % 360) + 360) % 360
    : ((centeredUnderPointer + BONUS_START_DEG) % 360 + 360) % 360;
  // rotate minimal amount to align exactly to center
  const delta = ((finalDeg - desiredFinalDeg + 540) % 360) - 180;
  setBonusSpinnerAngle(currentAngle - delta);
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
    setBonusCountdown(30);
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
  
  // Track category for statistics
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
  
  // Move setGameStats here, right after count is defined:
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
    <div
      className={cls(
        // Smaller padding and min-height on mobile
        "rounded-lg sm:rounded-2xl p-2 sm:p-3 lg:p-4 backdrop-blur-md bg-white/10 flex flex-col justify-between min-h-[60px] sm:min-h-[84px] transform-gpu",
        i === active ? "ring-2 sm:ring-4 ring-inset ring-yellow-300 ring-offset-0" : ""
      )}
      style={{ cursor: "default" }}
      aria-current={i === active ? "true" : "false"}
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="text-[10px] sm:text-xs uppercase tracking-widest opacity-90 select-none">{t.name}</div>
          <div className="text-[10px] sm:text-xs opacity-70">Total: ${t.total.toLocaleString()}</div>
        </div>
        <div className="flex flex-col items-end gap-0.5 sm:gap-1">
          {Object.entries(prizeCounts).map(([prizeLabel, count]) => (
            <div
              key={`${prizeLabel}-${count}`}
              className={cls(
                "px-1 sm:px-2 py-0.5 sm:py-1 text-[9px] sm:text-xs font-bold rounded-md",
                prizeLabel === "T-SHIRT" ? "bg-purple-600" :
                prizeLabel === "PIN" ? "bg-red-600" :
                prizeLabel === "STICKER" ? "bg-blue-600" :
                prizeLabel === "MAGNET" ? "bg-gray-600" :
                prizeLabel === "KEYCHAIN" ? "bg-orange-600" : "bg-green-600"
              )}
            >
              {prizeLabel}{count > 1 ? ` x${count}` : ""}
            </div>
          ))}
          {Array.isArray(t.holding) && t.holding.length > 0 && phase === "play" && (
            <div className="flex gap-1 sm:gap-2 mt-1 sm:mt-2 flex-wrap">
              {Object.entries(holdingCounts).map(([label, cnt]) => (
                <div key={`holding-${label}`} className="px-1 sm:px-2 py-0.5 sm:py-1 text-[8px] sm:text-[10px] font-extrabold rounded-md bg-purple-700/80 text-white">
                  HOLDING {label}{cnt > 1 ? ` x${cnt}` : ""}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="mt-0.5 sm:mt-1 text-lg sm:text-2xl lg:text-3xl font-black tabular-nums">${t.round.toLocaleString()}</div>
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
            
           <input
  ref={inputRef}
  type="text"
  value={solveGuess}
onChange={(e) => setSolveGuess(sanitizeLetters(e.target.value))}
onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); handleSolve(); } else { allowLetterKey(e); } }}
  className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 text-lg font-semibold text-black mb-4"
  placeholder="Enter your guess"
  autoFocus
/>
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
const BonusSpinnerModal = () => {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    if (!showBonusSpinner) return;
    
    const canvas = canvasRef.current;
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
      ctx.font = 'bold 14px Arial';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
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
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.stroke();
    
  }, [bonusSpinnerAngle]);
  
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80">
      <div className="bg-white rounded-3xl p-8 w-full max-w-2xl text-center shadow-2xl">
        <h1 className="text-4xl font-black mb-4 text-black">BONUS ROUND</h1>
        <p className="text-xl font-semibold mb-6 text-gray-700">
          Good luck: <span className="text-blue-600">{displayBonusPlayer}</span>!
        </p>
        <p className="text-lg text-gray-600 mb-6">Spin the wheel to see what prize you're playing for!</p>
        
        <div className="flex justify-center mb-6">
          <canvas 
            ref={canvasRef}
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
            <div className="text-2xl font-black text-gray-800 mb-2">🎉 CONGRATULATIONS! 🎉</div>
            <div className="text-lg text-gray-700">You're playing for: <span className="font-bold text-purple-600">{bonusPrize}</span></div>
          </div>
        )}
      </div>
    </div>
  );
};
const BonusLetterModal = () => {
  const GIVEN = ["R", "S", "T", "L", "N", "E"];
  const isSelectingConsonants = bonusLetterType === "consonant";
  // NEW: limit and helpers
  const consonantLimit = 3;
  // pickable letters (only show letters user can actually click)
  // For vowels we will stage the vowel (stageVowel) and not reveal until Confirm is pressed.
  const pickableLetters = LETTERS.filter((letter) => {
    if (isSelectingConsonants) {
      return !VOWELS.has(letter) && !GIVEN.includes(letter) && !bonusConsonants.includes(letter);
    } else {
      // once a vowel is staged (bonusVowel), don't show any more vowels as pickable
      return VOWELS.has(letter) && !GIVEN.includes(letter) && !bonusVowel;
    }
  });
  // remove handlers
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
  // Stage a vowel (do NOT reveal/close yet) — user must press Confirm to proceed
  const stageVowel = (v) => {
    if (!VOWELS.has(v)) return;
    // set staged vowel globally so UI updates (buttons disable)
    setBonusVowel(v);
    setBonusLetters((prev) => {
      const next = new Set(prev);
      next.add(v);
      return next;
    });
    // Do not call revealBonusLetters or close modal here — Confirm handles that
  };
  // Back handler: only relevant when you're on vowel selection.
  // Clears the vowel choice (if any) and returns to consonant selection so user can re-pick consonants.
  const handleBackFromVowel = () => {
    if (bonusVowel) {
      // remove previously chosen vowel from the set
      setBonusLetters((prev) => {
        const next = new Set(prev);
        next.delete(bonusVowel);
        return next;
      });
      setBonusVowel("");
    }
    setBonusLetterType("consonant");
  };
  // full-width grid so a row-spanning placeholder can center correctly
  const columns = isSelectingConsonants ? 6 : Math.min(6, pickableLetters.length || 1);
  const pickGridClasses = "grid gap-3 w-full";
  const gridStyle = {
    gridTemplateColumns: `repeat(${columns}, 52px)`,
    justifyItems: "center", // center each cell horizontally
    alignItems: "center",
  };
  // NEW: enforce limit - can't add more than 3 consonants
  const canPickMore = isSelectingConsonants ? bonusConsonants.length < consonantLimit : !bonusVowel;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      {/* modal slightly wider so message has room */}
      <div className="bg-white rounded-xl p-6 w-full max-w-lg text-center">
        <h2 className="text-2xl font-bold mb-4 text-black">
          {isSelectingConsonants ? `Choose Consonant ${bonusConsonants.length + 1}/${consonantLimit}` : "Choose 1 Vowel"}
        </h2>
        <p className="text-sm text-gray-600 mb-4">Given: {GIVEN.join(", ")}</p>
        {/* Selected area */}
        <div className="mb-4">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Selected</div>
          <div className="flex gap-2 justify-center">
            {isSelectingConsonants ? (
              bonusConsonants.length > 0 ? (
                bonusConsonants.map((c) => (
                  <button
                    key={c}
                    onClick={() => unselectConsonant(c)}
                    title={`Remove ${c}`}
                    className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-600 text-white font-bold hover:opacity-90"
                  >
                    {c}
                  </button>
                ))
              ) : (
                <div className="text-sm text-gray-400">None selected yet</div>
              )
            ) : bonusVowel ? (
              <button
                onClick={unselectVowel}
                title={`Remove ${bonusVowel}`}
                className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-600 text-white font-bold hover:opacity-90"
              >
                {bonusVowel}
              </button>
            ) : (
              <div className="text-sm text-gray-400"></div>
            )}
          </div>
        </div>
        {/* show a helper message when at the consonant limit */}
        {isSelectingConsonants && bonusConsonants.length >= consonantLimit && (
          <div className="text-sm text-red-500 mb-2">Maximum {consonantLimit} consonants selected — remove one to pick another.</div>
        )}
        {/* Compact pickable grid (only shows pickable letters) */}
        <div className="flex justify-center mb-2">
          <div className="grid gap-3" style={{
            gridTemplateColumns: `repeat(${Math.min(pickableLetters.length, columns)}, 52px)`,
            justifyItems: "center",
            alignItems: "center",
          }}>
            {pickableLetters.length > 0 && (
              pickableLetters.map((letter) => {
                const disabled = isSelectingConsonants ? !canPickMore : !canPickMore;
                const baseBtn = "w-12 h-12 rounded-lg text-sm font-bold flex items-center justify-center";
                const enabledClass = "bg-blue-500 text-white hover:bg-blue-600";
                const disabledClass = "bg-gray-200 text-gray-500 cursor-not-allowed";
                const title = disabled ? (isSelectingConsonants ? "Remove a consonant to pick another" : "Vowel already chosen") : `Pick ${letter}`;
                // For consonants: call handleBonusLetter (commits immediately)
                // For vowels: stage the vowel (requires Confirm to reveal)
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
                    title={title}
                    className={cls(baseBtn, disabled ? disabledClass : enabledClass)}
                  >
                    {letter}
                  </button>
                );
              })
            )}
          </div>
        </div>
        {/* Message displayed OUTSIDE the grid when no letters available */}
        {pickableLetters.length === 0 && (
          <div className="flex justify-center mb-2">
            <div
              role="status"
              aria-live="polite"
              className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 text-center whitespace-nowrap"
            >
              No letters left to pick in this category.
            </div>
          </div>
        )}
        {/* Action buttons: show Back & Confirm when on vowel screen; NO Close button */}
        <div className="mt-4 flex items-center justify-center gap-3">
          {!isSelectingConsonants && (
            <>
              <button
                onClick={handleBackFromVowel}
                className="px-4 py-2 rounded-xl bg-gray-100 text-gray-800 font-semibold hover:bg-gray-200"
              >
                ← Back
              </button>
              <button
                onClick={() => {
                  if (!bonusVowel) return;
                  // close modal and reveal letters using your existing reveal function
                  setShowBonusLetterModal(false);
                  revealBonusLetters(new Set([...(bonusLetters || []), bonusVowel]));
                }}
                disabled={!bonusVowel}
                className={cls(
                  "px-4 py-2 rounded-xl font-semibold",
                  !bonusVowel ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-green-600 text-white hover:bg-green-700"
                )}
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
  <div className="fixed inset-x-0 bottom-0 z-[55] bg-white rounded-t-2xl shadow-lg safe-bottom">
    <div className="p-4 max-w-3xl mx-auto">
      <h2 className="text-lg sm:text-xl font-bold text-black text-center">Solve to win {bonusPrize}!</h2>
      <div className="flex flex-col items-center gap-2 mt-2">
        <div className="text-2xl sm:text-3xl font-black text-red-500">{bonusCountdown}</div>
        <input 
          id="bonus-inline-solve-input" 
          ref={inputRef} 
          type="text" 
          value={bonusGuess} 
          onChange={onInputChange} 
          onKeyDown={onKeyDown} 
          placeholder="Enter your guess" 
          className="w-full px-3 py-2 rounded-lg border-2 border-blue-300 text-base sm:text-lg" 
          autoFocus 
        />
        <button 
          onClick={handleBonusSolve} 
          className="px-6 py-2 rounded-lg bg-purple-600 text-white font-semibold w-full sm:w-auto"
        >
          Submit
        </button>
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
        <div className="text-xl md:text-2xl font-semibold text-gray-700 mb-6">Press <strong>READY</strong> when you're ready. The 30 second countdown will start immediately.</div>
        <div className="flex items-center justify-center gap-4">
          <button onClick={pressReadyStartBonus} disabled={readyDisabled || bonusActive} className={cls("px-10 py-4 rounded-xl text-2xl font-extrabold text-white", (readyDisabled || bonusActive) ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700")}>READY</button>
        </div>
      </div>
    </div>
  );
const BonusResultModal = ({ result }) => {
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
      <div className={cls("bg-white rounded-3xl p-10 w-full max-w-3xl text-center shadow-2xl",
          result === "win" ? "border-4 border-green-400" : "border-4 border-red-400"
        )}>
        {result === "win" ? (
          <>
            <h2 className="text-5xl font-extrabold mb-4 text-green-700">CONGRATS!</h2>
           <div className="mb-4">
  <p className="text-2xl text-black">You solved the bonus puzzle and won a</p>
  <div className="font-extrabold text-3xl mt-2">{bonusPrize}</div>
</div>
          </>
        ) : (
          <>
            <h2 className="text-5xl font-extrabold mb-4 text-red-700">Too bad!</h2>
            <p className="text-2xl text-black mb-2">You did not solve the bonus puzzle in time.</p>
            <p className="text-xl font-bold text-black mt-2">The word was: <span className="uppercase">{board.map((b) => b.ch).join("")}</span></p>
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
  const StatsModal = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
    <div className="bg-white rounded-xl p-6 w-full max-w-4xl text-center max-h-[80vh] overflow-y-auto">
   <div className="flex items-center justify-between mb-6">
  <button
    onClick={() => setShowStats(false)}
    aria-label="Close statistics"
    className="px-3 py-2 rounded-lg bg-red-500 text-white border border-red-600 hover:bg-red-600 text-sm font-semibold"
  >
    Close
  </button>
  <h2 className="text-2xl font-bold text-black flex-1 text-center">Game Statistics</h2>
  <div className="w-16"></div> 
</div>
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
          {/* <div className="bg-gray-100 p-4 rounded-lg">
    <div className="text-2xl font-bold text-green-600">{gameStats.correctGuesses + gameStats.incorrectGuesses === 0 ? "N/A" : Math.round((gameStats.correctGuesses / (gameStats.correctGuesses + gameStats.incorrectGuesses)) * 100) + "%"}</div>
            <div className="text-sm">Accuracy</div>
          </div> */}
          {/* <div className="bg-gray-100 p-4 rounded-lg">
  <div className="text-2xl font-bold text-cyan-600">{gameStats.puzzlesStarted > 0 ? Math.round((gameStats.puzzlesSolved / gameStats.puzzlesStarted) * 100) + "%" : "N/A"}</div>
  <div className="text-sm">Completion Rate</div>
</div> */}
<div className="bg-gray-100 p-4 rounded-lg">
  <div className="text-2xl font-bold text-indigo-600">{gameStats.gameStartTime ? Math.round((Date.now() - gameStats.gameStartTime) / 60000) + "m" : "N/A"}</div>
  <div className="text-sm">Game Duration</div>
</div>
{/* <div className="bg-gray-100 p-4 rounded-lg">
            <div className="text-2xl font-bold text-pink-600">${gameStats.maxComeback.toLocaleString()}</div>
            <div className="text-sm">Biggest Comeback</div>
          </div> */}
          {/* <div className="bg-gray-100 p-4 rounded-lg"> */}
            {/* <div className="text-2xl font-bold text-purple-600">
              {gameStats.turnCount > 0 ? Math.round(gameStats.totalTurnTime / gameStats.turnCount / 1000) + "s" : "N/A"}
            </div> */}
          
           {/* <div className="bg-gray-100 p-4 rounded-lg">
  <div className="text-2xl font-bold text-purple-600">
    {Number.isFinite(gameStats.totalTurnTime) && (gameStats.turnCount || 0) > 0
      ? Math.round((gameStats.totalTurnTime || 0) / (gameStats.turnCount || 1) / 1000) + "s"
      : "N/A"}
  </div>
  <div className="text-sm">Avg Turn Time</div>
</div> */}
          {/* </div> */}
          {/* <div className="bg-gray-100 p-4 rounded-lg">
            <div className="text-2xl font-bold text-teal-600">
              {(gameStats.vowelSuccesses + gameStats.vowelFailures) > 0 
                ? Math.round((gameStats.vowelSuccesses / (gameStats.vowelSuccesses + gameStats.vowelFailures)) * 100) + "%"
                : "N/A"}
            </div>
            <div className="text-sm">Vowel Success Rate</div>
          </div> */}
          <div className="bg-gray-100 p-4 rounded-lg">
            <div className="text-lg font-bold text-red-600">
              {Object.entries(gameStats.incorrectLetters || {})
                .sort(([,a], [,b]) => b - a)
                .slice(0, 3)
                .map(([letter, count]) => `${letter}(${count})`)
                .join(" ") || "None"}
            </div>
            <div className="text-sm">Most Incorrect Letters</div>
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
  
  <div className="flex justify-between">
    <span>Efficiency:</span>
    <span className="font-bold">
              {(gameStats.teamStats[team.name]?.totalTurns || 0) > 0 ? Math.round(team.total / (gameStats.teamStats[team.name]?.totalTurns || 1)) : 0} pts/action
            </span>
    </div>
  {/* <div className="flex justify-between">
  <span>Avg Turn Time:</span>
  <span className="font-bold">
    {Number.isFinite(gameStats.teamStats?.[team.name]?.avgTurnTime)
      ? Math.round(gameStats.teamStats[team.name].avgTurnTime / 1000) + "s"
      : "N/A"}
  </span>
</div> */}
  <div className="flex justify-between"><span>Correct Letter Streak:</span><span className="font-bold">{gameStats.teamStats[team.name]?.maxConsecutive || 0}</span></div>
  <div className="flex justify-between"><span>Vowels Bought:</span><span className="font-bold">{gameStats.teamStats[team.name]?.vowelsBought || 0}</span></div>
  <div className="flex justify-between"><span>Vowel Success Rate:</span><span className="font-bold">{(() => { const successes = gameStats.teamStats[team.name]?.vowelSuccesses || 0; const failures = gameStats.teamStats[team.name]?.vowelFailures || 0; return (successes + failures) > 0 ? Math.round((successes / (successes + failures)) * 100) + "%" : "N/A"; })()}</span></div>
  <div className="flex justify-between"><span>Spins:</span><span className="font-bold">{gameStats.teamStats[team.name]?.spins || 0}</span></div>
  <div className="flex justify-between"><span>Bankrupts:</span><span className="font-bold">{gameStats.teamStats[team.name]?.bankrupts || 0}</span></div>
  <div className="flex justify-between"><span>Lose a Turn:</span><span className="font-bold">{gameStats.teamStats[team.name]?.loseTurns || 0}</span></div>
  {/* <div className="flex justify-between"><span>Biggest Comeback:</span><span className="font-bold">${(gameStats.teamStats[team.name]?.biggestComeback || 0).toLocaleString()}</span></div> */}
  <div className="flex justify-between"><span>Solved While Behind:</span><span className="font-bold">{gameStats.teamStats[team.name]?.solveWhenBehind || 0}</span></div>
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
      <button onClick={() => setShowStats(false)} className="px-6 py-3 rounded-xl bg-red-500 text-white border border-red-600 
      hover:bg-red-600 font-bold">Close</button>
    </div>
  </div>
);
  // Render branches
if (phase === "bonus") {
  const bonusState = bonusActive ? "countdown" : (bonusPrize ? (bonusAwaitingReady ? "ready" : "letters") : "prize_spin");
  return (
    <div className={cls("fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-auto p-4", GRADIENT)}>
      <PersistentHeader
        sfx={sfx}
        phase={phase}
        backToSetup={backToSetup}
        toggleFullscreen={toggleFullscreen}
        awaitingConsonant={awaitingConsonant}
        zoomed={zoomed}
        landed={landed}
        spinning={spinning}
        showSolveModal={showSolveModal}
        showWinScreen={showWinScreen}
        bonusReadyModalVisible={bonusReadyModalVisible}
        bonusResult={bonusResult}
        showStats={showStats}
        showBonusLetterModal={showBonusLetterModal}
        showBonusSelector={showBonusSelector}
        bonusActive={bonusActive}
        bonusRevealing={bonusRevealing}
        bonusAwaitingReady={bonusAwaitingReady}
        isFullscreen={isFullscreen}
        showBonusSolveModal={showBonusSolveModal}
        bonusSpinning={bonusSpinning}
        showMysterySpinner={showMysterySpinner}
      />
      
      {/* Prize Spin State - Show bonus wheel and spin button */}
     {bonusState === "prize_spin" && !showBonusSelector && (
  <BonusPrizeShuffler
    displayBonusPlayer={displayBonusPlayer}
    bonusPrize={bonusPrize}
    setBonusPrize={setBonusPrize}
    bonusSpinnerSpinning={bonusSpinnerSpinning}
    setBonusSpinnerSpinning={setBonusSpinnerSpinning}
    sfx={sfx}
    setBonusHideBoard={setBonusHideBoard}
    setShowBonusLetterModal={setShowBonusLetterModal}
    setBonusLetterType={setBonusLetterType}
  />
)}
      
   {/* Other bonus states */}
      {bonusState !== "prize_spin" && (
        <div className="max-w-6xl w-full mx-auto text-center py-8">
          <h1 className="text-5xl font-black mb-2">BONUS ROUND</h1>
          <p className="text-2xl mb-6">Good luck: {displayBonusPlayer}</p>
          
          {!bonusHideBoard && (
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
          
          {bonusState === "letters" && bonusAwaitingReady && !bonusReadyModalVisible && (
            <div className="my-8 flex flex-col items-center gap-6">
              <div className="text-5xl font-black text-yellow-300">{bonusPrize}</div>
              <p className="text-lg">Letters revealed. Press READY when you're ready to begin the 30s countdown.</p>
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
      )}
      
      {showBonusSelector && <BonusWinnerSelectorModal />}
      {showBonusLetterModal && <BonusLetterModal />}
      {bonusResult && <BonusResultModal result={bonusResult} />}
      <ConfettiCanvas trigger={bonusResult === 'win'} />
    </div>
  );
}
  if (phase === "done") {
    const sorted = [...teams].sort((a, b) => b.total - a.total);
    return (
      <div className={cls("min-h-screen h-screen text-white flex flex-col items-center justify-center p-4", GRADIENT)}>
        <PersistentHeader
  sfx={sfx}
  phase={phase}
  backToSetup={backToSetup}
  toggleFullscreen={toggleFullscreen}
  awaitingConsonant={awaitingConsonant}
  zoomed={zoomed}
  landed={landed}
  spinning={spinning}
  showSolveModal={showSolveModal}
  showWinScreen={showWinScreen}
  bonusReadyModalVisible={bonusReadyModalVisible}
  bonusResult={bonusResult}
  showStats={showStats}
  showBonusLetterModal={showBonusLetterModal}
  showBonusSelector={showBonusSelector}
  bonusActive={bonusActive}
  bonusRevealing={bonusRevealing}
  bonusAwaitingReady={bonusAwaitingReady}
  isFullscreen={isFullscreen}
  showBonusSolveModal={showBonusSolveModal}
  bonusSpinning={bonusSpinning}
  showMysterySpinner={showMysterySpinner}
/>
        <div className="max-w-6xl w-full mx-auto p-6 bg-white/10 rounded-2xl backdrop-blur-md flex flex-col gap-6">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2 text-center">Game Over!</h1>
          <div className="text-4xl font-semibold text-center">
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
            <button onClick={restartAll} className="px-4 py-2 rounded-xl bg-white text-black font-semibold hover:opacity-90">Play Again <br/>(with same settings)</button>
            <button onClick={backToSetup} className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 font-semibold">Back to Setup</button>
            <button onClick={() => setShowStats(true)} className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 font-semibold">Statistics</button>
          </div>
        </div>
        {showStats && <StatsModal />}
      </div>
    );
  }
// CODE TO REPLACE WITH
if (phase === "setup") {
    // helper used inside render to interpret tempTeamCount for live rendering
    const liveCount = (() => {
      const n = parseIntSafe(tempTeamCount);
      return Number.isFinite(n) ? Math.max(2, Math.min(MAX_TEAMS, n)) : Math.max(2, Math.min(MAX_TEAMS, teamCount));
    })();
    // Start-handler that applies typed values, sanitizes names, and initializes teams/puzzles
    const startGameFromSetup = async () => {
      // Ensure audio is unlocked/resumed in response to this user gesture.
      try {
        await sfx.unlock();
      } catch (e) {
        // ignore; unlock is best-effort
        console.warn("sfx.unlock() failed or not needed:", e);
      }
      // Play the start sound (best-effort)
      try {
        sfx.play("startGame");
      } catch (e) {
        console.warn("Failed to play startGame sound:", e);
      }
      // Compute final team count & rounds deterministically from temp values
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
      // Now initialize teams and everything else
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
      // select puzzles based on finalRounds
      setSelectedPuzzles(chosen);
      setIdx(0);
      const first = chosen[0] || FALLBACK[0];
      setBoard(normalizeAnswer(first.answer));
      setCategory(first.category || "PHRASE");
      // Track category for statistics
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
    return (
      // MODIFIED: Added overflow-y-auto and changed justify-center to justify-start on mobile
      <div className={cls("min-h-screen h-screen text-white flex flex-col items-center justify-start lg:justify-center overflow-y-auto p-4 sm:p-6", GRADIENT)}>
        <PersistentHeader
          sfx={sfx}
          phase={phase}
          backToSetup={backToSetup}
          toggleFullscreen={toggleFullscreen}
          awaitingConsonant={awaitingConsonant}
          zoomed={zoomed}
          landed={landed}
          spinning={spinning}
          showSolveModal={showSolveModal}
          showWinScreen={showWinScreen}
          bonusReadyModalVisible={bonusReadyModalVisible}
          bonusResult={bonusResult}
          showStats={showStats}
          showBonusLetterModal={showBonusLetterModal}
          showBonusSelector={showBonusSelector}
          bonusActive={bonusActive}
          bonusRevealing={bonusRevealing}
          bonusAwaitingReady={bonusAwaitingReady}
          isFullscreen={isFullscreen}
          showBonusSolveModal={showBonusSolveModal}
          bonusSpinning={bonusSpinning}
          showMysterySpinner={showMysterySpinner}
        />
        <div className="max-w-7xl w-full mx-auto mt-16 lg:mt-0">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 text-center text-white [text-shadow:0_6px_18px_rgba(0,0,0,0.45)]"
            style={{ fontFamily: "'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial" }}
          >
            <span className="inline-block mr-2">🛞</span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 via-yellow-400 to-white">Wheel of Jon-Tune</span>
          </h1>
     {/* MODIFIED: Stacks on mobile and adds padding-bottom to avoid keyboard overlap */}
<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-28 lg:pb-0">
            {/* --- Game Setup Card --- */}
  <div className="rounded-2xl p-6 md:p-8 backdrop-blur-md bg-white/10 border border-white/10 shadow-lg">
              <h2 className="text-3xl font-bold text-center text-white mb-8">Game Setup</h2>
              <div className="space-y-6">
                
                {/* MODIFIED: Number of Teams - Stacks on mobile */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 sm:gap-4">
                  <label className="text-lg sm:text-xl uppercase tracking-wider font-bold text-white/90 text-left sm:text-center" htmlFor="team-count-input">Number of Teams</label>
                  <input
                    id="team-count-input"
  onFocus={(e) => e.target.select()}
  type="text"
  inputMode="numeric"
  pattern="[0-9]*"
  maxLength={3}                      // allows up to 3 digits — change/remove if desired
  value={tempTeamCount}
  onChange={(e) => setTempTeamCount(e.target.value.replace(/\D/g, ""))}
  onBlur={() => applyTempTeamCount()}
  className="w-full sm:w-20 px-4 py-3 rounded-lg bg-black/30 text-white text-center font-bold text-xl border border-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"/>
                </div>
                {/* MODIFIED: Number of Rounds - Stacks on mobile */}
                <div>
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 sm:gap-4 mb-2">
                    <label className="text-lg sm:text-xl uppercase tracking-wider font-bold text-white/90 text-left sm:text-center" htmlFor="rounds-count-input">Number of Main Rounds</label>
                    <input
                      id="rounds-count-input"
  onFocus={(e) => e.target.select()}
  type="text"
  inputMode="numeric"
  pattern="[0-9]*"
  maxLength={3}
  value={tempRoundsCount}
  onChange={(e) => setTempRoundsCount(e.target.value.replace(/\D/g, ""))}
  onBlur={() => applyTempRoundsCount()}
  className="w-full sm:w-20 px-4 py-3 rounded-lg bg-black/30 text-white text-center font-bold text-xl border border-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
/>
                  </div>
                  <p className="text-sm sm:text-lg text-white/70 italic text-left sm:text-right">Bonus round is a single extra round.</p>
                </div>
                
                {/* Team Names */}
                <div>
                  <label className="text-xl uppercase tracking-wider font-bold text-white/90 mb-3 block text-left sm:text-center">Team Names</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2">
                    {Array.from({ length: liveCount }).map((_, i) => (
                      <input
                        key={i}
                        value={teamNames[i] || ""}
                        onChange={(e) => setTeamNames((arr) => {
                          const n = [...arr];
                          n[i] = e.target.value.slice(0, TEAM_NAME_MAX);
                          return n;
                        })}
                        className="w-full px-4 py-2 rounded-lg bg-black/20 text-white font-semibold border border-white/20 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
                        placeholder={`Team ${i + 1}`}
                        onFocus={(e) => e.target.select()}
                      />
                    ))}
                  </div>
                  <p className="text-base sm:text-xl text-white/70 mt-3 text-left sm:text-right">Max name length: {TEAM_NAME_MAX} characters.</p>
                </div>
                
                <div className="pt-4">
                  <button
                    onClick={startGameFromSetup}
                    disabled={!sfx.loaded || !imagesLoaded}
                    className={cls(
                      "w-full px-6 py-4 rounded-xl font-extrabold text-lg shadow-xl transform transition duration-200",
                      (!sfx.loaded || !imagesLoaded)
                        ? "bg-gray-400 text-gray-300 cursor-not-allowed"
                        : "bg-gradient-to-r from-yellow-400 to-orange-400 text-black hover:-translate-y-1 active:translate-y-0"
                    )}
                  >
                    {!sfx.loaded ? "Loading..." :
                      !imagesLoaded ? "Loading Images..." :
                        "▶ Start Game"}
                  </button>
                </div>
              </div>
            </div>
            {/* --- How to Play Card --- */}
            <div className="rounded-2xl p-6 md:p-8 backdrop-blur-md bg-white/10 border border-white/10 shadow-lg">
              <h2 className="text-3xl font-bold text-center text-white mb-8">How to Play</h2>
              <div className="space-y-6 text-white/95 leading-relaxed">
                <div>
                  <h3 className="font-semibold text-lg mb-2">🎯 The Goal</h3>
                  <p className="text-white/80">Work with your team to solve the word puzzle. The team with the most money at the end of all rounds wins!</p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">🕹️ On Your Turn</h3>
                  <ul className="list-inside space-y-2 text-white/80">
                    <li><span className="font-bold">Spin the Wheel:</span> Land on a dollar amount and guess a consonant.</li>
                    <li><span className="font-bold">Buy a Vowel:</span> Pay ${VOWEL_COST} to reveal a vowel.</li>
                    <li><span className="font-bold">Solve the Puzzle:</span> Guess the entire phrase to win the round!</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">⚠️ Watch Out For...</h3>
                  <ul className="list-inside space-y-2 text-white/80">
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
  
// Main play UI
  return (
    <div
      className={cls(
        "min-h-screen h-screen text-white flex flex-col items-center p-2 sm:p-4",
        zoomed ? "overflow-hidden" : "overflow-y-auto",
        GRADIENT
      )}
    >
      <PersistentHeader
        sfx={sfx}
        phase={phase}
        backToSetup={backToSetup}
        toggleFullscreen={toggleFullscreen}
        awaitingConsonant={awaitingConsonant}
        zoomed={zoomed}
        landed={landed}
        spinning={spinning}
        showSolveModal={showSolveModal}
        showWinScreen={showWinScreen}
        bonusReadyModalVisible={bonusReadyModalVisible}
        bonusResult={bonusResult}
        showStats={showStats}
        showBonusLetterModal={showBonusLetterModal}
        showBonusSelector={showBonusSelector}
        bonusActive={bonusActive}
        bonusRevealing={bonusRevealing}
        bonusAwaitingReady={bonusAwaitingReady}
        isFullscreen={isFullscreen}
        showBonusSolveModal={showBonusSolveModal}
        bonusSpinning={bonusSpinning}
        showMysterySpinner={showMysterySpinner}
      />
      <div
        className={cls(
          "w-full h-full flex flex-col",
          (zoomed || showWinScreen) && "invisible",
          (isRevealingLetters || finishingRef.current) && "pointer-events-none select-none"
        )}
      >
        {/* ======================================================================= */}
        {/* ====== MOBILE-ONLY LAYOUT (Visible below 1024px) ======================= */}
        {/* ======================================================================= */}
        <main className="w-full h-full flex flex-col justify-between max-w-lg mx-auto lg:hidden">
          {/* Top Section: Wheel and Action Buttons */}
          <div className="flex flex-col items-center gap-2 pt-12">
            <div className="relative flex items-center justify-center">
              {/* Use the new mobileCanvasRef here */}
              <canvas ref={mobileCanvasRef} style={{ width: `${wheelPx}px`, height: `${wheelPx}px`, display: "block" }} />
              <div
                className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full bg-no-repeat pointer-events-none"
                style={{ width: "20%", height: "20%", backgroundImage: "url(images/hub-image.png)", backgroundSize: "110%", backgroundPosition: "10% -30px" }}
                aria-hidden="true"
              />
            </div>
            <div className="flex justify-center flex-wrap gap-2 sm:gap-4 items-center mt-2">
              {/* Use the new mobileSpinButtonRef here */}
              <button ref={mobileSpinButtonRef} onMouseDown={startCharge} onMouseUp={endCharge} onMouseLeave={endCharge} disabled={!canSpin} style={canSpin ? { backgroundImage: `linear-gradient(to right, rgba(4,120,87,0.95) ${spinPower}%, #22c55e ${spinPower}%)`, transition: snapChargeToZero ? "none" : "background-image 80ms linear" } : {}} className={cls("rounded-xl font-bold text-base sm:text-xl px-4 py-2 sm:px-6 sm:py-3 transition-colors custom-hover", !canSpin ? "bg-gray-700/60 text-gray-400 cursor-not-allowed" : "text-white hover:brightness-110")}>
                SPIN
              </button>
              <button onClick={() => setShowVowelModal(true)} disabled={!canBuyVowel} className={cls("px-3 py-2 rounded-xl font-bold text-xs sm:text-base custom-hover", !canBuyVowel ? "bg-gray-700/60 text-gray-400 cursor-not-allowed" : "bg-blue-500 text-white hover:bg-blue-600")}>
                BUY VOWEL (${VOWEL_COST})
              </button>
              <button onClick={() => setShowSolveModal(true)} disabled={!canSolve} className={cls("px-3 py-2 rounded-xl font-bold text-xs sm:text-base custom-hover", !canSolve ? "bg-gray-700/60 text-gray-400 cursor-not-allowed" : "bg-purple-500 text-white hover:bg-purple-600")}>
                SOLVE
              </button>
            </div>
          </div>
          {/* Middle Section: Puzzle and Unified Keyboard */}
          <div className="w-full">
            <h2 className="text-xl sm:text-2xl font-bold tracking-widest uppercase text-center mb-2">{category}</h2>
            <div className="flex flex-wrap justify-center gap-1 sm:gap-2 p-2 rounded-xl backdrop-blur-md bg-white/10 w-full mb-4">
              {wordTokens.map((tok, i) => {
                if (tok.type === "space") return <div key={i} className="w-2 sm:w-4 h-8 sm:h-12 flex-shrink-0" />;
                return (
                  <div key={i} className="flex gap-1 sm:gap-1.5">
                    {tok.cells.map((cell, j) => {
                      const isSpecial = !isLetter(cell.ch);
                      return <div key={`${i}-${j}`} className={cls("w-6 h-8 sm:w-8 sm:h-12 text-lg sm:text-2xl font-bold flex items-center justify-center rounded", cell.shown ? "bg-yellow-300 text-black shadow-lg" : "bg-blue-950/80 text-white", isSpecial && "bg-transparent text-white")}>{isSpecial ? cell.ch : cell.shown ? cell.ch : ""}</div>;
                    })}
                  </div>
                );
              })}
            </div>
            <div className="w-full max-w-md mx-auto">
              <div className="grid grid-cols-9 gap-1.5 justify-center">
                {LETTERS.map((L) => {
                  const disabled = isRevealingLetters || letters.has(L) || VOWELS.has(L) || !awaitingConsonant;
                  return <button key={L} onClick={() => guessLetter(L)} disabled={disabled} aria-label={`Guess ${L}`} className={cls("w-8 h-8 sm:w-9 sm:h-9 rounded font-extrabold flex items-center justify-center text-sm transition-transform duration-150", disabled ? "bg-gray-700/50 text-gray-400 cursor-not-allowed" : "bg-white/10 hover:bg-white/20 active:scale-[0.98]")}>{L}</button>;
                })}
              </div>
              <div className="text-center mt-2 text-sm opacity-75">{awaitingConsonant ? "Pick a consonant" : "Spin, buy a vowel, or solve"}</div>
            </div>
          </div>
          {/* Bottom Section: Compact Team Cards */}
          <div className="w-full pb-2">
            <div className="grid grid-cols-3 gap-2 w-full">{teams.map((t, i) => <TeamCard key={i} t={t} i={i} />)}</div>
          </div>
        </main>
        
        {/* ======================================================================= */}
        {/* ====== DESKTOP-ONLY LAYOUT (Visible above 1024px) ===================== */}
        {/* ======================================================================= */}
        <main className="w-full max-w-7xl mx-auto flex-1 hidden lg:flex flex-col lg:flex-row items-center lg:items-center gap-4 min-h-0">
          {/* Left Column: Wheel and Buttons */}
          <div className="flex flex-col items-center justify-center gap-2 w-full lg:w-1/2 h-auto lg:h-full py-2">
            <div className="relative flex items-center justify-center">
              {/* Use the original canvasRef here */}
              <canvas ref={canvasRef} style={{ width: `${wheelPx}px`, height: `${wheelPx}px`, display: "block" }} />
              <div
                className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full bg-no-repeat pointer-events-none"
                style={{ width: "20%", height: "20%", backgroundImage: "url(images/hub-image.png)", backgroundSize: "110%", backgroundPosition: "10% -30px" }}
                aria-hidden="true"
              />
            </div>
            <div className="flex justify-center flex-wrap gap-2 sm:gap-4 items-center mt-2">
              {/* Use the original spinButtonRef here */}
              <button ref={spinButtonRef} onMouseDown={startCharge} onMouseUp={endCharge} onMouseLeave={endCharge} disabled={!canSpin} style={canSpin ? { backgroundImage: `linear-gradient(to right, rgba(4,120,87,0.95) ${spinPower}%, #22c55e ${spinPower}%)`, transition: snapChargeToZero ? "none" : "background-image 80ms linear" } : {}} className={cls("rounded-xl font-bold text-base sm:text-xl px-4 py-2 sm:px-8 sm:py-4 transition-colors custom-hover", !canSpin ? "bg-gray-700/60 text-gray-400 cursor-not-allowed" : "text-white hover:brightness-110")}>
                SPIN
              </button>
              <button onClick={() => setShowVowelModal(true)} disabled={!canBuyVowel} className={cls("px-4 py-2 rounded-xl font-bold text-sm sm:text-lg custom-hover", !canBuyVowel ? "bg-gray-700/60 text-gray-400 cursor-not-allowed" : "bg-blue-500 text-white hover:bg-blue-600")}>
                BUY VOWEL (${VOWEL_COST})
              </button>
              <button onClick={() => setShowSolveModal(true)} disabled={!canSolve} className={cls("px-4 py-2 rounded-xl font-bold text-sm sm:text-lg custom-hover", !canSolve ? "bg-gray-700/60 text-gray-400 cursor-not-allowed" : "bg-purple-500 text-white hover:bg-purple-600")}>
                SOLVE
              </button>
            </div>
          </div>
          
          {/* Right Column: Puzzle, Keyboard, Teams */}
          <div className="flex flex-col gap-4 w-full lg:w-1/2 h-full justify-center">
            <h2 className="text-xl sm:text-2xl font-bold tracking-widest uppercase text-center">{category}</h2>
            <div className="flex flex-wrap justify-center gap-1 sm:gap-2 p-2 sm:p-4 rounded-xl backdrop-blur-md bg-white/10 w-full">
              {wordTokens.map((tok, i) => {
                if (tok.type === "space") return <div key={i} className="w-2 sm:w-4 h-10 sm:h-14 flex-shrink-0 fullscreen:w-6" />;
                return (
                  <div key={i} className="flex gap-1 sm:gap-2">
                    {tok.cells.map((cell, j) => {
                      const isSpecial = !isLetter(cell.ch);
                      return <div key={`${i}-${j}`} className={cls("w-7 h-10 sm:w-10 sm:h-16 text-xl sm:text-3xl font-bold flex items-center justify-center rounded-md", cell.shown ? "bg-yellow-300 text-black shadow-lg" : "bg-blue-950/80 text-white", isSpecial && "bg-transparent text-white")}>{isSpecial ? cell.ch : cell.shown ? cell.ch : ""}</div>;
                    })}
                  </div>
                );
              })}
            </div>
            <div className="w-full max-w-2xl mx-auto p-2">
              <div className="flex flex-wrap justify-center gap-2 md:gap-3">
                {LETTERS.map((L) => {
                  const disabled = isRevealingLetters || letters.has(L) || VOWELS.has(L) || !awaitingConsonant;
                  return <button key={L} onClick={() => guessLetter(L)} disabled={disabled} aria-label={`Guess ${L}`} className={cls("w-11 h-11 lg:w-12 lg:h-12 rounded-md font-extrabold flex items-center justify-center text-lg transition-transform duration-150", disabled ? "bg-gray-700/50 text-gray-400 cursor-not-allowed" : "bg-white/10 hover:bg-white/20 active:scale-[0.98]")}>{L}</button>;
                })}
              </div>
              <div className="text-center mt-2 text-base opacity-75">{awaitingConsonant ? "Pick a consonant" : "Spin, buy a vowel, or solve"}</div>
            </div>
            <div className="w-full">
              <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-4 w-full">{teams.map((t, i) => <TeamCard key={i} t={t} i={i} />)}</div>
            </div>
          </div>
        </main>
      </div>
      {/* --- Modals and Overlays (Unchanged) --- */}
      <div className={cls("fixed inset-0 z-50 flex items-center justify-center", !zoomed && "hidden pointer-events-none")}>
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative flex items-center justify-center z-10">
          <canvas ref={zoomCanvasRef} style={{ width: `${wheelPx}px`, height: `${wheelPx}px`, display: "block" }} />
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full bg-no-repeat pointer-events-none" style={{ width: "20%", height: "20%", backgroundImage: "url(images/hub-image.png)", backgroundSize: "110%", backgroundPosition: "10% -30px" }} aria-hidden="true" />
        </div>
{/* THIS IS THE CORRECTED BLOCK */}
      {landed && (
        <div className="absolute inset-0 flex items-center justify-center p-8 text-6xl sm:text-8xl lg:text-9xl font-black uppercase text-white [text-shadow:0_4px_8px_rgba(0,0,0,0.8)] pointer-events-none z-20 text-center">
          {landed?.t === "cash" && `$${landed.v.toLocaleString()}`}
          {landed?.t === "bankrupt" && "BANKRUPT"}
          {landed?.t === "lose" && "LOSE A TURN"}
          {landed?.prize?.type === "tshirt" && "T-SHIRT PRIZE!"}
          {landed?.t !== "cash" && landed?.t !== "bankrupt" && landed?.t !== "lose" && !landed?.prize && landed.label}
        </div>
      )}
      </div>
{(isRevealingLetters || finishingRef.current) && !showWinScreen && <div ref={blockingOverlayRef} className="fixed inset-0 z-[90] bg-transparent" aria-hidden="true" onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} style={{ pointerEvents: "auto" }} />}
      {showVowelModal && <VowelModal />}
      {showSolveModal && <SolveModal />}
      {showMysterySpinner && <MysterySpinnerModal />}
      {showBonusLetterModal && <BonusLetterModal />}
      {showBonusSelector && <BonusWinnerSelectorModal />}
      {bonusReadyModalVisible && <BonusReadyModal />}
      {bonusResult && <BonusResultModal result={bonusResult} />}
      {showBonusSolveModal && <BonusSolveInline />}
      {showStats && <StatsModal />}
      {showWinScreen && <WinScreen winner={winners[0] || roundWinner || "Winner"} onClose={() => {
        try { sfx.stop("solve"); } catch { }
        setShowWinScreen(false);
        setRoundWinner(null);
        setIsRevealingLetters(false);
        finishingRef.current = false;
        nextPuzzle();
      }} />}
      <ConfettiCanvas trigger={showWinScreen || bonusResult === 'win'} />
    </div>
  );
}