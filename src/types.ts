export type LatLngTuple = [number, number];

export type LiveLocationSnapshot = {
  location: LatLngTuple;
  accuracyMeters: number | null;
  updatedAt: number;
};

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
  | "reported"
  | "pending"
  | "needs-confirmation"
  | "confirmed"
  | "challenged"
  | "hidden"
  | "rejected"
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

export type MapPoiKind = "access" | "hazard" | "feature" | "gauge";

export type MapPoiVerificationStatus =
  | "needs-confirmation"
  | "confirmed"
  | "needs-correction"
  | "resolved";

export interface MapPoi {
  id: string;
  sectionId: string;
  kind: MapPoiKind;
  title: string;
  subtitle: string;
  summary: string;
  location: LatLngTuple;
  source?: SourceMetadata;
  verificationStatus: MapPoiVerificationStatus;
  confirmations: number;
  corrections: number;
  viewerReview?: {
    confirmed: boolean;
    suggestedCorrection: boolean;
    correctionNote?: string | null;
  };
  payload: Record<string, unknown>;
  revision?: number;
  updatedAt?: string;
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
  what3words?: string;
  serverRevision?: number;
  photos?: ContributionPhoto[];
}

export interface ContributionPhoto {
  id: string;
  caption: string;
  storagePath: string;
  displayPath: string;
  thumbnailPath: string;
  displayUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  thumbnailWidth: number;
  thumbnailHeight: number;
  sizeBytes: number;
  thumbnailSizeBytes: number;
  mimeType: string;
  originalName?: string;
}

export type ContributionSyncStatus =
  | "draft"
  | "queued"
  | "syncing"
  | "synced"
  | "failed";

export interface ContributionSyncOperation {
  operationId: string;
  operationType: "contribution.create";
  entityType: "contribution";
  entityId: string;
  createdAt: string;
  baseRevision: number | null;
  payload: {
    id: string;
    type: ContributionType;
    sectionId: string;
    geometry?: {
      type: "Point";
      coordinates: [number, number];
    };
    observedAt: string;
    payload: Record<string, unknown>;
    client: {
      deviceId: string;
      createdOffline: boolean;
      appVersion: string;
    };
  };
}

export interface ContributionOutboxRecord {
  id: string;
  contribution: Contribution;
  operation: ContributionSyncOperation;
  syncStatus: ContributionSyncStatus;
  createdAt: string;
  updatedAt: string;
  lastSyncError?: string;
  serverRevision?: number;
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
