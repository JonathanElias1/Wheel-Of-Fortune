// src/data/loadPuzzles.js
import { FALLBACK } from "../lib/constants";

export async function loadPuzzles() {
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