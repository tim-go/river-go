import type { RiverSection } from "../types";

export const riverSections: RiverSection[] = [
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
      name: "Hereford gauge",
      location: [52.054, -2.714],
      value: "0.86 m",
      trend: "steady",
      observedAt: "Today 08:20",
    },
    accessPoints: [
      {
        id: "hoarwithy-put-in",
        type: "put-in",
        name: "Hoarwithy landing",
        location: [51.958, -2.663],
        notes: "Short carry from roadside parking. Can be busy on summer weekends.",
      },
      {
        id: "ross-take-out",
        type: "take-out",
        name: "Ross-on-Wye rowing club area",
        location: [51.913, -2.58],
        notes: "Good landing at normal levels. Confirm parking arrangements locally.",
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
    id: "dart-loop",
    riverName: "River Dart",
    sectionName: "Newbridge to Holne Bridge",
    summary:
      "A faster whitewater-adjacent section included to demonstrate hazard freshness and level caution.",
    centre: [50.524, -3.821],
    route: [
      [50.529, -3.837],
      [50.526, -3.831],
      [50.522, -3.823],
      [50.52, -3.814],
      [50.517, -3.805],
    ],
    distanceKm: 5.1,
    estimatedTime: "1.5-2.5 hours",
    difficulty: "Advanced",
    suitability: ["whitewater kayak", "experienced canoeists only"],
    levelBand: "high",
    levelLabel: "High and pushy",
    runnableGuidance:
      "Demo guidance marks this as high. Treat reports as context, not a safety recommendation.",
    accessSummary:
      "Access and parking are sensitive. Check local guidance and seasonal arrangements.",
    gauge: {
      id: "dart-austins-bridge",
      name: "Austin's Bridge gauge",
      location: [50.516, -3.78],
      value: "0.72 m",
      trend: "rising",
      observedAt: "Today 08:05",
    },
    accessPoints: [
      {
        id: "newbridge-put-in",
        type: "put-in",
        name: "Newbridge",
        location: [50.529, -3.837],
        notes: "Popular access point. Parking pressure can be significant.",
      },
      {
        id: "holne-take-out",
        type: "take-out",
        name: "Holne Bridge",
        location: [50.517, -3.805],
        notes: "Confirm take-out arrangements and avoid blocking lanes.",
      },
    ],
    hazards: [
      {
        id: "dart-weir",
        title: "Powerful stopper below ledge",
        type: "weir",
        severity: "serious",
        status: "active",
        location: [50.524, -3.823],
        lastConfirmed: "Yesterday",
        description:
          "Feature changes character quickly with level. Scout and use local knowledge.",
      },
    ],
    features: [
      {
        id: "dart-scouting-eddy",
        title: "Scouting eddy",
        type: "eddy",
        location: [50.525, -3.827],
        description: "Useful eddy before the steeper middle section.",
      },
    ],
    photos: [
      {
        id: "dart-photo-1",
        title: "Fast wooded section",
        url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=900&q=80",
        caption: "Wooded river corridor with limited exits.",
        dateTaken: "April 2026",
      },
    ],
    reports: [
      {
        id: "dart-report-1",
        author: "Ben",
        dateObserved: "Yesterday",
        type: "Level report",
        text: "Rising after rain. Pushy in the constricted middle section.",
      },
    ],
  },
  {
    id: "thames-lechlade-radcot",
    riverName: "River Thames",
    sectionName: "Lechlade to Radcot",
    summary:
      "A gentle navigation-style section showing locks, access notes, and beginner-friendly planning.",
    centre: [51.701, -1.62],
    route: [
      [51.694, -1.691],
      [51.697, -1.669],
      [51.701, -1.646],
      [51.704, -1.623],
      [51.708, -1.596],
    ],
    distanceKm: 10.8,
    estimatedTime: "3-4 hours",
    difficulty: "Beginner",
    suitability: ["open canoe", "inflatable canoe", "SUP", "touring kayak"],
    levelBand: "unknown",
    levelLabel: "Managed navigation",
    runnableGuidance:
      "Usually planned around navigation conditions, lock status, wind, and landing practicality rather than a single gauge.",
    accessSummary:
      "Licence and navigation authority context likely applies. Confirm current requirements before paddling.",
    gauge: {
      id: "thames-lechlade",
      name: "Lechlade level",
      location: [51.694, -1.691],
      value: "Normal range",
      trend: "steady",
      observedAt: "Today 07:50",
    },
    accessPoints: [
      {
        id: "lechlade-put-in",
        type: "put-in",
        name: "Lechlade slipway area",
        location: [51.694, -1.691],
        notes: "Good demo put-in. Check parking, fees, and local restrictions.",
      },
      {
        id: "radcot-take-out",
        type: "take-out",
        name: "Radcot Bridge",
        location: [51.708, -1.596],
        notes: "Practical landing nearby, with facilities in season.",
      },
    ],
    hazards: [
      {
        id: "thames-lock",
        title: "Lock approach",
        type: "lock hazard",
        severity: "info",
        status: "seasonal",
        location: [51.704, -1.626],
        lastConfirmed: "31 days ago",
        description:
          "Follow navigation instructions and portage if directed. Busy with hire craft in summer.",
      },
    ],
    features: [
      {
        id: "thames-pub-stop",
        title: "Riverside stop",
        type: "facility",
        location: [51.707, -1.602],
        description: "Useful end-of-trip facilities near the take-out.",
      },
    ],
    photos: [
      {
        id: "thames-photo-1",
        title: "Quiet navigation water",
        url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=80",
        caption: "Gentle water suited to relaxed touring conditions.",
        dateTaken: "May 2026",
      },
    ],
    reports: [
      {
        id: "thames-report-1",
        author: "Sarah",
        dateObserved: "5 days ago",
        type: "Access update",
        text: "Landing was easy at Radcot. Parking looked busy by late morning.",
      },
    ],
  },
];
