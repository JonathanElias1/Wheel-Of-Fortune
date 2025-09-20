// src/hooks/useSfx.js
import { useRef, useEffect, useState, useCallback } from "react";

/**
 * useSfx: HTMLAudio-based fallback hook with a simple UI surface.
 *
 * API:
 *  - loaded (boolean)
 *  - loadedCount (number)
 *  - targetCount (number)
 *  - load(map)
 *  - play(id, opts)
 *  - stop(id)
 *  - loop(id)
 *  - stopLoop(id)
 *  - stopAll()
 *  - setVolume(id, vol) // per-audio if needed
 *  - setMasterVolume(vol) // 0..1 (affects all audios)
 *  - volume (master volume state)
 *  - setVolumeState(vol) // set master volume (stateful)
 *  - themeOn (boolean)
 *  - toggleTheme() // plays themeOpen (optional), then loops themeLoop
 *  - unlock() // call from user gesture
 */
export default function useSfx(initialMap = {}) {
  const audioMapRef = useRef(new Map()); // id -> HTMLAudioElement
  const loopKeysRef = useRef(new Set()); // keys currently requested to loop
  const masterVolumeRef = useRef(1);
  const audioCtxRef = useRef(null);

  const [loadedCount, setLoadedCount] = useState(0);
  const targetCountRef = useRef(0);
  const [loaded, setLoaded] = useState(false);

  // UI-friendly master volume state
  const [volume, setVolumeState] = useState(0.9);

  // theme music state (intro + loop)
  const [themeOn, setThemeOn] = useState(false);

  // internal: create/update HTMLAudio elements from a map of id -> url
  const load = useCallback(async (soundMap = {}) => {
    const entries = Object.entries(soundMap || {});
    targetCountRef.current = entries.length;
    if (entries.length === 0) {
      setLoadedCount(0);
      setLoaded(true);
      return;
    }

    return new Promise((resolve) => {
      let completed = 0;
      entries.forEach(([id, url]) => {
        try {
          const existing = audioMapRef.current.get(id);
          // if same src already created, skip actual recreation
          if (existing && existing.src && existing.src.endsWith(url)) {
            completed++;
            setLoadedCount((n) => n + 1);
            if (completed === entries.length) {
              setLoaded(true);
              resolve();
            }
            return;
          }

          const a = new Audio(url);
          a.preload = "auto";
          a.crossOrigin = "anonymous";
          a.__baseVolume = a.volume ?? 1;
          a.addEventListener("canplaythrough", function onReady() {
            a.removeEventListener("canplaythrough", onReady);
            completed++;
            setLoadedCount((n) => n + 1);
            if (completed === entries.length) {
              setLoaded(true);
              resolve();
            }
          }, { once: true });

          // fail-safe: count after a small timeout
          setTimeout(() => {
            if (!a.ended && a.readyState < 3) {
              if (!a.__timed) {
                a.__timed = true;
                completed++;
                setLoadedCount((n) => n + 1);
                if (completed === entries.length) {
                  setLoaded(true);
                  resolve();
                }
              }
            }
          }, 3000);

          audioMapRef.current.set(id, a);
        } catch (e) {
          completed++;
          setLoadedCount((n) => n + 1);
          if (completed === entries.length) {
            setLoaded(true);
            resolve();
          }
        }
      });
    });
  }, []);

  // initialize on mount with initialMap
  useEffect(() => {
    if (initialMap && Object.keys(initialMap).length) load(initialMap);
    else setLoaded(true);

    return () => {
      audioMapRef.current.forEach((a) => {
        try { a.pause(); a.src = ""; } catch (e) {}
      });
      audioMapRef.current.clear();
      loopKeysRef.current.clear();
      if (audioCtxRef.current) {
        try { audioCtxRef.current.close(); } catch (e) {}
        audioCtxRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // master volume effect: apply to all audios
  useEffect(() => {
    masterVolumeRef.current = Math.max(0, Math.min(1, volume));
    audioMapRef.current.forEach((a) => {
      try {
        const base = typeof a.__baseVolume === "number" ? a.__baseVolume : 1;
        a.volume = base * masterVolumeRef.current;
      } catch (e) {}
    });
  }, [volume]);

  // low-level helpers
  const _getAudio = useCallback((id) => audioMapRef.current.get(id), []);
  const stop = useCallback((id) => {
    const a = _getAudio(id);
    if (!a) return;
    try { a.pause(); a.currentTime = 0; } catch (e) {}
  }, [_getAudio]);

  const stopAll = useCallback(() => {
    audioMapRef.current.forEach((a) => {
      try { a.pause(); a.currentTime = 0; } catch (e) {}
    });
    loopKeysRef.current.clear();
  }, []);

  // play one-shot or loop via HTMLAudio
  const play = useCallback((id, opts = {}) => {
    const a = _getAudio(id);
    if (!a) return;
    const { loop = false, volume: v } = opts;
    try {
      a.loop = !!loop;
      if (typeof v === "number") a.volume = Math.max(0, Math.min(1, v)) * masterVolumeRef.current;
      // ensure start from beginning if one-shot
      if (!loop) {
        a.currentTime = opts.seek || 0;
      }
      const p = a.play();
      if (p && p.catch) p.catch(() => {});
    } catch (e) {}
  }, [_getAudio]);

  const loop = useCallback((id) => {
    const a = _getAudio(id);
    if (!a) return;
    try {
      a.loop = true;
      loopKeysRef.current.add(id);
      a.currentTime = 0;
      const p = a.play();
      if (p && p.catch) p.catch(() => {});
    } catch (e) {}
  }, [_getAudio]);

  const stopLoop = useCallback((id) => {
    try {
      const a = _getAudio(id);
      if (a) {
        a.loop = false;
        try { a.pause(); a.currentTime = 0; } catch (e) {}
      }
    } catch (e) {}
    loopKeysRef.current.delete(id);
  }, [_getAudio]);

  const setVolume = useCallback((id, vol) => {
    const a = _getAudio(id);
    if (!a) return;
    try { a.volume = Math.max(0, Math.min(1, vol)) * masterVolumeRef.current; } catch (e) {}
  }, [_getAudio]);

  const setMasterVolume = useCallback((vol) => {
    setVolumeState(Math.max(0, Math.min(1, vol)));
  }, []);

  // Try to create/resume AudioContext (used as a polite unlock mechanism if needed)
  const unlock = useCallback(async () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!audioCtxRef.current && AudioCtx) audioCtxRef.current = new AudioCtx();
    } catch (e) {
      audioCtxRef.current = null;
    }

    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      try { await audioCtxRef.current.resume(); } catch (e) {}
    }
    // fallback poke: play+pause every audio to wake autoplay restrictions
    audioMapRef.current.forEach((a) => {
      try {
        const p = a.play();
        if (p && p.then) {
          p.then(() => { try { a.pause(); a.currentTime = 0; } catch (e) {} }).catch(()=>{});
        }
      } catch (e) {}
    });
    return true;
  }, []);

  // theme toggle: play intro then loop (if files exist)
  const toggleTheme = useCallback(async (opts = {}) => {
    // expected keys used: "themeOpen" and "themeLoop" in audio map
    const introKey = opts.introKey || "themeOpen";
    const loopKey = opts.loopKey || "themeLoop";
    const introAudio = _getAudio(introKey);
    const loopAudio = _getAudio(loopKey);

    // turning on
    if (!themeOn) {
      try {
        // unlock first if necessary
        await unlock();
      } catch (e) {}

      // if both intro and loop exist, play intro, and then start loop when intro ends
      if (introAudio && loopAudio) {
        try {
          // ensure loop audio reset
          loopAudio.loop = true;
          // when intro ends, start the loop audio and reset loopAudio to play from 0
          const onIntroEnd = () => {
            try {
              introAudio.removeEventListener("ended", onIntroEnd);
            } catch (e) {}
            try {
              loopAudio.currentTime = 0;
              loopAudio.play()?.catch(()=>{});
              loopKeysRef.current.add(loopKey);
            } catch (e) {}
          };
          introAudio.addEventListener("ended", onIntroEnd);
          introAudio.currentTime = 0;
          introAudio.play()?.catch(()=>{});
          setThemeOn(true);
        } catch (e) {
          // fallback: just play loop
          loop(loopKey);
          setThemeOn(true);
        }
      } else if (loopAudio) {
        // only loop available
        loop(loopKey);
        setThemeOn(true);
      } else if (introAudio) {
        // only intro available — play once
        try {
          introAudio.currentTime = 0;
          introAudio.play()?.catch(()=>{});
          setThemeOn(true);
        } catch (e) {}
      }
    } else {
      // turning off: stop both
      try {
        if (introAudio) {
          introAudio.pause();
          try { introAudio.currentTime = 0; } catch (e) {}
        }
        if (loopAudio) {
          loopAudio.loop = false;
          try { loopAudio.pause(); loopAudio.currentTime = 0; } catch (e) {}
        }
      } catch (e) {}
      setThemeOn(false);
      loopKeysRef.current.delete(loopKey);
    }
  }, [_getAudio, loop, unlock, themeOn]);

  return {
    // state
    loaded,
    loadedCount,
    targetCount: targetCountRef.current,
    volume,
    setVolumeState,
    themeOn,

    // actions
    load,
    play,
    stop,
    loop,
    stopLoop,
    stopAll,
    setVolume,
    setMasterVolume,
    toggleTheme,
    unlock,
  };
}
