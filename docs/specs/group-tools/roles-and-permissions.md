---
roadmap_community_feature_group: Groups
roadmap_community_feature_item: Roles & Permissions
roadmap_community_feature_phase: Soon
spec_schema: 4
maturity: Built (V1)
---

# Group Roles & Permissions

**Work state:** Built (V1)
**Last updated:** 2026-06-30
**Scope:** What each group role can do across membership, settings, and sessions.

## Source of truth

Permissions are **enforced on the backend** via `requireGroupRole(...)` in
`api/src/groups.ts` and `api/src/group-sessions.ts`. The frontend
(`src/components/GroupsPanel.tsx`) only mirrors these for the UI — it is not the
authority. This document must track the backend checks.

## Roles & tiers

Hierarchy: `owner` › `organiser` › `leader` › `member`. The code groups them into:

| Constant | Members | Used for |
| --- | --- | --- |
| `MEMBERSHIP_MANAGER_ROLES` | owner, organiser | settings, remove member, **change roles** |
| `MEMBER_MANAGER_ROLES` | owner, organiser, leader | membership intake (invite, requests, cancel) |
| `SESSION_MANAGER_ROLES` | owner, organiser, leader | create/run sessions, manual check-in, ICE reveal |
| owner-only | owner | transfer ownership |

"Admins" in the UI = owner + organiser. Statuses (separate from role):
`invited`, `requested`, `active`, `left`, `removed`, `declined`.

## Capability matrix

| Capability | Owner | Organiser | Leader | Member | Non-member |
| --- | :--: | :--: | :--: | :--: | :--: |
| **Group & settings** | | | | | |
| Create a group (→ becomes owner) | — | — | — | — | ✓ (signed in) |
| Edit settings (name, handle, description, visibility, access mode) | ✓ | ✓ | ✗ | ✗ | ✗ |
| Edit cover photo / About | ✓ | ✓ | ✗ | ✗ | ✗ |
| Delete / archive group | ✗ | ✗ | ✗ | ✗ | — *(not built)* |
| **Membership intake** | | | | | |
| Invite by email | ✓ | ✓ | ✓ | ✗ | ✗ |
| See pending requests & invites | ✓ | ✓ | ✓ | ✗ | ✗ |
| Approve / decline join requests | ✓ | ✓ | ✓ | ✗ | ✗ |
| Cancel a pending invite | ✓ | ✓ | ✓ | ✗ | ✗ |
| Share the group link | ✓ | ✓ | ✓ | ✓ | ✗ |
| Request to join (if "request to join") | — | — | — | — | ✓ (signed in) |
| Accept / decline an invite you received | — | — | — | — | ✓ (invited) |
| Withdraw your own request | — | — | — | — | ✓ (requested) |
| **Membership control** | | | | | |
| Remove a member | ✓ | ✓ | ✗ | ✗ | ✗ |
| Change a member's role | ✓ | ✓ | ✗ | ✗ | ✗ |
| Transfer ownership | ✓ | ✗ | ✗ | ✗ | ✗ |
| Leave the group | ✓\* | ✓ | ✓ | ✓ | — |
| **Sessions** | | | | | |
| Create / edit a session | ✓ | ✓ | ✓ | ✗ | ✗ |
| Change session status (start/complete/cancel) | ✓ | ✓ | ✓ | ✗ | ✗ |
| RSVP to a session | ✓ | ✓ | ✓ | ✓ | ✗ |
| Check **self** in / out | ✓ | ✓ | ✓ | ✓ | ✗ |
| Check **others** in / out (manual) | ✓ | ✓ | ✓ | ✗ | ✗ |
| Share own emergency contact (ICE) for a session | ✓ | ✓ | ✓ | ✓ | ✗ |
| See participants' ICE (only while session is live) | ✓ | ✓ | ✓ | ✗ | ✗ |
| **Viewing** | | | | | |
| View full group (members, sessions) | ✓ | ✓ | ✓ | ✓ | ✗ |
| View public page (name, kind, member count, About) | ✓ | ✓ | ✓ | ✓ | ✓ (incl. signed-out) |

\* The sole owner can't leave until they transfer ownership.

## Per-role summary

- **Owner** — everything, plus the one exclusive power: **transfer ownership**.
- **Organiser** — full admin: settings, remove members, **change roles** (not the
  owner's, not their own), run intake & sessions. Cannot transfer ownership.
- **Leader** — runs **sessions** and **membership intake** (invite, approve,
  cancel), but cannot remove members, change roles, or edit settings.
- **Member** — view everything, RSVP, check self in/out, share their own ICE,
  share the group link.
- **Non-member** — public page; request to join if open; invitees accept/decline.

## Guards (role changes)

`setMemberRole` (owner + organiser): assignable roles are
`organiser | leader | member` (never owner — that's transfer-only); you cannot
change your own role, and the owner's role is protected.

## Known asymmetries (intentional)

- **Leaders let people in, not out** — they approve requests + invite, but
  removing a member is owner/organiser (intake ≠ moderation).

## Change log

| Date | Change |
| --- | --- |
| 2026-06-30 | First written. Leaders gained membership intake (invite/approve/cancel/pending) + the shareable link opened to any active member. |
| 2026-06-30 | Organisers can now change member roles (was owner-only). |
