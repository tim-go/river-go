-- Precomputed level-distribution stats per gauge measure (LEVELS-B2).
-- A 99-point quantile grid over the trailing window (default 2 years) lets the
-- API classify the current reading into low/normal/high/very-high — and derive
-- a ±1%-accurate percentile — without scanning millions of readings per
-- request. Refreshed by the ingest job when stale (>20h), so it needs no
-- scheduler of its own.
CREATE TABLE IF NOT EXISTS observation_measure_level_stats (
  measure_id uuid PRIMARY KEY REFERENCES observation_measures (id) ON DELETE CASCADE,
  window_days integer NOT NULL,
  sample_size integer NOT NULL,
  -- quantiles[k] = the k-th percentile of value over the window (k = 1..99).
  quantiles double precision[] NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'river_go_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON observation_measure_level_stats TO river_go_app;
  END IF;
END
$$;
