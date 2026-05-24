CREATE UNIQUE INDEX IF NOT EXISTS map_poi_reviews_member_decision_uidx
ON map_poi_reviews (poi_id, member_id, decision);
