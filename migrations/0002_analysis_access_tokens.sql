ALTER TABLE scan_requests ADD COLUMN access_token_digest TEXT;

CREATE INDEX scan_requests_web_access_idx
  ON scan_requests(analysis_id, access_token_digest)
  WHERE channel = 'web' AND access_token_digest IS NOT NULL;
