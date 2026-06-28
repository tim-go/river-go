import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ChevronLeft,
  LogOut,
  Plus,
  UserPlus,
  UsersRound,
} from "lucide-react";
import type {
  Group,
  GroupDetail,
  GroupDiscipline,
  GroupKind,
  GroupSession,
  InvitableMember,
} from "../types";
import {
  createGroup,
  createSession,
  fetchGroup,
  fetchGroups,
  fetchSessions,
  inviteGroupMember,
  leaveGroup,
  respondToGroupInvite,
  searchMembers,
} from "../services/groupsApi";
import { SessionDetailPanel } from "./SessionDetailPanel";

interface GroupsPanelProps {
  isSignedIn: boolean;
  rivers: { id: string; displayName: string }[];
}

const GROUP_KIND_LABELS: Record<GroupKind, string> = {
  club: "Club",
  subgroup: "Subgroup",
  friends: "Friends",
  trip: "Trip",
};

function errorMessage(value: unknown, fallback: string): string {
  return value instanceof Error ? value.message : fallback;
}

function formatWhen(iso: string | null): string {
  if (!iso) {
    return "Date TBC";
  }
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function GroupsPanel({ isSignedIn, rivers }: GroupsPanelProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [sessions, setSessions] = useState<GroupSession[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [groupDetail, setGroupDetail] = useState<GroupDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupKind, setGroupKind] = useState<GroupKind>("friends");
  const [groupDiscipline, setGroupDiscipline] = useState<GroupDiscipline | "">(
    "",
  );

  const [inviteQuery, setInviteQuery] = useState("");
  const [inviteResults, setInviteResults] = useState<InvitableMember[]>([]);
  const inviteSearchTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (inviteSearchTimer.current) {
        window.clearTimeout(inviteSearchTimer.current);
      }
    },
    [],
  );

  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionRiverId, setSessionRiverId] = useState("");
  const [sessionScheduledFor, setSessionScheduledFor] = useState("");
  const [sessionMeetingPoint, setSessionMeetingPoint] = useState("");
  const [sessionNotes, setSessionNotes] = useState("");

  async function loadGroups() {
    setIsLoading(true);
    setError("");
    try {
      const [loadedGroups, loadedSessions] = await Promise.all([
        fetchGroups(),
        fetchSessions(),
      ]);
      setGroups(loadedGroups);
      setSessions(loadedSessions);
    } catch (loadError) {
      setError(errorMessage(loadError, "Could not load your groups."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (isSignedIn) {
      void loadGroups();
    } else {
      setIsLoading(false);
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (!selectedGroupId) {
      setGroupDetail(null);
      return;
    }
    let active = true;
    fetchGroup(selectedGroupId)
      .then((detail) => {
        if (active) {
          setGroupDetail(detail);
        }
      })
      .catch((detailError) => {
        if (active) {
          setError(errorMessage(detailError, "Could not load that group."));
        }
      });
    return () => {
      active = false;
    };
  }, [selectedGroupId]);

  async function handleCreateGroup(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const created = await createGroup({
        name: groupName.trim(),
        kind: groupKind,
        discipline: groupDiscipline || null,
      });
      setGroupName("");
      setGroupDiscipline("");
      setIsCreatingGroup(false);
      await loadGroups();
      setSelectedGroupId(created.id);
    } catch (createError) {
      setError(errorMessage(createError, "Could not create the group."));
    }
  }

  // Debounced so we don't fire a request per keystroke; only search once the
  // query reaches the backend's 3-char minimum.
  function handleSearchMembers(query: string) {
    setInviteQuery(query);
    if (inviteSearchTimer.current) {
      window.clearTimeout(inviteSearchTimer.current);
    }
    if (query.trim().length < 3) {
      setInviteResults([]);
      return;
    }
    inviteSearchTimer.current = window.setTimeout(() => {
      void searchMembers(query)
        .then(setInviteResults)
        .catch(() => setInviteResults([]));
    }, 250);
  }

  async function handleInvite(memberId: string) {
    if (!selectedGroupId) {
      return;
    }
    setError("");
    try {
      await inviteGroupMember(selectedGroupId, memberId);
      setInviteQuery("");
      setInviteResults([]);
      setGroupDetail(await fetchGroup(selectedGroupId));
    } catch (inviteError) {
      setError(errorMessage(inviteError, "Could not send the invite."));
    }
  }

  async function handleRespond(accept: boolean) {
    if (!selectedGroupId) {
      return;
    }
    try {
      await respondToGroupInvite(selectedGroupId, accept);
      await loadGroups();
      if (accept) {
        setGroupDetail(await fetchGroup(selectedGroupId));
      } else {
        setSelectedGroupId(null);
      }
    } catch (respondError) {
      setError(errorMessage(respondError, "Could not update the invite."));
    }
  }

  async function handleLeave() {
    if (!selectedGroupId) {
      return;
    }
    try {
      await leaveGroup(selectedGroupId);
      setSelectedGroupId(null);
      await loadGroups();
    } catch (leaveError) {
      setError(errorMessage(leaveError, "Could not leave the group."));
    }
  }

  async function handleCreateSession(event: FormEvent) {
    event.preventDefault();
    if (!selectedGroupId) {
      return;
    }
    setError("");
    try {
      const created = await createSession({
        groupId: selectedGroupId,
        title: sessionTitle.trim(),
        riverId: sessionRiverId || null,
        scheduledFor: sessionScheduledFor
          ? new Date(sessionScheduledFor).toISOString()
          : null,
        meetingPoint: sessionMeetingPoint.trim() || null,
        notes: sessionNotes.trim() || null,
      });
      setSessionTitle("");
      setSessionRiverId("");
      setSessionScheduledFor("");
      setSessionMeetingPoint("");
      setSessionNotes("");
      setIsCreatingSession(false);
      setSessions(await fetchSessions());
      setSelectedSessionId(created.id);
    } catch (sessionError) {
      setError(errorMessage(sessionError, "Could not plan the session."));
    }
  }

  if (!isSignedIn) {
    return (
      <section className="groups-panel">
        <div className="sign-in-card">
          <UsersRound size={22} />
          <div>
            <h3>Plan paddles with your people</h3>
            <p>
              Sign in to create clubs and friend groups, plan sessions, share
              meeting points, and coordinate who is coming.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (selectedSessionId) {
    return (
      <section className="groups-panel">
        <SessionDetailPanel
          sessionId={selectedSessionId}
          onBack={() => {
            setSelectedSessionId(null);
            void loadGroups();
          }}
        />
      </section>
    );
  }

  const canManage =
    groupDetail?.myRole === "owner" ||
    groupDetail?.myRole === "organiser" ||
    groupDetail?.myRole === "leader";
  const groupSessions = selectedGroupId
    ? sessions.filter((session) => session.groupId === selectedGroupId)
    : [];

  return (
    <section className="groups-panel">
      {error ? <p className="groups-panel__error">{error}</p> : null}

      {groupDetail && selectedGroupId ? (
        <div className="group-detail">
          <div className="group-detail__head">
            <button
              type="button"
              className="ghost-button ghost-button--compact"
              onClick={() => setSelectedGroupId(null)}
            >
              <ChevronLeft size={16} /> Groups
            </button>
            {groupDetail.myStatus === "active" ? (
              <button
                type="button"
                className="ghost-button ghost-button--compact"
                onClick={() => void handleLeave()}
              >
                <LogOut size={15} /> Leave
              </button>
            ) : null}
          </div>

          <header className="group-detail__title">
            <h2>{groupDetail.name}</h2>
            <p>
              {GROUP_KIND_LABELS[groupDetail.kind]} · {groupDetail.memberCount}{" "}
              member{groupDetail.memberCount === 1 ? "" : "s"} ·{" "}
              {groupDetail.visibility}
            </p>
          </header>

          {groupDetail.myStatus === "invited" ? (
            <div className="group-invite-banner">
              <span>You have been invited to this group.</span>
              <span>
                <button
                  type="button"
                  className="primary-action primary-action--compact"
                  onClick={() => void handleRespond(true)}
                >
                  Accept
                </button>
                <button
                  type="button"
                  className="ghost-button ghost-button--compact"
                  onClick={() => void handleRespond(false)}
                >
                  Decline
                </button>
              </span>
            </div>
          ) : null}

          <div className="group-detail__section">
            <h3>Members</h3>
            <ul className="group-member-list">
              {groupDetail.members.map((member) => (
                <li key={member.id} className="group-member-row">
                  <span>
                    <strong>{member.publicName}</strong>
                    <small>{member.role}</small>
                  </span>
                  {member.status === "invited" ? (
                    <span className="status-chip">invited</span>
                  ) : null}
                </li>
              ))}
            </ul>

            {canManage ? (
              <div className="group-invite">
                <label>
                  <UserPlus size={15} /> Invite a member
                  <input
                    value={inviteQuery}
                    onChange={(event) =>
                      void handleSearchMembers(event.target.value)
                    }
                    placeholder="Search by name"
                  />
                </label>
                {inviteResults.length ? (
                  <ul className="group-invite__results">
                    {inviteResults.map((candidate) => (
                      <li key={candidate.id}>
                        <button
                          type="button"
                          onClick={() => void handleInvite(candidate.id)}
                        >
                          {candidate.publicName}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="group-detail__section">
            <div className="group-detail__section-head">
              <h3>Sessions</h3>
              {canManage ? (
                <button
                  type="button"
                  className="ghost-button ghost-button--compact"
                  onClick={() => setIsCreatingSession((open) => !open)}
                >
                  <Plus size={15} />{" "}
                  {isCreatingSession ? "Cancel" : "Plan session"}
                </button>
              ) : null}
            </div>

            {isCreatingSession ? (
              <form className="session-form" onSubmit={handleCreateSession}>
                <label>
                  Title
                  <input
                    value={sessionTitle}
                    onChange={(event) => setSessionTitle(event.target.value)}
                    placeholder="Saturday Tryweryn"
                    required
                  />
                </label>
                <label>
                  River
                  <select
                    value={sessionRiverId}
                    onChange={(event) => setSessionRiverId(event.target.value)}
                  >
                    <option value="">— optional —</option>
                    {rivers.map((river) => (
                      <option key={river.id} value={river.id}>
                        {river.displayName}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Date &amp; time
                  <input
                    type="datetime-local"
                    value={sessionScheduledFor}
                    onChange={(event) =>
                      setSessionScheduledFor(event.target.value)
                    }
                  />
                </label>
                <label>
                  Meeting point
                  <input
                    value={sessionMeetingPoint}
                    onChange={(event) =>
                      setSessionMeetingPoint(event.target.value)
                    }
                    placeholder="Car park, get-in…"
                  />
                </label>
                <label>
                  Notes
                  <textarea
                    value={sessionNotes}
                    onChange={(event) => setSessionNotes(event.target.value)}
                    placeholder="Shuttle, parking, food plans…"
                  />
                </label>
                <button type="submit" className="primary-action">
                  Plan session
                </button>
              </form>
            ) : null}

            {groupSessions.length ? (
              <ul className="session-list">
                {groupSessions.map((session) => (
                  <li key={session.id}>
                    <button
                      type="button"
                      className="session-row"
                      onClick={() => setSelectedSessionId(session.id)}
                    >
                      <span>
                        <strong>{session.title}</strong>
                        <small>
                          {formatWhen(session.scheduledFor)} ·{" "}
                          {session.participantCount} going
                        </small>
                      </span>
                      <span className={`status-chip status-chip--${session.status}`}>
                        {session.status}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">No sessions planned yet.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="groups-list-view">
          <div className="groups-panel__head">
            <h2>Your groups</h2>
            <button
              type="button"
              className="primary-action primary-action--compact"
              onClick={() => setIsCreatingGroup((open) => !open)}
            >
              <Plus size={16} /> {isCreatingGroup ? "Cancel" : "New group"}
            </button>
          </div>

          {isCreatingGroup ? (
            <form className="group-form" onSubmit={handleCreateGroup}>
              <label>
                Name
                <input
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  placeholder="Tryweryn Tuesdays"
                  required
                />
              </label>
              <label>
                Type
                <select
                  value={groupKind}
                  onChange={(event) =>
                    setGroupKind(event.target.value as GroupKind)
                  }
                >
                  <option value="friends">Friends</option>
                  <option value="club">Club</option>
                  <option value="trip">Trip</option>
                  <option value="subgroup">Subgroup</option>
                </select>
              </label>
              <label>
                Discipline
                <select
                  value={groupDiscipline}
                  onChange={(event) =>
                    setGroupDiscipline(
                      event.target.value as GroupDiscipline | "",
                    )
                  }
                >
                  <option value="">— any —</option>
                  <option value="whitewater">Whitewater</option>
                  <option value="touring">Canoe touring</option>
                  <option value="both">Both</option>
                </select>
              </label>
              <button type="submit" className="primary-action">
                Create group
              </button>
            </form>
          ) : null}

          {isLoading ? (
            <p className="empty-state">Loading…</p>
          ) : groups.length ? (
            <ul className="groups-list">
              {groups.map((group) => (
                <li key={group.id}>
                  <button
                    type="button"
                    className="group-row"
                    onClick={() => setSelectedGroupId(group.id)}
                  >
                    <span>
                      <strong>{group.name}</strong>
                      <small>
                        {GROUP_KIND_LABELS[group.kind]} · {group.memberCount}{" "}
                        member{group.memberCount === 1 ? "" : "s"}
                      </small>
                    </span>
                    {group.myStatus === "invited" ? (
                      <span className="status-chip">invited</span>
                    ) : (
                      <span className="status-chip status-chip--muted">
                        {group.myRole}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">
              No groups yet. Create one to plan paddles with your club or
              friends.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
