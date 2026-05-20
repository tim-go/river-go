export type LatLngTuple = [number, number];

export type LevelBand = "too-low" | "good" | "high" | "unknown";

export type AccessType = "put-in" | "take-out" | "portage" | "parking";

export type HazardSeverity = "info" | "caution" | "significant" | "serious";

export type ContributionType = "hazard" | "report" | "photo" | "feature";

export interface Gauge {
  id: string;
  name: string;
  location: LatLngTuple;
  value: string;
  trend: "rising" | "falling" | "steady";
  observedAt: string;
}

export interface AccessPoint {
  id: string;
  type: AccessType;
  name: string;
  location: LatLngTuple;
  notes: string;
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
}

export interface Feature {
  id: string;
  title: string;
  type: string;
  location: LatLngTuple;
  description: string;
}

export interface Photo {
  id: string;
  title: string;
  url: string;
  caption: string;
  dateTaken: string;
}

export interface ConditionReport {
  id: string;
  author: string;
  dateObserved: string;
  type: string;
  text: string;
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
}

export interface Contribution {
  id: string;
  sectionId: string;
  type: ContributionType;
  title: string;
  detail: string;
  category: string;
  severity?: HazardSeverity;
  createdAt: string;
  location?: LatLngTuple;
}
