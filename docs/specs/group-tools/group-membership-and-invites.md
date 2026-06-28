---
roadmap_community_feature_group: Groups
roadmap_community_feature_item: Group Membership & Invites
roadmap_community_feature_phase: Soon
spec_schema: 4
maturity: Draft
---

# Group Membership & Invites

**Work state:** Proposed — supersedes the invite-by-name flow (GROUP-F2)
**Last updated:** 2026-06-28
**Scope:** How people join a group — invite by exact email, shareable invite
codes/links, and request-to-join with manager approval — without exposing a
searchable directory of the member base.

## Purpose

People need to add the right paddlers to a group, but RiverLaunch must not turn
the member base into a browsable directory. Letting anyone search all members by
name is an enumeration and privacy risk: it leaks who has an account and lets a
signed-in user harvest display names.

Following Strava's model, **members are not globally searchable**. You reach
someone you already know (you have their email), or you hand out an invite
code/link, or someone asks to join and a manager approves. Discovery of *people*
happens through shared groups, not a global search box.

## Product Role

- `Primary user objective:` Add known paddlers to a group, or let paddlers join a
  group, without anyone being able to browse or enumerate the member base.
- `Classification:` Community / privacy
- `Loop step:` Plan
- `Why this matters:` Groups are where the most valuable local knowledge forms,
  so joining must be easy — but member privacy and anti-abuse have to hold up.

## References

- `/docs/specs/group-tools/group-paddle-sessions.md` (groups, roles, `groups.visibility`)
- `/docs/specs/member-tools/member-profiles-and-history.md` (public name, email)
- `/docs/specs/contributions/trust-and-moderation.md` (trust levels, abuse)
- `/docs/specs/foundations/service-api.md`
- `/docs/specs/foundations/platform-configuration.md` (email provider)

## Requirements

### No Global Member Search

There must be **no endpoint that lets a member search or list the member base**.
The existing invite-by-name search (`GET /api/members/search`, GROUP-F2) is
removed. A member's existence, email, or display name must not be discoverable by
probing.

An interim hardening is already in place while this spec is built: the search
escapes `LIKE` wildcards, requires ≥3 characters, caps input length, and is
debounced. That reduces — but does not remove — enumeration, so the endpoint is
retired once the paths below ship.

Members remain reachable only through the three join paths below. Discovery of a
*person* is a side effect of a shared group (you can see fellow members of groups
you belong to, per `groups.visibility`), never a global lookup.

### Join Path 1 — Invite An Existing Member By Exact Email

A group manager can invite by typing the **full email address**. The backend
matches it (trimmed, lower-cased) against an existing member and creates a pending
invite.

To avoid turning invites into an account-existence oracle:

- The response is **neutral and identical** whether or not the email matches —
  e.g. "If they have a RiverLaunch account, they'll see the invite." The
  inviter is not told whether the address resolved, and the member's name/id is
  not echoed back.
- A pending invite must not reveal the invitee's identity to the inviter before
  they accept (see GINV-B1). The group shows a pending-invite **count**, not the
  invited person, until they join.

V1 invites **existing members only** — no email is sent to non-members, so there
is no outbound-email spam vector. Inviting people who have not signed up yet is
GINV-F7 (parked, needs email infrastructure and its own controls).

### Join Path 2 — Group Invite Code / Link

A group manager can generate a **shareable invite code** (and a corresponding
`/join/<code>` link) and distribute it out-of-band (message, email, club page).
This works regardless of anyone's privacy and needs no lookup.

- Opening a valid link, while signed in, joins the group (or creates a join
  request if the group requires approval — see Path 3).
- The code is a high-entropy secret. Managers can **revoke/rotate** it, and it
  supports an optional **expiry** and **max-uses** cap.
- A revoked or exhausted code returns a generic "this invite link is no longer
  valid" without leaking group details.

### Join Path 3 — Request To Join + Approval

