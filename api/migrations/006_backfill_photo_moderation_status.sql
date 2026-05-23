UPDATE contribution_photos p
SET moderation_status = 'visible'
FROM contributions c
WHERE p.contribution_id = c.id
  AND c.moderation_status IN ('reported', 'confirmed', 'resolved')
  AND p.moderation_status = 'pending';

