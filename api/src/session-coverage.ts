// Advisory kit/skills coverage for a group session (GROUP-F7).
//
// This is ADVISORY ONLY. It reports whether the prospective group has recorded
// certain kit/skills — it must never tell a group it is "safe". Participants
// and leaders remain responsible for their own decisions. Coverage is computed
// from aggregate counts only; individual kit/skill detail is not exposed.

export type CoverageKind = "kit" | "skill";

export interface CoverageCheck {
  key: string;
  label: string;
  kind: CoverageKind;
  count: number;
  present: boolean;
}

interface CoverageDefinition {
  key: string;
  label: string;
  kind: CoverageKind;
  keywords: string[];
}

// Keyword-matched against the lowercased "category name" of each kit item /
// skill, because those fields are free text.
const COVERAGE_DEFINITIONS: CoverageDefinition[] = [
  {
    key: "first-aid-kit",
    label: "First aid kit",
    kind: "kit",
    keywords: ["first aid", "first-aid", "medical kit"],
  },
  {
    key: "throw-line",
    label: "Throw line",
    kind: "kit",
    keywords: ["throw line", "throw bag", "throwline", "throwbag", "throw-bag"],
  },
  {
    key: "spare-paddle",
    label: "Spare / split paddle",
    kind: "kit",
    keywords: ["spare paddle", "split paddle", "splits", "breakdown paddle"],
  },
  {
    key: "first-aid-training",
    label: "First aid training",
    kind: "skill",
    keywords: ["first aid", "first-aid", "rec first responder", "wfr", "feff"],
  },
  {
    key: "rescue-training",
    label: "Whitewater safety / rescue training",
    kind: "skill",
    keywords: [
      "rescue",
      "white water safety",
      "whitewater safety",
      "wwsr",
      "swiftwater",
      "swift water",
    ],
  },
];

export interface ParticipantCapabilities {
  memberId: string;
  /** Lowercased "category name" strings for the member's kit items. */
  kit: string[];
  /** Lowercased "category name" strings for the member's declared skills. */
  skills: string[];
}

/**
 * Count, per advisory check, how many participants have a recorded kit item or
 * skill that matches. Returns one CoverageCheck per definition.
 */
export function computeSessionCoverage(
  participants: ParticipantCapabilities[],
): CoverageCheck[] {
  return COVERAGE_DEFINITIONS.map((def) => {
    let count = 0;
    for (const participant of participants) {
      const haystack = def.kind === "kit" ? participant.kit : participant.skills;
      const matches = haystack.some((text) =>
        def.keywords.some((keyword) => text.includes(keyword)),
      );
      if (matches) {
        count += 1;
      }
    }
    return {
      key: def.key,
      label: def.label,
      kind: def.kind,
      count,
      present: count > 0,
    };
  });
}
