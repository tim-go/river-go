# River level bands — statistical today, curated tomorrow

Status: LEVELS-B2 (2-year percentile bands, precomputed) SHIPPED 2026-07.
LEVELS-C1 (curated paddleability thresholds) SPECCED, not built.

## What the band means (and what it must never claim)

The level badge (`low / normal / high / very-high`) answers **"where is this
gauge relative to its own typical range?"** — it is a statistical statement,
not a paddleability verdict. Copy must always read as *"vs typical levels"*;
"runnable / scrapey / pumping" wording is reserved for the curated layer below,
which encodes human knowledge.

## LEVELS-B2 — 2-year percentile bands (shipped)

- Window: `LEVEL_STATE_HISTORY_DAYS = 730` (was 90 — which made bands
  drought/deluge-relative: a shower in a dry June read "very high"). Two years
  of archive per gauge came from the historic backfill
  (`backfill-historic-observations.ts`; EA + SEPA 2yr, NRW ~1yr).
- Thresholds unchanged: `<p25 low · p25–p75 normal · p75–p90 high · >p90
  very-high`, minimum 20 samples.
- **Precomputed distributions**: `observation_measure_level_stats` stores a
  99-point quantile grid per enabled measure (migration 044). Classification
  and the ±1% percentile are in-memory lookups (`percentileFromQuantiles`) —
  no request-time scans of `observation_readings` (which holds millions of
  rows post-backfill). `/api/stations` measured ~3ms after the change.
- **Refresh cadence**: the half-hourly ingest job calls
  `refreshObservationLevelStats()` which no-ops unless any enabled measure's
  stats are >20h old — i.e. one aggregate pass per day, no scheduler, self-heals
  after downtime. `npm --prefix api run refresh:level-stats` forces it (run
  after any historic backfill).

## LEVELS-C1 — curated paddleability thresholds (specced)

Per-river gauge calibration, the way paddlers actually reason: "the Tryweryn
runs from 0.6 on the Bala gauge; above 1.2 it's big".

### Data model (draft)

```sql
CREATE TABLE river_level_thresholds (
  river_id text NOT NULL REFERENCES canonical_rivers (id) ON DELETE CASCADE,
  measure_id uuid NOT NULL REFERENCES observation_measures (id) ON DELETE CASCADE,
  scrape_value double precision,      -- below this: too low / scrapey
  good_value double precision,        -- from here: a proper run
  high_value double precision,        -- above this: big water, experienced only
  source text NOT NULL,               -- 'moderator' | 'guidebook:<ref>' | 'community'
  notes text,
  set_by uuid REFERENCES members (id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (river_id, measure_id)
);
```

All three values optional (a river may only know its scrape level). Validation:
`scrape < good < high` where present.

### Behaviour

- **Fallback ladder** per river: curated thresholds → percentile band →
  unknown (grey). The API response says which layer produced the badge
  (`bandSource: "curated" | "percentile"`), so the UI can phrase honestly:
  curated → "Runnable · 0.72m (scrape 0.6m)"; percentile → "Normal vs typical
  levels".
- Provenance surfaces in the UI (who/what set it, when) — same trust model as
  other community intelligence.
- Editing: moderators + trusted paddlers, via the river page (admin-gated
  form); moderation queue entry for community submissions.

### Seeding path (no big data-entry project)

- Paddle logs already capture a level note ("paddled at 0.65m — scrapey");
  condition reports are planned. Aggregate these per river as *suggested*
  thresholds for a moderator to confirm — community-sourced calibration, one
  river at a time.
- Guidebook values can be entered directly with `source: 'guidebook:<ref>'`.

## Future context (not planned)

- **Seasonal copy**: "unusually high for July" — compare today against a
  ±30-day day-of-year window across years. Supplementary text only; absolute
  paddleability does not care about seasons.
- Longer windows: the 2-year window simply lengthens as ingestion accrues;
  no further backfill work needed (NRW archive is ~1yr — Wales grows to 2yr
  naturally by mid-2027).
