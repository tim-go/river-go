import { useEffect, useState, type FormEvent } from "react";
import {
  Check,
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
import { EntityPage, type EntityTab } from "./EntityPage";

interface GroupsPanelProps {
  isSignedIn: boolean;
  // The open group entity, from the URL (/g/<token>) — a handle or id, or null
  // for the "My groups" list. Driven by App routing, not internal state.
  routeGroup: string | null;
  onOpenGroup: (idOrHandle: string | null) => void;
  onSignIn: () => void;
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

// The async clipboard API is unavailable in insecure contexts (e.g. http on a
// LAN IP), so fall back to a hidden-textarea + execCommand copy.
async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(textarea);
  if (!ok) {
    throw new Error("Copy failed");
  }
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

export function GroupsPanel({
  isSignedIn,
  routeGroup,
  onOpenGroup,
  onSignIn,
  rivers,
}: GroupsPanelProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [sessions, setSessions] = useState<GroupSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [groupDetail, setGroupDetail] = useState<GroupDetail | null>(null);
  const [publicGroup, setPublicGroup] = useState<GroupPublic | null>(null);
  const [pending, setPending] = useState<GroupPending | null>(null);
  // The route token (routeGroup) may be a handle; API calls need the resolved
  // group UUID, which the fetched group carries.
  const selectedGroupId = groupDetail?.id ?? publicGroup?.id ?? null;
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
  const [groupTab, setGroupTab] = useState("overview");
  const [memberQuery, setMemberQuery] = useState("");
  const [showAllMembers, setShowAllMembers] = useState(false);

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
    // Drive the open group from the route token (handle or id), not the resolved
    // id — the id only exists once the group has been fetched.
    if (!routeGroup) {
      setGroupDetail(null);
      setPublicGroup(null);
      setPending(null);
      return;
    }
    let active = true;
    setInviteNotice("");
    setIsEditingHandle(false);
    setGroupTab("overview");
    setMemberQuery("");
    setShowAllMembers(false);
    fetchGroup(routeGroup)
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
  }, [routeGroup]);

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
    if (!routeGroup) {
      return;
    }
    const view = await fetchGroup(routeGroup);
    if (view.access === "member") {
      setGroupDetail(view.group);
      if (canManage) {
        setPending(await fetchPending(view.group.id).catch(() => null));
      }
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
      onOpenGroup(created.handle ?? created.id);
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
        onOpenGroup(null);
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
      onOpenGroup(null);
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

  // Signed-out visitors can still view a group entity page (public view) when
  // they arrive via its URL; only the "My groups" list needs sign-in.
  if (!isSignedIn && !routeGroup) {
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

  // ----- Group entity page (member view): per-tab panels -----
  const gd = groupDetail && selectedGroupId ? groupDetail : null;

  const nowMs = Date.now();
  const isPastSession = (s: GroupSession) =>
    s.status === "completed" ||
    s.status === "cancelled" ||
    (s.scheduledFor ? Date.parse(s.scheduledFor) < nowMs : false);
  const upcomingGroupSessions = groupSessions
    .filter((s) => !isPastSession(s))
    .sort(
      (a, b) =>
        (a.scheduledFor ? Date.parse(a.scheduledFor) : Infinity) -
        (b.scheduledFor ? Date.parse(b.scheduledFor) : Infinity),
    );
  const pastGroupSessions = groupSessions
    .filter(isPastSession)
    .sort(
      (a, b) =>
        (b.scheduledFor ? Date.parse(b.scheduledFor) : 0) -
        (a.scheduledFor ? Date.parse(a.scheduledFor) : 0),
    );

  const renderSessionRow = (session: GroupSession) => (
    <li key={session.id}>
      <button
        type="button"
        className="session-row"
        onClick={() => setSelectedSessionId(session.id)}
      >
        <span>
          <strong>{session.title}</strong>
          <small>
            {formatWhen(session.scheduledFor)} · {session.participantCount} going
          </small>
        </span>
        <span className={`status-chip status-chip--${session.status}`}>
          {session.status}
        </span>
      </button>
    </li>
  );

  const renderMemberRow = (member: GroupMember) => (
    <li key={member.id} className="group-member-row">
      <span>
        <strong>{member.publicName}</strong>
        <small>{GROUP_ROLE_LABELS[member.role]}</small>
      </span>
      {gd && canManage && member.role !== "owner" ? (
        <span className="group-member-row__actions">
          {isOwner ? (
            <select
              value={member.role}
              onChange={(event) =>
                void runGroupAction(
                  () =>
                    setMemberRole(
                      gd.id,
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
                () => removeMember(gd.id, member.memberId),
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
  );

  const inviteLinkBlock = gd ? (
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
          const inviteUrl = `${window.location.origin}/g/${gd.handle ?? gd.id}`;
          return (
            <span className="group-invite-link__view">
              <code title={inviteUrl}>{inviteUrl}</code>
              <button
                type="button"
                className="ghost-button ghost-button--compact"
                onClick={() => {
                  void copyToClipboard(inviteUrl)
                    .then(() => {
                      setLinkCopied(true);
                      window.setTimeout(() => setLinkCopied(false), 1800);
                    })
                    .catch(() => setError("Could not copy the link."));
                }}
              >
                {linkCopied ? <Check size={14} /> : <Copy size={14} />}
                {linkCopied ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                className="ghost-button ghost-button--compact"
                onClick={() => {
                  setHandleDraft(gd.handle ?? "");
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
  ) : null;

  const requestsSection =
    gd && canManage && pending && pending.requests.length ? (
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
                      () => respondToRequest(gd.id, request.memberId, true),
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
                      () => respondToRequest(gd.id, request.memberId, false),
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
    ) : null;

  const memberFilter = memberQuery.trim().toLowerCase();
  const filteredMembers = gd
    ? memberFilter
      ? gd.members.filter((m) =>
          m.publicName.toLowerCase().includes(memberFilter),
        )
      : gd.members
    : [];
  const visibleMembers = showAllMembers
    ? filteredMembers
    : filteredMembers.slice(0, 25);

  const membersPanel = gd ? (
    <>
      {requestsSection}
      <div className="group-detail__section">
        <h3>Members · {gd.memberCount}</h3>
        <div className="entity-toolbar">
          <input
            type="search"
            value={memberQuery}
            onChange={(event) => setMemberQuery(event.target.value)}
            placeholder="Search members"
          />
        </div>
        {filteredMembers.length ? (
          <ul className="group-member-list">
            {visibleMembers.map(renderMemberRow)}
          </ul>
        ) : (
          <p className="empty-state">No members match “{memberQuery}”.</p>
        )}
        {!showAllMembers && filteredMembers.length > 25 ? (
          <button
            type="button"
            className="ghost-button ghost-button--compact"
            onClick={() => setShowAllMembers(true)}
          >
            Show all {filteredMembers.length}
          </button>
        ) : null}
      </div>
    </>
  ) : null;

  const sessionsPanel = gd ? (
    <>
      <div className="group-detail__section">
        <div className="group-detail__section-head">
          <h3>Upcoming sessions</h3>
          {canManageSessions ? (
            <button
              type="button"
              className="ghost-button ghost-button--compact"
              onClick={() => setIsCreatingSession((open) => !open)}
            >
              <Plus size={15} /> {isCreatingSession ? "Cancel" : "Plan session"}
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
                onChange={(event) => setSessionScheduledFor(event.target.value)}
              />
            </label>
            <label>
              Meeting point
              <input
                value={sessionMeetingPoint}
                onChange={(event) => setSessionMeetingPoint(event.target.value)}
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
        {upcomingGroupSessions.length ? (
          <ul className="session-list">
            {upcomingGroupSessions.map(renderSessionRow)}
          </ul>
        ) : (
          <p className="empty-state">No sessions planned yet.</p>
        )}
      </div>
      {pastGroupSessions.length ? (
        <div className="group-detail__section">
          <h3>Past sessions</h3>
          <ul className="session-list">
            {pastGroupSessions.map(renderSessionRow)}
          </ul>
        </div>
      ) : null}
    </>
  ) : null;

  const overviewPanel = gd ? (
    <>
      {gd.description ? (
        <div className="group-detail__section">
          <p>{gd.description}</p>
        </div>
      ) : null}
      <div className="group-detail__section">
        <div className="group-detail__section-head">
          <h3>Next session</h3>
          {canManageSessions ? (
            <button
              type="button"
              className="ghost-button ghost-button--compact"
              onClick={() => setGroupTab("sessions")}
            >
              <Plus size={15} /> Plan session
            </button>
          ) : null}
        </div>
        {upcomingGroupSessions.length ? (
          <ul className="session-list">
            {renderSessionRow(upcomingGroupSessions[0])}
          </ul>
        ) : (
          <p className="empty-state">No sessions planned yet.</p>
        )}
      </div>
      <div className="group-detail__section">
        <div className="group-detail__section-head">
          <h3>Members · {gd.memberCount}</h3>
          <button
            type="button"
            className="ghost-button ghost-button--compact"
            onClick={() => setGroupTab("members")}
          >
            View all
          </button>
        </div>
        <ul className="group-member-list">
          {gd.members.slice(0, 5).map((member) => (
            <li key={member.id} className="group-member-row">
              <span>
                <strong>{member.publicName}</strong>
                <small>{GROUP_ROLE_LABELS[member.role]}</small>
              </span>
            </li>
          ))}
        </ul>
      </div>
      {canManage &&
      pending &&
      (pending.requests.length || pending.invitedCount) ? (
        <div className="group-detail__section">
          <p className="group-invite__count">
            {pending.requests.length} request
            {pending.requests.length === 1 ? "" : "s"} · {pending.invitedCount}{" "}
            invite{pending.invitedCount === 1 ? "" : "s"} pending{" "}
            <button
              type="button"
              className="ghost-button ghost-button--compact"
              onClick={() => setGroupTab("members")}
            >
              Review
            </button>
          </p>
        </div>
      ) : null}
    </>
  ) : null;

  const aboutPanel = gd ? (
    <>
      <div className="group-detail__section">
        <h3>About</h3>
        {gd.description ? (
          <p>{gd.description}</p>
        ) : (
          <p className="empty-state">No description yet.</p>
        )}
      </div>
      <div className="group-detail__section">
        <h3>Details</h3>
        <p>
          {GROUP_KIND_LABELS[gd.kind]}
          {gd.discipline ? ` · ${gd.discipline}` : ""} · {gd.visibility}
        </p>
      </div>
      <div className="group-detail__section">
        <h3>How to join</h3>
        <p>
          {gd.accessMode === "request_to_join"
            ? "Anyone with the link can request to join — a manager approves."
            : "Invite only — ask a member to invite you."}
        </p>
      </div>
    </>
  ) : null;

  const settingsPanel =
    gd && canManage ? (
      <>
        <div className="group-detail__section">
          <h3>Invite link</h3>
          {inviteLinkBlock}
          <label className="group-access-mode">
            Joining
            <select
              value={gd.accessMode}
              onChange={(event) =>
                void runGroupAction(
                  () =>
                    updateGroupSettings(gd.id, {
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
          <label className="group-access-mode">
            Visibility
            <select
              value={gd.visibility}
              onChange={(event) =>
                void runGroupAction(
                  () =>
                    updateGroupSettings(gd.id, {
                      visibility: event.target
                        .value as GroupDetail["visibility"],
                    }).then(setGroupDetail),
                  "Could not update visibility.",
                )
              }
            >
              <option value="private">Private</option>
              <option value="members">Members</option>
              <option value="public">Public</option>
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

  // The active group tab's body (member view).
  const groupTabBody =
    groupTab === "members"
      ? membersPanel
      : groupTab === "sessions"
        ? sessionsPanel
        : groupTab === "about"
          ? aboutPanel
          : groupTab === "settings"
            ? settingsPanel
            : overviewPanel;

  const groupTabs: EntityTab[] = [
    { id: "overview", label: "Overview" },
    { id: "about", label: "About" },
    { id: "members", label: "Members" },
    { id: "sessions", label: "Sessions" },
    ...(canManage ? [{ id: "settings", label: "Settings" }] : []),
  ];

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
      ) : routeGroup ? (
        // A group is open via the route (/g/<token>). Resolve to member or
        // public view, or a loading state until the fetch lands.
        groupDetail ? (
        // Group entity page — a first-class page with tabs.
        <EntityPage
          icon={<UsersRound size={22} />}
          title={groupDetail.name}
          subtitle={`@${groupDetail.handle ?? groupDetail.id}`}
          meta={
            <>
              {GROUP_KIND_LABELS[groupDetail.kind]}
              {groupDetail.discipline ? ` · ${groupDetail.discipline}` : ""} ·{" "}
              {groupDetail.visibility} · {groupDetail.memberCount} member
              {groupDetail.memberCount === 1 ? "" : "s"}
            </>
          }
          actions={
            groupDetail.myStatus === "active" ? (
              <button
                type="button"
                className="ghost-button ghost-button--compact"
                onClick={() => void handleLeave()}
              >
                <LogOut size={15} /> Leave
              </button>
            ) : null
          }
          tabs={groupTabs}
          activeTab={groupTab}
          onTabChange={setGroupTab}
        >
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
          {groupTabBody}
        </EntityPage>
        ) : publicGroup ? (
        // Group entity page — public/limited view (non-members).
        <EntityPage
          icon={<UsersRound size={22} />}
          title={publicGroup.name}
          subtitle={`@${publicGroup.handle ?? publicGroup.id}`}
          meta={
            <>
              {GROUP_KIND_LABELS[publicGroup.kind]}
              {publicGroup.discipline ? ` · ${publicGroup.discipline}` : ""} ·{" "}
              {publicGroup.memberCount} member
              {publicGroup.memberCount === 1 ? "" : "s"}
            </>
          }
          actions={
            !isSignedIn ? (
              <button
                type="button"
                className="primary-action primary-action--compact"
                onClick={onSignIn}
              >
                Sign in to join
              </button>
            ) : publicGroup.myStatus === "requested" ? (
              <span className="status-chip">request pending</span>
            ) : publicGroup.accessMode === "request_to_join" ? (
              <button
                type="button"
                className="primary-action primary-action--compact"
                onClick={() => void handleRequestToJoin()}
              >
                Request to join
              </button>
            ) : (
              <span className="status-chip status-chip--muted">
                Invite only
              </span>
            )
          }
          tabs={[
            { id: "overview", label: "Overview" },
            { id: "about", label: "About" },
          ]}
          activeTab={groupTab === "about" ? "about" : "overview"}
          onTabChange={setGroupTab}
        >
          {groupTab === "about" ? (
            <>
              <div className="group-detail__section">
                <h3>About</h3>
                {publicGroup.description ? (
                  <p>{publicGroup.description}</p>
                ) : (
                  <p className="empty-state">No description yet.</p>
                )}
              </div>
              <div className="group-detail__section">
                <h3>How to join</h3>
                <p>
                  {publicGroup.accessMode === "request_to_join"
                    ? "Anyone with the link can request to join — a manager approves."
                    : "Invite only — ask a member to invite you."}
                </p>
              </div>
            </>
          ) : (
            <div className="group-detail__section">
              {publicGroup.description ? <p>{publicGroup.description}</p> : null}
              {!isSignedIn ? (
                <button
                  type="button"
                  className="primary-action"
                  onClick={onSignIn}
                >
                  Sign in to join
                </button>
              ) : publicGroup.myStatus === "requested" ? (
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
          )}
        </EntityPage>
        ) : (
          <p className="empty-state">Loading group…</p>
        )
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
                      onOpenGroup(group.handle ?? group.id);
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
                          onOpenGroup(group?.handle ?? session.groupId);
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
