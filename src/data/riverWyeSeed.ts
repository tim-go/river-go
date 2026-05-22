import type { LatLngTuple, RiverSection, SourceMetadata } from "../types";
import { wyeRouteTraces } from "./wyeRouteTraces";

export const riverWyePilotNotes = {
  regionName: "River Wye pilot",
  status: "draft-seed-data",
  sourcePolicy:
    "Approximate prototype data for product validation. Verify access, gauges, hazards, and route details with open sources and local contributors before publishing.",
  verificationNeeded: [
    "put-in and take-out practicality",
    "parking notes",
    "gauge-to-section relevance",
    "open canoe runnable ranges",
    "known fixed hazards",
    "recent obstruction reports",
    "photo evidence for access points and hazards",
  ],
};

function routeCentre(route: LatLngTuple[]) {
  return route[Math.floor(route.length / 2)];
}

function closestPointOnSegment(
  point: LatLngTuple,
  start: LatLngTuple,
  end: LatLngTuple,
): LatLngTuple {
  const x = point[1];
  const y = point[0];
  const x1 = start[1];
  const y1 = start[0];
  const x2 = end[1];
  const y2 = end[0];
  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    return start;
  }

  const t = Math.max(
    0,
    Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)),
  );

  return [y1 + t * dy, x1 + t * dx];
}

function squaredDistance(a: LatLngTuple, b: LatLngTuple) {
  const lat = a[0] - b[0];
  const lng = a[1] - b[1];
  return lat * lat + lng * lng;
}

function snapLocationToRoute(location: LatLngTuple, route: LatLngTuple[]) {
  let bestPoint = route[0];
  let bestDistance = Infinity;

  for (let index = 0; index < route.length - 1; index += 1) {
    const candidate = closestPointOnSegment(
      location,
      route[index],
      route[index + 1],
    );
    const candidateDistance = squaredDistance(location, candidate);

    if (candidateDistance < bestDistance) {
      bestPoint = candidate;
      bestDistance = candidateDistance;
    }
  }

  return [
    Number(bestPoint[0].toFixed(6)),
    Number(bestPoint[1].toFixed(6)),
  ] satisfies LatLngTuple;
}

const seedSource: SourceMetadata = {
  kind: "seed",
  label: "River Go Wye seed dataset",
  confidence: "low",
  updatedAt: "2026-05-21",
  notes:
    "Draft prototype data requiring local contributor verification before publication.",
};

const routeSource: SourceMetadata = {
  kind: "derived",
  label: "OpenStreetMap-derived River Wye route trace",
  confidence: "medium",
  updatedAt: "2026-05-21",
  notes:
    "Generated from OSM waterway geometry for prototype route display; production licence and geometry review required.",
  url: "https://www.openstreetmap.org/copyright",
};

