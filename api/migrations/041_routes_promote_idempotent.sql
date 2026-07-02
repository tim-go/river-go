-- Promotion must be idempotent: one route suggestion → at most one canonical
-- route. Concurrent/repeat "Promote to section" clicks previously inserted
-- duplicate routes (the insert didn't lock the suggestion row). Remove existing
-- duplicates, then enforce uniqueness at the DB level.

-- Keep the earliest route per source suggestion; drop the rest.
DELETE FROM routes a
USING routes b
WHERE a.source_route_suggestion_id IS NOT NULL
  AND a.source_route_suggestion_id = b.source_route_suggestion_id
  AND (
    a.created_at > b.created_at
    OR (a.created_at = b.created_at AND a.id > b.id)
  );

CREATE UNIQUE INDEX IF NOT EXISTS routes_source_suggestion_uniq
  ON routes (source_route_suggestion_id)
  WHERE source_route_suggestion_id IS NOT NULL;
