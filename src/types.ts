export type LatLngTuple = [number, number];

export type LevelBand = "too-low" | "good" | "high" | "unknown";

export type AccessType = "put-in" | "take-out" | "portage" | "parking";

export type HazardSeverity = "info" | "caution" | "significant" | "serious";

export type ContributionType =
  | "hazard"
  | "report"
  | "photo"
  | "feature"
  | "access";

export type ContributionStatus =
  | "active"
  | "needs-confirmation"
  | "confirmed"
  | "resolved";

export type SourceConfidence = "seed" | "low" | "medium" | "high";

export type SourceKind =
  | "seed"
  | "open-data"
  | "community"
  | "provider"
  | "derived";

export interface SourceMetadata {
  kind: SourceKind;
  label: string;
  confidence: SourceConfidence;
  updatedAt: string;
  notes: string;
  url?: string;
}

export interface Gauge {
  id: string;
  name: string;
  location: LatLngTuple;
  value: string;
  trend: "rising" | "falling" | "steady";
  observedAt: string;
  source?: SourceMetadata;
}

export interface AccessPoint {
  id: string;
  type: AccessType;
  name: string;
  location: LatLngTuple;
  notes: string;
  source?: SourceMetadata;
}

export interface Hazard {
  id: string;
  title: string;
  type: string;
  severity: HazardSeverity;
  status: "active" | "seasonal" | "needs-confirmation" | "resolved";
  location: LatLngTuple;
  lastConfirmed: string;
  description: string;
  source?: SourceMetadata;
}

export interface Feature {
  id: string;
  title: string;
  type: string;
  location: LatLngTuple;
  description: string;
  source?: SourceMetadata;
}

export interface Photo {
  id: string;
  title: string;
  url: string;
  caption: string;
  dateTaken: string;
  source?: SourceMetadata;
}

export interface ConditionReport {
  id: string;
  author: string;
  dateObserved: string;
  type: string;
  text: string;
  source?: SourceMetadata;
}

export interface RiverSection {
  id: string;
  riverName: string;
  sectionName: string;
  summary: string;
  centre: LatLngTuple;
  route: LatLngTuple[];
  distanceKm: number;
  estimatedTime: string;
  difficulty: string;
  suitability: string[];
  levelBand: LevelBand;
  levelLabel: string;
  runnableGuidance: string;
  accessSummary: string;
  gauge: Gauge;
  accessPoints: AccessPoint[];
  hazards: Hazard[];
  features: Feature[];
  photos: Photo[];
  reports: ConditionReport[];
  source?: SourceMetadata;
}

export interface Contribution {
  id: string;
  sectionId: string;
  type: ContributionType;
  title: string;
  detail: string;
  category: string;
  severity?: HazardSeverity;
  status: ContributionStatus;
  author: string;
  dateObserved: string;
  craftType?: string;
  confirmations: number;
  lastConfirmed?: string;
  createdAt: string;
  location?: LatLngTuple;
}

export interface HazardReview {
  status: ContributionStatus;
  confirmations: number;
  lastConfirmed: string;
}

export interface LiveGaugeReading {
  sectionId: string;
  gauge: {
    provider: "environment-agency";
    providerStationId: string;
    providerMeasureId: string;
    name: string;
    latestValue: number | null;
    unit: string;
    trend: "rising" | "falling" | "steady" | "unknown";
    observedAt: string | null;
    sourceUrl: string;
  };
  interpretation: {
    band: LevelBand;
    confidence: string;
  };
  state: "live" | "fallback" | "unmapped" | "error";
  message: string;
}
