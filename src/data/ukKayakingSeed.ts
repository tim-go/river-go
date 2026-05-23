import type { LatLngTuple, LevelBand, RiverSection, SourceMetadata } from "../types";

const sampleCatalogueSource: SourceMetadata = {
  kind: "seed",
  label: "RiverLaunch.app UK kayaking sample catalogue",
  confidence: "low",
  updatedAt: "2026-05-23",
  notes:
    "Curated prototype-only list of well-known UK canoeing and kayaking rivers. Route lines and marker positions are schematic and require local verification before use as trip advice.",
};

const routeSource: SourceMetadata = {
  kind: "derived",
  label: "Schematic prototype route",
  confidence: "low",
  updatedAt: "2026-05-23",
  notes:
    "Approximate visual route for discovery demos only. Replace with verified route geometry before publication.",
};

type SampleSectionInput = {
  id: string;
  riverName: string;
  sectionName: string;
  route: LatLngTuple[];
  distanceKm: number;
  estimatedTime: string;
  difficulty: string;
  suitability: string[];
  levelBand: LevelBand;
  levelLabel: string;
  summary: string;
  runnableGuidance: string;
  accessSummary: string;
  gaugeName: string;
  knownFor: string;
  sourceUrl?: string;
};

function routeCentre(route: LatLngTuple[]) {
  return route[Math.floor(route.length / 2)];
}

function routePoint(route: LatLngTuple[], ratio: number) {
  const index = Math.min(route.length - 1, Math.max(0, Math.round((route.length - 1) * ratio)));
  return route[index];
}

function sourceFor(section: SampleSectionInput): SourceMetadata {
  return {
    ...sampleCatalogueSource,
    url: section.sourceUrl,
  };
}

function createSampleSection(section: SampleSectionInput): RiverSection {
  const source = sourceFor(section);

  return {
    id: section.id,
    riverName: section.riverName,
    sectionName: section.sectionName,
    summary: section.summary,
    centre: routeCentre(section.route),
    route: section.route,
    distanceKm: section.distanceKm,
    estimatedTime: section.estimatedTime,
    difficulty: section.difficulty,
    suitability: section.suitability,
    levelBand: section.levelBand,
    levelLabel: section.levelLabel,
    runnableGuidance: section.runnableGuidance,
    accessSummary: section.accessSummary,
    gauge: {
      id: `${section.id}-level-check`,
      name: section.gaugeName,
      location: routePoint(section.route, 0.5),
      value: "Check live level",
      trend: "steady",
      observedAt: "Demo seed",
      source,
    },
    accessPoints: [
      {
        id: `${section.id}-put-in`,
        type: "put-in",
        name: "Candidate put-in",
        location: routePoint(section.route, 0),
        notes:
          "Seed access point for demo discovery. Confirm access rights, parking, and local restrictions before paddling.",
        source,
      },
      {
        id: `${section.id}-take-out`,
        type: "take-out",
        name: "Candidate take-out",
        location: routePoint(section.route, 1),
        notes:
          "Seed take-out point for demo discovery. Replace with verified local access detail.",
        source,
      },
    ],
    hazards: [
      {
        id: `${section.id}-verification-warning`,
        title: "Local verification needed",
        type: "seed data",
        severity: "caution",
        status: "needs-confirmation",
        location: routePoint(section.route, 0.55),
        lastConfirmed: "Unverified seed",
        description:
          "This river is included as a known paddling candidate, but RiverLaunch.app needs contributor updates for current hazards, trees, access, and level guidance.",
        source,
      },
    ],
    features: [
      {
        id: `${section.id}-known-for`,
        title: section.knownFor,
        type: "river character",
        location: routePoint(section.route, 0.35),
        description:
          "Prototype feature note to show why this river belongs in the UK kayaking discovery catalogue.",
        source,
      },
    ],
    photos: [
      {
        id: `${section.id}-photo-needed`,
        title: "Photo needed",
        url: "/images/river-tryweryn.jpeg",
        caption:
          "Placeholder river image. Replace with contributor photography for this specific river section.",
        dateTaken: "Needed",
        source,
      },
    ],
    reports: [
      {
        id: `${section.id}-seed-report`,
        author: "RiverLaunch.app seed",
        dateObserved: "Needs local confirmation",
        type: "Seed note",
        text:
          "Collect recent level, access, hazard, parking, and route-condition reports from local paddlers before treating this as reliable guidance.",
        source,
      },
    ],
    source: {
      ...routeSource,
      url: section.sourceUrl,
    },
  };
}

