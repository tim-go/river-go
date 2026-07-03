---
roadmap_community_feature_group: Groups
roadmap_community_feature_item: Group Membership & Invites
roadmap_community_feature_phase: Soon
spec_schema: 4
maturity: Draft
---

# Group Membership & Invites

**Work state:** V1 delivered — supersedes the invite-by-name flow (GROUP-F2). Built (migration 032): `/api/members/search` retired, invite-by-exact-email, group link + request-to-join, access modes (request_to_join / invite_only), invite/request management, ownership transfer, role promote/demote, membership audit. Parked: non-member email invites (GINV-F7), public/discoverable groups (GINV-F8). *(Tracking table below not yet flipped cell-by-cell — the delivery plan is authoritative.)*
**Last updated:** 2026-07-03
**Scope:** How people join a group — invite an existing member by exact email, or
share the group's link and request to join (subject to the group's access mode) —
plus the membership lifecycle (roles, ownership, removal), without exposing a
searchable directory of the member base.

## Purpose

People need to add the right paddlers to a group, but RiverLaunch must not turn
the member base into a browsable directory. Letting anyone search all members by
name is an enumeration and privacy risk: it leaks who has an account and lets a
signed-in user harvest display names.

Following Strava's model, **members are not globally searchable**. You reach
someone you already know (you have their email), or you share the group's link and
they ask to join. Discovery of *people* happens through shared groups, not a
global search box.

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

### Roles

Groups use four roles (the `guest` role is removed; existing guests migrate to
`member`):

- **Owner** — owns the group. Everything an organiser can do, **plus** transfer
  ownership, delete/archive the group, and set roles. Exactly one per group.
- **Organiser** — the group **admin**: manages membership (invite, approve,
  remove, cancel), edits group settings (name, visibility, handle, access mode),
  and manages sessions.
- **Leader** — **trip leader**: can create and lead sessions (on-water
  leadership), but **cannot** manage membership or roles.
- **Member** — participates, RSVPs.

Two manager tiers fall out of this: **membership managers** = owner + organiser;
**session managers** = owner + organiser + leader. Where this spec says "manager"
unqualified it means a membership manager.

### No Global Member Search

There must be **no endpoint that lets a member search or list the member base**.
The existing invite-by-name search (`GET /api/members/search`, GROUP-F2) is
removed. A member's existence, email, or display name must not be discoverable by
probing.

An interim hardening is already in place while this spec is built: the search
escapes `LIKE` wildcards, requires ≥3 characters, caps input length, and is
debounced. That reduces — but does not remove — enumeration, so the endpoint is
retired once the paths below ship.

Members remain reachable only through the two join paths below. Discovery of a
*person* is a side effect of a shared group (you can see fellow members of groups
you belong to, per `groups.visibility`), never a global lookup.

### Join Path 1 — Invite An Existing Member By Exact Email

A membership manager can invite by typing the **full email address**. The backend
matches it (trimmed, lower-cased) against an existing member and creates a pending
invite.

To avoid turning invites into an account-existence oracle:

- The response is **neutral and identical** whether or not the email matches —
  e.g. "If they have a RiverLaunch account, they'll see the invite." The inviter
  is not told whether the address resolved, and the member's name/id is not echoed
  back.
- A pending invite must not reveal the invitee's identity to the inviter before
  they accept (see GINV-B1). The group shows a pending-invite **count**, not the
  invited person, until they join.

V1 invites **existing members only** — no email is sent to non-members, so there
is no outbound-email spam vector. Inviting people who have not signed up yet is
GINV-F7 (parked, needs email infrastructure and its own controls).

### Join Path 2 — Group Link + Request To Join

Every group has a stable, shareable **link** the owner/organiser distributes
out-of-band (message, club page). No secret codes to generate, rotate, or expire.

- **Two link forms** (Strava-style): a permanent **ID link** (`/groups/<id>`) and
  an optional **human-readable handle** (`/g/<handle>`, e.g. `/g/tryweryn-paddlers`).
  The handle is unique (like a username), **defaults to a slug of the group name**,
  and is owner/organiser-editable.
- Opening the link shows the **group page**. For a non-member of a private group
  this is a **limited view** — name, description, discipline (per
  `groups.visibility`) — never the member list or sessions.