A prospective member who reaches a group (via an invite link, or a discoverable
group if GINV-F8 ships) can **request to join**. A manager **approves or
declines** the request.

- Whether a group **auto-joins** on a valid invite link or **requires approval**
  is a per-group setting (GINV-B5); private groups default to approval.
- Declining a request is sticky: a declined requester cannot silently re-request
  (cooldown or block), mirroring the invite anti-abuse rules.

### Roles & Permissions

- Only group managers (owner/organiser/leader per GROUP-F1) may invite, generate
  or revoke codes, and approve/decline requests.
- Any signed-in member may use an invite link or request to join.
- Membership states extend the existing model: `invited` (manager-initiated),
  `requested` (member-initiated, awaiting approval), `active`, `left`
  (self-removed), `removed` (manager-removed — re-invitable, not terminal),
  `declined` (terminal/sticky, blocks silent re-invite/re-request).
- "Admin" in this spec means a manager role (organiser/leader per GROUP-F1);
  "owner" is the single group owner. Managers act as admins.

### Membership & Role Management

#### Ownership

- A group has **exactly one owner**. The owner is the only role that can
  transfer ownership, delete/archive the group, and demote other managers.
- **Transfer ownership:** the owner can transfer to another **active** member,
  who becomes the new owner; the previous owner is demoted to admin. There is
  never zero or more than one owner.
- **Owner succession:** the owner **cannot leave or be removed while sole
  owner** — they must transfer ownership first (or delete the group). The UI
  blocks the action and prompts to transfer.

#### Roles

- **Only the owner** can **promote** a member to admin or **demote** an admin
  back to member (GINV-B7). Admins manage invites/requests/removals but not
  roles.
- An admin cannot remove, demote, or override the owner, nor promote someone to
  owner (only transfer-ownership does that). The owner cannot self-demote without
  transferring ownership.

#### Removing & Leaving

- **Remove a member (kick):** a manager can remove an `active` member or revoke
  an `invited`/`requested` row. You **cannot remove the owner**, and you cannot
  remove **yourself** via this action (use leave). A removed member loses access
  immediately and any session participation tied to membership ends.
- **Leave:** any member can leave (existing behaviour); the owner must transfer
  ownership first.
- **Re-join after removal (GINV-B6):** a removed member is simply removed — they
  may be **re-invited** or request to join again. Removal is not a sticky block
  (only declining is). A dedicated block action is out of scope for V1.

#### Cancelling Invites & Requests

- A manager can **cancel a pending invite**; the (group, member) row returns to a
  non-pending state and the invitee is not notified-spammed.
- A member can **withdraw their own pending join request**.
- Cancelling/withdrawing is distinct from declining: it does not set the sticky
  `declined` state, so the person can be invited or request again later.

#### Permission Matrix

| Action | Owner | Admin | Member |
| --- | --- | --- | --- |
| Invite by email / generate-revoke code | ✓ | ✓ | — |
| Approve/decline join requests | ✓ | ✓ | — |
| Cancel a pending invite | ✓ | ✓ | — |
| Withdraw own request | n/a | n/a | ✓ |
| Remove a member | ✓ | ✓ (not owner) | — |
| Promote/demote admin | ✓ | — | — |
| Transfer ownership | ✓ | — | — |
| Leave group | ✓ (transfer first) | ✓ | ✓ |
| Delete/archive group | ✓ | — | — |
| Edit group settings (name, visibility, join policy) | ✓ | ✓ | — |

#### Audit & Notifications

- Membership changes — invite, accept, decline, cancel, remove, role change,
  ownership transfer, code rotation — are recorded with **actor + timestamp**
  (supports trust-and-moderation review).
- Affected members get a **light notification** for relevant changes (you were
  promoted/removed, your invite was cancelled), throttled to avoid spam.

### Anti-Abuse

Because invites and requests are **in-app only** (no email to non-members), abuse
is bounded to in-app clutter, but must still be controlled:

