-- Two-dimension moderation: a public visibility gate plus a review-status reason
-- code. Add the gate, derive it from the old single status, then remap the old
-- moderation_status values into the review-status vocabulary.
ALTER TABLE contributions
ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'published';

UPDATE contributions SET visibility = CASE
  WHEN moderation_status IN ('hidden', 'rejected', 'pending') THEN 'removed'
  ELSE 'published'
END;

UPDATE contributions SET moderation_status = CASE moderation_status
  WHEN 'reported' THEN 'approved'
  WHEN 'needs-confirmation' THEN 'approved'
  WHEN 'confirmed' THEN 'approved'
  WHEN 'resolved' THEN 'approved'
  WHEN 'challenged' THEN 'pending'
  WHEN 'hidden' THEN 'withdrawn'
  WHEN 'rejected' THEN 'inaccurate'
  ELSE moderation_status
END;

CREATE INDEX IF NOT EXISTS contributions_visibility_idx ON contributions (visibility);
