export type LatLngTuple = [number, number];

export type LiveLocationSnapshot = {
  location: LatLngTuple;
  accuracyMeters: number | null;
  updatedAt: number;
};

export type MarkerClickMode = "info" | "detail";

export type SyncBannerDismissal = {
  queuedOutboxCount: number;
  failedOutboxCount: number;
  expiresAt: number;
};

export type AppSection =
  | "map"
  | "discover"
  | "dashboard"
  | "groups"
  | "profile"
  | "more"
  | "about"
  | "admin";

export type AppNotificationTone = "success" | "info" | "error";

export type AppNotification = {
  id: number;
  message: string;
  tone: AppNotificationTone;
};

export type PhotoLightboxItem = {
  src: string;
  title: string;
  caption?: string;
  alt?: string;
};

export type AuthSheetMode = "welcome" | "signin" | "save-required";

export type PoiDetailsTab = "details" | "location" | "verification" | "photos";

export interface SelectedPoi {
  id: string;
  kind: MapPoiKind | "contribution";
  title: string;
  subtitle: string;
  summary: string;
  sectionLabel: string;
  location: LatLngTuple;
  status?: string;
  sourceLabel?: string;
  sourceConfidence?: string;
  navigationLocation?: LatLngTuple;
  what3words?: string;
  syncStatus?: ContributionSyncStatus;
  photos?: ContributionPhoto[];
  category?: string;
  author?: string;
  dateObserved?: string;
  createdAt?: string;
  contributionType?: ContributionType;
  mapPoi?: MapPoi;
}

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
  | "pending"
  | "approved"
  | "spam"
  | "inaccurate"
  | "duplicate"
  | "inappropriate"
  | "withdrawn";

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
  mapPoiId?: string | null;
  type: ContributionType;
  title: string;
  detail: string;
  category: string;
  severity?: HazardSeverity;
  status: ContributionStatus;
  visibility?: "published" | "removed";
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
    mapPoiId?: string | null;
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

export interface PaddleLog {
  id: string;
  riverId: string | null;
  sectionId: string | null;
  venue: string | null;
  title: string;
  paddledOn: string;
  levelNote: string | null;
  craftType: string | null;
  companions: string | null;
  notes: string | null;
  visibility: "private" | "friends" | "public";
  createdAt: string;
  updatedAt: string;
}

export interface PaddleStats {
  totalPaddles: number;
  distinctRivers: number;
  thisYearPaddles: number;
  thisYearNewRivers: number;
  nations: number;
  mostPaddled: { riverId: string | null; title: string; count: number } | null;
}

export interface KitItem {
  id: string;
  category: string;
  name: string;
  notes: string | null;
  purchasedOn: string | null;
  replaceOn: string | null;
  serial: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MemberSkill {
  id: string;
  category: string;
  name: string;
  detail: string | null;
  attainedOn: string | null;
  expiresOn: string | null;
  selfDeclared: boolean;
  createdAt: string;
  updatedAt: string;
}

// --- Group Paddle Sessions ---

export type GroupKind = "club" | "subgroup" | "friends" | "trip";
export type GroupVisibility = "private" | "members" | "public";
export type GroupRole = "owner" | "organiser" | "leader" | "member" | "guest";
export type GroupMemberStatus = "invited" | "active" | "left";
export type GroupDiscipline = "whitewater" | "touring" | "both";
export type SessionStatus = "planned" | "active" | "completed" | "cancelled";
export type Rsvp = "invited" | "yes" | "no" | "maybe";

export interface Group {
  id: string;
  name: string;
  kind: GroupKind;
  parentGroupId: string | null;
  description: string | null;
  discipline: GroupDiscipline | null;
  visibility: GroupVisibility;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  myRole: GroupRole | null;
  myStatus: GroupMemberStatus | null;
}

export interface GroupMember {
  id: string;
  memberId: string;
  publicName: string;
  role: GroupRole;
  status: GroupMemberStatus;
  joinedAt: string;
}

export interface GroupDetail extends Group {
  members: GroupMember[];
}

export interface InvitableMember {
  id: string;
  publicName: string;
}

export interface GroupSession {
  id: string;
  groupId: string;
  groupName: string | null;
  title: string;
  riverId: string | null;
  sectionId: string | null;
  venue: string | null;
  scheduledFor: string | null;
  meetingPoint: string | null;
  meetingAt: string | null;
  notes: string | null;
  organiserId: string;
  status: SessionStatus;
  startedAt: string | null;
  endedAt: string | null;
  outcomeNotes: string | null;
  outcomeLevelNote: string | null;
  createdAt: string;
  updatedAt: string;
  participantCount: number;
  myRsvp: Rsvp | null;
  myCheckedIn: boolean;
  myIceConsent: boolean;
}

export interface SessionParticipant {
  id: string;
  memberId: string;
  publicName: string;
  rsvp: Rsvp;
  availabilityNote: string | null;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  checkedInBy: string | null;
  iceConsent: boolean;
  ice: {
    name: string | null;
    phone: string | null;
    relationship: string | null;
  } | null;
}

export interface SessionCoverageCheck {
  key: string;
  label: string;
  kind: "kit" | "skill";
  count: number;
  present: boolean;
}

export interface SessionDetail extends GroupSession {
  myGroupRole: GroupRole | null;
  participants: SessionParticipant[];
  advisory: SessionCoverageCheck[];
  iceVisible: boolean;
}
