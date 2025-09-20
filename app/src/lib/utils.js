import { TEAM_NAME_MAX, FALLBACK } from "./constants";

export const cls = (...xs) => xs.filter(Boolean).join(" ");

export const isLetter = (ch) => /^[A-Z]$/.test(ch);

export function normalizeAnswer(raw) {
  const chars = raw.toUpperCase().split("");
  return chars.map((ch) => ({ ch, shown: !isLetter(ch) }));
}

export function nextIdx(i, len) {
  if (!len || len <= 0) return 0;
  return (i + 1) % len;
}

export const parseIntSafe = (str) => {
    const n = parseInt((str || "").trim(), 10);
    return Number.isFinite(n) ? n : NaN;
};

export function makeTeamNamesArray(desiredCount, sourceNames = []) {
    const out = Array.from({ length: desiredCount }, (_, i) => {
      const raw = sourceNames[i];
      if (raw && String(raw).trim().length > 0) return String(raw).slice(0, TEAM_NAME_MAX);
      return `Team ${i + 1}`;
    });
    return out;
}

export const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
};

export const selectRandomPuzzles = (pool, n) => {
    if (!Array.isArray(pool) || pool.length === 0) return FALLBACK.slice(0, n);
    const count = Math.max(1, Math.min(n, pool.length));
    const shuffled = shuffle(pool);
    return shuffled.slice(0, count);
};