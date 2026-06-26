import { getApiBaseUrl } from "./apiConfig";

export interface RainFrameInfo {
  ts: number;
  validTime: string;
}

export interface RainFramesResponse {
  frames: RainFrameInfo[];
  bounds: [[number, number], [number, number]];
}

export async function fetchRainFrames(): Promise<RainFramesResponse> {
  const response = await fetch(`${getApiBaseUrl()}/api/weather/rain/frames`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Rain frames API failed with HTTP ${response.status}`);
  }

  const result = (await response.json()) as Partial<RainFramesResponse>;
  return {
    frames: result.frames ?? [],
    bounds: result.bounds ?? [
      [45, -25],
      [63, 15],
    ],
  };
}

/** Index of the frame whose valid time is nearest to now. */
export function nearestNowFrameIndex(frames: RainFrameInfo[]): number {
  if (frames.length === 0) return 0;
  const now = Date.now();
  let best = 0;
  let bestDiff = Infinity;
  frames.forEach((frame, index) => {
    const diff = Math.abs(new Date(frame.validTime).getTime() - now);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = index;
    }
  });
  return best;
}
