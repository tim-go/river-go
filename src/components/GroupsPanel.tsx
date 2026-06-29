import { useEffect, useState, type FormEvent } from "react";
import {
  Check,
  ChevronLeft,
  Copy,
  LogOut,
  Plus,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import type {
  Group,
  GroupDetail,
  GroupDiscipline,
  GroupKind,
  GroupMember,
  GroupPending,
  GroupPublic,
  GroupRole,
  GroupSession,
} from "../types";
import {
  createGroup,
  createSession,
  fetchGroup,
  fetchGroups,
  fetchPending,
  fetchSessions,
  inviteByEmail,
  leaveGroup,
  removeMember,
  requestToJoin,
  respondToGroupInvite,
  respondToRequest,
  setMemberRole,
  transferOwnership,
  updateGroupSettings,
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

const GROUP_ROLE_LABELS: Record<GroupRole, string> = {
  owner: "Owner",
  organiser: "Organiser",
  leader: "Leader",
  member: "Member",
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
  const [publicGroup, setPublicGroup] = useState<GroupPublic | null>(null);
  const [pending, setPending] = useState<GroupPending | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupKind, setGroupKind] = useState<GroupKind>("friends");
  const [groupDiscipline, setGroupDiscipline] = useState<GroupDiscipline | "">(
    "",
  );

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteNotice, setInviteNotice] = useState("");
  const [handleDraft, setHandleDraft] = useState("");
  const [isEditingHandle, setIsEditingHandle] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

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
      setPublicGroup(null);
      setPending(null);
      return;
    }
    let active = true;
    setInviteNotice("");
    setIsEditingHandle(false);
    fetchGroup(selectedGroupId)
      .then((view) => {
        if (!active) {
          return;
        }
        if (view.access === "member") {
          setGroupDetail(view.group);
          setPublicGroup(null);
        } else {
          setPublicGroup(view.group);
          setGroupDetail(null);
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

  // Membership managers see pending invites/requests.
  const canManage =
    groupDetail?.myRole === "owner" || groupDetail?.myRole === "organiser";
  const isOwner = groupDetail?.myRole === "owner";

  useEffect(() => {
    if (!selectedGroupId || !canManage) {
      setPending(null);
      return;
    }
    let active = true;
    fetchPending(selectedGroupId)
      .then((result) => {
        if (active) {
          setPending(result);
        }
      })
      .catch(() => {
        if (active) {
          setPending(null);
        }
      });
    return () => {
      active = false;
    };
  }, [selectedGroupId, canManage, groupDetail?.memberCount]);

  async function reloadGroup() {
    if (!selectedGroupId) {
      return;
    }
    const view = await fetchGroup(selectedGroupId);
    if (view.access === "member") {
      setGroupDetail(view.group);
    }
    if (canManage) {
      setPending(await fetchPending(selectedGroupId).catch(() => null));
    }
  }

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

  async function handleInviteByEmail(event: FormEvent) {
    event.preventDefault();
    if (!selectedGroupId || !inviteEmail.trim()) {
      return;
    }
    setError("");
    setInviteNotice("");
    try {
      await inviteByEmail(selectedGroupId, inviteEmail.trim());
      setInviteEmail("");
      // Neutral confirmation — we never reveal whether the email is registered.
      setInviteNotice(
        "If they have a RiverLaunch account, they'll see the invite.",
      );
      await reloadGroup();
    } catch (inviteError) {
      setError(errorMessage(inviteError, "Could not send the invite."));
    }
  }

  async function runGroupAction(
    action: () => Promise<unknown>,
    fallback: string,
  ) {
    if (!selectedGroupId) {
      return;
    }
    setError("");
    try {
      await action();
      await reloadGroup();
    } catch (actionError) {
      setError(errorMessage(actionError, fallback));
    }
  }

  async function handleRequestToJoin() {
    if (!selectedGroupId) {
      return;
    }
    setError("");
    try {
      await requestToJoin(selectedGroupId);
      const view = await fetchGroup(selectedGroupId);
      if (view.access === "public") {
        setPublicGroup(view.group);
      }
    } catch (requestError) {
      setError(errorMessage(requestError, "Could not send the request."));
    }
  }

  async function handleSaveHandle() {
    await runGroupAction(async () => {
      const updated = await updateGroupSettings(selectedGroupId!, {
        handle: handleDraft.trim().toLowerCase(),
      });
      setGroupDetail(updated);
      setIsEditingHandle(false);
    }, "Could not update the link.");
  }

  async function handleTransfer(member: GroupMember) {
    if (
      !window.confirm(
        `Make ${member.publicName} the owner? You'll become an organiser.`,
      )
    ) {
      return;
    }
    await runGroupAction(
      () => transferOwnership(selectedGroupId!, member.memberId),
      "Could not transfer ownership.",
    );
  }

  async function handleRespond(accept: boolean) {
    if (!selectedGroupId) {
      return;
    }
    try {
      await respondToGroupInvite(selectedGroupId, accept);
      await loadGroups();
      if (accept) {
        await reloadGroup();
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

  // Leaders can manage sessions but not membership.
  const canManageSessions = canManage || groupDetail?.myRole === "leader";
  const groupSessions = selectedGroupId
    ? sessions.filter((session) => session.groupId === selectedGroupId)
    : [];
  // All the user's sessions across groups, soonest first (My groups page).
  const upcomingSessions = [...sessions].sort((a, b) => {
    const at = a.scheduledFor ? Date.parse(a.scheduledFor) : Infinity;
    const bt = b.scheduledFor ? Date.parse(b.scheduledFor) : Infinity;
    return at - bt;
  });

  // Primary detail content (members, requests, sessions). Shown full width for
  // plain members, or as the main column beside the manage aside for managers.
  const primarySections =
    groupDetail && selectedGroupId ? (
      <>
        {canManage && pending && pending.requests.length ? (
          <div className="group-detail__section">
            <h3>Join requests</h3>
            <ul className="group-member-list">
              {pending.requests.map((request) => (
                <li key={request.memberId} className="group-member-row">
                  <span>
                    <strong>{request.publicName}</strong>
                    <small>wants to join</small>
                  </span>
                  <span className="group-member-row__actions">
                    <button
                      type="button"
                      className="primary-action primary-action--compact"
                      onClick={() =>
                        void runGroupAction(
                          () =>
                            respondToRequest(
                              groupDetail.id,
                              request.memberId,
                              true,
                            ),
                          "Could not approve the request.",
                        )
                      }
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="ghost-button ghost-button--compact"
                      onClick={() =>
                        void runGroupAction(
                          () =>
                            respondToRequest(
                              groupDetail.id,
                              request.memberId,
                              false,
                            ),
                          "Could not decline the request.",
                        )
                      }
                    >
                      Decline
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="group-detail__section">
          <h3>Members</h3>
          <ul className="group-member-list">
            {groupDetail.members.map((member) => (
              <li key={member.id} className="group-member-row">
                <span>
                  <strong>{member.publicName}</strong>
                  <small>{GROUP_ROLE_LABELS[member.role]}</small>
                </span>
                {canManage && member.role !== "owner" ? (
                  <span className="group-member-row__actions">
                    {isOwner ? (
                      <select
                        value={member.role}
                        onChange={(event) =>
                          void runGroupAction(
                            () =>
                              setMemberRole(
                                groupDetail.id,
                                member.memberId,
                                event.target.value as GroupRole,
                              ),
                            "Could not change the role.",
                          )
                        }
                      >
                        <option value="organiser">Organiser</option>
                        <option value="leader">Leader</option>
                        <option value="member">Member</option>
                      </select>
                    ) : null}
                    {isOwner ? (
                      <button
                        type="button"
                        className="ghost-button ghost-button--compact"
                        onClick={() => void handleTransfer(member)}
                      >
                        Make owner
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="ghost-button ghost-button--compact"
                      onClick={() =>
                        void runGroupAction(
                          () => removeMember(groupDetail.id, member.memberId),
                          "Could not remove the member.",
                        )
                      }
                      aria-label={`Remove ${member.publicName}`}
                    >
                      <X size={14} />
                    </button>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>

        <div className="group-detail__section">
          <div className="group-detail__section-head">
            <h3>Sessions</h3>
            {canManageSessions ? (
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
                    <span
                      className={`status-chip status-chip--${session.status}`}
                    >
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
      </>
    ) : null;

  // Manage controls (manager only) — the aside beside the primary content.
  const manageAside =
    groupDetail && selectedGroupId && canManage ? (
      <>
        <div className="group-detail__section">
          <h3>Invite link</h3>
          <div className="group-invite-link">
            {isEditingHandle ? (
              <span className="group-invite-link__edit">
                <span className="group-invite-link__prefix">/g/</span>
                <input
                  value={handleDraft}
                  onChange={(event) => setHandleDraft(event.target.value)}
                  placeholder="tryweryn-paddlers"
                />
                <button
                  type="button"
                  className="primary-action primary-action--compact"
                  onClick={() => void handleSaveHandle()}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="ghost-button ghost-button--compact"
                  onClick={() => setIsEditingHandle(false)}
                >
                  Cancel
                </button>
              </span>
            ) : (
              (() => {
                const inviteUrl = `${window.location.origin}/g/${
                  groupDetail.handle ?? groupDetail.id
                }`;
                return (
                  <span className="group-invite-link__view">
                    <code title={inviteUrl}>{inviteUrl}</code>
                    <button
                      type="button"
                      className="ghost-button ghost-button--compact"
                      onClick={() => {
                        void navigator.clipboard
                          ?.writeText(inviteUrl)
                          .then(() => {
                            setLinkCopied(true);
                            window.setTimeout(() => setLinkCopied(false), 1800);
                          });
                      }}
                    >
                      {linkCopied ? <Check size={14} /> : <Copy size={14} />}
                      {linkCopied ? "Copied" : "Copy"}
                    </button>
                    <button
                      type="button"
                      className="ghost-button ghost-button--compact"
                      onClick={() => {
                        setHandleDraft(groupDetail.handle ?? "");
                        setIsEditingHandle(true);
                      }}
                    >
                      Edit
                    </button>
                  </span>
                );
              })()
            )}
          </div>
          <label className="group-access-mode">
            Joining
            <select
              value={groupDetail.accessMode}
              onChange={(event) =>
                void runGroupAction(
                  () =>
                    updateGroupSettings(groupDetail.id, {
                      accessMode: event.target
                        .value as GroupDetail["accessMode"],
                    }).then(setGroupDetail),
                  "Could not update access mode.",
                )
              }
            >
              <option value="request_to_join">
                Anyone with the link can request to join
              </option>
              <option value="invite_only">Invite only</option>
            </select>
          </label>
        </div>

        <form
          className="group-invite group-detail__section"
          onSubmit={handleInviteByEmail}
        >
          <h3>Invite a member</h3>
          <label>
            <UserPlus size={15} /> By email
            <input
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="paddler@example.com"
            />
          </label>
          <button
            type="submit"
            className="primary-action primary-action--compact"
          >
            Send invite
          </button>
          {pending && pending.invitedCount ? (
            <p className="group-invite__count">
              {pending.invitedCount} invite
              {pending.invitedCount === 1 ? "" : "s"} pending
            </p>
          ) : null}
          {inviteNotice ? (
            <p className="group-invite__notice">{inviteNotice}</p>
          ) : null}
        </form>
      </>
    ) : null;

  return (
    <section className="groups-panel">
      {error ? <p className="groups-panel__error">{error}</p> : null}

      {selectedSessionId ? (
        <SessionDetailPanel
          sessionId={selectedSessionId}
          onBack={() => {
            setSelectedSessionId(null);
            void loadGroups();
          }}
        />
      ) : groupDetail && selectedGroupId ? (
        // Group page (member view) — the group as its own entity.
        <div className="group-detail">
          <div className="group-detail__head">
            <button
              type="button"
              className="ghost-button ghost-button--compact"
              onClick={() => setSelectedGroupId(null)}
            >
              <ChevronLeft size={16} /> My groups
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

          {canManage ? (
            <div className="content-columns">
              <div className="content-columns__main">{primarySections}</div>
              <aside className="content-columns__aside">{manageAside}</aside>
            </div>
          ) : (
            primarySections
          )}
        </div>
      ) : publicGroup && selectedGroupId ? (
        // Group page (public/limited view) — non-members of a private group.
        <div className="group-detail">
          <div className="group-detail__head">
            <button
              type="button"
              className="ghost-button ghost-button--compact"
              onClick={() => setSelectedGroupId(null)}
            >
              <ChevronLeft size={16} /> My groups
            </button>
          </div>
          <header className="group-detail__title">
            <h2>{publicGroup.name}</h2>
            <p>
              {GROUP_KIND_LABELS[publicGroup.kind]} · {publicGroup.memberCount}{" "}
              member{publicGroup.memberCount === 1 ? "" : "s"}
            </p>
          </header>
          {publicGroup.description ? (
            <p className="group-detail__description">
              {publicGroup.description}
            </p>
          ) : null}
          <div className="group-detail__section">
            {publicGroup.myStatus === "requested" ? (
              <p className="group-invite__notice">
                Your request to join is pending approval.
              </p>
            ) : publicGroup.accessMode === "request_to_join" ? (
              <button
                type="button"
                className="primary-action"
                onClick={() => void handleRequestToJoin()}
              >
                Request to join
              </button>
            ) : (
              <p className="empty-state">
                This group is invite only. Ask a member to invite you.
              </p>
            )}
          </div>
        </div>
      ) : (
        // "My groups" — the user's list of groups.
        <div className="groups-list-view">
          <div className="groups-panel__head">
            <h2>My groups</h2>
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
            <ul className="groups-grid">
              {groups.map((group) => (
                <li key={group.id}>
                  <button
                    type="button"
                    className="group-row"
                    onClick={() => {
                      setSelectedSessionId(null);
                      setSelectedGroupId(group.id);
                    }}
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

          {upcomingSessions.length ? (
            <div className="group-detail__section">
              <h3>Upcoming sessions</h3>
              <ul className="session-list">
                {upcomingSessions.map((session) => {
                  const group = groups.find((g) => g.id === session.groupId);
                  return (
                    <li key={session.id}>
                      <button
                        type="button"
                        className="session-row"
                        onClick={() => {
                          setSelectedGroupId(session.groupId);
                          setSelectedSessionId(session.id);
                        }}
                      >
                        <span>
                          <strong>{session.title}</strong>
                          <small>
                            {formatWhen(session.scheduledFor)}
                            {group ? ` · ${group.name}` : ""}
                          </small>
                        </span>
                        <span
                          className={`status-chip status-chip--${session.status}`}
                        >
                          {session.status}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
