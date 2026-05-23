import type { LatLngTuple, RiverSection, SourceMetadata } from "../types";
import { trywerynRouteTraces } from "./trywerynRouteTraces";

export const riverTrywerynPilotNotes = {
  regionName: "River Tryweryn pilot",
  status: "draft-seed-data",
  sourcePolicy:
    "Prototype data for validating a dam-release whitewater river. Verify access, release rules, hazards, portages, and centre requirements with Canolfan Tryweryn, NRW, and local contributors before publication.",
  verificationNeeded: [
    "release calendar and flow source",
    "centre facility-fee/check-in requirements",
    "put-in and take-out practicality",
    "portage locations and instructions",
    "current obstruction reports",
    "bridge and rapid names",
    "local photos for dam, access points, hazards, and take-outs",
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
  label: "RiverLaunch.app Tryweryn seed dataset",
  confidence: "low",
  updatedAt: "2026-05-23",
  notes:
    "Draft prototype data requiring centre/local contributor verification before publication.",
};

const routeSource: SourceMetadata = {
  kind: "derived",
  label: "OpenStreetMap-derived Afon Tryweryn route trace",
  confidence: "medium",
  updatedAt: "2026-05-23",
  notes:
    "Generated from OSM waterway geometry via Overpass for prototype route display; production licence and geometry review required.",
  url: "https://www.openstreetmap.org/copyright",
};

const centreSource: SourceMetadata = {
  kind: "open-data",
  label: "National White Water Centre public river information",
  confidence: "medium",
  updatedAt: "2026-05-23",
  notes:
    "Used for public section lengths, grade bands, dam-release context, and centre/release caveats. Local operating rules still need direct confirmation.",
  url: "https://www.nationalwhitewatercentre.co.uk/the-river",
};

const releaseSource: SourceMetadata = {
  kind: "provider",
  label: "National White Water Centre water level information",
  confidence: "medium",
  updatedAt: "2026-05-23",
  notes:
    "Release availability is controlled upstream and should be treated as live operational data rather than static route advice.",
  url: "https://www.nationalwhitewatercentre.co.uk/water-level-information",
};

const userPhotoSource: SourceMetadata = {
  kind: "community",
  label: "User-provided River Tryweryn photo",
  confidence: "medium",
  updatedAt: "2026-05-23",
  notes:
    "Photo supplied for the River Tryweryn demo dataset. Location and caption should be confirmed before public data publication.",
};

const routeTracesBySection = trywerynRouteTraces as Record<
  string,
  LatLngTuple[]
>;

const riverTrywerynSectionSeeds: RiverSection[] = [
  {
    id: "tryweryn-dam-centre",
    riverName: "River Tryweryn",
    sectionName: "Llyn Celyn Dam to Canolfan Tryweryn",
    summary:
      "A dam-release whitewater section beginning near the Llyn Celyn outflow/stilling basin and running beside Canolfan Tryweryn. This is a controlled-release, technical venue rather than a touring canoe section.",
    centre: [52.9456, -3.6579],
    route: trywerynRouteTraces["tryweryn-dam-centre"],
    distanceKm: 2,
    estimatedTime: "Venue session",
    difficulty: "Advanced whitewater",
    suitability: [
      "whitewater kayak",
      "experienced canoeists only",
      "guided raft groups",
    ],
    levelBand: "unknown",
    levelLabel: "Dam release dependent",
    runnableGuidance:
      "Check the current Canolfan Tryweryn release calendar, centre rules, and facility arrangements before paddling. Seed guidance only.",
    accessSummary:
      "Access is venue-managed. Treat the start as a near-dam release/stilling-basin reference point, not an independent public put-in, until confirmed.",
    gauge: {
      id: "tryweryn-release-calendar",
      name: "Llyn Celyn release check",
      location: [52.944901, -3.668422],
      value: "Check release calendar",
      trend: "steady",
      observedAt: "Live check required",
      source: releaseSource,
    },
    accessPoints: [
      {
        id: "tryweryn-dam-start-candidate",
        type: "put-in",
        name: "Near Llyn Celyn dam/stilling basin",
        location: [52.944901, -3.668422],
        notes:
          "Seed point at the upstream start of the OSM river trace. Confirm authorised access and centre requirements before using.",
        source: seedSource,
      },
      {
        id: "tryweryn-centre-take-out",
        type: "take-out",
        name: "Canolfan Tryweryn centre / raft steps",
        location: [52.946492, -3.647993],
        notes:
          "Centre-area take-out candidate. Confirm current operating instructions and fees.",
        source: centreSource,
      },
    ],
    hazards: [
      {
        id: "tryweryn-dam-release-flow",
        title: "Controlled release flow",
        type: "dam release",
        severity: "serious",
        status: "active",
        location: [52.944944, -3.666964],
        lastConfirmed: "Seeded from public release guidance",
        description:
          "Flow depends on releases from Llyn Celyn. Conditions can change by release schedule and centre operating decisions.",
        source: releaseSource,
      },
      {
        id: "tryweryn-upper-grade-rapid-chain",
        title: "Grade 3-4 rapid chain",
        type: "technical whitewater",
        severity: "serious",
        status: "needs-confirmation",
        location: [52.944953, -3.662427],
        lastConfirmed: "Unverified seed",
        description:
          "Upper section is a continuous technical whitewater venue. Add named rapid photos, scout notes, and rescue/egress details.",
        source: centreSource,
      },
      {
        id: "tryweryn-miss-davies-bridge",
        title: "Weak bridge warning",
        type: "bridge",
        severity: "significant",
        status: "needs-confirmation",
        location: [52.946997, -3.65437],
        lastConfirmed: "Public centre update",
        description:
          "The centre publishes an active caution for Miss Davies' Bridge. Verify exact location and current status before relying on this marker.",
        source: centreSource,
      },
    ],
    features: [
      {
        id: "tryweryn-dam-context",
        title: "Llyn Celyn dam release context",
        type: "dam",
        location: [52.944901, -3.668422],
        description:
          "The demo section starts at the river trace immediately below the Llyn Celyn dam/outflow area.",
        source: centreSource,
      },
      {
        id: "tryweryn-centre-facility",
        title: "National White Water Centre",
        type: "facility",
        location: [52.946492, -3.647993],
        description:
          "Venue focal point for checking release, access, fees, and local operating guidance.",
        source: centreSource,
      },
    ],
    photos: [
      {
        id: "tryweryn-river-photo",
        title: "River Tryweryn whitewater",
        url: "/images/river-tryweryn.jpeg",
        caption:
          "User-provided Tryweryn river photo for the demo section image.",
        dateTaken: "May 2026",
        source: userPhotoSource,
      },
    ],
    reports: [
      {
        id: "tryweryn-dam-seed-report",
        author: "RiverLaunch.app seed",
        dateObserved: "Needs local confirmation",
        type: "Seed note",
        text: "First contributor task: verify the exact authorised start point near the dam, centre check-in process, and whether this marker should be labelled as access, feature, or release reference only.",
        source: seedSource,
      },
    ],
    source: centreSource,
  },
  {
    id: "tryweryn-centre-bala",
    riverName: "River Tryweryn",
    sectionName: "Canolfan Tryweryn to Bala",
    summary:
      "The lower Tryweryn continues below the centre toward Bala with natural-feeling whitewater, a serious rapid near the end, and portage/route-choice details that need community verification.",
    centre: [52.9281, -3.6186],
    route: trywerynRouteTraces["tryweryn-centre-bala"],
    distanceKm: 6,
    estimatedTime: "1.5-3 hours",
    difficulty: "Intermediate to advanced whitewater",
    suitability: ["whitewater kayak", "experienced canoeists"],
    levelBand: "unknown",
    levelLabel: "Dam release dependent",
    runnableGuidance:
      "Check release information and ask the centre for current lower-section hazards, portage advice, and take-out conditions.",
    accessSummary:
      "Starts below the centre/raft take-out steps and finishes around Bala car park in the public centre guide. Exact landings need local confirmation.",
    gauge: {
      id: "tryweryn-lower-release-calendar",
      name: "Lower Tryweryn release check",
      location: [52.946492, -3.647993],
      value: "Check release calendar",
      trend: "steady",
      observedAt: "Live check required",
      source: releaseSource,
    },
    accessPoints: [
      {
        id: "tryweryn-lower-put-in",
        type: "put-in",
        name: "Below centre / lower put-in",
        location: [52.946492, -3.647993],
        notes:
          "Seed point based on the lower section beginning below the centre. Confirm exact steps/landing and centre instructions.",
        source: centreSource,
      },
      {
        id: "tryweryn-bala-take-out",
        type: "take-out",
        name: "Bala car park / finish candidate",
        location: [52.906593, -3.58672],
        notes:
          "Seed finish near Bala. Confirm landing, parking, shuttle, and current local restrictions.",
        source: seedSource,
      },
    ],
    hazards: [
      {
        id: "tryweryn-lower-obstructions",
        title: "Natural obstructions can change",
        type: "strainer / obstruction",
        severity: "significant",
        status: "needs-confirmation",
        location: [52.930344, -3.619387],
        lastConfirmed: "Unverified seed",
        description:
          "The lower river is a natural environment. Fresh tree, debris, and bank-change reports are high-value community contributions.",
        source: centreSource,
      },
      {
        id: "tryweryn-bala-mill-falls",
        title: "Grade 4 rapid near end / portage option",
        type: "rapid / portage",
        severity: "serious",
        status: "needs-confirmation",
        location: [52.913057, -3.593515],
        lastConfirmed: "Seeded from public centre guide",
        description:
          "Public centre guidance notes a serious rapid near the end that can be portaged using the leat. Exact portage line needs a local photo and confirmation.",
        source: centreSource,
      },
    ],
    features: [
      {
        id: "tryweryn-lower-portage-leat",
        title: "Portage/leat reference needed",
        type: "portage",
        location: [52.91319, -3.593716],
        description:
          "Add contributor photos and precise instructions for the lower-section portage option near the end.",
        source: seedSource,
      },
      {
        id: "tryweryn-bala-finish",
        title: "Bala finish candidate",
        type: "landing",
        location: [52.906593, -3.58672],
        description:
          "End-of-section landing candidate needing parking and shuttle notes.",
        source: seedSource,
      },
    ],
    photos: [
      {
        id: "tryweryn-lower-river-photo",
        title: "River Tryweryn whitewater",
        url: "/images/river-tryweryn.jpeg",
        caption:
          "User-provided Tryweryn river photo used until lower-section-specific photos are collected.",
        dateTaken: "May 2026",
        source: userPhotoSource,
      },
    ],
    reports: [
      {
        id: "tryweryn-lower-seed-report",
        author: "RiverLaunch.app seed",
        dateObserved: "Needs local confirmation",
        type: "Seed note",
        text: "Collect fresh lower-section reports for obstructions, exact portage line, and Bala take-out practicality.",
        source: seedSource,
      },
    ],
    source: centreSource,
  },
];

export const riverTrywerynSections: RiverSection[] =
  riverTrywerynSectionSeeds.map((section) => {
    const route = routeTracesBySection[section.id] ?? section.route;

    return {
      ...section,
      route,
      centre: routeCentre(route),
      gauge: {
        ...section.gauge,
        location: snapLocationToRoute(section.gauge.location, route),
      },
      accessPoints: section.accessPoints.map((accessPoint) => ({
        ...accessPoint,
        location: snapLocationToRoute(accessPoint.location, route),
      })),
      hazards: section.hazards.map((hazard) => ({
        ...hazard,
        location: snapLocationToRoute(hazard.location, route),
      })),
      features: section.features.map((feature) => ({
        ...feature,
        location: snapLocationToRoute(feature.location, route),
      })),
      photos: section.photos.map((photo) => ({
        ...photo,
        source: photo.source ?? seedSource,
      })),
      reports: section.reports.map((report) => ({
        ...report,
        source: report.source ?? seedSource,
      })),
      routeSource,
    };
  });
