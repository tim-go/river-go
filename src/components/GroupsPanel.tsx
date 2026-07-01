import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  Camera,
  Check,
  Copy,
  Crop,
  LogOut,
  Plus,
  Trash2,
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
  cancelInviteOrWithdraw,
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
import { uploadGroupCover } from "../services/groupCoverUpload";
import { ChangeRoleDialog } from "./ChangeRoleDialog";
import { ConfirmDialog } from "./ConfirmDialog";
import { SessionDetailPanel } from "./SessionDetailPanel";
import { Avatar } from "./Avatar";
import { EntityPage, type EntityTab } from "./EntityPage";
import { RiverPicker, type RiverPickerOption } from "./RiverPicker";

interface GroupsPanelProps {
  isSignedIn: boolean;
  // The open group entity, from the URL (/g/<token>) — a handle or id, or null
  // for the "My groups" list. Driven by App routing, not internal state.
  routeGroup: string | null;
  onOpenGroup: (idOrHandle: string | null) => void;
  // Back button on an open club page: where it goes + its label (set by the
  // page that opened the club, e.g. "Discover"). Defaults to the clubs list.
  onGroupBack: () => void;
  groupBackLabel: string;
  onOpenProfile: (idOrHandle: string, backLabel?: string) => void;
  onSignIn: () => void;
  rivers: RiverPickerOption[];
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

const DISCIPLINE_LABELS: Record<GroupDiscipline, string> = {
  whitewater: "Whitewater",
  touring: "Touring",
  both: "Whitewater & touring",
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
  onGroupBack,
  groupBackLabel,
  onOpenProfile,
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
  const [confirmDialog, setConfirmDialog] = useState<{
    eyebrow?: string;
    title: string;
    body: ReactNode;
    confirmLabel: string;
    onConfirm: () => void;
  } | null>(null);
  const [roleDialogMember, setRoleDialogMember] = useState<GroupMember | null>(
    null,
  );

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
  const [nameDraft, setNameDraft] = useState("");
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [coverPositionDraft, setCoverPositionDraft] = useState(50);
  const [coverXDraft, setCoverXDraft] = useState(50);
  const [coverZoomDraft, setCoverZoomDraft] = useState(100);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverDragging, setCoverDragging] = useState(false);
  // The cover editor (drag/zoom/save) is gated behind an explicit Edit; the
  // Settings view just shows the cover + add/replace/edit/remove actions.
  const [coverEditMode, setCoverEditMode] = useState(false);
  const coverFileRef = useRef<HTMLInputElement | null>(null);
  // Drag origin for repositioning the cover (pointer + draft start values).
  const coverDragStart = useRef({ px: 0, py: 0, x: 50, y: 50 });

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
      setError(errorMessage(loadError, "Could not load your clubs."));
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
          setError(errorMessage(detailError, "Could not load that club."));
        }
      });
    return () => {
      active = false;
    };
    // Re-fetch on auth change too: a guest viewing the public view who signs in
    // should upgrade to the member view (and vice versa).
  }, [routeGroup, isSignedIn]);

  // canManage (owner/organiser): settings, remove member, role changes, cover
  // + about edits. canManageMembers (+ leader): membership intake — invite,
  // see + approve/decline requests, cancel invites. Any active member can
  // share the group link.
  const canManage =
    groupDetail?.myRole === "owner" || groupDetail?.myRole === "organiser";
  const canManageMembers = canManage || groupDetail?.myRole === "leader";
  const isOwner = groupDetail?.myRole === "owner";
  const isActiveMember = groupDetail?.myStatus === "active";

  useEffect(() => {
    if (!selectedGroupId || !canManageMembers) {
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
  }, [selectedGroupId, canManageMembers, groupDetail?.memberCount]);

  // Seed the editable About fields when a different group loads (kept across
  // in-place reloads, which preserve the id).
  useEffect(() => {
    setNameDraft(groupDetail?.name ?? "");
    setDescriptionDraft(groupDetail?.description ?? "");
    setCoverPositionDraft(groupDetail?.coverPosition ?? 50);
    setCoverXDraft(groupDetail?.coverX ?? 50);
    setCoverZoomDraft(groupDetail?.coverZoom ?? 100);
    // Re-seed the frame drafts when the cover image itself changes too.
  }, [groupDetail?.id, groupDetail?.coverImageUrl]);

  async function reloadGroup() {
    if (!routeGroup) {
      return;
    }
    const view = await fetchGroup(routeGroup);
    if (view.access === "member") {
      setGroupDetail(view.group);
      if (canManageMembers) {
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
      setError(errorMessage(createError, "Could not create the club."));
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

  async function handleSaveAbout(event: FormEvent) {
    event.preventDefault();
    if (!nameDraft.trim()) {
      return;
    }
    await runGroupAction(async () => {
      const updated = await updateGroupSettings(selectedGroupId!, {
        name: nameDraft.trim(),
        description: descriptionDraft.trim() || null,
      });
      setGroupDetail(updated);
    }, "Could not save the club details.");
  }

  async function handleCoverUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selectedGroupId) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file for the cover.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError("Image is too large — max 12 MB.");
      return;
    }
    setError("");
    setCoverUploading(true);
    try {
      const { url, path } = await uploadGroupCover(selectedGroupId, file);
      const updated = await updateGroupSettings(selectedGroupId, {
        coverImageUrl: url,
        coverImagePath: path,
      });
      setGroupDetail(updated);
      // Drop straight into edit mode so the manager can frame the new photo.
      setCoverEditMode(true);
    } catch (uploadError) {
      setError(errorMessage(uploadError, "Could not upload the cover photo."));
    } finally {
      setCoverUploading(false);
    }
  }

  async function handleSaveCoverFrame() {
    await runGroupAction(
      () =>
        updateGroupSettings(selectedGroupId!, {
          coverPosition: coverPositionDraft,
          coverX: coverXDraft,
          coverZoom: coverZoomDraft,
        }).then(setGroupDetail),
      "Could not update the cover photo.",
    );
    setCoverEditMode(false);
  }

  // Discard unsaved framing and leave edit mode.
  function cancelCoverEdit() {
    setCoverXDraft(groupDetail?.coverX ?? 50);
    setCoverPositionDraft(groupDetail?.coverPosition ?? 50);
    setCoverZoomDraft(groupDetail?.coverZoom ?? 100);
    setCoverEditMode(false);
  }

  // Drag the preview to pan the cover on both axes. Dragging the photo right
  // reveals its left side → object-position X decreases, so the photo follows
  // the cursor.
  function handleCoverPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    coverDragStart.current = {
      px: event.clientX,
      py: event.clientY,
      x: coverXDraft,
      y: coverPositionDraft,
    };
    setCoverDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function handleCoverPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!coverDragging) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const start = coverDragStart.current;
    const clamp = (value: number) => Math.min(100, Math.max(0, value));
    const nextX = clamp(
      start.x - ((event.clientX - start.px) / rect.width) * 100,
    );
    const nextY = clamp(
      start.y - ((event.clientY - start.py) / rect.height) * 100,
    );
    setCoverXDraft(Math.round(nextX));
    setCoverPositionDraft(Math.round(nextY));
  }
  function handleCoverPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    setCoverDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  async function handleRemoveCover() {
    await runGroupAction(
      () =>
        updateGroupSettings(selectedGroupId!, {
          coverImageUrl: null,
          coverImagePath: null,
        }).then(setGroupDetail),
      "Could not remove the cover photo.",
    );
  }

  function handleTransfer(member: GroupMember) {
    setConfirmDialog({
      eyebrow: "Transfer ownership",
      title: `Make ${member.publicName} the owner?`,
      body: (
        <>
          <p>
            {member.publicName} will become the owner of “
            {gd?.name ?? "this club"}” with full control — including removing
            members, changing settings, or deleting the club.
          </p>
          <p>
            You'll be demoted to organiser, and only the new owner can transfer
            ownership back. This can't be undone by you.
          </p>
        </>
      ),
      confirmLabel: "Transfer ownership",
      onConfirm: () =>
        void runGroupAction(
          () => transferOwnership(selectedGroupId!, member.memberId),
          "Could not transfer ownership.",
        ),
    });
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
      setError(errorMessage(leaveError, "Could not leave the club."));
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
      setError(errorMessage(sessionError, "Could not plan the meetup."));
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
              Sign in to create clubs for your team or friends, plan meetups,
              share meeting points, and coordinate who is coming.
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

  const renderMemberRow = (member: GroupMember, withControls = false) => (
    <li key={member.id} className="group-member-row">
      <button
        type="button"
        className="group-member-row__person group-member-row__person--link"
        onClick={() => onOpenProfile(member.memberId, gd?.name ?? "Back")}
      >
        <Avatar name={member.publicName} avatar={member.avatar} size={36} />
        <span>
          <strong>{member.publicName}</strong>
          <small>{GROUP_ROLE_LABELS[member.role]}</small>
        </span>
      </button>
      {gd && withControls && canManage && member.role !== "owner" ? (
        <span className="group-member-row__actions">
          <button
            type="button"
            className="ghost-button ghost-button--compact"
            onClick={() => setRoleDialogMember(member)}
          >
            Change role
          </button>
          <button
            type="button"
            className="ghost-button ghost-button--compact"
            onClick={() =>
              setConfirmDialog({
                eyebrow: "Remove member",
                title: `Remove ${member.publicName}?`,
                body: (
                  <p>
                    They'll lose access to “{gd.name}” and would need to be
                    re-invited or request to join again.
                  </p>
                ),
                confirmLabel: "Remove",
                onConfirm: () =>
                  void runGroupAction(
                    () => removeMember(gd.id, member.memberId),
                    "Could not remove the member.",
                  ),
              })
            }
            aria-label={`Remove ${member.publicName}`}
          >
            <X size={14} />
          </button>
        </span>
      ) : null}
    </li>
  );

  // Read-only invite link for the right gutter. Editing the handle lives in
  // the Settings tab (see handleEditor) so this stays a compact link + copy.
  const inviteLinkBlock = gd
    ? (() => {
        const inviteUrl = `${window.location.origin}/club/${gd.handle ?? gd.id}`;
        return (
          <div className="group-invite-link group-invite-link--readonly">
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
          </div>
        );
      })()
    : null;

  const requestsSection =
    gd && canManageMembers && pending && pending.requests.length ? (
      <div className="group-detail__section">
        <h3>Join requests</h3>
        <ul className="group-member-list">
          {pending.requests.map((request) => (
            <li key={request.memberId} className="group-member-row">
              <button
                type="button"
                className="group-member-row__person group-member-row__person--link"
                onClick={() =>
                  onOpenProfile(request.memberId, gd?.name ?? "Back")
                }
              >
                <Avatar
                  name={request.publicName}
                  avatar={request.avatar}
                  size={36}
                />
                <span>
                  <strong>{request.publicName}</strong>
                  <small>wants to join</small>
                </span>
              </button>
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

  const invitesSection =
    gd && canManageMembers && pending && pending.invites.length ? (
      <div className="group-detail__section">
        <h3>Pending invites · {pending.invites.length}</h3>
        <ul className="group-member-list">
          {pending.invites.map((invite) => (
            <li key={invite.memberId} className="group-member-row">
              <button
                type="button"
                className="group-member-row__person group-member-row__person--link"
                onClick={() =>
                  onOpenProfile(invite.memberId, gd?.name ?? "Back")
                }
              >
                <Avatar
                  name={invite.publicName}
                  avatar={invite.avatar}
                  size={36}
                />
                <span>
                  <strong>{invite.publicName}</strong>
                  <small>invited · not yet accepted</small>
                </span>
              </button>
              <span className="group-member-row__actions">
                <button
                  type="button"
                  className="ghost-button ghost-button--compact"
                  onClick={() =>
                    setConfirmDialog({
                      eyebrow: "Cancel invite",
                      title: `Cancel the invite to ${invite.publicName}?`,
                      body: (
                        <p>
                          They won't be able to join unless you invite them
                          again.
                        </p>
                      ),
                      confirmLabel: "Cancel invite",
                      onConfirm: () =>
                        void runGroupAction(
                          () => cancelInviteOrWithdraw(gd.id, invite.memberId),
                          "Could not cancel the invite.",
                        ),
                    })
                  }
                >
                  <X size={14} /> Cancel
                </button>
              </span>
            </li>
          ))}
        </ul>
      </div>
    ) : null;

  // Roster ordered by role (owner → organiser → leader → member), then name.
  const memberRoleRank: Record<GroupRole, number> = {
    owner: 0,
    organiser: 1,
    leader: 2,
    member: 3,
  };
  const sortedMembers = gd
    ? [...gd.members].sort(
        (a, b) =>
          memberRoleRank[a.role] - memberRoleRank[b.role] ||
          a.publicName.localeCompare(b.publicName, undefined, {
            sensitivity: "base",
          }),
      )
    : [];
  const memberFilter = memberQuery.trim().toLowerCase();
  const filteredMembers = memberFilter
    ? sortedMembers.filter((m) =>
        m.publicName.toLowerCase().includes(memberFilter),
      )
    : sortedMembers;
  // TODO: server-side pagination/search for very large rosters (currently the
  // whole roster ships in one payload and is capped to 25 client-side).
  const visibleMembers = showAllMembers
    ? filteredMembers
    : filteredMembers.slice(0, 25);

  const inviteMemberForm =
    gd && canManageMembers ? (
      <form
        className="group-invite group-detail__section"
        onSubmit={handleInviteByEmail}
      >
        <h3>Invite a member</h3>
        <p className="source-note">
          Sends an in-app invite if they're already on RiverLaunch. To invite
          someone new, share your group invite link.
        </p>
        <label>
          <span className="field-label-icon">
            <UserPlus size={15} /> By email
          </span>
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
        {inviteNotice ? (
          <p className="group-invite__notice">{inviteNotice}</p>
        ) : null}
      </form>
    ) : null;

  // The member roster (search + role-tier sections). withControls renders the
  // per-row manager controls (role/remove/make-owner) — used on the Manage
  // members tab; the Members tab is a straight read-only list.
  const renderRoster = (withControls: boolean) =>
    gd ? (
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
          (
            [
              {
                title: "Owners & organisers",
                roles: ["owner", "organiser"] as GroupRole[],
              },
              { title: "Leaders", roles: ["leader"] as GroupRole[] },
              { title: "Members", roles: ["member"] as GroupRole[] },
            ] as const
          ).map((tier) => {
            const tierMembers = visibleMembers.filter((m) =>
              tier.roles.includes(m.role),
            );
            return tierMembers.length ? (
              <div key={tier.title} className="group-member-tier">
                <h4>{tier.title}</h4>
                <ul className="group-member-list">
                  {tierMembers.map((m) => renderMemberRow(m, withControls))}
                </ul>
              </div>
            ) : null;
          })
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
    ) : null;

  const managePanel = gd ? (
    <div className="manage-panel">
      <div className="manage-panel__intake">
        {inviteMemberForm}
        {requestsSection}
        {invitesSection}
      </div>
      <div className="manage-panel__members">{renderRoster(true)}</div>
    </div>
  ) : null;

  const membersPanel = gd ? (
    <>
      {renderRoster(false)}
    </>
  ) : null;

  const sessionsPanel = gd ? (
    <>
      <div className="group-detail__section">
        <div className="group-detail__section-head">
          <h3>Upcoming meetups</h3>
          {canManageSessions && !isCreatingSession ? (
            <button
              type="button"
              className="ghost-button ghost-button--compact"
              onClick={() => setIsCreatingSession(true)}
            >
              <Plus size={15} /> Plan meetup
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
              <RiverPicker
                rivers={rivers}
                value={sessionRiverId}
                onChange={setSessionRiverId}
                placeholder="Choose a river (optional)"
                allowClear
              />
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
            <div className="form-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => setIsCreatingSession(false)}
              >
                Cancel
              </button>
              <button type="submit" className="primary-action">
                Plan meetup
              </button>
            </div>
          </form>
        ) : upcomingGroupSessions.length ? (
          <ul className="session-list">
            {upcomingGroupSessions.map(renderSessionRow)}
          </ul>
        ) : (
          <p className="empty-state">No meetups planned yet.</p>
        )}
      </div>
      {!isCreatingSession && pastGroupSessions.length ? (
        <div className="group-detail__section">
          <h3>Past meetups</h3>
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
          <h3>Next meetup</h3>
          <button
            type="button"
            className="ghost-button ghost-button--compact"
            onClick={() => setGroupTab("sessions")}
          >
            View all
          </button>
        </div>
        {upcomingGroupSessions.length ? (
          <ul className="session-list">
            {renderSessionRow(upcomingGroupSessions[0])}
          </ul>
        ) : (
          <p className="empty-state">No meetups planned yet.</p>
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
          {gd.members.slice(0, 5).map((member) => renderMemberRow(member))}
        </ul>
      </div>
      {canManageMembers &&
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
              onClick={() => setGroupTab("manage")}
            >
              Review
            </button>
          </p>
        </div>
      ) : null}
      {isActiveMember ? (
        <div className="group-detail__section overview-club-link">
          <h3>Club link</h3>
          <p className="source-note">
            Share this to invite people to the club.
          </p>
          {inviteLinkBlock}
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
          <h3>Cover photo</h3>
          {coverEditMode && gd.coverImageUrl ? (
            // EDIT MODE — drag to frame, zoom, then save or cancel.
            <>
              <div
                className={`entity-page__cover group-cover-preview group-cover-preview--draggable${
                  coverDragging ? " group-cover-preview--dragging" : ""
                }`}
                onPointerDown={handleCoverPointerDown}
                onPointerMove={handleCoverPointerMove}
                onPointerUp={handleCoverPointerUp}
                onPointerCancel={handleCoverPointerUp}
              >
                <img
                  className="entity-page__cover-img"
                  src={gd.coverImageUrl}
                  alt=""
                  draggable={false}
                  style={{
                    objectPosition: `${coverXDraft}% ${coverPositionDraft}%`,
                    transformOrigin: `${coverXDraft}% ${coverPositionDraft}%`,
                    transform: `scale(${coverZoomDraft / 100})`,
                  }}
                />
              </div>
              <p className="group-cover-hint">Drag the photo to reposition.</p>
              <div className="group-cover-edit-row">
                <label className="group-cover-zoom">
                  Zoom
                  <input
                    type="range"
                    min={100}
                    max={300}
                    step={5}
                    value={coverZoomDraft}
                    onChange={(event) =>
                      setCoverZoomDraft(Number(event.target.value))
                    }
                  />
                </label>
                <button
                  type="button"
                  className="ghost-button ghost-button--compact"
                  onClick={cancelCoverEdit}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="primary-action primary-action--compact"
                  disabled={
                    coverXDraft === gd.coverX &&
                    coverPositionDraft === gd.coverPosition &&
                    coverZoomDraft === gd.coverZoom
                  }
                  onClick={() => void handleSaveCoverFrame()}
                >
                  Save
                </button>
              </div>
            </>
          ) : (
            // VIEW MODE — show the current cover (if any) + actions.
            <>
              {gd.coverImageUrl ? (
                <div className="entity-page__cover group-cover-preview">
                  <img
                    className="entity-page__cover-img"
                    src={gd.coverImageUrl}
                    alt=""
                    draggable={false}
                    style={{
                      objectPosition: `${gd.coverX}% ${gd.coverPosition}%`,
                      transformOrigin: `${gd.coverX}% ${gd.coverPosition}%`,
                      transform: `scale(${gd.coverZoom / 100})`,
                    }}
                  />
                </div>
              ) : (
                <div className="entity-page__cover group-cover-preview group-cover-preview--empty">
                  No cover photo yet
                </div>
              )}
              <div className="group-cover-actions">
                <button
                  type="button"
                  className="ghost-button ghost-button--compact"
                  disabled={coverUploading}
                  onClick={() => coverFileRef.current?.click()}
                >
                  <Camera size={15} />{" "}
                  {coverUploading
                    ? "Uploading…"
                    : gd.coverImageUrl
                      ? "Change picture"
                      : "Add picture"}
                </button>
                {gd.coverImageUrl ? (
                  <>
                    <button
                      type="button"
                      className="ghost-button ghost-button--compact"
                      onClick={() => setCoverEditMode(true)}
                    >
                      <Crop size={15} /> Reframe
                    </button>
                    <button
                      type="button"
                      className="ghost-button ghost-button--compact ghost-button--danger"
                      onClick={() =>
                        setConfirmDialog({
                          eyebrow: "Remove cover photo",
                          title: "Remove the cover photo?",
                          body: (
                            <p>
                              The club will show no cover banner until you add a
                              new one.
                            </p>
                          ),
                          confirmLabel: "Remove",
                          onConfirm: () => void handleRemoveCover(),
                        })
                      }
                    >
                      <Trash2 size={15} /> Remove
                    </button>
                  </>
                ) : null}
              </div>
            </>
          )}
          <input
            ref={coverFileRef}
            type="file"
            accept="image/*"
            // Inline display:none — the global input[type=file] rule overrides
            // the `hidden` attribute. Triggered via the styled button + ref.
            style={{ display: "none" }}
            disabled={coverUploading}
            onChange={(event) => void handleCoverUpload(event)}
          />
        </div>

        <form className="group-detail__section" onSubmit={handleSaveAbout}>
          <h3>About</h3>
          <label>
            Name
            <input
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              required
            />
          </label>
          <label className="group-about-description">
            Description
            <textarea
              value={descriptionDraft}
              onChange={(event) => setDescriptionDraft(event.target.value)}
              rows={6}
              placeholder="What's this club about? Where and when do you paddle?"
            />
          </label>
          <button
            type="submit"
            className="primary-action primary-action--compact"
            disabled={
              nameDraft.trim() === (gd.name ?? "") &&
              descriptionDraft.trim() === (gd.description ?? "")
            }
          >
            Save
          </button>
        </form>

        <div className="group-detail__section">
          <h3>Club link</h3>
          <p className="source-note">
            The handle used in this club&rsquo;s shareable link.
          </p>
          {isEditingHandle ? (
            <span className="group-invite-link__edit">
              <span className="group-invite-link__prefix">/club/</span>
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
            <span className="group-invite-link__view">
              <code>/club/{gd.handle ?? gd.id}</code>
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
          )}
        </div>

        <div className="group-detail__section">
          <h3>Joining &amp; visibility</h3>
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
      </>
    ) : null;

  // The active group tab's body (member view).
  const groupTabBody =
    groupTab === "members"
      ? membersPanel
      : groupTab === "sessions"
        ? sessionsPanel
        : groupTab === "manage"
          ? managePanel
          : groupTab === "about"
            ? aboutPanel
            : groupTab === "settings"
              ? settingsPanel
              : overviewPanel;

  const groupTabs: EntityTab[] = [
    { id: "overview", label: "Overview" },
    { id: "about", label: "About" },
    { id: "members", label: "Members" },
    { id: "sessions", label: "Meetups" },
    ...(canManageMembers ? [{ id: "manage", label: "Memberships" }] : []),
    ...(canManage ? [{ id: "settings", label: "Settings" }] : []),
  ];

  // Right gutter: club stats + contextual controls (member + public views).
  const nextGroupSession = upcomingGroupSessions[0];
  const memberAside = gd ? (
    <>
      <button
        type="button"
        className="group-detail__section group-aside-stat"
        onClick={() => setGroupTab("members")}
      >
        <span className="group-aside-stat__num">{gd.memberCount}</span>
        <span className="group-aside-stat__label">
          member{gd.memberCount === 1 ? "" : "s"}
        </span>
        {/* future: member avatars */}
      </button>
      <button
        type="button"
        className="group-detail__section group-aside-card"
        onClick={() => setGroupTab("sessions")}
      >
        <h3>Next meetup</h3>
        {nextGroupSession ? (
          <span className="group-aside-next">
            <strong>{nextGroupSession.title}</strong>
            <small>{formatWhen(nextGroupSession.scheduledFor)}</small>
          </span>
        ) : (
          <span className="empty-state">None planned</span>
        )}
      </button>
      <button
        type="button"
        className="group-detail__section group-aside-card"
        onClick={() => setGroupTab("about")}
      >
        <h3>About this club</h3>
        <p className="group-aside-facts">
          {GROUP_KIND_LABELS[gd.kind]}
          {gd.discipline ? ` · ${gd.discipline}` : ""} · {gd.visibility}
        </p>
      </button>
      {isActiveMember ? (
        <div className="group-detail__section">
          <h3>Club link</h3>
          <p className="source-note">Share this to invite people to the club.</p>
          {inviteLinkBlock}
        </div>
      ) : null}
    </>
  ) : null;

  const publicAside = publicGroup ? (
    <>
      <div className="group-detail__section group-aside-stat">
        <span className="group-aside-stat__num">{publicGroup.memberCount}</span>
        <span className="group-aside-stat__label">
          member{publicGroup.memberCount === 1 ? "" : "s"}
        </span>
      </div>
      <div className="group-detail__section">
        <h3>About this club</h3>
        <p className="group-aside-facts">
          {GROUP_KIND_LABELS[publicGroup.kind]}
          {publicGroup.discipline ? ` · ${publicGroup.discipline}` : ""}
        </p>
      </div>
      <div className="group-detail__section">
        <h3>Join</h3>
        {!isSignedIn ? (
          <button type="button" className="primary-action" onClick={onSignIn}>
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
            Invite only — ask a member to invite you.
          </p>
        )}
      </div>
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
          onOpenProfile={onOpenProfile}
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
          onBack={onGroupBack}
          backLabel={groupBackLabel}
          cover={
            groupDetail.coverImageUrl
              ? {
                  url: groupDetail.coverImageUrl,
                  x: groupDetail.coverX,
                  position: groupDetail.coverPosition,
                  zoom: groupDetail.coverZoom,
                }
              : undefined
          }
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
                onClick={() =>
                  setConfirmDialog({
                    eyebrow: "Leave club",
                    title: `Leave “${groupDetail.name}”?`,
                    body: (
                      <p>
                        You'll lose access to this club's meetups and members,
                        and would need to be re-invited or request to join
                        again.
                      </p>
                    ),
                    confirmLabel: "Leave club",
                    onConfirm: () => void handleLeave(),
                  })
                }
              >
                <LogOut size={15} /> Leave
              </button>
            ) : null
          }
          tabs={groupTabs}
          activeTab={groupTab}
          onTabChange={setGroupTab}
          aside={memberAside}
        >
          {groupTabBody}
        </EntityPage>
        ) : publicGroup ? (
        // Group entity page — public/limited view (non-members).
        <EntityPage
          icon={<UsersRound size={22} />}
          title={publicGroup.name}
          subtitle={`@${publicGroup.handle ?? publicGroup.id}`}
          onBack={onGroupBack}
          backLabel={groupBackLabel}
          cover={
            publicGroup.coverImageUrl
              ? {
                  url: publicGroup.coverImageUrl,
                  x: publicGroup.coverX,
                  position: publicGroup.coverPosition,
                  zoom: publicGroup.coverZoom,
                }
              : undefined
          }
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
            ) : publicGroup.myStatus === "invited" ? (
              <span className="status-chip">invited</span>
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
          aside={publicAside}
        >
          {publicGroup.myStatus === "invited" ? (
            <div className="group-invite-banner">
              <span>You have been invited to this club.</span>
              <span className="group-invite-banner__actions">
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
              {publicGroup.description ? (
                <p>{publicGroup.description}</p>
              ) : (
                <p className="empty-state">No description yet.</p>
              )}
            </div>
          )}
        </EntityPage>
        ) : (
          <p className="empty-state">Loading club…</p>
        )
      ) : (
        // "My groups" — the user's list of groups.
        <div className="groups-list-view">
          <div className="groups-panel__head">
            <h2>My clubs</h2>
            <button
              type="button"
              className="primary-action primary-action--compact"
              onClick={() => setIsCreatingGroup((open) => !open)}
            >
              <Plus size={16} /> {isCreatingGroup ? "Cancel" : "New club"}
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
                Create club
              </button>
            </form>
          ) : null}

          {isLoading ? (
            <p className="empty-state">Loading…</p>
          ) : groups.length ? (
            <ul className="groups-grid">
              {groups.map((group) => {
                const nextSession = upcomingSessions.find(
                  (s) => s.groupId === group.id && !isPastSession(s),
                );
                return (
                  <li key={group.id}>
                    <button
                      type="button"
                      className="group-card"
                      onClick={() => {
                        setSelectedSessionId(null);
                        onOpenGroup(group.handle ?? group.id);
                      }}
                    >
                      <span className="group-card__cover">
                        {group.coverImageUrl ? (
                          <img
                            className="group-card__cover-img"
                            src={group.coverImageUrl}
                            alt=""
                            style={{
                              objectPosition: `${group.coverX}% ${group.coverPosition}%`,
                              transformOrigin: `${group.coverX}% ${group.coverPosition}%`,
                              transform: `scale(${group.coverZoom / 100})`,
                            }}
                          />
                        ) : (
                          <span className="group-card__cover-empty">
                            <UsersRound size={26} />
                          </span>
                        )}
                        {group.myStatus === "invited" ? (
                          <span className="status-chip group-card__chip">
                            invited
                          </span>
                        ) : group.myStatus === "requested" ? (
                          <span className="status-chip group-card__chip">
                            request pending
                          </span>
                        ) : group.myRole ? (
                          <span className="status-chip status-chip--muted group-card__chip">
                            {GROUP_ROLE_LABELS[group.myRole]}
                          </span>
                        ) : null}
                      </span>
                      <span className="group-card__body">
                        <strong className="group-card__name">
                          {group.name}
                        </strong>
                        <span className="group-card__meta">
                          {GROUP_KIND_LABELS[group.kind]}
                          {group.discipline
                            ? ` · ${DISCIPLINE_LABELS[group.discipline]}`
                            : ""}{" "}
                          · {group.visibility} · {group.memberCount} member
                          {group.memberCount === 1 ? "" : "s"}
                        </span>
                        {group.description ? (
                          <span className="group-card__desc">
                            {group.description}
                          </span>
                        ) : null}
                        {nextSession ? (
                          <span className="group-card__next">
                            Next: {nextSession.title} ·{" "}
                            {formatWhen(nextSession.scheduledFor)}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="empty-state">
              No clubs yet. Create one to plan paddles with your team or
              friends.
            </p>
          )}

          {upcomingSessions.length ? (
            <div className="group-detail__section">
              <h3>Upcoming meetups</h3>
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

      {confirmDialog ? (
        <ConfirmDialog
          eyebrow={confirmDialog.eyebrow}
          title={confirmDialog.title}
          body={confirmDialog.body}
          confirmLabel={confirmDialog.confirmLabel}
          onConfirm={() => {
            confirmDialog.onConfirm();
            setConfirmDialog(null);
          }}
          onCancel={() => setConfirmDialog(null)}
        />
      ) : null}

      {roleDialogMember ? (
        <ChangeRoleDialog
          memberName={roleDialogMember.publicName}
          currentRole={roleDialogMember.role}
          canTransferOwnership={isOwner}
          onSave={(role) => {
            const member = roleDialogMember;
            setRoleDialogMember(null);
            void runGroupAction(
              () => setMemberRole(selectedGroupId!, member.memberId, role),
              "Could not change the role.",
            );
          }}
          onTransfer={() => {
            const member = roleDialogMember;
            setRoleDialogMember(null);
            handleTransfer(member);
          }}
          onCancel={() => setRoleDialogMember(null)}
        />
      ) : null}
    </section>
  );
}
