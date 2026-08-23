CREATE INDEX IF NOT EXISTS profile_identities_profile_idx
  ON profile_identities(profile_id, last_seen_at);
