import type { MapPoiSeedInput } from "./map-pois.js";

export const seedMapPois: MapPoiSeedInput[] = [
  {
    "id": "tryweryn-dam-centre:tryweryn-release-calendar",
    "sectionId": "tryweryn-dam-centre",
    "kind": "gauge",
    "location": [
      52.944901,
      -3.668422
    ],
    "title": "Llyn Celyn release check",
    "subtitle": "Gauge",
    "summary": "Check release calendar. Trend: steady. Observed Live check required.",
    "source": {
      "kind": "provider",
      "label": "National White Water Centre water level information",
      "confidence": "medium",
      "updatedAt": "2026-05-23",
      "url": "https://www.nationalwhitewatercentre.co.uk/water-level-information"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "tryweryn-release-calendar",
      "value": "Check release calendar",
      "trend": "steady",
      "observedAt": "Live check required",
      "what3wordsAddress": "lifted.sliders.blackbird"
    }
  },
  {
    "id": "tryweryn-dam-centre:tryweryn-dam-start-candidate",
    "sectionId": "tryweryn-dam-centre",
    "kind": "access",
    "location": [
      52.944901,
      -3.668422
    ],
    "title": "Near Llyn Celyn dam/stilling basin",
    "subtitle": "Access · put-in",
    "summary": "Seed point at the upstream start of the OSM river trace. Confirm authorised access and centre requirements before using.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app Tryweryn seed dataset",
      "confidence": "low",
      "updatedAt": "2026-05-23"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "tryweryn-dam-start-candidate",
      "accessType": "put-in",
      "what3wordsAddress": "lifted.sliders.blackbird"
    }
  },
  {
    "id": "tryweryn-dam-centre:tryweryn-centre-take-out",
    "sectionId": "tryweryn-dam-centre",
    "kind": "access",
    "location": [
      52.946492,
      -3.647993
    ],
    "title": "Canolfan Tryweryn centre / raft steps",
    "subtitle": "Access · take-out",
    "summary": "Centre-area take-out candidate. Confirm current operating instructions and fees.",
    "source": {
      "kind": "open-data",
      "label": "National White Water Centre public river information",
      "confidence": "medium",
      "updatedAt": "2026-05-23",
      "url": "https://www.nationalwhitewatercentre.co.uk/the-river"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "tryweryn-centre-take-out",
      "accessType": "take-out",
      "what3wordsAddress": "seashell.binders.claim"
    }
  },
  {
    "id": "tryweryn-dam-centre:tryweryn-dam-release-flow",
    "sectionId": "tryweryn-dam-centre",
    "kind": "hazard",
    "location": [
      52.944944,
      -3.666964
    ],
    "title": "Controlled release flow",
    "subtitle": "dam release · serious",
    "summary": "Flow depends on releases from Llyn Celyn. Conditions can change by release schedule and centre operating decisions.",
    "source": {
      "kind": "provider",
      "label": "National White Water Centre water level information",
      "confidence": "medium",
      "updatedAt": "2026-05-23",
      "url": "https://www.nationalwhitewatercentre.co.uk/water-level-information"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "tryweryn-dam-release-flow",
      "hazardType": "dam release",
      "severity": "serious",
      "sourceStatus": "active",
      "lastConfirmed": "Seeded from public release guidance",
      "what3wordsAddress": "resolved.lollipop.ruins"
    }
  },
  {
    "id": "tryweryn-dam-centre:tryweryn-upper-grade-rapid-chain",
    "sectionId": "tryweryn-dam-centre",
    "kind": "hazard",
    "location": [
      52.944818,
      -3.662376
    ],
    "title": "Grade 3-4 rapid chain",
    "subtitle": "technical whitewater · serious",
    "summary": "Upper section is a continuous technical whitewater venue. Add named rapid photos, scout notes, and rescue/egress details.",
    "source": {
      "kind": "open-data",
      "label": "National White Water Centre public river information",
      "confidence": "medium",
      "updatedAt": "2026-05-23",
      "url": "https://www.nationalwhitewatercentre.co.uk/the-river"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "tryweryn-upper-grade-rapid-chain",
      "hazardType": "technical whitewater",
      "severity": "serious",
      "sourceStatus": "needs-confirmation",
      "lastConfirmed": "Unverified seed",
      "what3wordsAddress": "backtrack.punctuate.wins"
    }
  },
  {
    "id": "tryweryn-dam-centre:tryweryn-miss-davies-bridge",
    "sectionId": "tryweryn-dam-centre",
    "kind": "hazard",
    "location": [
      52.947017,
      -3.654375
    ],
    "title": "Weak bridge warning",
    "subtitle": "bridge · significant",
    "summary": "The centre publishes an active caution for Miss Davies' Bridge. Verify exact location and current status before relying on this marker.",
    "source": {
      "kind": "open-data",
      "label": "National White Water Centre public river information",
      "confidence": "medium",
      "updatedAt": "2026-05-23",
      "url": "https://www.nationalwhitewatercentre.co.uk/the-river"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "tryweryn-miss-davies-bridge",
      "hazardType": "bridge",
      "severity": "significant",
      "sourceStatus": "needs-confirmation",
      "lastConfirmed": "Public centre update",
      "what3wordsAddress": "notifying.brand.milder"
    }
  },
  {
    "id": "tryweryn-dam-centre:tryweryn-dam-context",
    "sectionId": "tryweryn-dam-centre",
    "kind": "feature",
    "location": [
      52.944901,
      -3.668422
    ],
    "title": "Llyn Celyn dam release context",
    "subtitle": "dam",
    "summary": "The demo section starts at the river trace immediately below the Llyn Celyn dam/outflow area.",
    "source": {
      "kind": "open-data",
      "label": "National White Water Centre public river information",
      "confidence": "medium",
      "updatedAt": "2026-05-23",
      "url": "https://www.nationalwhitewatercentre.co.uk/the-river"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "tryweryn-dam-context",
      "featureType": "dam",
      "what3wordsAddress": "lifted.sliders.blackbird"
    }
  },
  {
    "id": "tryweryn-dam-centre:tryweryn-centre-facility",
    "sectionId": "tryweryn-dam-centre",
    "kind": "feature",
    "location": [
      52.946492,
      -3.647993
    ],
    "title": "National White Water Centre",
    "subtitle": "facility",
    "summary": "Venue focal point for checking release, access, fees, and local operating guidance.",
    "source": {
      "kind": "open-data",
      "label": "National White Water Centre public river information",
      "confidence": "medium",
      "updatedAt": "2026-05-23",
      "url": "https://www.nationalwhitewatercentre.co.uk/the-river"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "tryweryn-centre-facility",
      "featureType": "facility",
      "what3wordsAddress": "seashell.binders.claim"
    }
  },
  {
    "id": "tryweryn-centre-bala:tryweryn-lower-release-calendar",
    "sectionId": "tryweryn-centre-bala",
    "kind": "gauge",
    "location": [
      52.946492,
      -3.647993
    ],
    "title": "Lower Tryweryn release check",
    "subtitle": "Gauge",
    "summary": "Check release calendar. Trend: steady. Observed Live check required.",
    "source": {
      "kind": "provider",
      "label": "National White Water Centre water level information",
      "confidence": "medium",
      "updatedAt": "2026-05-23",
      "url": "https://www.nationalwhitewatercentre.co.uk/water-level-information"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "tryweryn-lower-release-calendar",
      "value": "Check release calendar",
      "trend": "steady",
      "observedAt": "Live check required",
      "what3wordsAddress": "seashell.binders.claim"
    }
  },
  {
    "id": "tryweryn-centre-bala:tryweryn-lower-put-in",
    "sectionId": "tryweryn-centre-bala",
    "kind": "access",
    "location": [
      52.946492,
      -3.647993
    ],
    "title": "Below centre / lower put-in",
    "subtitle": "Access · put-in",
    "summary": "Seed point based on the lower section beginning below the centre. Confirm exact steps/landing and centre instructions.",
    "source": {
      "kind": "open-data",
      "label": "National White Water Centre public river information",
      "confidence": "medium",
      "updatedAt": "2026-05-23",
      "url": "https://www.nationalwhitewatercentre.co.uk/the-river"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "tryweryn-lower-put-in",
      "accessType": "put-in",
      "what3wordsAddress": "seashell.binders.claim"
    }
  },
  {
    "id": "tryweryn-centre-bala:tryweryn-bala-take-out",
    "sectionId": "tryweryn-centre-bala",
    "kind": "access",
    "location": [
      52.906593,
      -3.58672
    ],
    "title": "Bala car park / finish candidate",
    "subtitle": "Access · take-out",
    "summary": "Seed finish near Bala. Confirm landing, parking, shuttle, and current local restrictions.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app Tryweryn seed dataset",
      "confidence": "low",
      "updatedAt": "2026-05-23"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "tryweryn-bala-take-out",
      "accessType": "take-out",
      "what3wordsAddress": "easels.wimp.firm"
    }
  },
  {
    "id": "tryweryn-centre-bala:tryweryn-lower-obstructions",
    "sectionId": "tryweryn-centre-bala",
    "kind": "hazard",
    "location": [
      52.930415,
      -3.619396
    ],
    "title": "Natural obstructions can change",
    "subtitle": "strainer / obstruction · significant",
    "summary": "The lower river is a natural environment. Fresh tree, debris, and bank-change reports are high-value community contributions.",
    "source": {
      "kind": "open-data",
      "label": "National White Water Centre public river information",
      "confidence": "medium",
      "updatedAt": "2026-05-23",
      "url": "https://www.nationalwhitewatercentre.co.uk/the-river"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "tryweryn-lower-obstructions",
      "hazardType": "strainer / obstruction",
      "severity": "significant",
      "sourceStatus": "needs-confirmation",
      "lastConfirmed": "Unverified seed",
      "what3wordsAddress": "airship.driveways.divides"
    }
  },
  {
    "id": "tryweryn-centre-bala:tryweryn-bala-mill-falls",
    "sectionId": "tryweryn-centre-bala",
    "kind": "hazard",
    "location": [
      52.913057,
      -3.593515
    ],
    "title": "Grade 4 rapid near end / portage option",
    "subtitle": "rapid / portage · serious",
    "summary": "Public centre guidance notes a serious rapid near the end that can be portaged using the leat. Exact portage line needs a local photo and confirmation.",
    "source": {
      "kind": "open-data",
      "label": "National White Water Centre public river information",
      "confidence": "medium",
      "updatedAt": "2026-05-23",
      "url": "https://www.nationalwhitewatercentre.co.uk/the-river"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "tryweryn-bala-mill-falls",
      "hazardType": "rapid / portage",
      "severity": "serious",
      "sourceStatus": "needs-confirmation",
      "lastConfirmed": "Seeded from public centre guide",
      "what3wordsAddress": "teeth.comedians.bead"
    }
  },
  {
    "id": "tryweryn-centre-bala:tryweryn-lower-portage-leat",
    "sectionId": "tryweryn-centre-bala",
    "kind": "feature",
    "location": [
      52.91319,
      -3.593716
    ],
    "title": "Portage/leat reference needed",
    "subtitle": "portage",
    "summary": "Add contributor photos and precise instructions for the lower-section portage option near the end.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app Tryweryn seed dataset",
      "confidence": "low",
      "updatedAt": "2026-05-23"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "tryweryn-lower-portage-leat",
      "featureType": "portage",
      "what3wordsAddress": "ignore.donates.turns"
    }
  },
  {
    "id": "tryweryn-centre-bala:tryweryn-bala-finish",
    "sectionId": "tryweryn-centre-bala",
    "kind": "feature",
    "location": [
      52.906593,
      -3.58672
    ],
    "title": "Bala finish candidate",
    "subtitle": "landing",
    "summary": "End-of-section landing candidate needing parking and shuttle notes.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app Tryweryn seed dataset",
      "confidence": "low",
      "updatedAt": "2026-05-23"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "tryweryn-bala-finish",
      "featureType": "landing",
      "what3wordsAddress": "easels.wimp.firm"
    }
  },
  {
    "id": "wye-glasbury-hay:wye-hay-gauge",
    "sectionId": "wye-glasbury-hay",
    "kind": "gauge",
    "location": [
      52.076483,
      -3.127474
    ],
    "title": "Hay-on-Wye gauge candidate",
    "subtitle": "Gauge",
    "summary": "0.78 m. Trend: steady. Observed Demo reading.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app Wye seed dataset",
      "confidence": "low",
      "updatedAt": "2026-05-21"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "wye-hay-gauge",
      "value": "0.78 m",
      "trend": "steady",
      "observedAt": "Demo reading",
      "what3wordsAddress": "charcoal.newlyweds.branching"
    }
  },
  {
    "id": "wye-glasbury-hay:glasbury-put-in",
    "sectionId": "wye-glasbury-hay",
    "kind": "access",
    "location": [
      52.043274,
      -3.20138
    ],
    "title": "Glasbury launch candidate",
    "subtitle": "Access · put-in",
    "summary": "Seed point. Confirm permitted launch, parking, fees, and seasonal crowding.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app Wye seed dataset",
      "confidence": "low",
      "updatedAt": "2026-05-21"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "glasbury-put-in",
      "accessType": "put-in",
      "what3wordsAddress": "remover.scream.cope"
    }
  },
  {
    "id": "wye-glasbury-hay:hay-take-out",
    "sectionId": "wye-glasbury-hay",
    "kind": "access",
    "location": [
      52.076483,
      -3.127474
    ],
    "title": "Hay-on-Wye take-out candidate",
    "subtitle": "Access · take-out",
    "summary": "Seed point. Confirm landing practicality and parking constraints.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app Wye seed dataset",
      "confidence": "low",
      "updatedAt": "2026-05-21"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "hay-take-out",
      "accessType": "take-out",
      "what3wordsAddress": "charcoal.newlyweds.branching"
    }
  },
  {
    "id": "wye-glasbury-hay:wye-glasbury-shallows",
    "sectionId": "wye-glasbury-hay",
    "kind": "hazard",
    "location": [
      52.072222,
      -3.1619
    ],
    "title": "Shallow gravel bars",
    "subtitle": "shallow water · info",
    "summary": "Likely low-water scrape zones. Needs local confirmation and level-linked photos.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app Wye seed dataset",
      "confidence": "low",
      "updatedAt": "2026-05-21"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "wye-glasbury-shallows",
      "hazardType": "shallow water",
      "severity": "info",
      "sourceStatus": "needs-confirmation",
      "lastConfirmed": "Unverified seed",
      "what3wordsAddress": "forgives.families.digits"
    }
  },
  {
    "id": "wye-glasbury-hay:wye-hay-bridge",
    "sectionId": "wye-glasbury-hay",
    "kind": "feature",
    "location": [
      52.076483,
      -3.127474
    ],
    "title": "Hay bridge approach",
    "subtitle": "bridge",
    "summary": "Useful navigation landmark near the end of the section.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app Wye seed dataset",
      "confidence": "low",
      "updatedAt": "2026-05-21"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "wye-hay-bridge",
      "featureType": "bridge",
      "what3wordsAddress": "charcoal.newlyweds.branching"
    }
  },
  {
    "id": "wye-hay-whitney:wye-hay-gauge",
    "sectionId": "wye-hay-whitney",
    "kind": "gauge",
    "location": [
      52.077507,
      -3.126583
    ],
    "title": "Hay-on-Wye gauge candidate",
    "subtitle": "Gauge",
    "summary": "0.78 m. Trend: steady. Observed Demo reading.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app Wye seed dataset",
      "confidence": "low",
      "updatedAt": "2026-05-21"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "wye-hay-gauge",
      "value": "0.78 m",
      "trend": "steady",
      "observedAt": "Demo reading",
      "what3wordsAddress": "natively.chickens.outnumber"
    }
  },
  {
    "id": "wye-hay-whitney:hay-put-in",
    "sectionId": "wye-hay-whitney",
    "kind": "access",
    "location": [
      52.076938,
      -3.127078
    ],
    "title": "Hay-on-Wye launch candidate",
    "subtitle": "Access · put-in",
    "summary": "Seed point. Confirm access route and parking.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app Wye seed dataset",
      "confidence": "low",
      "updatedAt": "2026-05-21"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "hay-put-in",
      "accessType": "put-in",
      "what3wordsAddress": "endings.scrolled.socket"
    }
  },
  {
    "id": "wye-hay-whitney:whitney-take-out",
    "sectionId": "wye-hay-whitney",
    "kind": "access",
    "location": [
      52.120428,
      -3.073071
    ],
    "title": "Whitney Bridge take-out candidate",
    "subtitle": "Access · take-out",
    "summary": "Seed point. Confirm landing and road access practicality.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app Wye seed dataset",
      "confidence": "low",
      "updatedAt": "2026-05-21"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "whitney-take-out",
      "accessType": "take-out",
      "what3wordsAddress": "decanter.flasks.bike"
    }
  },
  {
    "id": "wye-hay-whitney:wye-whitney-bridge-approach",
    "sectionId": "wye-hay-whitney",
    "kind": "hazard",
    "location": [
      52.120428,
      -3.073071
    ],
    "title": "Bridge approach needs review",
    "subtitle": "bridge · info",
    "summary": "Add photos and local notes for bridge approach, landing choice, and high-water behaviour.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app Wye seed dataset",
      "confidence": "low",
      "updatedAt": "2026-05-21"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "wye-whitney-bridge-approach",
      "hazardType": "bridge",
      "severity": "info",
      "sourceStatus": "needs-confirmation",
      "lastConfirmed": "Unverified seed",
      "what3wordsAddress": "decanter.flasks.bike"
    }
  },
  {
    "id": "wye-hay-whitney:wye-whitney-landing",
    "sectionId": "wye-hay-whitney",
    "kind": "feature",
    "location": [
      52.120428,
      -3.073071
    ],
    "title": "Whitney Bridge landing candidate",
    "subtitle": "landing",
    "summary": "Candidate take-out requiring contributor confirmation.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app Wye seed dataset",
      "confidence": "low",
      "updatedAt": "2026-05-21"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "wye-whitney-landing",
      "featureType": "landing",
      "what3wordsAddress": "decanter.flasks.bike"
    }
  },
  {
    "id": "wye-whitney-bredwardine:wye-bredwardine-gauge",
    "sectionId": "wye-whitney-bredwardine",
    "kind": "gauge",
    "location": [
      52.093997,
      -2.945415
    ],
    "title": "Bredwardine gauge candidate",
    "subtitle": "Gauge",
    "summary": "Demo unavailable. Trend: steady. Observed Demo reading.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app Wye seed dataset",
      "confidence": "low",
      "updatedAt": "2026-05-21"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "wye-bredwardine-gauge",
      "value": "Demo unavailable",
      "trend": "steady",
      "observedAt": "Demo reading",
      "what3wordsAddress": "overtones.dreams.chairing"
    }
  },
  {
    "id": "wye-whitney-bredwardine:whitney-put-in",
    "sectionId": "wye-whitney-bredwardine",
    "kind": "access",
    "location": [
      52.119467,
      -3.071364
    ],
    "title": "Whitney Bridge launch candidate",
    "subtitle": "Access · put-in",
    "summary": "Seed point. Confirm whether launch and parking are practical.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app Wye seed dataset",
      "confidence": "low",
      "updatedAt": "2026-05-21"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "whitney-put-in",
      "accessType": "put-in",
      "what3wordsAddress": "garlic.melon.reapply"
    }
  },
  {
    "id": "wye-whitney-bredwardine:bredwardine-take-out",
    "sectionId": "wye-whitney-bredwardine",
    "kind": "access",
    "location": [
      52.093997,
      -2.945415
    ],
    "title": "Bredwardine take-out candidate",
    "subtitle": "Access · take-out",
    "summary": "Seed point. Needs local access and parking review.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app Wye seed dataset",
      "confidence": "low",
      "updatedAt": "2026-05-21"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "bredwardine-take-out",
      "accessType": "take-out",
      "what3wordsAddress": "overtones.dreams.chairing"
    }
  },
  {
    "id": "wye-whitney-bredwardine:wye-bredwardine-tree-watch",
    "sectionId": "wye-whitney-bredwardine",
    "kind": "hazard",
    "location": [
      52.107192,
      -2.985135
    ],
    "title": "Tree obstruction watch point",
    "subtitle": "strainer · caution",
    "summary": "Use this as a demo placeholder for reporting fallen trees after high flows.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app Wye seed dataset",
      "confidence": "low",
      "updatedAt": "2026-05-21"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "wye-bredwardine-tree-watch",
      "hazardType": "strainer",
      "severity": "caution",
      "sourceStatus": "needs-confirmation",
      "lastConfirmed": "Unverified seed",
      "what3wordsAddress": "overhear.loving.gradually"
    }
  },
  {
    "id": "wye-whitney-bredwardine:wye-rural-rest-point",
    "sectionId": "wye-whitney-bredwardine",
    "kind": "feature",
    "location": [
      52.106786,
      -3.013812
    ],
    "title": "Potential rest stop",
    "subtitle": "landing",
    "summary": "Candidate feature for contributor review.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app Wye seed dataset",
      "confidence": "low",
      "updatedAt": "2026-05-21"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "wye-rural-rest-point",
      "featureType": "landing",
      "what3wordsAddress": "poem.serenade.afterglow"
    }
  },
  {
    "id": "wye-hoarwithy-ross:wye-hereford",
    "sectionId": "wye-hoarwithy-ross",
    "kind": "gauge",
    "location": [
      51.956305,
      -2.660945
    ],
    "title": "Hereford gauge candidate",
    "subtitle": "Gauge",
    "summary": "0.86 m. Trend: steady. Observed Demo reading.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app Wye seed dataset",
      "confidence": "low",
      "updatedAt": "2026-05-21"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "wye-hereford",
      "value": "0.86 m",
      "trend": "steady",
      "observedAt": "Demo reading",
      "what3wordsAddress": "dustbin.washing.dozen"
    }
  },
  {
    "id": "wye-hoarwithy-ross:hoarwithy-put-in",
    "sectionId": "wye-hoarwithy-ross",
    "kind": "access",
    "location": [
      51.956305,
      -2.660945
    ],
    "title": "Hoarwithy landing candidate",
    "subtitle": "Access · put-in",
    "summary": "Seed point. Confirm parking, carry distance, and landing quality.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app Wye seed dataset",
      "confidence": "low",
      "updatedAt": "2026-05-21"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "hoarwithy-put-in",
      "accessType": "put-in",
      "what3wordsAddress": "dustbin.washing.dozen"
    }
  },
  {
    "id": "wye-hoarwithy-ross:ross-take-out",
    "sectionId": "wye-hoarwithy-ross",
    "kind": "access",
    "location": [
      51.91523,
      -2.588334
    ],
    "title": "Ross-on-Wye take-out candidate",
    "subtitle": "Access · take-out",
    "summary": "Good demo take-out candidate. Confirm current arrangements locally.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app Wye seed dataset",
      "confidence": "low",
      "updatedAt": "2026-05-21"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "ross-take-out",
      "accessType": "take-out",
      "what3wordsAddress": "caravans.cupboards.domain"
    }
  },
  {
    "id": "wye-hoarwithy-ross:wye-low-bridge",
    "sectionId": "wye-hoarwithy-ross",
    "kind": "hazard",
    "location": [
      51.934667,
      -2.608565
    ],
    "title": "Low branches near inside bend",
    "subtitle": "strainer · caution",
    "summary": "Branches reported close to the main flow at higher levels. Needs recent confirmation.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app Wye seed dataset",
      "confidence": "low",
      "updatedAt": "2026-05-21"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "wye-low-bridge",
      "hazardType": "strainer",
      "severity": "caution",
      "sourceStatus": "needs-confirmation",
      "lastConfirmed": "18 days ago",
      "what3wordsAddress": "spades.irony.sharper"
    }
  },
  {
    "id": "wye-hoarwithy-ross:wye-gravel-beach",
    "sectionId": "wye-hoarwithy-ross",
    "kind": "feature",
    "location": [
      51.946615,
      -2.628826
    ],
    "title": "Gravel lunch beach",
    "subtitle": "landing",
    "summary": "Useful stopping point in normal summer flows.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app Wye seed dataset",
      "confidence": "low",
      "updatedAt": "2026-05-21"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "wye-gravel-beach",
      "featureType": "landing",
      "what3wordsAddress": "geology.shrugging.strapped"
    }
  },
  {
    "id": "wye-ross-kerne:wye-ross-gauge",
    "sectionId": "wye-ross-kerne",
    "kind": "gauge",
    "location": [
      51.91523,
      -2.588334
    ],
    "title": "Ross-on-Wye gauge candidate",
    "subtitle": "Gauge",
    "summary": "0.92 m. Trend: falling. Observed Demo reading.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app Wye seed dataset",
      "confidence": "low",
      "updatedAt": "2026-05-21"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "wye-ross-gauge",
      "value": "0.92 m",
      "trend": "falling",
      "observedAt": "Demo reading",
      "what3wordsAddress": "caravans.cupboards.domain"
    }
  },
  {
    "id": "wye-ross-kerne:ross-put-in",
    "sectionId": "wye-ross-kerne",
    "kind": "access",
    "location": [
      51.91523,
      -2.588334
    ],
    "title": "Ross-on-Wye launch candidate",
    "subtitle": "Access · put-in",
    "summary": "Seed point. Confirm launch rights, parking, and busy periods.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app Wye seed dataset",
      "confidence": "low",
      "updatedAt": "2026-05-21"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "ross-put-in",
      "accessType": "put-in",
      "what3wordsAddress": "caravans.cupboards.domain"
    }
  },
  {
    "id": "wye-ross-kerne:kerne-take-out",
    "sectionId": "wye-ross-kerne",
    "kind": "access",
    "location": [
      51.846741,
      -2.609514
    ],
    "title": "Kerne Bridge take-out candidate",
    "subtitle": "Access · take-out",
    "summary": "Seed point. Needs recent landing and parking confirmation.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app Wye seed dataset",
      "confidence": "low",
      "updatedAt": "2026-05-21"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "kerne-take-out",
      "accessType": "take-out",
      "what3wordsAddress": "garlic.mixer.spin"
    }
  },
  {
    "id": "wye-ross-kerne:wye-ross-bridge-watch",
    "sectionId": "wye-ross-kerne",
    "kind": "hazard",
    "location": [
      51.914145,
      -2.589911
    ],
    "title": "Bridge and traffic watch",
    "subtitle": "bridge · info",
    "summary": "Add local notes for bridge lines, hire-boat congestion, and wind exposure.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app Wye seed dataset",
      "confidence": "low",
      "updatedAt": "2026-05-21"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "wye-ross-bridge-watch",
      "hazardType": "bridge",
      "severity": "info",
      "sourceStatus": "needs-confirmation",
      "lastConfirmed": "Unverified seed",
      "what3wordsAddress": "bulldozer.wobbling.cover"
    }
  },
  {
    "id": "wye-ross-kerne:wye-ross-feature",
    "sectionId": "wye-ross-kerne",
    "kind": "feature",
    "location": [
      51.91523,
      -2.588334
    ],
    "title": "Ross riverside facilities",
    "subtitle": "facility",
    "summary": "Useful for trip start/end planning. Needs detail.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app Wye seed dataset",
      "confidence": "low",
      "updatedAt": "2026-05-21"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "wye-ross-feature",
      "featureType": "facility",
      "what3wordsAddress": "caravans.cupboards.domain"
    }
  },
  {
    "id": "wye-kerne-symonds-yat:wye-ross-gauge",
    "sectionId": "wye-kerne-symonds-yat",
    "kind": "gauge",
    "location": [
      51.859579,
      -2.628612
    ],
    "title": "Ross-on-Wye gauge candidate",
    "subtitle": "Gauge",
    "summary": "0.92 m. Trend: falling. Observed Demo reading.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app Wye seed dataset",
      "confidence": "low",
      "updatedAt": "2026-05-21"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "wye-ross-gauge",
      "value": "0.92 m",
      "trend": "falling",
      "observedAt": "Demo reading",
      "what3wordsAddress": "riots.game.behalf"
    }
  },
  {
    "id": "wye-kerne-symonds-yat:kerne-put-in",
    "sectionId": "wye-kerne-symonds-yat",
    "kind": "access",
    "location": [
      51.846741,
      -2.609514
    ],
    "title": "Kerne Bridge launch candidate",
    "subtitle": "Access · put-in",
    "summary": "Seed point. Confirm launch and parking practicality.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app Wye seed dataset",
      "confidence": "low",
      "updatedAt": "2026-05-21"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "kerne-put-in",
      "accessType": "put-in",
      "what3wordsAddress": "garlic.mixer.spin"
    }
  },
  {
    "id": "wye-kerne-symonds-yat:symonds-yat-take-out",
    "sectionId": "wye-kerne-symonds-yat",
    "kind": "access",
    "location": [
      51.844477,
      -2.64385
    ],
    "title": "Symonds Yat take-out candidate",
    "subtitle": "Access · take-out",
    "summary": "Seed point. Confirm landing options, crowding, parking, and local signage.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app Wye seed dataset",
      "confidence": "low",
      "updatedAt": "2026-05-21"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "symonds-yat-take-out",
      "accessType": "take-out",
      "what3wordsAddress": "streamers.wrist.spines"
    }
  },
  {
    "id": "wye-kerne-symonds-yat:wye-symonds-yat-busy",
    "sectionId": "wye-kerne-symonds-yat",
    "kind": "hazard",
    "location": [
      51.844477,
      -2.64385
    ],
    "title": "Busy landing area",
    "subtitle": "navigation conflict · caution",
    "summary": "Use reports to capture crowding, hire traffic, and practical take-out timing.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app Wye seed dataset",
      "confidence": "low",
      "updatedAt": "2026-05-21"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "wye-symonds-yat-busy",
      "hazardType": "navigation conflict",
      "severity": "caution",
      "sourceStatus": "needs-confirmation",
      "lastConfirmed": "Unverified seed",
      "what3wordsAddress": "streamers.wrist.spines"
    }
  },
  {
    "id": "wye-kerne-symonds-yat:wye-symonds-yat-feature",
    "sectionId": "wye-kerne-symonds-yat",
    "kind": "feature",
    "location": [
      51.844477,
      -2.64385
    ],
    "title": "Symonds Yat visitor area",
    "subtitle": "facility",
    "summary": "Feature and facility notes need structured contributor input.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app Wye seed dataset",
      "confidence": "low",
      "updatedAt": "2026-05-21"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "wye-symonds-yat-feature",
      "featureType": "facility",
      "what3wordsAddress": "streamers.wrist.spines"
    }
  },
  {
    "id": "wye-symonds-yat-monmouth:wye-monmouth-gauge",
    "sectionId": "wye-symonds-yat-monmouth",
    "kind": "gauge",
    "location": [
      51.810233,
      -2.710623
    ],
    "title": "Monmouth gauge candidate",
    "subtitle": "Gauge",
    "summary": "1.04 m. Trend: steady. Observed Demo reading.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app Wye seed dataset",
      "confidence": "low",
      "updatedAt": "2026-05-21"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "wye-monmouth-gauge",
      "value": "1.04 m",
      "trend": "steady",
      "observedAt": "Demo reading",
      "what3wordsAddress": "nails.meaty.bits"
    }
  },
  {
    "id": "wye-symonds-yat-monmouth:symonds-yat-put-in",
    "sectionId": "wye-symonds-yat-monmouth",
    "kind": "access",
    "location": [
      51.844477,
      -2.64385
    ],
    "title": "Symonds Yat launch candidate",
    "subtitle": "Access · put-in",
    "summary": "Seed point. Confirm best launch, parking, and crowding.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app Wye seed dataset",
      "confidence": "low",
      "updatedAt": "2026-05-21"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "symonds-yat-put-in",
      "accessType": "put-in",
      "what3wordsAddress": "streamers.wrist.spines"
    }
  },
  {
    "id": "wye-symonds-yat-monmouth:monmouth-take-out",
    "sectionId": "wye-symonds-yat-monmouth",
    "kind": "access",
    "location": [
      51.810233,
      -2.710623
    ],
    "title": "Monmouth take-out candidate",
    "subtitle": "Access · take-out",
    "summary": "Seed point. Confirm landing quality, parking, and shuttle logistics.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app Wye seed dataset",
      "confidence": "low",
      "updatedAt": "2026-05-21"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "monmouth-take-out",
      "accessType": "take-out",
      "what3wordsAddress": "nails.meaty.bits"
    }
  },
  {
    "id": "wye-symonds-yat-monmouth:wye-monmouth-long-section",
    "sectionId": "wye-symonds-yat-monmouth",
    "kind": "hazard",
    "location": [
      51.821397,
      -2.691089
    ],
    "title": "Longer day-trip commitment",
    "subtitle": "fatigue · info",
    "summary": "Use reports to confirm realistic timings for novice canoe groups at different levels.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app Wye seed dataset",
      "confidence": "low",
      "updatedAt": "2026-05-21"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "wye-monmouth-long-section",
      "hazardType": "fatigue",
      "severity": "info",
      "sourceStatus": "needs-confirmation",
      "lastConfirmed": "Unverified seed",
      "what3wordsAddress": "aware.swanky.durations"
    }
  },
  {
    "id": "wye-symonds-yat-monmouth:wye-monmouth-finish",
    "sectionId": "wye-symonds-yat-monmouth",
    "kind": "feature",
    "location": [
      51.810233,
      -2.710623
    ],
    "title": "Monmouth finish candidate",
    "subtitle": "landing",
    "summary": "Candidate finish needing contributor photos and access review.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app Wye seed dataset",
      "confidence": "low",
      "updatedAt": "2026-05-21"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "wye-monmouth-finish",
      "featureType": "landing",
      "what3wordsAddress": "nails.meaty.bits"
    }
  },
  {
    "id": "dart-loop:dart-loop-level-check",
    "sectionId": "dart-loop",
    "kind": "gauge",
    "location": [
      50.5188,
      -3.8244
    ],
    "title": "Dart level check",
    "subtitle": "Gauge",
    "summary": "Check live level. Trend: steady. Observed Demo seed.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://gopaddling.info/rivers/river-dart/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "dart-loop-level-check",
      "value": "Check live level",
      "trend": "steady",
      "observedAt": "Demo seed",
      "what3wordsAddress": "sprouting.fried.tweed"
    }
  },
  {
    "id": "dart-loop:dart-loop-put-in",
    "sectionId": "dart-loop",
    "kind": "access",
    "location": [
      50.5224,
      -3.8398
    ],
    "title": "Candidate put-in",
    "subtitle": "Access · put-in",
    "summary": "Seed access point for demo discovery. Confirm access rights, parking, and local restrictions before paddling.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://gopaddling.info/rivers/river-dart/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "dart-loop-put-in",
      "accessType": "put-in",
      "what3wordsAddress": "usage.stung.charted"
    }
  },
  {
    "id": "dart-loop:dart-loop-take-out",
    "sectionId": "dart-loop",
    "kind": "access",
    "location": [
      50.5163,
      -3.8075
    ],
    "title": "Candidate take-out",
    "subtitle": "Access · take-out",
    "summary": "Seed take-out point for demo discovery. Replace with verified local access detail.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://gopaddling.info/rivers/river-dart/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "dart-loop-take-out",
      "accessType": "take-out",
      "what3wordsAddress": "downhill.today.durations"
    }
  },
  {
    "id": "dart-loop:dart-loop-verification-warning",
    "sectionId": "dart-loop",
    "kind": "hazard",
    "location": [
      50.5188,
      -3.8244
    ],
    "title": "Local verification needed",
    "subtitle": "seed data · caution",
    "summary": "This river is included as a known paddling candidate, but RiverLaunch.app needs contributor updates for current hazards, trees, access, and level guidance.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://gopaddling.info/rivers/river-dart/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "dart-loop-verification-warning",
      "hazardType": "seed data",
      "severity": "caution",
      "sourceStatus": "needs-confirmation",
      "lastConfirmed": "Unverified seed",
      "what3wordsAddress": "sprouting.fried.tweed"
    }
  },
  {
    "id": "dart-loop:dart-loop-known-for",
    "sectionId": "dart-loop",
    "kind": "feature",
    "location": [
      50.5208,
      -3.8332
    ],
    "title": "Classic England whitewater run",
    "subtitle": "river character",
    "summary": "Prototype feature note to show why this river belongs in the UK kayaking discovery catalogue.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://gopaddling.info/rivers/river-dart/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "dart-loop-known-for",
      "featureType": "river character",
      "what3wordsAddress": "bouncing.catapult.glaze"
    }
  },
  {
    "id": "dee-llangollen:dee-llangollen-level-check",
    "sectionId": "dee-llangollen",
    "kind": "gauge",
    "location": [
      52.9715,
      -3.1378
    ],
    "title": "Llangollen Dee level check",
    "subtitle": "Gauge",
    "summary": "Check live level. Trend: steady. Observed Demo seed.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.wildwater.org.uk/river-guides/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "dee-llangollen-level-check",
      "value": "Check live level",
      "trend": "steady",
      "observedAt": "Demo seed",
      "what3wordsAddress": "walkway.hopefully.legroom"
    }
  },
  {
    "id": "dee-llangollen:dee-llangollen-put-in",
    "sectionId": "dee-llangollen",
    "kind": "access",
    "location": [
      52.9686,
      -3.1702
    ],
    "title": "Candidate put-in",
    "subtitle": "Access · put-in",
    "summary": "Seed access point for demo discovery. Confirm access rights, parking, and local restrictions before paddling.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.wildwater.org.uk/river-guides/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "dee-llangollen-put-in",
      "accessType": "put-in",
      "what3wordsAddress": "surprised.haunts.impressed"
    }
  },
  {
    "id": "dee-llangollen:dee-llangollen-take-out",
    "sectionId": "dee-llangollen",
    "kind": "access",
    "location": [
      52.9703,
      -3.1198
    ],
    "title": "Candidate take-out",
    "subtitle": "Access · take-out",
    "summary": "Seed take-out point for demo discovery. Replace with verified local access detail.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.wildwater.org.uk/river-guides/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "dee-llangollen-take-out",
      "accessType": "take-out",
      "what3wordsAddress": "musical.marker.generated"
    }
  },
  {
    "id": "dee-llangollen:dee-llangollen-verification-warning",
    "sectionId": "dee-llangollen",
    "kind": "hazard",
    "location": [
      52.9715,
      -3.1378
    ],
    "title": "Local verification needed",
    "subtitle": "seed data · caution",
    "summary": "This river is included as a known paddling candidate, but RiverLaunch.app needs contributor updates for current hazards, trees, access, and level guidance.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.wildwater.org.uk/river-guides/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "dee-llangollen-verification-warning",
      "hazardType": "seed data",
      "severity": "caution",
      "sourceStatus": "needs-confirmation",
      "lastConfirmed": "Unverified seed",
      "what3wordsAddress": "walkway.hopefully.legroom"
    }
  },
  {
    "id": "dee-llangollen:dee-llangollen-known-for",
    "sectionId": "dee-llangollen",
    "kind": "feature",
    "location": [
      52.9718,
      -3.1538
    ],
    "title": "Town whitewater and club trips",
    "subtitle": "river character",
    "summary": "Prototype feature note to show why this river belongs in the UK kayaking discovery catalogue.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.wildwater.org.uk/river-guides/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "dee-llangollen-known-for",
      "featureType": "river character",
      "what3wordsAddress": "impulses.buildings.tickles"
    }
  },
  {
    "id": "usk-talybont-crickhowell:usk-talybont-crickhowell-level-check",
    "sectionId": "usk-talybont-crickhowell",
    "kind": "gauge",
    "location": [
      51.8749,
      -3.2329
    ],
    "title": "Usk level check",
    "subtitle": "Gauge",
    "summary": "Check live level. Trend: steady. Observed Demo seed.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.wildwater.org.uk/river-guides/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "usk-talybont-crickhowell-level-check",
      "value": "Check live level",
      "trend": "steady",
      "observedAt": "Demo seed",
      "what3wordsAddress": "embodied.shocked.clenching"
    }
  },
  {
    "id": "usk-talybont-crickhowell:usk-talybont-crickhowell-put-in",
    "sectionId": "usk-talybont-crickhowell",
    "kind": "access",
    "location": [
      51.9015,
      -3.2772
    ],
    "title": "Candidate put-in",
    "subtitle": "Access · put-in",
    "summary": "Seed access point for demo discovery. Confirm access rights, parking, and local restrictions before paddling.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.wildwater.org.uk/river-guides/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "usk-talybont-crickhowell-put-in",
      "accessType": "put-in",
      "what3wordsAddress": "sailed.hologram.intent"
    }
  },
  {
    "id": "usk-talybont-crickhowell:usk-talybont-crickhowell-take-out",
    "sectionId": "usk-talybont-crickhowell",
    "kind": "access",
    "location": [
      51.8565,
      -3.1424
    ],
    "title": "Candidate take-out",
    "subtitle": "Access · take-out",
    "summary": "Seed take-out point for demo discovery. Replace with verified local access detail.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.wildwater.org.uk/river-guides/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "usk-talybont-crickhowell-take-out",
      "accessType": "take-out",
      "what3wordsAddress": "awestruck.required.rushed"
    }
  },
  {
    "id": "usk-talybont-crickhowell:usk-talybont-crickhowell-verification-warning",
    "sectionId": "usk-talybont-crickhowell",
    "kind": "hazard",
    "location": [
      51.8749,
      -3.2329
    ],
    "title": "Local verification needed",
    "subtitle": "seed data · caution",
    "summary": "This river is included as a known paddling candidate, but RiverLaunch.app needs contributor updates for current hazards, trees, access, and level guidance.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.wildwater.org.uk/river-guides/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "usk-talybont-crickhowell-verification-warning",
      "hazardType": "seed data",
      "severity": "caution",
      "sourceStatus": "needs-confirmation",
      "lastConfirmed": "Unverified seed",
      "what3wordsAddress": "embodied.shocked.clenching"
    }
  },
  {
    "id": "usk-talybont-crickhowell:usk-talybont-crickhowell-known-for",
    "sectionId": "usk-talybont-crickhowell",
    "kind": "feature",
    "location": [
      51.8875,
      -3.245
    ],
    "title": "South Wales training run",
    "subtitle": "river character",
    "summary": "Prototype feature note to show why this river belongs in the UK kayaking discovery catalogue.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.wildwater.org.uk/river-guides/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "usk-talybont-crickhowell-known-for",
      "featureType": "river character",
      "what3wordsAddress": "future.chimp.protrude"
    }
  },
  {
    "id": "tay-grandtully:tay-grandtully-level-check",
    "sectionId": "tay-grandtully",
    "kind": "gauge",
    "location": [
      56.641,
      -3.739
    ],
    "title": "Tay level check",
    "subtitle": "Gauge",
    "summary": "Check live level. Trend: steady. Observed Demo seed.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.wildwater.org.uk/river-guides/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "tay-grandtully-level-check",
      "value": "Check live level",
      "trend": "steady",
      "observedAt": "Demo seed",
      "what3wordsAddress": "bends.redouble.crunch"
    }
  },
  {
    "id": "tay-grandtully:tay-grandtully-put-in",
    "sectionId": "tay-grandtully",
    "kind": "access",
    "location": [
      56.651,
      -3.776
    ],
    "title": "Candidate put-in",
    "subtitle": "Access · put-in",
    "summary": "Seed access point for demo discovery. Confirm access rights, parking, and local restrictions before paddling.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.wildwater.org.uk/river-guides/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "tay-grandtully-put-in",
      "accessType": "put-in",
      "what3wordsAddress": "intro.stance.clutches"
    }
  },
  {
    "id": "tay-grandtully:tay-grandtully-take-out",
    "sectionId": "tay-grandtully",
    "kind": "access",
    "location": [
      56.637,
      -3.724
    ],
    "title": "Candidate take-out",
    "subtitle": "Access · take-out",
    "summary": "Seed take-out point for demo discovery. Replace with verified local access detail.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.wildwater.org.uk/river-guides/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "tay-grandtully-take-out",
      "accessType": "take-out",
      "what3wordsAddress": "armrests.bracing.winks"
    }
  },
  {
    "id": "tay-grandtully:tay-grandtully-verification-warning",
    "sectionId": "tay-grandtully",
    "kind": "hazard",
    "location": [
      56.641,
      -3.739
    ],
    "title": "Local verification needed",
    "subtitle": "seed data · caution",
    "summary": "This river is included as a known paddling candidate, but RiverLaunch.app needs contributor updates for current hazards, trees, access, and level guidance.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.wildwater.org.uk/river-guides/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "tay-grandtully-verification-warning",
      "hazardType": "seed data",
      "severity": "caution",
      "sourceStatus": "needs-confirmation",
      "lastConfirmed": "Unverified seed",
      "what3wordsAddress": "bends.redouble.crunch"
    }
  },
  {
    "id": "tay-grandtully:tay-grandtully-known-for",
    "sectionId": "tay-grandtully",
    "kind": "feature",
    "location": [
      56.646,
      -3.756
    ],
    "title": "Scottish racing and training venue",
    "subtitle": "river character",
    "summary": "Prototype feature note to show why this river belongs in the UK kayaking discovery catalogue.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.wildwater.org.uk/river-guides/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "tay-grandtully-known-for",
      "featureType": "river character",
      "what3wordsAddress": "headlines.bookcases.rinsed"
    }
  },
  {
    "id": "spey-aviemore-boat:spey-aviemore-boat-level-check",
    "sectionId": "spey-aviemore-boat",
    "kind": "gauge",
    "location": [
      57.231,
      -3.782
    ],
    "title": "Spey level check",
    "subtitle": "Gauge",
    "summary": "Check live level. Trend: steady. Observed Demo seed.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.britishcanoeing.org.uk/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "spey-aviemore-boat-level-check",
      "value": "Check live level",
      "trend": "steady",
      "observedAt": "Demo seed",
      "what3wordsAddress": "aimlessly.glow.spades"
    }
  },
  {
    "id": "spey-aviemore-boat:spey-aviemore-boat-put-in",
    "sectionId": "spey-aviemore-boat",
    "kind": "access",
    "location": [
      57.195,
      -3.829
    ],
    "title": "Candidate put-in",
    "subtitle": "Access · put-in",
    "summary": "Seed access point for demo discovery. Confirm access rights, parking, and local restrictions before paddling.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.britishcanoeing.org.uk/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "spey-aviemore-boat-put-in",
      "accessType": "put-in",
      "what3wordsAddress": "revamped.uproot.dispenser"
    }
  },
  {
    "id": "spey-aviemore-boat:spey-aviemore-boat-take-out",
    "sectionId": "spey-aviemore-boat",
    "kind": "access",
    "location": [
      57.251,
      -3.754
    ],
    "title": "Candidate take-out",
    "subtitle": "Access · take-out",
    "summary": "Seed take-out point for demo discovery. Replace with verified local access detail.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.britishcanoeing.org.uk/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "spey-aviemore-boat-take-out",
      "accessType": "take-out",
      "what3wordsAddress": "slippers.former.boast"
    }
  },
  {
    "id": "spey-aviemore-boat:spey-aviemore-boat-verification-warning",
    "sectionId": "spey-aviemore-boat",
    "kind": "hazard",
    "location": [
      57.231,
      -3.782
    ],
    "title": "Local verification needed",
    "subtitle": "seed data · caution",
    "summary": "This river is included as a known paddling candidate, but RiverLaunch.app needs contributor updates for current hazards, trees, access, and level guidance.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.britishcanoeing.org.uk/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "spey-aviemore-boat-verification-warning",
      "hazardType": "seed data",
      "severity": "caution",
      "sourceStatus": "needs-confirmation",
      "lastConfirmed": "Unverified seed",
      "what3wordsAddress": "aimlessly.glow.spades"
    }
  },
  {
    "id": "spey-aviemore-boat:spey-aviemore-boat-known-for",
    "sectionId": "spey-aviemore-boat",
    "kind": "feature",
    "location": [
      57.211,
      -3.808
    ],
    "title": "Scottish canoe touring",
    "subtitle": "river character",
    "summary": "Prototype feature note to show why this river belongs in the UK kayaking discovery catalogue.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.britishcanoeing.org.uk/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "spey-aviemore-boat-known-for",
      "featureType": "river character",
      "what3wordsAddress": "petty.gurgled.parked"
    }
  },
  {
    "id": "findhorn-randolphs-leap:findhorn-randolphs-leap-level-check",
    "sectionId": "findhorn-randolphs-leap",
    "kind": "gauge",
    "location": [
      57.563,
      -3.619
    ],
    "title": "Findhorn level check",
    "subtitle": "Gauge",
    "summary": "Check live level. Trend: steady. Observed Demo seed.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.aboynecanoeclub.co.uk/kayak-canoe-polo-sup/whitewater-kayaking/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "findhorn-randolphs-leap-level-check",
      "value": "Check live level",
      "trend": "steady",
      "observedAt": "Demo seed",
      "what3wordsAddress": "tastings.products.lung"
    }
  },
  {
    "id": "findhorn-randolphs-leap:findhorn-randolphs-leap-put-in",
    "sectionId": "findhorn-randolphs-leap",
    "kind": "access",
    "location": [
      57.541,
      -3.644
    ],
    "title": "Candidate put-in",
    "subtitle": "Access · put-in",
    "summary": "Seed access point for demo discovery. Confirm access rights, parking, and local restrictions before paddling.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.aboynecanoeclub.co.uk/kayak-canoe-polo-sup/whitewater-kayaking/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "findhorn-randolphs-leap-put-in",
      "accessType": "put-in",
      "what3wordsAddress": "dogs.debit.threaded"
    }
  },
  {
    "id": "findhorn-randolphs-leap:findhorn-randolphs-leap-take-out",
    "sectionId": "findhorn-randolphs-leap",
    "kind": "access",
    "location": [
      57.574,
      -3.608
    ],
    "title": "Candidate take-out",
    "subtitle": "Access · take-out",
    "summary": "Seed take-out point for demo discovery. Replace with verified local access detail.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.aboynecanoeclub.co.uk/kayak-canoe-polo-sup/whitewater-kayaking/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "findhorn-randolphs-leap-take-out",
      "accessType": "take-out",
      "what3wordsAddress": "soils.whimpered.mixed"
    }
  },
  {
    "id": "findhorn-randolphs-leap:findhorn-randolphs-leap-verification-warning",
    "sectionId": "findhorn-randolphs-leap",
    "kind": "hazard",
    "location": [
      57.563,
      -3.619
    ],
    "title": "Local verification needed",
    "subtitle": "seed data · caution",
    "summary": "This river is included as a known paddling candidate, but RiverLaunch.app needs contributor updates for current hazards, trees, access, and level guidance.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.aboynecanoeclub.co.uk/kayak-canoe-polo-sup/whitewater-kayaking/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "findhorn-randolphs-leap-verification-warning",
      "hazardType": "seed data",
      "severity": "caution",
      "sourceStatus": "needs-confirmation",
      "lastConfirmed": "Unverified seed",
      "what3wordsAddress": "tastings.products.lung"
    }
  },
  {
    "id": "findhorn-randolphs-leap:findhorn-randolphs-leap-known-for",
    "sectionId": "findhorn-randolphs-leap",
    "kind": "feature",
    "location": [
      57.552,
      -3.631
    ],
    "title": "Highland whitewater",
    "subtitle": "river character",
    "summary": "Prototype feature note to show why this river belongs in the UK kayaking discovery catalogue.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.aboynecanoeclub.co.uk/kayak-canoe-polo-sup/whitewater-kayaking/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "findhorn-randolphs-leap-known-for",
      "featureType": "river character",
      "what3wordsAddress": "scope.triathlon.submerged"
    }
  },
  {
    "id": "orchy-middle:orchy-middle-level-check",
    "sectionId": "orchy-middle",
    "kind": "gauge",
    "location": [
      56.497,
      -4.733
    ],
    "title": "Orchy level check",
    "subtitle": "Gauge",
    "summary": "Check live level. Trend: steady. Observed Demo seed.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://delkayaks.co.uk/2024/01/28/5-of-my-favourite-white-water-rivers-to-paddle-in-scotland/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "orchy-middle-level-check",
      "value": "Check live level",
      "trend": "steady",
      "observedAt": "Demo seed",
      "what3wordsAddress": "glory.advancing.salsa"
    }
  },
  {
    "id": "orchy-middle:orchy-middle-put-in",
    "sectionId": "orchy-middle",
    "kind": "access",
    "location": [
      56.516,
      -4.768
    ],
    "title": "Candidate put-in",
    "subtitle": "Access · put-in",
    "summary": "Seed access point for demo discovery. Confirm access rights, parking, and local restrictions before paddling.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://delkayaks.co.uk/2024/01/28/5-of-my-favourite-white-water-rivers-to-paddle-in-scotland/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "orchy-middle-put-in",
      "accessType": "put-in",
      "what3wordsAddress": "vessel.blanket.prepared"
    }
  },
  {
    "id": "orchy-middle:orchy-middle-take-out",
    "sectionId": "orchy-middle",
    "kind": "access",
    "location": [
      56.488,
      -4.72
    ],
    "title": "Candidate take-out",
    "subtitle": "Access · take-out",
    "summary": "Seed take-out point for demo discovery. Replace with verified local access detail.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://delkayaks.co.uk/2024/01/28/5-of-my-favourite-white-water-rivers-to-paddle-in-scotland/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "orchy-middle-take-out",
      "accessType": "take-out",
      "what3wordsAddress": "frowns.imprints.hatter"
    }
  },
  {
    "id": "orchy-middle:orchy-middle-verification-warning",
    "sectionId": "orchy-middle",
    "kind": "hazard",
    "location": [
      56.497,
      -4.733
    ],
    "title": "Local verification needed",
    "subtitle": "seed data · caution",
    "summary": "This river is included as a known paddling candidate, but RiverLaunch.app needs contributor updates for current hazards, trees, access, and level guidance.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://delkayaks.co.uk/2024/01/28/5-of-my-favourite-white-water-rivers-to-paddle-in-scotland/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "orchy-middle-verification-warning",
      "hazardType": "seed data",
      "severity": "caution",
      "sourceStatus": "needs-confirmation",
      "lastConfirmed": "Unverified seed",
      "what3wordsAddress": "glory.advancing.salsa"
    }
  },
  {
    "id": "orchy-middle:orchy-middle-known-for",
    "sectionId": "orchy-middle",
    "kind": "feature",
    "location": [
      56.506,
      -4.746
    ],
    "title": "Classic Scottish spate run",
    "subtitle": "river character",
    "summary": "Prototype feature note to show why this river belongs in the UK kayaking discovery catalogue.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://delkayaks.co.uk/2024/01/28/5-of-my-favourite-white-water-rivers-to-paddle-in-scotland/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "orchy-middle-known-for",
      "featureType": "river character",
      "what3wordsAddress": "transit.forgiving.spends"
    }
  },
  {
    "id": "etive-glen:etive-glen-level-check",
    "sectionId": "etive-glen",
    "kind": "gauge",
    "location": [
      56.588,
      -5.007
    ],
    "title": "Etive level check",
    "subtitle": "Gauge",
    "summary": "Check live level. Trend: steady. Observed Demo seed.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://roamwest.co.uk/journal/roam-west-white-water"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "etive-glen-level-check",
      "value": "Check live level",
      "trend": "steady",
      "observedAt": "Demo seed",
      "what3wordsAddress": "articulated.kilt.slid"
    }
  },
  {
    "id": "etive-glen:etive-glen-put-in",
    "sectionId": "etive-glen",
    "kind": "access",
    "location": [
      56.615,
      -5.013
    ],
    "title": "Candidate put-in",
    "subtitle": "Access · put-in",
    "summary": "Seed access point for demo discovery. Confirm access rights, parking, and local restrictions before paddling.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://roamwest.co.uk/journal/roam-west-white-water"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "etive-glen-put-in",
      "accessType": "put-in",
      "what3wordsAddress": "prune.plotted.urban"
    }
  },
  {
    "id": "etive-glen:etive-glen-take-out",
    "sectionId": "etive-glen",
    "kind": "access",
    "location": [
      56.573,
      -5.009
    ],
    "title": "Candidate take-out",
    "subtitle": "Access · take-out",
    "summary": "Seed take-out point for demo discovery. Replace with verified local access detail.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://roamwest.co.uk/journal/roam-west-white-water"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "etive-glen-take-out",
      "accessType": "take-out",
      "what3wordsAddress": "marmalade.year.candidate"
    }
  },
  {
    "id": "etive-glen:etive-glen-verification-warning",
    "sectionId": "etive-glen",
    "kind": "hazard",
    "location": [
      56.588,
      -5.007
    ],
    "title": "Local verification needed",
    "subtitle": "seed data · caution",
    "summary": "This river is included as a known paddling candidate, but RiverLaunch.app needs contributor updates for current hazards, trees, access, and level guidance.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://roamwest.co.uk/journal/roam-west-white-water"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "etive-glen-verification-warning",
      "hazardType": "seed data",
      "severity": "caution",
      "sourceStatus": "needs-confirmation",
      "lastConfirmed": "Unverified seed",
      "what3wordsAddress": "articulated.kilt.slid"
    }
  },
  {
    "id": "etive-glen:etive-glen-known-for",
    "sectionId": "etive-glen",
    "kind": "feature",
    "location": [
      56.602,
      -5.009
    ],
    "title": "Glen Etive steep whitewater",
    "subtitle": "river character",
    "summary": "Prototype feature note to show why this river belongs in the UK kayaking discovery catalogue.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://roamwest.co.uk/journal/roam-west-white-water"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "etive-glen-known-for",
      "featureType": "river character",
      "what3wordsAddress": "undertook.craft.hourglass"
    }
  },
  {
    "id": "moriston-classic:moriston-classic-level-check",
    "sectionId": "moriston-classic",
    "kind": "gauge",
    "location": [
      57.201,
      -4.598
    ],
    "title": "Moriston level check",
    "subtitle": "Gauge",
    "summary": "Check live level. Trend: steady. Observed Demo seed.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.aboynecanoeclub.co.uk/kayak-canoe-polo-sup/whitewater-kayaking/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "moriston-classic-level-check",
      "value": "Check live level",
      "trend": "steady",
      "observedAt": "Demo seed",
      "what3wordsAddress": "fish.plodding.retina"
    }
  },
  {
    "id": "moriston-classic:moriston-classic-put-in",
    "sectionId": "moriston-classic",
    "kind": "access",
    "location": [
      57.215,
      -4.651
    ],
    "title": "Candidate put-in",
    "subtitle": "Access · put-in",
    "summary": "Seed access point for demo discovery. Confirm access rights, parking, and local restrictions before paddling.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.aboynecanoeclub.co.uk/kayak-canoe-polo-sup/whitewater-kayaking/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "moriston-classic-put-in",
      "accessType": "put-in",
      "what3wordsAddress": "exit.nearly.pursue"
    }
  },
  {
    "id": "moriston-classic:moriston-classic-take-out",
    "sectionId": "moriston-classic",
    "kind": "access",
    "location": [
      57.194,
      -4.585
    ],
    "title": "Candidate take-out",
    "subtitle": "Access · take-out",
    "summary": "Seed take-out point for demo discovery. Replace with verified local access detail.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.aboynecanoeclub.co.uk/kayak-canoe-polo-sup/whitewater-kayaking/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "moriston-classic-take-out",
      "accessType": "take-out",
      "what3wordsAddress": "zebra.erupt.perch"
    }
  },
  {
    "id": "moriston-classic:moriston-classic-verification-warning",
    "sectionId": "moriston-classic",
    "kind": "hazard",
    "location": [
      57.201,
      -4.598
    ],
    "title": "Local verification needed",
    "subtitle": "seed data · caution",
    "summary": "This river is included as a known paddling candidate, but RiverLaunch.app needs contributor updates for current hazards, trees, access, and level guidance.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.aboynecanoeclub.co.uk/kayak-canoe-polo-sup/whitewater-kayaking/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "moriston-classic-verification-warning",
      "hazardType": "seed data",
      "severity": "caution",
      "sourceStatus": "needs-confirmation",
      "lastConfirmed": "Unverified seed",
      "what3wordsAddress": "fish.plodding.retina"
    }
  },
  {
    "id": "moriston-classic:moriston-classic-known-for",
    "sectionId": "moriston-classic",
    "kind": "feature",
    "location": [
      57.208,
      -4.616
    ],
    "title": "Scottish dam-influenced whitewater",
    "subtitle": "river character",
    "summary": "Prototype feature note to show why this river belongs in the UK kayaking discovery catalogue.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.aboynecanoeclub.co.uk/kayak-canoe-polo-sup/whitewater-kayaking/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "moriston-classic-known-for",
      "featureType": "river character",
      "what3wordsAddress": "grapevine.subway.publisher"
    }
  },
  {
    "id": "garry-killiecrankie:garry-killiecrankie-level-check",
    "sectionId": "garry-killiecrankie",
    "kind": "gauge",
    "location": [
      56.71,
      -3.982
    ],
    "title": "Garry level check",
    "subtitle": "Gauge",
    "summary": "Check live level. Trend: steady. Observed Demo seed.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.aboynecanoeclub.co.uk/kayak-canoe-polo-sup/whitewater-kayaking/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "garry-killiecrankie-level-check",
      "value": "Check live level",
      "trend": "steady",
      "observedAt": "Demo seed",
      "what3wordsAddress": "archive.nourished.lock"
    }
  },
  {
    "id": "garry-killiecrankie:garry-killiecrankie-put-in",
    "sectionId": "garry-killiecrankie",
    "kind": "access",
    "location": [
      56.721,
      -4.024
    ],
    "title": "Candidate put-in",
    "subtitle": "Access · put-in",
    "summary": "Seed access point for demo discovery. Confirm access rights, parking, and local restrictions before paddling.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.aboynecanoeclub.co.uk/kayak-canoe-polo-sup/whitewater-kayaking/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "garry-killiecrankie-put-in",
      "accessType": "put-in",
      "what3wordsAddress": "allergy.answer.stickler"
    }
  },
  {
    "id": "garry-killiecrankie:garry-killiecrankie-take-out",
    "sectionId": "garry-killiecrankie",
    "kind": "access",
    "location": [
      56.704,
      -3.97
    ],
    "title": "Candidate take-out",
    "subtitle": "Access · take-out",
    "summary": "Seed take-out point for demo discovery. Replace with verified local access detail.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.aboynecanoeclub.co.uk/kayak-canoe-polo-sup/whitewater-kayaking/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "garry-killiecrankie-take-out",
      "accessType": "take-out",
      "what3wordsAddress": "quite.relating.inclines"
    }
  },
  {
    "id": "garry-killiecrankie:garry-killiecrankie-verification-warning",
    "sectionId": "garry-killiecrankie",
    "kind": "hazard",
    "location": [
      56.71,
      -3.982
    ],
    "title": "Local verification needed",
    "subtitle": "seed data · caution",
    "summary": "This river is included as a known paddling candidate, but RiverLaunch.app needs contributor updates for current hazards, trees, access, and level guidance.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.aboynecanoeclub.co.uk/kayak-canoe-polo-sup/whitewater-kayaking/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "garry-killiecrankie-verification-warning",
      "hazardType": "seed data",
      "severity": "caution",
      "sourceStatus": "needs-confirmation",
      "lastConfirmed": "Unverified seed",
      "what3wordsAddress": "archive.nourished.lock"
    }
  },
  {
    "id": "garry-killiecrankie:garry-killiecrankie-known-for",
    "sectionId": "garry-killiecrankie",
    "kind": "feature",
    "location": [
      56.716,
      -3.997
    ],
    "title": "Scottish release whitewater",
    "subtitle": "river character",
    "summary": "Prototype feature note to show why this river belongs in the UK kayaking discovery catalogue.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.aboynecanoeclub.co.uk/kayak-canoe-polo-sup/whitewater-kayaking/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "garry-killiecrankie-known-for",
      "featureType": "river character",
      "what3wordsAddress": "lanes.clincher.uncouth"
    }
  },
  {
    "id": "tummel-pitlochry:tummel-pitlochry-level-check",
    "sectionId": "tummel-pitlochry",
    "kind": "gauge",
    "location": [
      56.705,
      -3.721
    ],
    "title": "Tummel level check",
    "subtitle": "Gauge",
    "summary": "Check live level. Trend: steady. Observed Demo seed.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.aboynecanoeclub.co.uk/kayak-canoe-polo-sup/whitewater-kayaking/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "tummel-pitlochry-level-check",
      "value": "Check live level",
      "trend": "steady",
      "observedAt": "Demo seed",
      "what3wordsAddress": "reward.reliving.gravy"
    }
  },
  {
    "id": "tummel-pitlochry:tummel-pitlochry-put-in",
    "sectionId": "tummel-pitlochry",
    "kind": "access",
    "location": [
      56.704,
      -3.768
    ],
    "title": "Candidate put-in",
    "subtitle": "Access · put-in",
    "summary": "Seed access point for demo discovery. Confirm access rights, parking, and local restrictions before paddling.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.aboynecanoeclub.co.uk/kayak-canoe-polo-sup/whitewater-kayaking/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "tummel-pitlochry-put-in",
      "accessType": "put-in",
      "what3wordsAddress": "constrain.towels.sideburns"
    }
  },
  {
    "id": "tummel-pitlochry:tummel-pitlochry-take-out",
    "sectionId": "tummel-pitlochry",
    "kind": "access",
    "location": [
      56.703,
      -3.707
    ],
    "title": "Candidate take-out",
    "subtitle": "Access · take-out",
    "summary": "Seed take-out point for demo discovery. Replace with verified local access detail.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.aboynecanoeclub.co.uk/kayak-canoe-polo-sup/whitewater-kayaking/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "tummel-pitlochry-take-out",
      "accessType": "take-out",
      "what3wordsAddress": "passport.acrobatic.handover"
    }
  },
  {
    "id": "tummel-pitlochry:tummel-pitlochry-verification-warning",
    "sectionId": "tummel-pitlochry",
    "kind": "hazard",
    "location": [
      56.705,
      -3.721
    ],
    "title": "Local verification needed",
    "subtitle": "seed data · caution",
    "summary": "This river is included as a known paddling candidate, but RiverLaunch.app needs contributor updates for current hazards, trees, access, and level guidance.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.aboynecanoeclub.co.uk/kayak-canoe-polo-sup/whitewater-kayaking/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "tummel-pitlochry-verification-warning",
      "hazardType": "seed data",
      "severity": "caution",
      "sourceStatus": "needs-confirmation",
      "lastConfirmed": "Unverified seed",
      "what3wordsAddress": "reward.reliving.gravy"
    }
  },
  {
    "id": "tummel-pitlochry:tummel-pitlochry-known-for",
    "sectionId": "tummel-pitlochry",
    "kind": "feature",
    "location": [
      56.706,
      -3.739
    ],
    "title": "Club whitewater trips",
    "subtitle": "river character",
    "summary": "Prototype feature note to show why this river belongs in the UK kayaking discovery catalogue.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.aboynecanoeclub.co.uk/kayak-canoe-polo-sup/whitewater-kayaking/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "tummel-pitlochry-known-for",
      "featureType": "river character",
      "what3wordsAddress": "accordion.yard.without"
    }
  },
  {
    "id": "tees-abbey-rapids:tees-abbey-rapids-level-check",
    "sectionId": "tees-abbey-rapids",
    "kind": "gauge",
    "location": [
      54.538,
      -1.901
    ],
    "title": "Tees level check",
    "subtitle": "Gauge",
    "summary": "Check live level. Trend: steady. Observed Demo seed.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.britishcanoeing.org.uk/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "tees-abbey-rapids-level-check",
      "value": "Check live level",
      "trend": "steady",
      "observedAt": "Demo seed",
      "what3wordsAddress": "bluffs.speeches.dummy"
    }
  },
  {
    "id": "tees-abbey-rapids:tees-abbey-rapids-put-in",
    "sectionId": "tees-abbey-rapids",
    "kind": "access",
    "location": [
      54.545,
      -1.925
    ],
    "title": "Candidate put-in",
    "subtitle": "Access · put-in",
    "summary": "Seed access point for demo discovery. Confirm access rights, parking, and local restrictions before paddling.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.britishcanoeing.org.uk/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "tees-abbey-rapids-put-in",
      "accessType": "put-in",
      "what3wordsAddress": "signed.broad.refrained"
    }
  },
  {
    "id": "tees-abbey-rapids:tees-abbey-rapids-take-out",
    "sectionId": "tees-abbey-rapids",
    "kind": "access",
    "location": [
      54.535,
      -1.895
    ],
    "title": "Candidate take-out",
    "subtitle": "Access · take-out",
    "summary": "Seed take-out point for demo discovery. Replace with verified local access detail.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.britishcanoeing.org.uk/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "tees-abbey-rapids-take-out",
      "accessType": "take-out",
      "what3wordsAddress": "grain.filed.reception"
    }
  },
  {
    "id": "tees-abbey-rapids:tees-abbey-rapids-verification-warning",
    "sectionId": "tees-abbey-rapids",
    "kind": "hazard",
    "location": [
      54.538,
      -1.901
    ],
    "title": "Local verification needed",
    "subtitle": "seed data · caution",
    "summary": "This river is included as a known paddling candidate, but RiverLaunch.app needs contributor updates for current hazards, trees, access, and level guidance.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.britishcanoeing.org.uk/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "tees-abbey-rapids-verification-warning",
      "hazardType": "seed data",
      "severity": "caution",
      "sourceStatus": "needs-confirmation",
      "lastConfirmed": "Unverified seed",
      "what3wordsAddress": "bluffs.speeches.dummy"
    }
  },
  {
    "id": "tees-abbey-rapids:tees-abbey-rapids-known-for",
    "sectionId": "tees-abbey-rapids",
    "kind": "feature",
    "location": [
      54.542,
      -1.908
    ],
    "title": "Northern England whitewater",
    "subtitle": "river character",
    "summary": "Prototype feature note to show why this river belongs in the UK kayaking discovery catalogue.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.britishcanoeing.org.uk/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "tees-abbey-rapids-known-for",
      "featureType": "river character",
      "what3wordsAddress": "yield.eagle.pheasants"
    }
  },
  {
    "id": "bure-broads:bure-broads-level-check",
    "sectionId": "bure-broads",
    "kind": "gauge",
    "location": [
      52.713,
      1.516
    ],
    "title": "Broads conditions check",
    "subtitle": "Gauge",
    "summary": "Check live level. Trend: steady. Observed Demo seed.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.norfolkbroads.com/story/canoeing-on-the-broads-1147/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "bure-broads-level-check",
      "value": "Check live level",
      "trend": "steady",
      "observedAt": "Demo seed",
      "what3wordsAddress": "scrubber.radar.steady"
    }
  },
  {
    "id": "bure-broads:bure-broads-put-in",
    "sectionId": "bure-broads",
    "kind": "access",
    "location": [
      52.704,
      1.463
    ],
    "title": "Candidate put-in",
    "subtitle": "Access · put-in",
    "summary": "Seed access point for demo discovery. Confirm access rights, parking, and local restrictions before paddling.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.norfolkbroads.com/story/canoeing-on-the-broads-1147/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "bure-broads-put-in",
      "accessType": "put-in",
      "what3wordsAddress": "fewer.inkjet.parading"
    }
  },
  {
    "id": "bure-broads:bure-broads-take-out",
    "sectionId": "bure-broads",
    "kind": "access",
    "location": [
      52.707,
      1.536
    ],
    "title": "Candidate take-out",
    "subtitle": "Access · take-out",
    "summary": "Seed take-out point for demo discovery. Replace with verified local access detail.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.norfolkbroads.com/story/canoeing-on-the-broads-1147/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "bure-broads-take-out",
      "accessType": "take-out",
      "what3wordsAddress": "nylon.radiated.manliness"
    }
  },
  {
    "id": "bure-broads:bure-broads-verification-warning",
    "sectionId": "bure-broads",
    "kind": "hazard",
    "location": [
      52.713,
      1.516
    ],
    "title": "Local verification needed",
    "subtitle": "seed data · caution",
    "summary": "This river is included as a known paddling candidate, but RiverLaunch.app needs contributor updates for current hazards, trees, access, and level guidance.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.norfolkbroads.com/story/canoeing-on-the-broads-1147/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "bure-broads-verification-warning",
      "hazardType": "seed data",
      "severity": "caution",
      "sourceStatus": "needs-confirmation",
      "lastConfirmed": "Unverified seed",
      "what3wordsAddress": "scrubber.radar.steady"
    }
  },
  {
    "id": "bure-broads:bure-broads-known-for",
    "sectionId": "bure-broads",
    "kind": "feature",
    "location": [
      52.714,
      1.493
    ],
    "title": "Accessible canoe touring",
    "subtitle": "river character",
    "summary": "Prototype feature note to show why this river belongs in the UK kayaking discovery catalogue.",
    "source": {
      "kind": "seed",
      "label": "RiverLaunch.app UK kayaking sample catalogue",
      "confidence": "low",
      "updatedAt": "2026-05-23",
      "url": "https://www.norfolkbroads.com/story/canoeing-on-the-broads-1147/"
    },
    "verificationStatus": "needs-confirmation",
    "payload": {
      "sourceId": "bure-broads-known-for",
      "featureType": "river character",
      "what3wordsAddress": "hormones.geek.elbowing"
    }
  }
];