const samples: SampleSectionInput[] = [
  {
    id: "dart-loop",
    riverName: "River Dart",
    sectionName: "New Bridge to Holne Bridge Loop",
    route: [
      [50.5224, -3.8398],
      [50.5208, -3.8332],
      [50.5188, -3.8244],
      [50.5161, -3.8153],
      [50.5163, -3.8075],
    ],
    distanceKm: 5,
    estimatedTime: "Half day",
    difficulty: "Intermediate whitewater",
    suitability: ["whitewater kayak", "experienced canoeists"],
    levelBand: "unknown",
    levelLabel: "Rain-fed",
    summary:
      "A classic Dartmoor whitewater section often used as an intermediate benchmark for UK paddlers.",
    runnableGuidance:
      "Rain-fed and level-sensitive. Check local Dart levels, access arrangements, and tree reports before travelling.",
    accessSummary:
      "Candidate New Bridge to Holne Bridge section. Access and parking details need local verification.",
    gaugeName: "Dart level check",
    knownFor: "Classic England whitewater run",
    sourceUrl: "https://gopaddling.info/rivers/river-dart/",
  },
  {
    id: "dee-llangollen",
    riverName: "River Dee",
    sectionName: "Llangollen town run",
    route: [
      [52.9686, -3.1702],
      [52.9718, -3.1538],
      [52.9715, -3.1378],
      [52.9703, -3.1198],
    ],
    distanceKm: 4,
    estimatedTime: "Short session",
    difficulty: "Intermediate whitewater",
    suitability: ["whitewater kayak", "club trips"],
    levelBand: "unknown",
    levelLabel: "Check Dee gauges",
    summary:
      "A North Wales whitewater favourite around Llangollen with town features and frequent paddler use.",
    runnableGuidance:
      "Check current levels, local access, and event/competition use before paddling.",
    accessSummary:
      "Seeded Llangollen-area route only. Confirm put-ins, egress, and parking.",
    gaugeName: "Llangollen Dee level check",
    knownFor: "Town whitewater and club trips",
    sourceUrl: "https://www.wildwater.org.uk/river-guides/",
  },
  {
    id: "usk-talybont-crickhowell",
    riverName: "River Usk",
    sectionName: "Talybont to Crickhowell",
    route: [
      [51.9015, -3.2772],
      [51.8875, -3.245],
      [51.8749, -3.2329],
      [51.8648, -3.1848],
      [51.8565, -3.1424],
    ],
    distanceKm: 14,
    estimatedTime: "Half day",
    difficulty: "Intermediate touring / whitewater",
    suitability: ["kayak", "canoe in suitable levels"],
    levelBand: "unknown",
    levelLabel: "Rain responsive",
    summary:
      "A South Wales river often discussed alongside the Wye, but more rain-responsive and access-sensitive.",
    runnableGuidance:
      "Use formal access guidance and current river levels. The Usk rises and falls quickly after rain.",
    accessSummary:
      "Seeded public access candidates need agreement and season checks before use.",
    gaugeName: "Usk level check",
    knownFor: "South Wales training run",
    sourceUrl: "https://www.wildwater.org.uk/river-guides/",
  },
  {
    id: "tay-grandtully",
    riverName: "River Tay",
    sectionName: "Grandtully / Aberfeldy",
    route: [
      [56.651, -3.776],
      [56.646, -3.756],
      [56.641, -3.739],
      [56.637, -3.724],
    ],
    distanceKm: 5,
    estimatedTime: "Short session",
    difficulty: "Grade 2-3 whitewater",
    suitability: ["whitewater kayak", "canoe in suitable levels"],
    levelBand: "unknown",
    levelLabel: "Check Tay level",
    summary:
      "A well-known Scottish paddling and racing venue around Grandtully and Aberfeldy.",
    runnableGuidance:
      "Check live Tay levels and local event use before paddling.",
    accessSummary:
      "Seeded venue-area route; access and parking require local validation.",
    gaugeName: "Tay level check",
    knownFor: "Scottish racing and training venue",
    sourceUrl: "https://www.wildwater.org.uk/river-guides/",
  },
  {
    id: "spey-aviemore-boat",
    riverName: "River Spey",
    sectionName: "Aviemore to Boat of Garten",
    route: [
      [57.195, -3.829],
      [57.211, -3.808],
      [57.231, -3.782],
      [57.251, -3.754],
    ],
    distanceKm: 10,
    estimatedTime: "Half day",
    difficulty: "Touring river",
    suitability: ["touring kayak", "open canoe", "expedition canoe"],
    levelBand: "unknown",
    levelLabel: "Check Spey level",
    summary:
      "A classic Scottish touring-river corridor and useful contrast to the whitewater-focused samples.",
    runnableGuidance:
      "Check levels, wind, cold-water conditions, and access/egress options before committing.",
    accessSummary:
      "Seeded Speyside touring section. Replace with verified access and camping notes.",
    gaugeName: "Spey level check",
    knownFor: "Scottish canoe touring",
    sourceUrl: "https://www.britishcanoeing.org.uk/",
  },
  {
    id: "findhorn-randolphs-leap",
    riverName: "River Findhorn",
    sectionName: "Randolph's Leap sample",
    route: [
      [57.541, -3.644],
      [57.552, -3.631],
      [57.563, -3.619],
      [57.574, -3.608],
    ],
    distanceKm: 6,
    estimatedTime: "Half day",
    difficulty: "Advanced whitewater",
    suitability: ["whitewater kayak"],
    levelBand: "unknown",
    levelLabel: "Rain-fed / spate",
    summary:
      "A celebrated Scottish whitewater river where level and local knowledge are central.",
    runnableGuidance:
      "Treat as advanced, level-sensitive whitewater. Verify flow, access, and hazards locally.",
    accessSummary:
      "Seed section only. Exact put-in, take-out, and gorge safety notes need contributor review.",
    gaugeName: "Findhorn level check",
    knownFor: "Highland whitewater",
    sourceUrl: "https://www.aboynecanoeclub.co.uk/kayak-canoe-polo-sup/whitewater-kayaking/",
  },
  {
    id: "orchy-middle",
    riverName: "River Orchy",
    sectionName: "Middle Orchy sample",
    route: [
      [56.516, -4.768],
      [56.506, -4.746],
      [56.497, -4.733],
      [56.488, -4.72],
    ],
    distanceKm: 7,
    estimatedTime: "Half day",
    difficulty: "Advanced whitewater",
    suitability: ["whitewater kayak"],
    levelBand: "unknown",
    levelLabel: "Rain-fed / spate",
    summary:
      "A Scottish classic frequently referenced by experienced whitewater paddlers.",
    runnableGuidance:
      "Advanced spate river. Verify level, trees, access, and group competence before use.",
    accessSummary:
      "Prototype route only; access details require Scottish local contributor review.",
    gaugeName: "Orchy level check",
    knownFor: "Classic Scottish spate run",
    sourceUrl: "https://delkayaks.co.uk/2024/01/28/5-of-my-favourite-white-water-rivers-to-paddle-in-scotland/",
  },
  {
    id: "etive-glen",
    riverName: "River Etive",
    sectionName: "Glen Etive sample",
    route: [
      [56.615, -5.013],
      [56.602, -5.009],
      [56.588, -5.007],
      [56.573, -5.009],
    ],
    distanceKm: 7,
    estimatedTime: "Half day",
    difficulty: "Advanced whitewater",
    suitability: ["whitewater kayak"],
    levelBand: "unknown",
    levelLabel: "Rain-fed / spate",
    summary:
      "A high-profile Glen Etive whitewater sample where waterfalls, portages, and levels need precise notes.",
    runnableGuidance:
      "Advanced whitewater only. Verify current levels and all falls/portage decisions locally.",
    accessSummary:
      "Seed route for demo discovery. Replace with exact legal access, parking, and egress details.",
    gaugeName: "Etive level check",
    knownFor: "Glen Etive steep whitewater",
    sourceUrl: "https://roamwest.co.uk/journal/roam-west-white-water",
  },
  {
    id: "moriston-classic",
    riverName: "River Moriston",
    sectionName: "Classic Moriston sample",
    route: [
      [57.215, -4.651],
      [57.208, -4.616],
      [57.201, -4.598],
      [57.194, -4.585],
    ],
    distanceKm: 5,
    estimatedTime: "Short session",
    difficulty: "Advanced whitewater",
    suitability: ["whitewater kayak"],
    levelBand: "unknown",
    levelLabel: "Dam release / level check",
    summary:
      "A Scottish whitewater candidate where release/level timing and precise feature notes matter.",
    runnableGuidance:
      "Check release/level information and local hazard updates before travelling.",
    accessSummary:
      "Seed discovery route only. Contributor validation needed for all access points.",
    gaugeName: "Moriston level check",
    knownFor: "Scottish dam-influenced whitewater",
    sourceUrl: "https://www.aboynecanoeclub.co.uk/kayak-canoe-polo-sup/whitewater-kayaking/",
  },
  {
    id: "garry-killiecrankie",
    riverName: "River Garry",
    sectionName: "Garry sample",
    route: [
      [56.721, -4.024],
      [56.716, -3.997],
      [56.71, -3.982],
      [56.704, -3.97],
    ],
    distanceKm: 6,
    estimatedTime: "Short session",
    difficulty: "Intermediate / advanced whitewater",
    suitability: ["whitewater kayak"],
    levelBand: "unknown",
    levelLabel: "Release / level dependent",
    summary:
      "A Scottish whitewater sample included for release/level-aware discovery and club-trip planning.",
    runnableGuidance:
      "Check current releases, river levels, and local access before paddling.",
    accessSummary:
      "Seed route only. Exact access, shuttle, and egress notes need local confirmation.",
    gaugeName: "Garry level check",
    knownFor: "Scottish release whitewater",
    sourceUrl: "https://www.aboynecanoeclub.co.uk/kayak-canoe-polo-sup/whitewater-kayaking/",
  },
  {
    id: "tummel-pitlochry",
    riverName: "River Tummel",
    sectionName: "Pitlochry sample",
    route: [
      [56.704, -3.768],
      [56.706, -3.739],
      [56.705, -3.721],
      [56.703, -3.707],
    ],
    distanceKm: 6,
    estimatedTime: "Short session",
    difficulty: "Intermediate whitewater",
    suitability: ["whitewater kayak", "club trips"],
    levelBand: "unknown",
    levelLabel: "Release / level dependent",
    summary:
      "A popular Scottish club-trip style river sample where release timing and access notes are important.",
    runnableGuidance:
      "Verify release state, event use, and hazards before paddling.",
    accessSummary:
      "Seed route only. Local put-in and take-out information needed.",
    gaugeName: "Tummel level check",
    knownFor: "Club whitewater trips",
    sourceUrl: "https://www.aboynecanoeclub.co.uk/kayak-canoe-polo-sup/whitewater-kayaking/",
  },
  {
    id: "tees-abbey-rapids",
    riverName: "River Tees",
    sectionName: "Abbey Rapids sample",
    route: [
      [54.545, -1.925],
      [54.542, -1.908],
      [54.538, -1.901],
      [54.535, -1.895],
    ],
    distanceKm: 4,
    estimatedTime: "Short session",
    difficulty: "Intermediate whitewater",
    suitability: ["whitewater kayak", "canoe in suitable levels"],
    levelBand: "unknown",
    levelLabel: "Check Tees level",
    summary:
      "A North East England sample useful for broadening discovery beyond Wales, Scotland, and the South West.",
    runnableGuidance:
      "Check current levels, access, and local hazard reports before paddling.",
    accessSummary:
      "Seed route only. Replace with verified access and parking detail.",
    gaugeName: "Tees level check",
    knownFor: "Northern England whitewater",
    sourceUrl: "https://www.britishcanoeing.org.uk/",
  },
  {
    id: "bure-broads",
    riverName: "River Bure",
    sectionName: "Norfolk Broads sample",
    route: [
      [52.704, 1.463],
      [52.714, 1.493],
      [52.713, 1.516],
      [52.707, 1.536],
    ],
    distanceKm: 8,
    estimatedTime: "Half day",
    difficulty: "Sheltered touring",
    suitability: ["touring kayak", "open canoe", "SUP in suitable conditions"],
    levelBand: "unknown",
    levelLabel: "Tidal/weather checks",
    summary:
      "A Norfolk Broads touring sample representing gentle canoe/kayak discovery rather than whitewater.",
    runnableGuidance:
      "Check wind, navigation rules, tidal influence, motor traffic, and nature-reserve restrictions.",
    accessSummary:
      "Seed route only. Add verified launch points, hire bases, moorings, and restricted channels.",
    gaugeName: "Broads conditions check",
    knownFor: "Accessible canoe touring",
    sourceUrl: "https://www.norfolkbroads.com/story/canoeing-on-the-broads-1147/",
  },
];

export const ukKayakingSampleSections = samples.map(createSampleSection);
