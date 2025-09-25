function useSfx() {
  const audioCtxRef = useRef(null);
  const bufferMapRef = useRef({});       // key -> AudioBuffer
  const activeNodesRef = useRef({});     // key -> Set of active source nodes (one-shots)
  const loopNodesRef = useRef({});       // key -> persistent loop node info { node, gainNode }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        loadedRef.current = true;  // Add this line
      setLoaded(true);
    }).catch(() => {
       loadedRef.current = true;  // Add this line
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

  // helper: ensure AudioContext is running (resume on user gesture if needed)
  const ensureCtxRunning = async () => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (ctx.state === "suspended") {
      try { await ctx.resume(); } catch (e) {}
    }
  };

  // Exposed helper to unlock from a user gesture — call from a click handler
const unlock = async () => {
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
};

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
