// src/lib/constants.js

export const GRADIENT = "bg-[radial-gradient(110%_110%_at_0%_0%,#5b7fff_0%,#21bd84_100%)]";
export const BASE_WHEEL_PX = 500;
export const VOWEL_COST = 200;
export const TEAM_NAME_MAX = 15;
export const MAX_TEAMS = 100;
export const SOLVE_BONUS = 300;

export const WEDGES = [
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
  { t: "bankrupt", label: "BANKRUPT", c: "#222222" },
  { t: "cash", v: 125, c: "#4F9F4F" },
];

export const VOWELS = new Set(["A", "E", "I", "O", "U"]);
export const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
export const ZOOM_WHEEL_PX = BASE_WHEEL_PX * 1.5;
export const BONUS_PRIZES = ["PIN", "STICKER", "T-SHIRT", "MAGNET", "KEYCHAIN"]; // <-- Add this line
export const SOLVE_REVEAL_INTERVAL = 650;


export const FALLBACK = [
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