const riverWyeSectionSeeds: RiverSection[] = [
  {
    id: "wye-glasbury-hay",
    riverName: "River Wye",
    sectionName: "Glasbury to Hay-on-Wye",
    summary:
      "A popular upper Wye touring section for open canoes, useful for testing beginner planning, hire-boat traffic, and launch/take-out confidence.",
    centre: [52.095, -3.137],
    route: [
      [52.045, -3.201],
      [52.061, -3.179],
      [52.083, -3.154],
      [52.1, -3.132],
      [52.076, -3.126],
    ],
    distanceKm: 8.6,
    estimatedTime: "2-3 hours",
    difficulty: "Beginner",
    suitability: ["open canoe", "tandem canoe", "inflatable canoe", "SUP"],
    levelBand: "good",
    levelLabel: "Good touring level",
    runnableGuidance:
      "Seed guidance only: local contributors should confirm low-water scrape points and high-water caution levels for open canoes.",
    accessSummary:
      "Pilot access notes need local verification, especially parking, launch fees, and busy-period arrangements.",
    gauge: {
      id: "wye-hay-gauge",
      name: "Hay-on-Wye gauge candidate",
      location: [52.077, -3.126],
      value: "0.78 m",
      trend: "steady",
      observedAt: "Demo reading",
    },
    accessPoints: [
      {
        id: "glasbury-put-in",
        type: "put-in",
        name: "Glasbury launch candidate",
        location: [52.045, -3.201],
        notes:
          "Seed point. Confirm permitted launch, parking, fees, and seasonal crowding.",
      },
      {
        id: "hay-take-out",
        type: "take-out",
        name: "Hay-on-Wye take-out candidate",
        location: [52.076, -3.126],
        notes: "Seed point. Confirm landing practicality and parking constraints.",
      },
    ],
    hazards: [
      {
        id: "wye-glasbury-shallows",
        title: "Shallow gravel bars",
        type: "shallow water",
        severity: "info",
        status: "needs-confirmation",
        location: [52.074, -3.162],
        lastConfirmed: "Unverified seed",
        description:
          "Likely low-water scrape zones. Needs local confirmation and level-linked photos.",
      },
    ],
    features: [
      {
        id: "wye-hay-bridge",
        title: "Hay bridge approach",
        type: "bridge",
        location: [52.076, -3.126],
        description: "Useful navigation landmark near the end of the section.",
      },
    ],
    photos: [
      {
        id: "wye-glasbury-photo-needed",
        title: "Photo needed: Glasbury launch",
        url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
        caption: "Placeholder image. Replace with contributor photo of launch.",
        dateTaken: "Needed",
      },
    ],
    reports: [
      {
        id: "wye-glasbury-seed-report",
        author: "River Go seed",
        dateObserved: "Needs local confirmation",
        type: "Seed note",
        text: "Ask early contributors to confirm launch process, parking, and low-water scrape points.",
      },
    ],
  },
  {
    id: "wye-hay-whitney",
    riverName: "River Wye",
    sectionName: "Hay-on-Wye to Whitney Bridge",
    summary:
      "A short touring section intended to validate access notes, landing quality, and family-friendly section descriptions.",
    centre: [52.11, -3.09],
    route: [
      [52.076, -3.126],
      [52.094, -3.105],
      [52.113, -3.087],
      [52.128, -3.075],
      [52.129, -3.066],
    ],
    distanceKm: 8.1,
    estimatedTime: "2-3 hours",
    difficulty: "Beginner",
    suitability: ["open canoe", "tandem canoe", "touring kayak"],
    levelBand: "good",
    levelLabel: "Good touring level",
    runnableGuidance:
      "Seed guidance only: collect reports against the Hay gauge candidate before publishing ranges.",
    accessSummary:
      "Take-out and parking details need confirmation from recent paddlers or local operators.",
    gauge: {
      id: "wye-hay-gauge",
      name: "Hay-on-Wye gauge candidate",
      location: [52.077, -3.126],
      value: "0.78 m",
      trend: "steady",
      observedAt: "Demo reading",
    },
    accessPoints: [
      {
        id: "hay-put-in",
        type: "put-in",
        name: "Hay-on-Wye launch candidate",
        location: [52.076, -3.126],
        notes: "Seed point. Confirm access route and parking.",
      },
      {
        id: "whitney-take-out",
        type: "take-out",
        name: "Whitney Bridge take-out candidate",
        location: [52.129, -3.066],
        notes: "Seed point. Confirm landing and road access practicality.",
      },
    ],
    hazards: [
      {
        id: "wye-whitney-bridge-approach",
        title: "Bridge approach needs review",
        type: "bridge",
        severity: "info",
        status: "needs-confirmation",
        location: [52.128, -3.07],
        lastConfirmed: "Unverified seed",
        description:
          "Add photos and local notes for bridge approach, landing choice, and high-water behaviour.",
      },
    ],
    features: [
      {
        id: "wye-whitney-landing",
        title: "Whitney Bridge landing candidate",
        type: "landing",
        location: [52.129, -3.066],
        description: "Candidate take-out requiring contributor confirmation.",
      },
    ],
    photos: [
      {
        id: "wye-whitney-photo-needed",
        title: "Photo needed: Whitney take-out",
        url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=80",
        caption: "Placeholder image. Replace with landing and parking photos.",
        dateTaken: "Needed",
      },
    ],
    reports: [
      {
        id: "wye-whitney-seed-report",
        author: "River Go seed",
        dateObserved: "Needs local confirmation",
        type: "Seed note",
        text: "Collect reports on whether this feels distinct enough from longer Wye day trips.",
      },
    ],
  },
  {
    id: "wye-whitney-bredwardine",
    riverName: "River Wye",
    sectionName: "Whitney Bridge to Bredwardine",
    summary:
      "A longer rural Wye section for testing intermediate touring information, rest stops, and take-out confidence.",
    centre: [52.104, -2.98],
    route: [
      [52.129, -3.066],
      [52.119, -3.035],
      [52.104, -3.0],
      [52.098, -2.966],
      [52.103, -2.934],
    ],
    distanceKm: 13.4,
    estimatedTime: "3-4 hours",
    difficulty: "Novice",
    suitability: ["open canoe", "tandem canoe", "touring kayak"],
    levelBand: "unknown",
    levelLabel: "Needs local range",
    runnableGuidance:
      "Gauge relevance and canoe-specific ranges need local validation before this should be marked low/good/high.",
    accessSummary:
      "Rural section with access and parking details to verify before public release.",
    gauge: {
      id: "wye-bredwardine-gauge",
      name: "Bredwardine gauge candidate",
      location: [52.103, -2.934],
      value: "Demo unavailable",
      trend: "steady",
      observedAt: "Demo reading",
    },
    accessPoints: [
      {
        id: "whitney-put-in",
        type: "put-in",
        name: "Whitney Bridge launch candidate",
        location: [52.129, -3.066],
        notes: "Seed point. Confirm whether launch and parking are practical.",
      },
      {
        id: "bredwardine-take-out",
        type: "take-out",
        name: "Bredwardine take-out candidate",
        location: [52.103, -2.934],
        notes: "Seed point. Needs local access and parking review.",
      },
    ],
    hazards: [
      {
        id: "wye-bredwardine-tree-watch",
        title: "Tree obstruction watch point",
        type: "strainer",
        severity: "caution",
        status: "needs-confirmation",
        location: [52.108, -2.985],
        lastConfirmed: "Unverified seed",
        description:
          "Use this as a demo placeholder for reporting fallen trees after high flows.",
      },
    ],
    features: [
      {
        id: "wye-rural-rest-point",
        title: "Potential rest stop",
        type: "landing",
        location: [52.111, -3.015],
        description: "Candidate feature for contributor review.",
      },
    ],
    photos: [
      {
        id: "wye-bredwardine-photo-needed",
        title: "Photo needed: Bredwardine landing",
        url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=900&q=80",
        caption: "Placeholder image. Replace with take-out photo.",
        dateTaken: "Needed",
      },
    ],
    reports: [
      {
        id: "wye-bredwardine-seed-report",
        author: "River Go seed",
        dateObserved: "Needs local confirmation",
        type: "Seed note",
        text: "Ask contributors whether this section split is practical for open canoe day trips.",
      },
    ],
  },
  {
    id: "wye-hoarwithy-ross",
    riverName: "River Wye",
    sectionName: "Hoarwithy to Ross-on-Wye",
    summary:
      "A scenic touring section with broad water, easy landings, and useful options for open canoes.",
    centre: [51.939, -2.606],
    route: [
      [51.958, -2.663],
      [51.948, -2.648],
      [51.936, -2.624],
      [51.925, -2.602],
      [51.913, -2.58],
    ],
    distanceKm: 17.2,
    estimatedTime: "4-5 hours",
    difficulty: "Novice",
    suitability: ["open canoe", "tandem canoe", "touring kayak"],
    levelBand: "good",
    levelLabel: "Good touring level",
    runnableGuidance:
      "Community guidance suggests this section is usually pleasant at moderate levels, with shallow gravel bars when low.",
    accessSummary:
      "Popular touring water. Check local parking and landing arrangements before travel.",
    gauge: {
      id: "wye-hereford",
      name: "Hereford gauge candidate",
      location: [52.054, -2.714],
      value: "0.86 m",
      trend: "steady",
      observedAt: "Demo reading",
    },
    accessPoints: [
      {
        id: "hoarwithy-put-in",
        type: "put-in",
        name: "Hoarwithy landing candidate",
        location: [51.958, -2.663],
        notes: "Seed point. Confirm parking, carry distance, and landing quality.",
      },
      {
        id: "ross-take-out",
        type: "take-out",
        name: "Ross-on-Wye take-out candidate",
        location: [51.913, -2.58],
        notes: "Good demo take-out candidate. Confirm current arrangements locally.",
      },
    ],
    hazards: [
      {
        id: "wye-low-bridge",
        title: "Low branches near inside bend",
        type: "strainer",
        severity: "caution",
        status: "needs-confirmation",
        location: [51.935, -2.62],
        lastConfirmed: "18 days ago",
        description:
          "Branches reported close to the main flow at higher levels. Needs recent confirmation.",
      },
    ],
    features: [
      {
        id: "wye-gravel-beach",
        title: "Gravel lunch beach",
        type: "landing",
        location: [51.94, -2.633],
        description: "Useful stopping point in normal summer flows.",
      },
    ],
    photos: [
      {
        id: "wye-photo-1",
        title: "Open touring water",
        url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
        caption: "Broad open water with easy visibility downstream.",
        dateTaken: "May 2026",
      },
    ],
    reports: [
      {
        id: "wye-report-1",
        author: "Maya",
        dateObserved: "2 days ago",
        type: "Paddled recently",
        text: "Good level for a tandem canoe. A few shallow scrapes on inside bends.",
      },
    ],
  },
  {
    id: "wye-ross-kerne",
    riverName: "River Wye",
    sectionName: "Ross-on-Wye to Kerne Bridge",
    summary:
      "A lower Wye touring section for testing popular day-trip data, bridge notes, and visitor-facing access clarity.",
    centre: [51.872, -2.587],
    route: [
      [51.913, -2.58],
      [51.895, -2.579],
      [51.875, -2.587],
      [51.856, -2.594],
      [51.842, -2.604],
    ],
    distanceKm: 11.6,
    estimatedTime: "3-4 hours",
    difficulty: "Novice",
    suitability: ["open canoe", "tandem canoe", "touring kayak"],
    levelBand: "good",
    levelLabel: "Good touring level",
    runnableGuidance:
      "Seed guidance only: collect reports for low-water shallows, wind exposure, and take-out practicality.",
    accessSummary:
      "Likely a useful pilot section because it should generate reports from recreational paddlers and hire traffic.",
    gauge: {
      id: "wye-ross-gauge",
      name: "Ross-on-Wye gauge candidate",
      location: [51.913, -2.58],
      value: "0.92 m",
      trend: "falling",
      observedAt: "Demo reading",
    },
    accessPoints: [
      {
        id: "ross-put-in",
        type: "put-in",
        name: "Ross-on-Wye launch candidate",
        location: [51.913, -2.58],
        notes: "Seed point. Confirm launch rights, parking, and busy periods.",
      },
      {
        id: "kerne-take-out",
        type: "take-out",
        name: "Kerne Bridge take-out candidate",
        location: [51.842, -2.604],
        notes: "Seed point. Needs recent landing and parking confirmation.",
      },
    ],
    hazards: [
      {
        id: "wye-ross-bridge-watch",
        title: "Bridge and traffic watch",
        type: "bridge",
        severity: "info",
        status: "needs-confirmation",
        location: [51.895, -2.579],
        lastConfirmed: "Unverified seed",
        description:
          "Add local notes for bridge lines, hire-boat congestion, and wind exposure.",
      },
    ],
    features: [
      {
        id: "wye-ross-feature",
        title: "Ross riverside facilities",
        type: "facility",
        location: [51.913, -2.58],
        description: "Useful for trip start/end planning. Needs detail.",
      },
    ],
    photos: [
      {
        id: "wye-ross-photo-needed",
        title: "Photo needed: Ross launch",
        url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
        caption: "Placeholder image. Replace with launch and signage photos.",
        dateTaken: "Needed",
      },
    ],
    reports: [
      {
        id: "wye-ross-seed-report",
        author: "River Go seed",
        dateObserved: "Needs local confirmation",
        type: "Seed note",
        text: "Ask contributors which gauge and level bands they use for this section.",
      },
    ],
  },
  {
    id: "wye-kerne-symonds-yat",
    riverName: "River Wye",
    sectionName: "Kerne Bridge to Symonds Yat",
    summary:
      "A scenic Wye section for validating feature photos, busy landing notes, and canoe suitability detail.",
    centre: [51.835, -2.625],
    route: [
      [51.842, -2.604],
      [51.835, -2.616],
      [51.829, -2.628],
      [51.833, -2.642],
      [51.844, -2.647],
    ],
    distanceKm: 7.4,
    estimatedTime: "2-3 hours",
    difficulty: "Novice",
    suitability: ["open canoe", "tandem canoe", "touring kayak"],
    levelBand: "unknown",
    levelLabel: "Needs local range",
    runnableGuidance:
      "Seed guidance only: needs local review for popular features, busy periods, and level interpretation.",
    accessSummary:
      "Busy visitor area. Access, landing, and parking notes should be verified carefully.",
    gauge: {
      id: "wye-ross-gauge",
      name: "Ross-on-Wye gauge candidate",
      location: [51.913, -2.58],
      value: "0.92 m",
      trend: "falling",
      observedAt: "Demo reading",
    },
    accessPoints: [
      {
        id: "kerne-put-in",
        type: "put-in",
        name: "Kerne Bridge launch candidate",
        location: [51.842, -2.604],
        notes: "Seed point. Confirm launch and parking practicality.",
      },
      {
        id: "symonds-yat-take-out",
        type: "take-out",
        name: "Symonds Yat take-out candidate",
        location: [51.844, -2.647],
        notes:
          "Seed point. Confirm landing options, crowding, parking, and local signage.",
      },
    ],
    hazards: [
      {
        id: "wye-symonds-yat-busy",
        title: "Busy landing area",
        type: "navigation conflict",
        severity: "caution",
        status: "needs-confirmation",
        location: [51.844, -2.647],
        lastConfirmed: "Unverified seed",
        description:
          "Use reports to capture crowding, hire traffic, and practical take-out timing.",
      },
    ],
    features: [
      {
        id: "wye-symonds-yat-feature",
        title: "Symonds Yat visitor area",
        type: "facility",
        location: [51.844, -2.647],
        description: "Feature and facility notes need structured contributor input.",
      },
    ],
    photos: [
      {
        id: "wye-symonds-photo-needed",
        title: "Photo needed: Symonds Yat landing",
        url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=80",
        caption: "Placeholder image. Replace with landing and access photos.",
        dateTaken: "Needed",
      },
    ],
    reports: [
      {
        id: "wye-symonds-seed-report",
        author: "River Go seed",
        dateObserved: "Needs local confirmation",
        type: "Seed note",
        text: "Test how users report crowding, landing quality, and navigation conflicts.",
      },
    ],
  },
  {
    id: "wye-symonds-yat-monmouth",
    riverName: "River Wye",
    sectionName: "Symonds Yat to Monmouth",
    summary:
      "A longer lower Wye section for testing day-trip planning, take-out clarity, and tired-group exit planning.",
    centre: [51.809, -2.693],
    route: [
      [51.844, -2.647],
      [51.827, -2.666],
      [51.811, -2.686],
      [51.795, -2.704],
      [51.812, -2.713],
    ],
    distanceKm: 13.1,
    estimatedTime: "3.5-5 hours",
    difficulty: "Novice",
    suitability: ["open canoe", "tandem canoe", "touring kayak"],
    levelBand: "good",
    levelLabel: "Good touring level",
    runnableGuidance:
      "Seed guidance only: collect reports on group timing, wind, fatigue, and take-out quality.",
    accessSummary:
      "Destination take-out and shuttle logistics should be reviewed before public release.",
    gauge: {
      id: "wye-monmouth-gauge",
      name: "Monmouth gauge candidate",
      location: [51.812, -2.713],
      value: "1.04 m",
      trend: "steady",
      observedAt: "Demo reading",
    },
    accessPoints: [
      {
        id: "symonds-yat-put-in",
        type: "put-in",
        name: "Symonds Yat launch candidate",
        location: [51.844, -2.647],
        notes: "Seed point. Confirm best launch, parking, and crowding.",
      },
      {
        id: "monmouth-take-out",
        type: "take-out",
        name: "Monmouth take-out candidate",
        location: [51.812, -2.713],
        notes: "Seed point. Confirm landing quality, parking, and shuttle logistics.",
      },
    ],
    hazards: [
      {
        id: "wye-monmouth-long-section",
        title: "Longer day-trip commitment",
        type: "fatigue",
        severity: "info",
        status: "needs-confirmation",
        location: [51.811, -2.686],
        lastConfirmed: "Unverified seed",
        description:
          "Use reports to confirm realistic timings for novice canoe groups at different levels.",
      },
    ],
    features: [
      {
        id: "wye-monmouth-finish",
        title: "Monmouth finish candidate",
        type: "landing",
        location: [51.812, -2.713],
        description: "Candidate finish needing contributor photos and access review.",
      },
    ],
    photos: [
      {
        id: "wye-monmouth-photo-needed",
        title: "Photo needed: Monmouth take-out",
        url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
        caption: "Placeholder image. Replace with take-out and parking photos.",
        dateTaken: "Needed",
      },
    ],
    reports: [
      {
        id: "wye-monmouth-seed-report",
        author: "River Go seed",
        dateObserved: "Needs local confirmation",
        type: "Seed note",
        text: "Collect real timing reports and note which groups find this a long day.",
      },
    ],
  },
];

export const riverWyeSections: RiverSection[] = riverWyeSectionSeeds.map(
  (section) => {
    const route = wyeRouteTraces[section.id] ?? section.route;

    return {
      ...section,
      source: seedSource,
      route,
      centre: routeCentre(route),
      gauge: {
        ...section.gauge,
        location: snapLocationToRoute(section.gauge.location, route),
        source: seedSource,
      },
      accessPoints: section.accessPoints.map((accessPoint) => ({
        ...accessPoint,
        location: snapLocationToRoute(accessPoint.location, route),
        source: seedSource,
      })),
      hazards: section.hazards.map((hazard) => ({
        ...hazard,
        location: snapLocationToRoute(hazard.location, route),
        source: seedSource,
      })),
      features: section.features.map((feature) => ({
        ...feature,
        location: snapLocationToRoute(feature.location, route),
        source: seedSource,
      })),
      photos: section.photos.map((photo) => ({
        ...photo,
        source: seedSource,
      })),
      reports: section.reports.map((report) => ({
        ...report,
        source: seedSource,
      })),
      routeSource,
    };
  },
);