- **Dedupe:** at most one non-terminal invite/request per (group, member) —
  already enforced by the unique `(group_id, member_id)` constraint.
- **Decline is sticky:** a declined invite/request is not auto-flipped back to
  pending on re-send (today a `left` row is reset to `invited` — that must change
  for the declined case).
- **Rate-limit:** cap invites/requests per actor per window, and cap the number
  of pending invites a single person can accumulate across all groups, so nobody
  can be flooded.
- **Code hygiene:** invite codes are revocable, optionally expiring and
  use-capped; generic failure messages.

## API Shape

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/groups/:id/invites` | Invite an existing member by exact email. Neutral response; manager-only. |
| `POST` | `/api/groups/:id/invite-code` | Create/rotate the group's invite code (manager-only). |
| `DELETE` | `/api/groups/:id/invite-code` | Revoke the active invite code. |
| `POST` | `/api/groups/join/:code` | Join (or request to join) via an invite code. |
| `POST` | `/api/groups/:id/requests` | Request to join a reachable group. |
| `POST` | `/api/groups/:id/requests/:memberId` | Approve/decline a join request (manager-only). |
| `GET` | `/api/groups/:id/pending` | Manager view of pending invites/requests. |
| `DELETE` | `/api/groups/:id/invites/:memberId` | Cancel a pending invite (manager) / withdraw own request. |
| `DELETE` | `/api/groups/:id/members/:memberId` | Remove a member, or leave when it's yourself. |
| `PATCH` | `/api/groups/:id/members/:memberId` | Set a member's role (promote/demote admin); manager-only. |
| `POST` | `/api/groups/:id/transfer-ownership` | Transfer ownership to another active member (owner-only). |
| ~~`GET`~~ | ~~`/api/members/search`~~ | **Removed** — the enumeration hole this spec closes. |

## Data Shape

- Reuse `group_members` with an extended `status`: `invited`, `requested`,
  `active`, `left`, `removed`, `declined`/`blocked`. Keep the unique
  `(group_id, member_id)` and the `role` column (owner/admin/member).
- Enforce **exactly one owner** per group (partial unique index on
  `(group_id)` where `role = 'owner'`); ownership transfer is a single
  transaction that swaps the two roles.
- New `group_invite_codes` (or columns on `groups`): `group_id`, `code`
  (hashed/opaque), `created_by`, `expires_at` (nullable), `max_uses` (nullable),
  `uses`, `revoked_at`.
- Optional `groups.join_policy`: `approval` (default for private) | `auto`.
- `group_membership_events` audit rows: `group_id`, `actor_member_id`,
  `target_member_id`, `action` (invite/accept/decline/cancel/remove/role-change/
  transfer/code-rotate), `created_at`. Record who did what, and when.

## Open Questions

- Should a pending invite ever show the invitee's identity to managers, or always
  count-only until accepted? (GINV-B1)
- Default invite-code expiry and max-uses?
- Should discoverable/public groups be browsable (request-to-join) in V1, or
  later? (GINV-F8)
- What's the rate-limit shape given Cloud Run runs multiple instances (needs a
  shared store)? (GINV-B3)

## Decisions

- **No global member search (GINV-B0):** the member base is not searchable or
  enumerable; `/api/members/search` is removed. Reachability is via email,
  invite code, or request-to-join only.
- **Email invites are existing-members-only, neutral-response:** no account
  oracle, no outbound email to non-members in V1.
- **Invite codes + request-to-join + approval** are the privacy-safe join paths;
  private groups default to requiring approval.
- **Removal is re-invitable (GINV-B6):** a removed member can be re-invited or
  re-request; only declining is sticky. No V1 block action.
- **Role management is owner-only (GINV-B7):** only the owner promotes/demotes
  admins and transfers ownership; admins manage invites/requests/removals.

## Tracking

### Features

| Key | Feature | Surface | Status | Target | Delivered | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| GINV-F1 | Remove global member search | Groups/backend | Proposed | Soon | — | Retire `/api/members/search`; members not enumerable. Interim wildcard hardening shipped. |
| GINV-F2 | Invite existing member by exact email | Groups | Proposed | Soon | — | Exact (normalised) email match; neutral response; no existence oracle. |
| GINV-F3 | Group invite code / link | Groups | Proposed | Soon | — | Generate, share, revoke/rotate; optional expiry + max-uses. |
| GINV-F4 | Request to join + approval | Groups | Proposed | Soon | — | Member requests; manager approves/declines; decline is sticky. |
| GINV-F5 | Invite/request management UI | Groups | Proposed | Soon | — | Pending invites/requests, approve/decline, copy/rotate code. |
| GINV-F6 | Anti-abuse controls | Backend | Proposed | Soon | — | Dedupe (have it), sticky decline, rate-limit, pending-invite cap, code hygiene. |
| GINV-F7 | Invite non-members by email | Groups/email | Parked | Later | — | Email a signup invite that resolves on account creation. Needs email infra + spam controls. |
| GINV-F8 | Discoverable/public groups | Groups | Parked | Later | — | Optional per-group: browse + request to join, per `groups.visibility`. |
| GINV-F9 | Transfer ownership + succession | Groups | Proposed | Soon | — | Exactly one owner; owner can transfer to an active member; can't leave/be removed while sole owner. |
| GINV-F10 | Promote/demote admins | Groups | Proposed | Soon | — | Owner-only sets member↔admin roles (GINV-B7); admins can't touch roles or the owner. |
| GINV-F11 | Remove a member | Groups | Proposed | Soon | — | Manager removes active/invited/requested rows; not the owner, not self (use leave). |
| GINV-F12 | Cancel invite / withdraw request | Groups | Proposed | Soon | — | Manager cancels a pending invite; member withdraws own request; not sticky-declined. |
| GINV-F13 | Membership audit + notifications | Backend/Groups | Proposed | Soon | — | `group_membership_events` audit; light, throttled notifications for affected members. |

### Backlog

| Key | Type | Item | Status | Target | Notes |
| --- | --- | --- | --- | --- | --- |
| GINV-B0 | decision | Drop global search | Resolved | Soon | Members not searchable/enumerable; reach via email/code/request only. |
| GINV-B1 | decision | Pending-invite visibility | Open | Soon | Count-only vs manager-visible identity before accept (oracle trade-off). |
| GINV-B2 | dependency | Non-member email invites | Open | Later | Needs Resend/email infra (see platform-configuration) + outbound spam controls. |
| GINV-B3 | dependency | Rate-limit infra | Open | Soon | Cloud Run scales horizontally — needs a shared store (Postgres counter/Redis), not in-memory. |
| GINV-B4 | decision | Invite-code policy | Open | Soon | Code entropy/format; default expiry + max-uses. |
| GINV-B5 | decision | Join policy per group | Open | Soon | Auto-join on valid code vs request+approval; default approval for private. |
| GINV-B6 | decision | Re-join after removal | Resolved | Soon | Removed members are re-invitable; only declining is sticky. No V1 block action. |
| GINV-B7 | decision | Who can manage roles | Resolved | Soon | Owner-only promote/demote + ownership transfer; admins manage invites/requests/removals. |
| GINV-B8 | dependency | Group delete/archive | Open | Later | Owner-only lifecycle (members, sessions, codes) — likely its own spec. |

## Change Log

| Date | Change |
| --- | --- |
| 2026-06-28 | Created from the decision to drop global member search (privacy/enumeration risk) in favour of email-exact invites, invite codes/links, and request-to-join + approval. Supersedes GROUP-F2 invite-by-name. |
| 2026-06-28 | Added membership management: ownership transfer + succession, promote/demote admins, remove member, cancel invite / withdraw request, permission matrix, audit + notifications. |
| 2026-06-28 | Resolved GINV-B6 (removed members are re-invitable, not blocked) and GINV-B7 (role management is owner-only). |
