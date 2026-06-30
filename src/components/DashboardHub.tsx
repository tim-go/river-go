import { useEffect, useState } from "react";
import {
  CalendarClock,
  Camera,
  ChevronRight,
  MapPin,
  UsersRound,
  Waves,
} from "lucide-react";
import { fetchGroups, fetchSessions } from "../services/groupsApi";
import { fetchPaddleLogs } from "../services/paddleLogApi";
import { fetchMyPhotos, type MemberPhoto } from "../services/photoApi";
import { fetchMyContributions } from "../services/contributionApi";
import type { Contribution, Group, GroupSession, PaddleLog } from "../types";
import type { ProfileMode } from "../appCore";
import { formatShortDateTime } from "../lib/format";

interface DashboardHubProps {
  onOpenGroups: () => void;
  onOpenProfileTab: (tab: ProfileMode) => void;
}

// The Dashboard hub: compact, self-fetching summaries of the things a signed-in
// member cares about — next sessions, recent paddles, recent photos, and their
// contributions — each linking to its full page. Rendered only when signed in
// (the parent gates it), so it can fetch on mount like the full panels do.
export function DashboardHub({
  onOpenGroups,
  onOpenProfileTab,
}: DashboardHubProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [sessions, setSessions] = useState<GroupSession[]>([]);
  const [paddles, setPaddles] = useState<PaddleLog[]>([]);
  const [photos, setPhotos] = useState<MemberPhoto[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const [g, s, p, ph, c] = await Promise.all([
        fetchGroups().catch(() => [] as Group[]),
        fetchSessions().catch(() => [] as GroupSession[]),
        fetchPaddleLogs().catch(() => [] as PaddleLog[]),
        fetchMyPhotos().catch(() => [] as MemberPhoto[]),
        fetchMyContributions().catch(() => [] as Contribution[]),
      ]);
      if (!active) {
        return;
      }
      setGroups(g);
      setSessions(s);
      setPaddles(p);
      setPhotos(ph);
      setContributions(c);
    })();
    return () => {
      active = false;
    };
  }, []);

  const now = Date.now();
  const toTime = (value: string | null | undefined) =>
    value ? new Date(value).getTime() : 0;
  const upcomingSessions = sessions
    .filter(
      (session) =>
        session.status === "planned" && toTime(session.scheduledFor) >= now,
    )
    .sort((a, b) => toTime(a.scheduledFor) - toTime(b.scheduledFor))
    .slice(0, 3);
  const recentPaddles = [...paddles]
    .sort((a, b) => toTime(b.paddledOn) - toTime(a.paddledOn))
    .slice(0, 3);
  const recentPhotos = photos.filter((photo) => photo.thumbnailUrl).slice(0, 6);
  const recentContributions = [...contributions]
    .sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt))
    .slice(0, 3);

  return (
    <div className="dashboard-hub">
      <div className="placeholder-list">
        <button
          className="placeholder-row"
          type="button"
          onClick={onOpenGroups}
        >
          <span>
            <strong>Clubs</strong>
            <small>Your clubs and friends, and planned meetups</small>
          </span>
          <UsersRound size={18} />
        </button>
      </div>

      <section className="dashboard-section">
        <header className="dashboard-section__head">
          <h3>
            <CalendarClock size={16} /> Next meetups
          </h3>
          <button
            type="button"
            className="dashboard-section__link"
            onClick={onOpenGroups}
          >
            Clubs <ChevronRight size={14} />
          </button>
        </header>
        {upcomingSessions.length ? (
          <ul className="dashboard-list">
            {upcomingSessions.map((session) => (
              <li key={session.id} className="dashboard-list__row">
                <span className="dashboard-list__title">{session.title}</span>
                <span className="dashboard-list__meta">
                  {formatShortDateTime(session.scheduledFor)} ·{" "}
                  {session.groupName} · {session.participantCount} going
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="dashboard-section__empty">
            {groups.length
              ? "No upcoming meetups planned."
              : "Join a club to plan paddles together."}
          </p>
        )}
      </section>

      <section className="dashboard-section">
        <header className="dashboard-section__head">
          <h3>
            <Waves size={16} /> Recent paddles
          </h3>
          <button
            type="button"
            className="dashboard-section__link"
            onClick={() => onOpenProfileTab("history")}
          >
            History <ChevronRight size={14} />
          </button>
        </header>
        {recentPaddles.length ? (
          <ul className="dashboard-list">
            {recentPaddles.map((log) => (
              <li key={log.id} className="dashboard-list__row">
                <span className="dashboard-list__title">{log.title}</span>
                <span className="dashboard-list__meta">
                  {formatShortDateTime(log.paddledOn)} · {log.craftType}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="dashboard-section__empty">No paddles logged yet.</p>
        )}
      </section>

      <section className="dashboard-section">
        <header className="dashboard-section__head">
          <h3>
            <Camera size={16} /> Your photos
          </h3>
          <button
            type="button"
            className="dashboard-section__link"
            onClick={() => onOpenProfileTab("photos")}
          >
            Photos <ChevronRight size={14} />
          </button>
        </header>
        {recentPhotos.length ? (
          <div className="dashboard-photo-strip">
            {recentPhotos.map((photo) => (
              <img
                key={photo.id}
                src={photo.thumbnailUrl ?? undefined}
                alt={photo.caption || photo.contributionTitle || "Your photo"}
                loading="lazy"
              />
            ))}
          </div>
        ) : (
          <p className="dashboard-section__empty">No photos uploaded yet.</p>
        )}
      </section>

      <section className="dashboard-section">
        <header className="dashboard-section__head">
          <h3>
            <MapPin size={16} /> Your contributions
          </h3>
          <button
            type="button"
            className="dashboard-section__link"
            onClick={() => onOpenProfileTab("activity")}
          >
            Points <ChevronRight size={14} />
          </button>
        </header>
        {recentContributions.length ? (
          <ul className="dashboard-list">
            {recentContributions.map((contribution) => (
              <li key={contribution.id} className="dashboard-list__row">
                <span className="dashboard-list__title">
                  {contribution.title}
                </span>
                <span
                  className={`status-chip status-chip--${contribution.status}`}
                >
                  {contribution.status}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="dashboard-section__empty">
            No contributions yet — add info from a river.
          </p>
        )}
      </section>
    </div>
  );
}
