import { useEffect, useState } from "react";
import {
  Camera,
  CheckCircle2,
  Copy,
  Flag,
  Map as MapIcon,
  MapPinned,
  MessageSquare,
  Navigation,
  Plus,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { DetailPanel } from "./DetailPanel";
import type {
  Contribution,
  MapPoi,
  PhotoLightboxItem,
  PoiDetailsTab,
  SelectedPoi,
} from "../types";
import type { ModerationDecision } from "../services/contributionApi";
import type { MapPoiReviewDecision } from "../services/mapPoiApi";
import {
  fetchWhat3WordsAddress,
  formatWhat3Words,
  googleMapsDirectionsUrl,
  googleMapsSearchUrl,
} from "../services/locationReferences";
import { formatLocation } from "../lib/format";
import {
  confirmationSummary,
  contributionStatusLabel,
  verificationStatusLabel,
  moderationActions,
  syncStatusLabel,
} from "../lib/contributionLabels";

const poiDetailsTabs: Array<{ id: PoiDetailsTab; label: string }> = [
  { id: "details", label: "Details" },
  { id: "location", label: "Location" },
  { id: "verification", label: "Verify" },
  { id: "photos", label: "Photos" },
];

const mapPoiStatusActions: Array<{
  status: MapPoi["verificationStatus"];
  label: string;
}> = [
  { status: "confirmed", label: "Mark confirmed" },
  { status: "needs-confirmation", label: "Needs confirmation" },
  { status: "needs-correction", label: "Needs correction" },
  { status: "resolved", label: "Mark resolved" },
];

export function PoiDetailPanel({
  poi,
  isExpanded,
  onToggleExpanded,
  onClose,
  onAddPhoto,
  onAddUpdate,
  linkedContributions,
  onOpenPhoto,
  onReviewMapPoi,
  onUpdateMapPoiStatus,
  onUpdateContributionStatus,
  reviewMessage,
  isReviewSaving,
  isStatusSaving,
  canManagePoiStatus,
}: {
  poi: SelectedPoi;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onClose: () => void;
  onAddPhoto: () => void;
  onAddUpdate: () => void;
  linkedContributions: Contribution[];
  onOpenPhoto: (photo: PhotoLightboxItem) => void;
  onReviewMapPoi: (
    poi: MapPoi,
    decision: MapPoiReviewDecision,
    action?: "add" | "remove",
    note?: string,
  ) => void;
  onUpdateMapPoiStatus: (
    poi: MapPoi,
    status: MapPoi["verificationStatus"],
  ) => void;
  onUpdateContributionStatus: (
    poi: SelectedPoi,
    decision: ModerationDecision,
  ) => void;
  reviewMessage: string;
  isReviewSaving: boolean;
  isStatusSaving: boolean;
  canManagePoiStatus: boolean;
}) {
  const [what3wordsAddress, setWhat3WordsAddress] = useState(
    poi.what3words ?? "",
  );
  const [isWhat3WordsLoading, setIsWhat3WordsLoading] = useState(false);
  const [what3wordsUnavailable, setWhat3WordsUnavailable] = useState(false);
  const [copiedLocationLabel, setCopiedLocationLabel] = useState("");
  const [isCorrectionFormOpen, setIsCorrectionFormOpen] = useState(false);
  const [correctionNote, setCorrectionNote] = useState("");
  const [adminMapPoiStatus, setAdminMapPoiStatus] =
    useState<MapPoi["verificationStatus"]>("confirmed");
  const [adminContributionDecision, setAdminContributionDecision] =
    useState<ModerationDecision>("approve");
  const [activePoiDetailsTab, setActivePoiDetailsTab] =
    useState<PoiDetailsTab>("details");

  function resetWhat3WordsState() {
    setCopiedLocationLabel("");
    setWhat3WordsAddress(poi.what3words ?? "");
    setWhat3WordsUnavailable(false);
    setIsWhat3WordsLoading(false);
  }

  useEffect(() => {
    resetWhat3WordsState();
    setIsCorrectionFormOpen(false);
    setCorrectionNote(poi.mapPoi?.viewerReview?.correctionNote ?? "");
    setAdminMapPoiStatus(poi.mapPoi?.verificationStatus ?? "confirmed");
    setAdminContributionDecision("approve");
    setActivePoiDetailsTab("details");
  }, [poi.id, poi.location, poi.what3words]);

  async function loadWhat3WordsAddress() {
    setIsWhat3WordsLoading(true);
    setWhat3WordsUnavailable(false);

    try {
      const result = await fetchWhat3WordsAddress(poi.location);
      setWhat3WordsUnavailable(!result.configured || !result.words);
      setWhat3WordsAddress(result.words ?? "");
    } catch {
      setWhat3WordsUnavailable(true);
    } finally {
      setIsWhat3WordsLoading(false);
    }
  }

  function retryWhat3WordsAddress() {
    setCopiedLocationLabel("");
    void loadWhat3WordsAddress();
  }

  async function copyLocationText(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedLocationLabel(`${label} copied`);
    } catch {
      setCopiedLocationLabel("Could not copy");
    }
  }

  const coordinateText = formatLocation(poi.location);
  const formattedWhat3Words = what3wordsAddress
    ? formatWhat3Words(what3wordsAddress)
    : "";
  const viewerCorrectionNote =
    poi.mapPoi?.viewerReview?.correctionNote?.trim() ?? "";
  const linkedPhotos = linkedContributions.flatMap(
    (contribution) => contribution.photos ?? [],
  );
  const poiPhotos = [...(poi.photos ?? []), ...linkedPhotos];
  const visiblePoiDetailsTabs = poiDetailsTabs.filter(
    (tab) => tab.id !== "verification" || poi.mapPoi || poi.kind === "contribution",
  );

  return (
    <DetailPanel
      ariaLabel="Point of interest details"
      className="detail-panel--poi"
      eyebrow={poi.kind}
      title={poi.title}
      subtitle={poi.subtitle}
      badges={
        poi.status ? (
          <span className={`status-chip status-chip--${poi.status}`}>
            {poi.status}
          </span>
        ) : undefined
      }
      expanded={isExpanded}
      onToggleExpand={onToggleExpanded}
      onClose={onClose}
    >
        <div
          className="segmented-control route-detail-tabs poi-detail-tabs"
          role="tablist"
          aria-label="Point details"
        >
          {visiblePoiDetailsTabs.map((tab) => (
            <button
              className={activePoiDetailsTab === tab.id ? "active" : ""}
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activePoiDetailsTab === tab.id}
              onClick={() => setActivePoiDetailsTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activePoiDetailsTab === "details" ? (
          <div className="route-tab-panel" role="tabpanel">
            <div className="compact-summary-panel" aria-label="Point summary">
              <div className="compact-summary-item">
                <MapPinned size={15} />
                <span>Section</span>
                <strong>{poi.sectionLabel}</strong>
              </div>
              <div className="compact-summary-item">
                <Navigation size={15} />
                <span>Location</span>
                <strong>{formatLocation(poi.location)}</strong>
              </div>
              <div className="compact-summary-item">
                <ShieldCheck size={15} />
                <span>Status</span>
                <strong>{poi.status ?? "Info"}</strong>
              </div>
              <div className="compact-summary-item">
                <MessageSquare size={15} />
                <span>Source</span>
                <strong>{poi.sourceConfidence ?? "Demo"}</strong>
              </div>
            </div>
            <section className="info-block">
              <h3>Details</h3>
              <p>{poi.summary}</p>
            </section>
            {poi.sourceLabel ? (
              <section className="info-block">
                <h3>Source</h3>
                <p>{poi.sourceLabel}</p>
              </section>
            ) : null}
            {poi.kind === "contribution" ? (
              <section className="info-block">
                <h3>Contribution</h3>
                <div className="detail-list">
                  {poi.contributionType ? (
                    <span>
                      <strong>Type</strong>
                      {poi.contributionType}
                    </span>
                  ) : null}
                  {poi.category ? (
                    <span>
                      <strong>Category</strong>
                      {poi.category}
                    </span>
                  ) : null}
                  {poi.author ? (
                    <span>
                      <strong>Added by</strong>
                      {poi.author}
                    </span>
                  ) : null}
                  {poi.dateObserved ? (
                    <span>
                      <strong>Observed</strong>
                      {poi.dateObserved}
                    </span>
                  ) : null}
                  {poi.createdAt ? (
                    <span>
                      <strong>Added</strong>
                      {poi.createdAt}
                    </span>
                  ) : null}
                </div>
              </section>
            ) : null}
            {poi.syncStatus ? (
              <section className="info-block">
                <h3>Sync</h3>
                <span className={`status-chip status-chip--sync-${poi.syncStatus}`}>
                  {syncStatusLabel(poi.syncStatus)}
                </span>
              </section>
            ) : null}
            {poi.mapPoi ? (
              <section className="info-block">
                <div className="block-title">
                  <h3>Updates</h3>
                  <span>{linkedContributions.length} on this point</span>
                </div>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={onAddUpdate}
                >
                  <Plus size={16} />
                  Add update
                </button>
                {linkedContributions.length ? (
                  <ul className="poi-updates">
                    {linkedContributions.map((contribution) => (
                      <li key={contribution.id}>
                        <strong>{contribution.title}</strong>
                        <span className="poi-update-meta">
                          {contribution.author}
                          {contribution.dateObserved
                            ? ` · ${contribution.dateObserved}`
                            : ""}
                        </span>
                        {contribution.detail ? (
                          <p>{contribution.detail}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="source-note">No updates attached yet.</p>
                )}
              </section>
            ) : null}
          </div>
        ) : null}

        {activePoiDetailsTab === "location" ? (
          <div className="route-tab-panel" role="tabpanel">
            <section className="info-block info-block--first">
              <h3>Location</h3>
              <div className="detail-list">
                <span>
                  <strong>Coordinates</strong>
                  {coordinateText}
                </span>
                {formattedWhat3Words ? (
                  <span>
                    <strong>what3words</strong>
                    {formattedWhat3Words}
                  </span>
                ) : isWhat3WordsLoading ? (
                  <span>
                    <strong>what3words</strong>
                    Looking up...
                  </span>
                ) : what3wordsUnavailable ? (
                  <span>
                    <strong>what3words</strong>
                    Unavailable
                  </span>
                ) : null}
              </div>
              <div className="location-actions">
                <a
                  className="ghost-button ghost-button--compact"
                  href={googleMapsSearchUrl(poi.location)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MapIcon size={15} />
                  Maps
                </a>
                {poi.navigationLocation ? (
                  <a
                    className="ghost-button ghost-button--compact"
                    href={googleMapsDirectionsUrl(poi.navigationLocation)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Navigation size={15} />
                    Navigate
                  </a>
                ) : null}
                <button
                  className="ghost-button ghost-button--compact"
                  type="button"
                  onClick={() => void copyLocationText("Coordinates", coordinateText)}
                >
                  <Copy size={15} />
                  Copy
                </button>
                {formattedWhat3Words ? (
                  <button
                    className="ghost-button ghost-button--compact"
                    type="button"
                    onClick={() =>
                      void copyLocationText("what3words", formattedWhat3Words)
                    }
                  >
                    <Copy size={15} />
                    W3W
                  </button>
                ) : !isWhat3WordsLoading ? (
                  <button
                    className="ghost-button ghost-button--compact"
                    type="button"
                    onClick={retryWhat3WordsAddress}
                  >
                    <RefreshCw size={15} />
                    Fetch W3W
                  </button>
                ) : null}
              </div>
              {copiedLocationLabel ? (
                <p className="source-note">{copiedLocationLabel}</p>
              ) : null}
            </section>
          </div>
        ) : null}

        {activePoiDetailsTab === "verification" &&
        (poi.mapPoi || poi.kind === "contribution") ? (
          <div className="route-tab-panel" role="tabpanel">
            <section className="info-block info-block--first">
              <div className="block-title">
                <h3>Verification</h3>
                <span
                  className={`status-chip status-chip--${
                    poi.mapPoi?.verificationStatus ?? poi.status ?? "reported"
                  }`}
                >
                  {poi.mapPoi?.verificationStatus
                    ? verificationStatusLabel(poi.mapPoi.verificationStatus)
                    : contributionStatusLabel(poi.status as Contribution["status"])}
                </span>
              </div>
              {poi.mapPoi ? (
                <>
                  <div className="detail-list">
                    <span>
                      <strong>Community</strong>
                      {confirmationSummary(poi.mapPoi.confirmations)}
                    </span>
                    {poi.mapPoi.corrections > 0 ? (
                      <span>
                        <strong>Corrections</strong>
                        {`${poi.mapPoi.corrections} suggested`}
                      </span>
                    ) : null}
                  </div>
                  <div className="inline-actions">
                    <button
                      className={`ghost-button ghost-button--compact ${
                        poi.mapPoi.viewerReview?.confirmed ? "is-selected" : ""
                      }`}
                      type="button"
                      disabled={isReviewSaving}
                      aria-pressed={poi.mapPoi.viewerReview?.confirmed ?? false}
                      onClick={() =>
                        onReviewMapPoi(
                          poi.mapPoi!,
                          "confirm",
                          poi.mapPoi!.viewerReview?.confirmed ? "remove" : "add",
                        )
                      }
                    >
                      <CheckCircle2 size={15} />
                      {poi.mapPoi.viewerReview?.confirmed
                        ? "Confirmed"
                        : "Confirm"}
                    </button>
                    <button
                      className={`ghost-button ghost-button--compact ${
                        poi.mapPoi.viewerReview?.suggestedCorrection
                          ? "is-selected"
                          : ""
                      }`}
                      type="button"
                      disabled={isReviewSaving}
                      aria-pressed={
                        poi.mapPoi.viewerReview?.suggestedCorrection ?? false
                      }
                      onClick={() => {
                        setCorrectionNote(
                          poi.mapPoi?.viewerReview?.correctionNote ?? "",
                        );
                        setIsCorrectionFormOpen(true);
                      }}
                    >
                      <Flag size={15} />
                      {poi.mapPoi.viewerReview?.suggestedCorrection
                        ? "Correction suggested"
                        : "Suggest correction"}
                    </button>
                  </div>
                  {!isCorrectionFormOpen && viewerCorrectionNote ? (
                    <div className="inline-correction-note">
                      <span>Your correction</span>
                      <p>{viewerCorrectionNote}</p>
                    </div>
                  ) : null}
                  {isCorrectionFormOpen ? (
                    <div className="inline-correction-form">
                      <label>
                        <span>Correction note</span>
                        <textarea
                          rows={3}
                          value={correctionNote}
                          onChange={(event) => setCorrectionNote(event.target.value)}
                          placeholder="What needs correcting?"
                        />
                      </label>
                      <div className="inline-actions">
                        <button
                          className="ghost-button ghost-button--compact"
                          type="button"
                          disabled={isReviewSaving || correctionNote.trim().length < 3}
                          onClick={() => {
                            const note = correctionNote.trim();

                            if (note) {
                              onReviewMapPoi(
                                poi.mapPoi!,
                                "correction",
                                "add",
                                note,
                              );
                              setIsCorrectionFormOpen(false);
                            }
                          }}
                        >
                          Submit
                        </button>
                        <button
                          className="ghost-button ghost-button--compact"
                          type="button"
                          disabled={isReviewSaving}
                          onClick={() => {
                            setIsCorrectionFormOpen(false);
                            setCorrectionNote(
                              poi.mapPoi?.viewerReview?.correctionNote ?? "",
                            );
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="source-note">
                  This contribution is managed through the moderation workflow.
                  Confirmed items can still receive correction suggestions without
                  being made unconfirmed first.
                </p>
              )}
              {canManagePoiStatus && poi.mapPoi ? (
                <div className="inline-admin-control">
                  <div>
                    <strong>Moderator status override</strong>
                    <span>
                      Use this only for data quality, safety, duplicate, or
                      moderation fixes.
                    </span>
                  </div>
                  {poi.mapPoi ? (
                    <div className="inline-admin-control__actions">
                      <select
                        value={adminMapPoiStatus}
                        onChange={(event) =>
                          setAdminMapPoiStatus(
                            event.target.value as MapPoi["verificationStatus"],
                          )
                        }
                      >
                        {mapPoiStatusActions.map((action) => (
                          <option key={action.status} value={action.status}>
                            {action.label}
                          </option>
                        ))}
                      </select>
                      <button
                        className="primary-action"
                        type="button"
                        disabled={isStatusSaving}
                        onClick={() => onUpdateMapPoiStatus(poi.mapPoi!, adminMapPoiStatus)}
                      >
                        Apply
                      </button>
                    </div>
                  ) : (
                    <div className="inline-admin-control__actions">
                      <select
                        value={adminContributionDecision}
                        onChange={(event) =>
                          setAdminContributionDecision(
                            event.target.value as ModerationDecision,
                          )
                        }
                      >
                        {moderationActions.map((action) => (
                          <option key={action.decision} value={action.decision}>
                            {action.label}
                          </option>
                        ))}
                      </select>
                      <button
                        className="primary-action"
                        type="button"
                        disabled={isStatusSaving}
                        onClick={() =>
                          onUpdateContributionStatus(poi, adminContributionDecision)
                        }
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
              {reviewMessage ? <p className="source-note">{reviewMessage}</p> : null}
            </section>
          </div>
        ) : null}

        {activePoiDetailsTab === "photos" ? (
          <div className="route-tab-panel" role="tabpanel">
            <section className="info-block info-block--first">
              <div className="block-title">
                <h3>Photos</h3>
                <span>{poiPhotos.length} attached</span>
              </div>
              <button className="ghost-button" type="button" onClick={onAddPhoto}>
                <Camera size={16} />
                Add photo
              </button>
              {poiPhotos.length ? (
                <div className="poi-photo-grid">
                  {poiPhotos.map((photo) => (
                    <figure key={photo.id}>
                      <button
                        className="photo-open-button"
                        type="button"
                        onClick={() =>
                          onOpenPhoto({
                            src: photo.displayUrl || photo.thumbnailUrl,
                            title: photo.caption || poi.title,
                            caption: photo.originalName,
                            alt: photo.caption || poi.title,
                          })
                        }
                      >
                        <img
                          src={photo.displayUrl || photo.thumbnailUrl}
                          alt=""
                        />
                      </button>
                      <figcaption>
                        <strong>{photo.caption || poi.title}</strong>
                        {photo.originalName ? (
                          <span>{photo.originalName}</span>
                        ) : null}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              ) : (
                <p className="source-note">No photos have been added to this point yet.</p>
              )}
            </section>
          </div>
        ) : null}
    </DetailPanel>
  );
}
