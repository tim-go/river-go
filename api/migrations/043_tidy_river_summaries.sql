-- Seeded canonical-river summaries carried a process/disclaimer tail, e.g.
--   "… (whitewater). Source-derived paddling-river record; review sections,
--    levels, and POIs before treating it as paddling guidance."
-- Provenance shows via the source label and the non-advice note lives in the UI,
-- so drop the tail, keeping the useful lead ("<run> — grade <g> (<discipline>).").
-- Idempotent: re-running matches nothing once cleaned.
UPDATE canonical_rivers
SET summary = regexp_replace(
    summary,
    '\s*Source-derived paddling-river record;.*$',
    ''
  )
WHERE summary LIKE '%Source-derived paddling-river record%';
