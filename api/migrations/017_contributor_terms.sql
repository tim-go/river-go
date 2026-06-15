-- Records a member's acceptance of the contributor terms. Contributions require
-- a known, attributable identity (email-verified + public name + accepted terms),
-- so we persist when and which version of the terms a member accepted.
ALTER TABLE members
ADD COLUMN IF NOT EXISTS contributor_terms_accepted_at timestamptz,
ADD COLUMN IF NOT EXISTS contributor_terms_version text;