- What the page offers depends on the group's **access mode** (admin setting):
  - **`request_to_join`** — a **"Request to join"** button. The request goes to
    the membership managers, who **approve or decline**.
  - **`invite_only`** — **no** request button; the page shows an **"Invite only"**
    notice ("Ask a member to invite you"). People join only via an email invite
    (Path 1).
- Access mode is set by the owner/organiser on the group admin page; default
  `request_to_join` (GINV-B5).
- Declining a request is sticky: a declined requester cannot silently re-request
  (mirrors the invite anti-abuse rules). Withdrawing your own request is not
  sticky.

### Membership & Role Management

#### Ownership

- A group has **exactly one owner**. The owner is the only role that can transfer
  ownership, delete/archive the group, and set roles.
- **Transfer ownership:** the owner transfers to another **active** member, who
  becomes the new owner; the previous owner is demoted to organiser. There is
  never zero or more than one owner.
- **Owner succession:** the owner **cannot leave or be removed while sole
  owner** — they must transfer ownership first (or delete the group). The UI
  blocks the action and prompts to transfer.

#### Roles

- **Only the owner** sets roles — promote a member to organiser/leader, or demote
  (GINV-B7). Organisers manage membership but **not** roles.
- An organiser/leader cannot remove, demote, or override the owner, nor promote
  anyone to owner (only transfer-ownership does that). The owner cannot self-demote
  without transferring ownership.

#### Removing & Leaving

- **Remove a member (kick):** a membership manager can remove an `active` member
  or revoke an `invited`/`requested` row. You **cannot remove the owner**, and you
  cannot remove **yourself** via this action (use leave). A removed member loses
  access immediately and any session participation tied to membership ends.
- **Leave:** any member can leave; the owner must transfer ownership first.
- **Re-join after removal (GINV-B6):** a removed member is simply removed — they
  may be **re-invited** or request to join again. Removal is not a sticky block
  (only declining is). A dedicated block action is out of scope for V1.

#### Cancelling Invites & Requests

- A membership manager can **cancel a pending invite**; the (group, member) row
  returns to a non-pending state and the invitee is not notified-spammed.
- A member can **withdraw their own pending join request**.
- Cancelling/withdrawing is distinct from declining: it does not set the sticky
  `declined` state, so the person can be invited or request again later.

#### Permission Matrix

| Action | Owner | Organiser | Leader | Member |
| --- | --- | --- | --- | --- |
| Invite by email | ✓ | ✓ | — | — |
| Approve/decline join requests | ✓ | ✓ | — | — |
| Cancel a pending invite | ✓ | ✓ | — | — |
| Remove a member | ✓ | ✓ (not owner) | — | — |
| Set group settings, handle & access mode | ✓ | ✓ | — | — |
| Create/lead sessions | ✓ | ✓ | ✓ | — |
| Withdraw own request / RSVP | ✓ | ✓ | ✓ | ✓ |
| Promote/demote roles | ✓ | — | — | — |
| Transfer ownership | ✓ | — | — | — |
| Leave group | ✓ (transfer first) | ✓ | ✓ | ✓ |
| Delete/archive group | ✓ | — | — | — |

#### Audit & Notifications

- Membership changes — invite, accept, decline, cancel, remove, role change,
  ownership transfer, access-mode/handle change — are recorded with **actor +
  timestamp** (supports trust-and-moderation review).
- Affected members get a **light notification** for relevant changes (you were
  promoted/removed, your invite was cancelled, your request was approved),
  throttled to avoid spam. (No notification surface exists yet — V1 may ship the
  audit log only and defer notifications; see GINV-F13.)

### Anti-Abuse

Because invites and requests are **in-app only** (no email to non-members), abuse
is bounded to in-app clutter, but must still be controlled:

- **Dedupe:** at most one non-terminal invite/request per (group, member) —
  already enforced by the unique `(group_id, member_id)` constraint.
- **Decline is sticky:** a declined invite/request is not auto-flipped back to
  pending on re-send (today a `left` row is reset to `invited` — that must change
  for the declined case).
- **Rate-limit:** cap invites/requests per actor per window, and cap the number of
  pending invites/requests a single person can accumulate across all groups, so
  nobody can be flooded. (Needs a shared store on Cloud Run — GINV-B3.)

