// POI subtitles often arrive as raw OSM tags ("waterway=rapids", "waterway=lock
// gate"). Humanise them for display: take the value after the last "=", turn
// separators into spaces, and capitalise → "Rapids", "Lock gate". Non-tag
// subtitles (e.g. "Gauge", "Community hazard · Wye") pass through unchanged.
export function humanisePoiSubtitle(subtitle: string): string {
  if (!subtitle) return "";
  const value = subtitle.includes("=")
    ? subtitle.slice(subtitle.lastIndexOf("=") + 1)
    : subtitle;
  const cleaned = value.replace(/[_-]+/g, " ").trim();
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : "";
}

// "Rapids · Weir"-style line pairing a category label with the humanised type,
// but collapsing to just the label when the type merely repeats it (so we get
// "Rapids", not "Rapids · Rapids" or "Dams · Dam").
export function poiTypeSubtitle(label: string, subtitle: string): string {
  const human = humanisePoiSubtitle(subtitle);
  if (!human) return label;
  const norm = (s: string) => s.toLowerCase().replace(/s$/, "").trim();
  return norm(human) === norm(label) ? label : `${label} · ${human}`;
}
