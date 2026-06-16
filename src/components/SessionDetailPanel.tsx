import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  CircleCheck,
  ShieldAlert,
} from "lucide-react";
import type { Rsvp, SessionDetail } from "../types";
import {
  fetchSession,
  setSessionCheckIn,
  setSessionIceConsent,
  setSessionRsvp,
  setSessionStatus,
} from "../services/groupsApi";

interface SessionDetailPanelProps {
  sessionId: string;
  onBack: () => void;
}

const MANAGER_ROLES = ["owner", "organiser", "leader"];
const RSVP_OPTIONS: { value: Rsvp; label: string }[] = [
  { value: "yes", label: "Going" },
  { value: "maybe", label: "Maybe" },
  { value: "no", label: "Can't" },
];

function errorMessage(value: unknown, fallback: string): string {
  return value instanceof Error ? value.message : fallback;
}

function formatWhen(iso: string | null): string {
  if (!iso) {
    return "Date to be confirmed";
  }
  return new Date(iso).toLocaleString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SessionDetailPanel({
  sessionId,
  onBack,
}: SessionDetailPanelProps) {
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [availabilityNote, setAvailabilityNote] = useState("");
  const [outcomeNotes, setOutcomeNotes] = useState("");

  async function load() {
    try {
      setSession(await fetchSession(sessionId));
    } catch (loadError) {
      setError(errorMessage(loadError, "Could not load the session."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    setIsLoading(true);
    setError("");
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
      await load();
    } catch (actionError) {
      setError(errorMessage(actionError, "That action could not be completed."));
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) {
    return (
      <section className="session-detail">
        <button
          type="button"
          className="ghost-button ghost-button--compact"
          onClick={onBack}
        >
          <ChevronLeft size={16} /> Back
        </button>
        <p className="empty-state">Loading…</p>
      </section>
    );
  }

  if (!session) {
    return (
      <section className="session-detail">
        <button
          type="button"
          className="ghost-button ghost-button--compact"
          onClick={onBack}
        >
          <ChevronLeft size={16} /> Back
        </button>
        {error ? <p className="groups-panel__error">{error}</p> : null}
      </section>
    );
  }

  const canManage = MANAGER_ROLES.includes(session.myGroupRole ?? "");
  const isLive = session.status === "planned" || session.status === "active";

  return (
    <section className="session-detail">
      <button
        type="button"
        className="ghost-button ghost-button--compact"
        onClick={onBack}
      >
        <ChevronLeft size={16} /> Back
      </button>

      {error ? <p className="groups-panel__error">{error}</p> : null}

      <header className="session-detail__head">
        <div>
          <p className="eyebrow">{session.groupName}</p>
          <h2>{session.title}</h2>
        </div>
        <span className={`status-chip status-chip--${session.status}`}>
          {session.status}
        </span>
      </header>

      <ul className="session-facts">
        <li>{formatWhen(session.scheduledFor)}</li>
        {session.meetingPoint ? <li>Meet: {session.meetingPoint}</li> : null}
        {session.venue ? <li>{session.venue}</li> : null}
        {session.notes ? <li>{session.notes}</li> : null}
      </ul>

      {/* Your attendance (GROUP-F4/F5) */}
      <div className="session-block">
        <h3>Your attendance</h3>
        <div className="rsvp-row">
          {RSVP_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={busy}
              className={`rsvp-button ${
                session.myRsvp === option.value ? "rsvp-button--active" : ""
              }`}
              onClick={() =>
                void run(() =>
                  setSessionRsvp(
                    sessionId,
                    option.value,
                    availabilityNote || null,
                  ),
                )
              }
            >
              {option.label}
            </button>
          ))}
        </div>
        <input
          className="availability-input"
          value={availabilityNote}
          onChange={(event) => setAvailabilityNote(event.target.value)}
          placeholder="Availability note (e.g. can shuttle, leaving by 4pm)"
        />
        {session.myRsvp && session.myRsvp !== "no" ? (
          <button
            type="button"
            disabled={busy}
            className="ghost-button ghost-button--compact"
            onClick={() =>
              void run(() =>
                setSessionCheckIn(sessionId, !session.myCheckedIn),
              )
            }
          >
            <CircleCheck size={15} />{" "}
            {session.myCheckedIn ? "Check out" : "Check in"}
          </button>
        ) : null}
      </div>

      {/* Session-scoped ICE consent (GROUP-F6) */}
      <div className="session-block session-block--ice">
        <h3>
          <ShieldAlert size={16} /> Emergency contact
        </h3>
        <p className="session-note">
          Share the emergency contact from your profile with this session's
          organisers — only while the session is live. You can turn it off any
          time, and it closes automatically when the session ends.
        </p>
        <label className="toggle-line">
          <input
            type="checkbox"
            checked={session.myIceConsent}
            disabled={busy}
            onChange={(event) =>
              void run(() =>
                setSessionIceConsent(sessionId, event.target.checked),
              )
            }
          />
          Share my emergency contact for this session
        </label>
      </div>

      {/* Kit & skills advisory coverage (GROUP-F7) */}
      <div className="session-block">
        <h3>Kit &amp; skills coverage</h3>
        <p className="session-note">
          Advisory only — this is not a safety check. Participants and leaders
          remain responsible for their own decisions.
        </p>
        <ul className="coverage-list">
          {session.advisory.map((check) => (
            <li
              key={check.key}
              className={`coverage-item ${
                check.present ? "coverage-item--ok" : "coverage-item--gap"
              }`}
            >
              {check.present ? (
                <Check size={15} />
              ) : (
                <AlertTriangle size={15} />
              )}
              <span>
                {check.present
                  ? `${check.label}: ${check.count} recorded`
                  : `No shared ${check.label.toLowerCase()} recorded`}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Participants (GROUP-F4/F5/F6) */}
      <div className="session-block">
        <h3>Participants ({session.participantCount})</h3>
        <ul className="participant-list">
          {session.participants.map((participant) => (
            <li key={participant.id} className="participant-row">
              <span>
                <strong>{participant.publicName}</strong>
                <small>
                  {participant.rsvp}
                  {participant.checkedInAt && !participant.checkedOutAt
                    ? " · checked in"
                    : ""}
                  {participant.availabilityNote
                    ? ` · ${participant.availabilityNote}`
                    : ""}
                </small>
                {session.iceVisible && participant.ice ? (
                  <small className="participant-ice">
                    <ShieldAlert size={12} /> ICE:{" "}
                    {participant.ice.name ?? "—"}
                    {participant.ice.phone ? ` · ${participant.ice.phone}` : ""}
                    {participant.ice.relationship
                      ? ` (${participant.ice.relationship})`
                      : ""}
                  </small>
                ) : null}
              </span>
              {canManage ? (
                <button
                  type="button"
                  disabled={busy}
                  className="ghost-button ghost-button--compact"
                  onClick={() =>
                    void run(() =>
                      setSessionCheckIn(
                        sessionId,
                        !(
                          participant.checkedInAt && !participant.checkedOutAt
                        ),
                        participant.memberId,
                      ),
                    )
                  }
                >
                  {participant.checkedInAt && !participant.checkedOutAt
                    ? "Check out"
                    : "Check in"}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      {/* Lifecycle (GROUP-F5/F9) */}
      {canManage ? (
        <div className="session-block">
          <h3>Organiser controls</h3>
          {session.status === "planned" ? (
            <button
              type="button"
              disabled={busy}
              className="primary-action primary-action--compact"
              onClick={() =>
                void run(() => setSessionStatus(sessionId, "active"))
              }
            >
              Start session
            </button>
          ) : null}
          {session.status === "active" ? (
            <>
              <textarea
                className="availability-input"
                value={outcomeNotes}
                onChange={(event) => setOutcomeNotes(event.target.value)}
                placeholder="How did it go? Rivers paddled, level on the day, notes…"
              />
              <button
                type="button"
                disabled={busy}
                className="primary-action primary-action--compact"
                onClick={() =>
                  void run(() =>
                    setSessionStatus(sessionId, "completed", {
                      outcomeNotes: outcomeNotes.trim() || null,
                    }),
                  )
                }
              >
                Complete session
              </button>
            </>
          ) : null}
          {isLive ? (
            <button
              type="button"
              disabled={busy}
              className="ghost-button ghost-button--compact"
              onClick={() =>
                void run(() => setSessionStatus(sessionId, "cancelled"))
              }
            >
              Cancel session
            </button>
          ) : null}
          {session.outcomeNotes ? (
            <p className="session-note">Outcome: {session.outcomeNotes}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
