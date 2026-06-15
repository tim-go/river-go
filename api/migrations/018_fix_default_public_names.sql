-- The auto-generated default public name used the brand word "RiverLaunch",
-- which the public-name validator blocks as implied organisation/staff status.
-- Members left with the default name therefore could not save their profile.
-- Re-key those defaults to a neutral placeholder that passes validation,
-- preserving the numeric suffix.
UPDATE members
SET public_name = regexp_replace(public_name, '^RiverLaunch member ', 'Paddler ')
WHERE public_name LIKE 'RiverLaunch member %';
