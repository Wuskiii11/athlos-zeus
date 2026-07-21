// Blocks slurs/profanity from display names. Normalizes common evasion
// tricks (leetspeak digits, spaced-out letters, repeated-letter stretching,
// accents) before matching, so "n1gg3r", "n i g g e r", "niggerrrr" etc. get
// caught by the same plain-word list instead of needing a variant each.

const BANNED = [
  "nigger", "nigga", "chink", "spic", "kike", "faggot", "fag",
  "tranny", "wetback", "gook", "coon", "beaner", "paki",
  "cunt", "whore", "slut", "retard", "nazi", "hitler",
];

const LEET = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "6": "g", "@": "a", "$": "s", "!": "i" };

function normalize(s) {
  return (s || "")
    .normalize("NFD")
    .toLowerCase()
    .replace(/[01345678@$!]/g, (c) => LEET[c] || c)
    // Drops spaces/punctuation AND leftover accent marks from NFD (they're
    // outside a-z) in one pass — defeats both "n i g g e r" and "café"-style evasion.
    .replace(/[^a-z]/g, "")
    .replace(/(.)\1{2,}/g, "$1$1"); // "niggerrrr" -> "nigger", keeps real double letters
}

export function isNameAllowed(name) {
  const n = normalize(name);
  if (!n) return true;
  return !BANNED.some((word) => n.includes(word));
}
