import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import type { RainFrameInfo } from "../../services/weatherApi";
import { nearestNowFrameIndex } from "../../services/weatherApi";
import "./weather-timebar.css";

interface WeatherTimebarProps {
  frames: RainFrameInfo[];
  selectedTs: number;
  onSelect: (ts: number) => void;
}

const FRAME_MS = 1200;

function formatValid(validTime: string): string {
  const date = new Date(validTime);
  const day = date
    .toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
    })
    .replace(/,/g, "");
  const time = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${day} · ${time}`;
}

// Scrubber across the rain forecast frames, shown while a weather layer is on.
export function WeatherTimebar({
  frames,
  selectedTs,
  onSelect,
}: WeatherTimebarProps) {
  const [playing, setPlaying] = useState(false);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!playing || frames.length === 0) return;
    const timer = window.setInterval(() => {
      const current = frames.findIndex((frame) => frame.ts === selectedTs);
      const next = frames[(current + 1) % frames.length];
      if (next) onSelectRef.current(next.ts);
    }, FRAME_MS);
    return () => window.clearInterval(timer);
  }, [playing, frames, selectedTs]);

  if (frames.length === 0) return null;

  const index = Math.max(
    0,
    frames.findIndex((frame) => frame.ts === selectedTs),
  );
  const current = frames[index] ?? frames[0];
  const nowIndex = nearestNowFrameIndex(frames);
  const nowPercent = (nowIndex / Math.max(1, frames.length - 1)) * 100;

  return (
    <div className="weather-timebar" role="group" aria-label="Rain forecast time">
      <button
        type="button"
        className="weather-timebar__play"
        onClick={() => setPlaying((value) => !value)}
        aria-label={playing ? "Pause" : "Play forecast"}
      >
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <div className="weather-timebar__track">
        <input
          type="range"
          min={0}
          max={frames.length - 1}
          value={index}
          onChange={(event) => {
            const frame = frames[Number(event.target.value)];
            if (frame) onSelect(frame.ts);
          }}
          aria-label="Forecast time"
        />
        <span
          className="weather-timebar__now"
          style={{ left: `${nowPercent}%` }}
          title="Now"
          aria-hidden="true"
        />
      </div>
      <span className="weather-timebar__label">{formatValid(current.validTime)}</span>
    </div>
  );
}
