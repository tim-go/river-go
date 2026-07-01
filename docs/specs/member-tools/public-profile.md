---
roadmap_community_feature_group: Members
roadmap_community_feature_item: Public Profile Page
roadmap_community_feature_phase: Soon
spec_schema: 4
maturity: Draft
---

# Member Public Profile

**Work state:** Draft — design agreed, **not implemented**.
**Last updated:** 2026-06-30
**Scope:** A public, shareable paddler profile page that a member opts into and
controls. The existing Profile is private (the member's own dashboard of tabs);
this adds an outward-facing face. Deliberately simple — no followers, comments,
or messaging (those are the deferred [[posts-and-sharing]] work).

**Related:** [[member-profiles-and-history]] (the private profile + history),
[[posts-and-sharing]] (this page is the `/p/` "paddler" shareable subject).

---

## The one idea

> A member flips **one master switch** to publish a profile, **ticks which
> sections** to show, and gets a clean read-only public page at **`/p/<handle>`**
> (or `/p/<id>`). Off by default; only ever a curated, public-safe subset.

It reuses the **EntityPage** shell that already powers club pages — the routing
already reserves `/p/<handle>` for exactly this.

---

## Visibility model (on `members`)

```
profile_public      boolean  default false   -- master switch
handle              text     null  unique     -- optional vanity slug (see URL)
bio                 text     null              -- optional one-liner
show_paddles        boolean  default false     -- v1 section flags
show_skills         boolean  default false
show_photos         boolean  default false
-- (show_kit deferred — not in v1)
```

- **Default off.** Nothing is public until the member opts in.
- Always shown when public: **avatar + public name** (already public-facing).
- **Never** shown: email, "Your name" (private), emergency/ICE contact, account
  & sync data, exact home location. The public page is a curated projection, not
  the raw profile (same principle as [[posts-and-sharing]]).

### v1 sections (agreed)
**Paddles** (history), **Skills**, **Photos**. Kit and Contributions/Activity
are out of v1 (easy to add later as more flags).

---

## URL & identity (agreed: support both)

Mirror the club pattern (`/club/<handle-or-id>`):

- Canonical: **`/p/<handle>`** when the member has set a handle.
- **`/p/<id>`** always resolves (works before/without a handle).
- The route parser accepts either token and resolves to the member.

So **member handles** are added (optional, user-settable on the Public tab,
unique, lower-cased), giving a memorable URL — while `/p/<id>` means the feature
works the moment the master switch is on, no handle required.

---

## The page (`/p/<handle-or-id>`)

Reuse **EntityPage**:

- **Header:** circle avatar, public name, optional bio, a light meta line
  (e.g. "Paddler" · member since · clubs count if we choose to show it).
- **Sections/tabs:** one per *enabled* flag — Paddles, Skills, Photos. Hidden
  when their flag is off.
- **Read-only, public:** viewable logged-out. Respects the flags exactly.
- **Private/disabled state:** if `profile_public` is off (or the id/handle
  doesn't resolve), show a neutral "This profile is private or doesn't exist"
  state — never leak whether the member exists.

### What each section shows (public-safe subset)
- **Paddles:** title, river/section, date, craft type. Not private notes.
- **Skills:** the skill names/levels the member recorded.
- **Photos:** the member's uploaded, already-public photos (display + thumbnail).

---

## Controls (Profile › Public tab)

Add a **"Public profile"** card to the existing Public tab:

- Master toggle: **"Make my profile public."**
- When on: a **handle** field (optional, with availability check), an optional
  **bio**, and checkboxes for **Paddles / Skills / Photos**.
- A **"View / copy link"** action (the share pattern from [[posts-and-sharing]]).

---

## Backend

- `members` gains the flags above (one migration).
- A **public read endpoint** — `GET /api/p/<handle-or-id>` — returns the curated
  profile: header fields + only the enabled sections, assembled from the public-
  safe subset of the existing per-section data. The existing per-section APIs
  stay member-scoped/private; the public endpoint is the only anonymous reader
  and is the single place that enforces the curation.
- Handle resolution + uniqueness mirrors the club handle logic.

---

## Privacy & safety

- **Off by default**; per-section opt-in.
- Public endpoint returns a **curated subset** by construction — it never selects
  the private columns, so a model change can't accidentally leak them.
- Neutral not-found/private state (no member-existence disclosure).

---

## Reuse & alignment

- **EntityPage** shell (header + tabs + sections) — second instance after clubs.
- The **Avatar** component (already built) for the header.
- Existing **paddleLogApi / skillsApi / photoApi** data, projected to the public
  subset server-side.
- This page is the **`/p/` paddler subject** referenced by [[posts-and-sharing]];
  a shared paddle later links here.

---

## v1 scope (keep it simple)

In: master switch, handle (optional) + `/p/<id>` fallback, bio, Paddles/Skills/
Photos flags, the public EntityPage, the public read endpoint, the Public-tab
controls.

Out (later): Kit & Contributions sections, follower/social features, a richer
header (stats, club memberships), per-item visibility within a section.
