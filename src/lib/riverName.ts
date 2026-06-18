// Generic leading words in UK river names that carry no identity on their own.
// Most of our seed rivers are "Afon X" (Welsh) or "River X" (English), so a map
// marker initial taken from the raw name is almost always "A" or "R". Skip these
// and use the first meaningful word instead.
const RIVER_NAME_PREFIXES = new Set([
  "afon",
  "river",
  "nant",
  "allt",
  "water",
  "of",
  "the",
  "yr",
  "y",
  "an",
]);

function cleanWord(word: string): string {
  return word.toLowerCase().replace(/[^\p{L}]/gu, "");
}

// The river name with leading generic words removed — but never empty: if the
// name is only generic words (e.g. "Afon") we keep the original words.
export function meaningfulRiverWords(name: string): string[] {
  const words = name.trim().split(/\s+/).filter(Boolean);
  let start = 0;
  while (
    start < words.length - 1 &&
    RIVER_NAME_PREFIXES.has(cleanWord(words[start]))
  ) {
    start += 1;
  }
  return words.slice(start);
}

// Single-letter token for a map marker: the first letter of the first meaningful
// word. "Afon Colwyn" -> "C", "River Wye" -> "W", "Water of Nevis" -> "N".
export function riverMarkerInitial(name: string): string {
  const words = meaningfulRiverWords(name);
  const first = words[0] ?? name.trim();
  return first.charAt(0).toUpperCase() || "R";
}
