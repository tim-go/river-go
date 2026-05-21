import fs from "node:fs";

const overpass = JSON.parse(fs.readFileSync("tmp/wye-overpass.json", "utf8"));

const sections = [
  {
    id: "wye-glasbury-hay",
    start: [52.045, -3.201],
    end: [52.076, -3.126],
  },
  {
    id: "wye-hay-whitney",
    start: [52.076, -3.126],
    end: [52.129, -3.066],
  },
  {
    id: "wye-whitney-bredwardine",
    start: [52.129, -3.066],
    end: [52.103, -2.934],
  },
  {
    id: "wye-hoarwithy-ross",
    start: [51.958, -2.663],
    end: [51.913, -2.58],
  },
  {
    id: "wye-ross-kerne",
    start: [51.913, -2.58],
    end: [51.842, -2.604],
  },
  {
    id: "wye-kerne-symonds-yat",
    start: [51.842, -2.604],
    end: [51.844, -2.647],
  },
  {
    id: "wye-symonds-yat-monmouth",
    start: [51.844, -2.647],
    end: [51.812, -2.713],
  },
];

function key(point) {
  return `${point[0].toFixed(7)},${point[1].toFixed(7)}`;
}

function distance(a, b) {
  const radiusKm = 6371;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const deltaLat = ((b[0] - a[0]) * Math.PI) / 180;
  const deltaLon = ((b[1] - a[1]) * Math.PI) / 180;
  const hav =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

  return radiusKm * 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
}

const points = new Map();
const edges = new Map();

function addPoint(point) {
  const pointKey = key(point);
  points.set(pointKey, point);
  if (!edges.has(pointKey)) {
    edges.set(pointKey, []);
  }
  return pointKey;
}

function addEdge(a, b) {
  const aKey = addPoint(a);
  const bKey = addPoint(b);
  const weight = distance(a, b);
  edges.get(aKey).push({ key: bKey, weight });
  edges.get(bKey).push({ key: aKey, weight });
}

for (const element of overpass.elements) {
  if (!element.geometry || element.tags?.name !== "River Wye") {
    continue;
  }

  const geometry = element.geometry.map((point) => [point.lat, point.lon]);
  for (let index = 0; index < geometry.length - 1; index += 1) {
    addEdge(geometry[index], geometry[index + 1]);
  }
}

function nearestKey(target) {
  let bestKey = "";
  let bestDistance = Infinity;

  for (const [pointKey, point] of points) {
    const candidateDistance = distance(target, point);
    if (candidateDistance < bestDistance) {
      bestDistance = candidateDistance;
      bestKey = pointKey;
    }
  }

  return bestKey;
}

function shortestPath(startTarget, endTarget) {
  const startKey = nearestKey(startTarget);
  const endKey = nearestKey(endTarget);
  const distances = new Map([[startKey, 0]]);
  const previous = new Map();
  const unsettled = new Set(points.keys());

  while (unsettled.size > 0) {
    let currentKey = "";
    let currentDistance = Infinity;

    for (const candidateKey of unsettled) {
      const candidateDistance = distances.get(candidateKey) ?? Infinity;
      if (candidateDistance < currentDistance) {
        currentDistance = candidateDistance;
        currentKey = candidateKey;
      }
    }

    if (!currentKey || currentKey === endKey) {
      break;
    }

    unsettled.delete(currentKey);

    for (const edge of edges.get(currentKey) ?? []) {
      if (!unsettled.has(edge.key)) {
        continue;
      }

      const nextDistance = currentDistance + edge.weight;
      if (nextDistance < (distances.get(edge.key) ?? Infinity)) {
        distances.set(edge.key, nextDistance);
        previous.set(edge.key, currentKey);
      }
    }
  }

  const path = [];
  let currentKey = endKey;

  while (currentKey) {
    path.push(points.get(currentKey));
    currentKey = previous.get(currentKey);
  }

  return path.reverse();
}

function perpendicularDistance(point, start, end) {
  const x = point[1];
  const y = point[0];
  const x1 = start[1];
  const y1 = start[0];
  const x2 = end[1];
  const y2 = end[0];
  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    return distance(point, start);
  }

  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
  return distance(point, [y1 + t * dy, x1 + t * dx]);
}

function simplify(pointsToSimplify, toleranceKm = 0.02) {
  if (pointsToSimplify.length <= 2) {
    return pointsToSimplify;
  }

  let maxDistance = 0;
  let maxIndex = 0;
  const start = pointsToSimplify[0];
  const end = pointsToSimplify.at(-1);

  for (let index = 1; index < pointsToSimplify.length - 1; index += 1) {
    const pointDistance = perpendicularDistance(
      pointsToSimplify[index],
      start,
      end,
    );
    if (pointDistance > maxDistance) {
      maxDistance = pointDistance;
      maxIndex = index;
    }
  }

  if (maxDistance <= toleranceKm) {
    return [start, end];
  }

  const before = simplify(pointsToSimplify.slice(0, maxIndex + 1), toleranceKm);
  const after = simplify(pointsToSimplify.slice(maxIndex), toleranceKm);
  return [...before.slice(0, -1), ...after];
}

const traces = {};

for (const section of sections) {
  const route = simplify(shortestPath(section.start, section.end));
  traces[section.id] = route.map(([lat, lng]) => [
    Number(lat.toFixed(6)),
    Number(lng.toFixed(6)),
  ]);
  console.log(section.id, `${route.length} points`);
}

const output = `import type { LatLngTuple } from "../types";

// Generated from OpenStreetMap River Wye waterway geometry via Overpass.
// Regenerate with: node scripts/generateWyeRouteTraces.mjs
export const wyeRouteTraces: Record<string, LatLngTuple[]> = ${JSON.stringify(
  traces,
  null,
  2,
)};
`;

fs.writeFileSync("src/data/wyeRouteTraces.ts", output);
