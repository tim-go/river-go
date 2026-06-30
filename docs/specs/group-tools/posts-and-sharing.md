---
roadmap_community_feature_group: Groups
roadmap_community_feature_item: Posts & Social Sharing
roadmap_community_feature_phase: Later
spec_schema: 4
maturity: Draft
---

# Posts & Social Sharing

**Work state:** Draft — design captured, **not implemented**. Other work comes first.
**Last updated:** 2026-06-30
**Scope:** A group/individual **Post** primitive, and the pattern for sharing
content out to external social media (WhatsApp, Facebook, Instagram, etc.)
Strava-style. This doc fixes the *model and pattern* so it's cheap to build later;
it deliberately does not schedule the build.

**Out of scope:** Real-time messaging / chat. That is a separate, much larger build
(live channels, unread state, push, moderation) and is explicitly deferred —
comments-on-posts cover "arranging" for now. See the closing note.

---

## The one idea

> **The shareable atom is a Post. A Post can be *authored by* a user or a group,
> and be *about* a session, a paddle, or nothing (just photos + caption).**

This is the Strava model: you never share "a photo" or "a database row" — you share
an **Activity with a public face**, and the photos/map/stats are part of it. Here,
the Post is that face. Sessions and paddles are *subjects* a Post points at; they are
not themselves shareable.

This collapses the "do they share the session, a post, or a photo?" question into a
single answer: **they always share a Post.**

---

## Why not fold this into Sessions

`GroupSession` (see `group-paddle-sessions.md`) is a structured safety-and-logistics
record: river/section, meeting point + time, RSVP, check-in/out, ICE consent, kit/skill
coverage advisory. Freeform social content has a different shape and lifecycle and must
not be forced through it:

- not all content belongs to a scheduled event (announcements, "great weekend!", "spare
  drysuit?"),
- it would bloat a model kept deliberately tight for safety,
- sessions are per-event, so they can never produce a group-wide feed.

So Sessions stays as-is. A Post may *reference* a session; it never lives inside one.

---

## Shareability is a layer, not a type

Define a thin projection that several subjects implement. One share component/service
consumes any `Shareable` — the share UX is written once.

```
Shareable = {
  url,          // stable, public, crawlable canonical URL
  title,        // "Tryweryn — Saturday"
  description,  // caption / summary
  image,        // hero photo OR a generated share-card image
  hashtags,     // ["riverlaunch", "whitewater"]
}
```

A Post projects into a `Shareable`. (Later, a session or paddle page could too, but the
Post is the primary path.) The projection is a **deliberately curated public subset** —
see Privacy below.

---

## Data model (sketch)

Generalise the `group_posts` idea from the membership discussion so it serves **both**
groups and individuals:

```
posts
  id
  author_type        'user' | 'group'      -- polymorphic authorship
  author_id          -> members.id | groups.id
  body               text (caption)
  subject_type       null | 'session' | 'paddle' | ...   -- optional "about"
  subject_id         null | <id>
  visibility         'private' | 'members' | 'public'     -- PER-ITEM, not inherited
  share_token        null | <unguessable>   -- optional capability link
  pinned             bool                    -- leader announcement flag (groups)
  created_at, updated_at

post_photos
  post_id -> posts.id
  ...                -- reuse the existing photo pipeline (Firebase Storage,
                     --   groupCoverUpload / ContributionPhoto, moderation_status)

post_comments
  id
  post_id -> posts.id
  author_member_id -> members.id
  body, created_at
```

Notes:
- **Polymorphic author** is what gives individuals the same feature as groups with one
  model, one feed component, one share path.
- **Subject reference** lets a Post be "about" a completed session (trip report) or a
  personal paddle, or nothing (a photo dump). The subject's rich/safe model is untouched.
- **`post_comments`** is the seed of "arranging" without a chat engine.

---

## Surfaces

- **Group "Posts" tab** — the group feed (drops into the existing EntityPage tab shell).
- **Recent posts on the Group Summary** — a latest-N query on the overview tab.
- **Individual feed** — the same Post list filtered to `author_type='user'`, on the
  paddler profile.
- **Session detail** — shows Posts whose `subject = this session` (trip reports/photos),
  without those photos living in the Session record.

---

## Four load-bearing decisions (get right *before* building)

Shared links and public URLs live forever in people's chat history, so these are
expensive to retrofit:

1. **URL scheme.** Decide the stable public routes now. Suggestion: `/p/<id>` (post),
   `/s/<id>` (session), `/u/<handle>` (paddler). Short, stable, public.
2. **Per-item public flag / share token.** Sharing must be **independent of group
   visibility** — a private group still needs to let a member share one session or photo
   publicly. Model `visibility` (± an unguessable `share_token`) **on the post**, never
   inherited from the group. (Strava: an activity can be private/followers/public,
   separate from the profile.)
3. **Curated public projection — not the raw record.** A shared session exposes *river,
   section, date, photos, "12 paddlers"* and **never** the meeting point, participant
   names, or ICE info. The `Shareable` is a safe subset by construction. Bake this in or
   we leak safety data.
4. **Generated share-card image.** Reserve the concept even if stubbed — it is required
   for Instagram and carries the brand into the wild (the growth goal). See below.

---

## Platform realities that shape the model

- **Web Share API (`navigator.share`)** is the primary path on mobile — it opens the
  native sheet (WhatsApp, Instagram, Facebook, Messages) for free. Hand it a URL + text,
  or a **File** for the image.
- **Instagram is link-hostile** — no clickable links in feed posts. "Share to Instagram"
  means sharing an **image**, not a URL. Hence the **generated share-card** (a branded
  image with river/date + RiverLaunch mark) is the unit Instagram actually wants — and
  it's also how the brand travels.
- **Rich previews** in FB/WhatsApp/iMessage need **server-rendered OG/Twitter meta tags**
  on the public URLs — bots crawl them without running JS. Implication: the public share
  routes need SSR or prerendering for `<head>`, even though the rest of the app is a SPA.
  This influences how those routes are hosted; flag it before building.
- **Desktop fallbacks:** `facebook.com/sharer/sharer.php?u=`, `wa.me/?text=`, copy-link.

---

## Privacy & safety

The public projection of any subject is a **safe, curated subset**:

- **Never** expose meeting points, participant names, or ICE / emergency contact data.
- A session is shareable only *after* it makes sense (e.g. completed), and only the
  sanitised "we paddled X" view.
- Sharing is an explicit, per-item opt-in (decision #2), defaulting to **not shared**.

---

## The growth loop

External sharing exists to drive natural consumer growth and easy socialising:

- **Groups** publicise paddle sessions and team-day photos.
- **Individuals** share their paddles + photos, Strava-style.
- Branded share-cards put RiverLaunch in front of non-users on the platforms they already
  use.

---

## Open decisions (resolve when we pick this up)

1. **Is an individual paddle a first-class logged activity** (a personal "Session-lite"
   with date/river/photos), or — for now — just a user Post with photos + a river tag?
   *Lean: start as a Post; promote to a real model only if people log paddles seriously.*
2. **Auto-create vs manual share.** When a group session completes, do we *prompt*
   "share this session?" (auto-draft a Post), or is every Post manual?
   *Lean: prompt-to-share on session completion — that's the growth loop.*
3. **Who can post in a group?** All active members, or leaders+ only?
   *Lean: members can post; leader-only `pinned`/announcement flag.*
4. **Moderation.** Reuse the contribution-photo `moderation_status` pattern for post
   photos, or trust small groups and keep it light?
5. **Notifications.** "New post" notify (per-post or digest) in v1, or feed-only first?
   Resend is already wired up.

---

## What we reuse when we build

- Firebase Storage + `groupCoverUpload` / `ContributionPhoto` pipeline → post photos.
- Resend transactional email → post notifications.
- EntityPage tab shell → the "Posts" tab.
- Existing photo `moderation_status` (migrations 005 / 006) → post-photo moderation.

---

## Deferred: Messaging / chat

Agreed to **ignore for now**. Comments-on-posts and a per-session discussion thread cover
~80% of "arranging a paddle" cheaply. True chat (live channel, unread badges, push) is a
separate build, gated on real demand, and would be its own model — not retrofitted onto
Posts.