## API Shape

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/groups/:idOrHandle` | Group page. Full for members; limited view + access-mode for non-members. |
| `PATCH` | `/api/groups/:id` | Edit settings incl. `handle` and `access_mode` (owner/organiser). |
| `POST` | `/api/groups/:id/invites` | Invite an existing member by exact email. Neutral response; manager-only. |
| `DELETE` | `/api/groups/:id/invites/:memberId` | Cancel a pending invite (manager) / withdraw own request. |
| `POST` | `/api/groups/:id/requests` | Request to join (only when `access_mode = request_to_join`). |
| `POST` | `/api/groups/:id/requests/:memberId` | Approve/decline a join request (manager-only). |
| `GET` | `/api/groups/:id/pending` | Manager view of pending invites/requests. |
| `DELETE` | `/api/groups/:id/members/:memberId` | Remove a member, or leave when it's yourself. |
| `PATCH` | `/api/groups/:id/members/:memberId` | Set a member's role (promote/demote); owner-only. |
| `POST` | `/api/groups/:id/transfer-ownership` | Transfer ownership to another active member (owner-only). |
| ~~`GET`~~ | ~~`/api/members/search`~~ | **Removed** — the enumeration hole this spec closes. |

## Data Shape

- `groups` gains:
  - `handle` — unique, url-safe, human-readable; defaults to a slug of `name`;
    owner/organiser-editable; reserve/validate against collisions and reserved
    words (GINV-B4).
  - `access_mode` — `request_to_join` (default) | `invite_only`.
- `group_members`: extend `status` to `invited`, `requested`, `active`, `left`,
  `removed`, `declined`; set `role` to `owner` | `organiser` | `leader` | `member`
  (drop `guest`). Keep the unique `(group_id, member_id)`.
- Enforce **exactly one owner** per group (partial unique index on `(group_id)`
  where `role = 'owner'`); ownership transfer is a single transaction that swaps
  the two roles.
- `group_membership_events` audit rows: `group_id`, `actor_member_id`,
  `target_member_id`, `action` (invite/accept/decline/cancel/remove/role-change/
  transfer/settings-change), `created_at`.
- No invite-code table — the group link replaces it.

## Open Questions

- Should a pending invite ever show the invitee's identity to managers, or always
  count-only until accepted? (GINV-B1)
- Handle rules: length, allowed characters, reserved words, change cooldown? (GINV-B4)
- What's the rate-limit shape given Cloud Run runs multiple instances (needs a
  shared store)? (GINV-B3)
- Do public/discoverable groups (open auto-join, browse) come later? (GINV-F8)

## Decisions

- **No global member search (GINV-B0):** the member base is not searchable or
  enumerable; `/api/members/search` is removed. Reachability is via email invite
  or the group link + request-to-join only.
- **Roles (GINV-B9):** `owner/organiser/leader/member` (guest dropped). Organiser
  = membership admin + sessions; leader = sessions/trip leadership only; owner =
  organiser + transfer/delete/roles.
- **Email invites are existing-members-only, neutral-response:** no account
  oracle, no outbound email to non-members in V1.
- **Group link replaces invite codes:** a permanent ID link + editable handle,
  with a "Request to join" page — no secret codes to generate/rotate/expire.
- **Access mode per group (GINV-B5):** `request_to_join` (default) | `invite_only`,
  set by owner/organiser. Invite-only hides the request button and shows an
  "Invite only" notice.
- **Removal is re-invitable (GINV-B6):** a removed member can be re-invited or
  re-request; only declining is sticky. No V1 block action.
- **Role management is owner-only (GINV-B7):** only the owner promotes/demotes and
  transfers ownership; organisers manage invites/requests/removals.

## Tracking

### Features

| Key | Feature | Surface | Status | Target | Delivered | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| GINV-F1 | Remove global member search | Groups/backend | Proposed | Soon | — | Retire `/api/members/search`; members not enumerable. Interim wildcard hardening shipped. |
| GINV-F2 | Invite existing member by exact email | Groups | Proposed | Soon | — | Exact (normalised) email match; neutral response; no existence oracle. |
| GINV-F3 | Group link + Request to Join | Groups | Proposed | Soon | — | Permanent ID link + editable handle; limited public group page; "Request to join" → manager approval. Replaces invite codes. |
| GINV-F4 | Group access mode | Groups | Proposed | Soon | — | Owner/organiser setting: `request_to_join` (default) vs `invite_only` (shows "Invite only", no request button). |
| GINV-F5 | Invite/request management UI | Groups | Proposed | Soon | — | Pending invites/requests, approve/decline, edit handle + access mode, copy link. |
| GINV-F6 | Anti-abuse controls | Backend | Proposed | Soon | — | Dedupe (have it), sticky decline, rate-limit, pending invite/request caps. |
| GINV-F7 | Invite non-members by email | Groups/email | Parked | Later | — | Email a signup invite that resolves on account creation. Needs email infra + spam controls. |
| GINV-F8 | Discoverable/public groups | Groups | Parked | Later | — | Optional per-group: browse + open/auto-join, per `groups.visibility`. |
| GINV-F9 | Transfer ownership + succession | Groups | Proposed | Soon | — | Exactly one owner; owner can transfer to an active member; can't leave/be removed while sole owner. |
| GINV-F10 | Promote/demote roles | Groups | Proposed | Soon | — | Owner-only sets member↔organiser↔leader (GINV-B7); can't touch the owner. |
| GINV-F11 | Remove a member | Groups | Proposed | Soon | — | Manager removes active/invited/requested rows; not the owner, not self (use leave). |
| GINV-F12 | Cancel invite / withdraw request | Groups | Proposed | Soon | — | Manager cancels a pending invite; member withdraws own request; not sticky-declined. |
| GINV-F13 | Membership audit + notifications | Backend/Groups | Proposed | Soon | — | `group_membership_events` audit; notifications deferred until a notification surface exists. |

### Backlog

| Key | Type | Item | Status | Target | Notes |
| --- | --- | --- | --- | --- | --- |
| GINV-B0 | decision | Drop global search | Resolved | Soon | Members not searchable/enumerable; reach via email invite or group link + request only. |
| GINV-B1 | decision | Pending-invite visibility | Open | Soon | Count-only vs manager-visible identity before accept (oracle trade-off). |
| GINV-B2 | dependency | Non-member email invites | Open | Later | Needs Resend/email infra (see platform-configuration) + outbound spam controls. |
| GINV-B3 | dependency | Rate-limit infra | Open | Soon | Cloud Run scales horizontally — needs a shared store (Postgres counter/Redis), not in-memory. |
| GINV-B4 | decision | Handle policy | Open | Soon | Length/characters, reserved words, change cooldown, collision handling. |
| GINV-B5 | decision | Access mode | Resolved | Soon | Per-group `request_to_join` (default) | `invite_only`, owner/organiser-settable. |
| GINV-B6 | decision | Re-join after removal | Resolved | Soon | Removed members are re-invitable; only declining is sticky. No V1 block action. |
| GINV-B7 | decision | Who can manage roles | Resolved | Soon | Owner-only promote/demote + ownership transfer; organisers manage invites/requests/removals. |
| GINV-B8 | dependency | Group delete/archive | Open | Later | Owner-only lifecycle (members, sessions) — likely its own spec. |
| GINV-B9 | decision | Role model | Resolved | Soon | owner/organiser/leader/member; organiser=membership admin, leader=session leader; guest dropped. |

## Change Log

| Date | Change |
| --- | --- |
| 2026-06-28 | Created from the decision to drop global member search (privacy/enumeration risk) in favour of email-exact invites, invite codes/links, and request-to-join + approval. Supersedes GROUP-F2 invite-by-name. |
| 2026-06-28 | Added membership management: ownership transfer + succession, promote/demote, remove member, cancel invite / withdraw request, permission matrix, audit + notifications. |
| 2026-06-28 | Resolved GINV-B6 (removed members are re-invitable) and GINV-B7 (role management is owner-only). |
| 2026-06-28 | Role split: owner/organiser/leader/member (organiser=membership admin, leader=session leader; guest dropped). Replaced invite codes with a permanent group link + editable handle + Request-to-Join, and a per-group access mode (request_to_join / invite_only). |
