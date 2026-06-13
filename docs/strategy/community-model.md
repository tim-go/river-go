# Community Model

## Summary

RiverLaunch.app is community-driven. Users should be encouraged to upload photos, hazards, river features, access notes, and recent condition reports.

The community model must be structured from day one. Contributions should be typed, date-stamped, attached to river objects, and open to confirmation or dispute. The product should help users judge freshness and confidence rather than simply showing old pins forever.

This doc owns the **contribution model**: types, trust and freshness, status values, reputation, moderation, and contribution UX. The **data strategy** (why community data is the product, acquisition, sourcing, legal position, flywheel) lives in `/docs/strategy/community-data-strategy.md`.

## Contribution Types

Contributions are typed so they can be searched, filtered, moderated, and shown with confidence. The full type lists (hazard types, feature types, access types, photo categories, runnable-range bands, craft suitability) are canonical in `/docs/strategy/feature-taxonomy.md`; entity fields are in `/docs/strategy/data-model.md`. This section covers what each type is *for* and the model/UX expectations.

- **Photos** — visual evidence that helps users recognise features and judge conditions. Attach to a river, section, access point, hazard, feature, or condition report — never a loose gallery.
- **Hazards** — safety-relevant contributions that need stronger structure than a note: type, location, severity, status, dates reported/last-confirmed, evidence photos, level dependency, and confidence. Hazards drive moderation priority and staleness.
- **River features** — the character and practical use of a section (rapids, eddies, weirs, bridges, portages, landings, facilities).
- **Access notes** — how practical and appropriate a put-in/take-out/portage/path is, distinguishing physical practicality, parking, landowner sensitivity, licence/navigation context, seasonal restriction, club agreement, and source uncertainty. Access notes are informational, not legal advice (see `/docs/specs/principles/no-advice-and-liability-language.md`).
- **Condition reports** — time-sensitive observations from recent paddlers; they should expire / visually stale over time.
- **Runnable ranges** — community interpretation of what gauge levels mean for a section, varying by craft, ability, and season; guidance, not safety certification.

## Trust and Freshness

Every contribution should show:

- who added it
- when it was added
- when it was last confirmed
- whether it has been disputed
- whether it has evidence photos
- whether the contributor is trusted, club-affiliated, or new

Public contribution identity should use a member-controlled public contributor name, not real name or email address. This protects privacy while still giving the community enough continuity to recognise useful contributors.

Public names need moderation controls. They should be:

- screened for profanity, abuse, impersonation, hate terms, and obvious trolling
- change-limited to avoid reputation laundering
- reportable by other users
- reviewable and overridable by moderators
- stored separately from the private account name/email

The first implementation should prefer conservative generated public names until the moderation workflow is ready.

Old data should not disappear automatically, but it should lose visual confidence.

## Emergency Profile / ICE Data

In-case-of-emergency data is useful for future group paddling features, but it is sensitive personal data and must not be treated as ordinary profile content.

V1 should only store emergency contact data:

- emergency contact name
- emergency contact phone
- emergency contact relationship

V1 should not collect medical conditions, allergies, medications, disabilities, swimming ability, rescue capability, or free-text health/support notes. If a paddler needs to share medical or support information with a trip leader, the app can remind them to do that directly outside RiverLaunch.app.

Default visibility should be private. Future group-session features may allow members to share emergency contact details with confirmed trip participants, trip leaders, or group organisers. That sharing should be explicit, scoped to a trip/session, revocable, and auditable.

ICE data should never appear beside public contributions, public profiles, search results, or general member directories.

## Suggested Status Values

Hazard status:

- active
- resolved
- seasonal
- unknown
- needs confirmation

Access status:

- usable
- limited
- closed
- sensitive
- unknown
- needs confirmation

Condition report status:

- current
- aging
- stale

## User Reputation

Reputation should be practical, not gamified for its own sake.

Signals:

- confirmed contributions
- accepted edits
- hazard reports verified by others
- club affiliation
- moderator approval
- repeated local activity on the same river

Possible roles:

- visitor
- member
- trusted contributor
- club contributor
- moderator
- admin

## Moderation

Moderation is especially important for:

- access claims
- legal/licence statements
- landowner disputes
- safety-critical hazards
- abusive content
- privacy-sensitive photos
- exact locations of sensitive wildlife or restricted sites

Moderators should be able to:

- edit contribution text
- change status
- mark as stale
- merge duplicate hazards
- hide or remove content
- lock sensitive access notes
- promote trusted contributors

## Contribution UX Principles

- Prefer typed forms over free-form pins.
- Make adding a useful contribution fast from the map.
- Prompt for a photo when reporting a hazard.
- Ask users to confirm existing hazards after a trip.
- Show stale items clearly and invite reconfirmation.
- Let users add information offline later, but require clear timestamps.

## Safety Language

The no-advice / safety-wording rule (use "recent reports", "last confirmed", "may be suitable"; avoid "safe", "guaranteed", "approved", "risk-free") is now the canonical product principle with the full use/avoid list. See `/docs/specs/principles/no-advice-and-liability-language.md`.
