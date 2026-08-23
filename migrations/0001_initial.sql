PRAGMA foreign_keys = ON;

-- IDs and ISO-8601 timestamps are generated in application code. JSON is canonical TEXT.
-- The application must reject analyses whose serialized JSON columns exceed 512 KiB total.
CREATE TABLE profiles (
  id                  TEXT PRIMARY KEY,
  preferred_language  TEXT,
  read_aloud          INTEGER NOT NULL DEFAULT 0 CHECK (read_aloud IN (0, 1)),
  compact_results     INTEGER NOT NULL DEFAULT 0 CHECK (compact_results IN (0, 1)),
  consent_version     TEXT,
  onboarding_complete INTEGER NOT NULL DEFAULT 0 CHECK (onboarding_complete IN (0, 1)),
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL,
  CHECK (preferred_language IS NULL OR preferred_language IN
    ('en','hi','mr','bn','ta','te','kn','gu','ml','pa','or','ur'))
);

CREATE TABLE profile_identities (
  id             TEXT PRIMARY KEY,
  profile_id     TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  channel        TEXT NOT NULL CHECK (channel IN ('web_device', 'whatsapp')),
  subject_digest TEXT NOT NULL,
  created_at     TEXT NOT NULL,
  last_seen_at   TEXT NOT NULL,
  UNIQUE (channel, subject_digest)
);

CREATE TABLE analyses (
  id                        TEXT PRIMARY KEY,
  cache_key                 TEXT NOT NULL UNIQUE,
  image_hash                TEXT NOT NULL,
  media_object_key          TEXT,
  language                  TEXT NOT NULL CHECK (language IN
    ('en','hi','mr','bn','ta','te','kn','gu','ml','pa','or','ur')),
  status                    TEXT NOT NULL CHECK (status IN
    ('queued', 'processing', 'complete', 'failed')),
  attempt_number            INTEGER NOT NULL DEFAULT 1 CHECK (attempt_number >= 1),
  queue_enqueued_at         TEXT,
  provider_started_at       TEXT,
  openai_response_id        TEXT,
  result_json               TEXT CHECK (result_json IS NULL OR json_valid(result_json)),
  provider_sources_json     TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(provider_sources_json)),
  local_matches_json        TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(local_matches_json)),
  validation_report_json    TEXT CHECK (validation_report_json IS NULL OR json_valid(validation_report_json)),
  web_search_used           INTEGER NOT NULL DEFAULT 0 CHECK (web_search_used IN (0, 1)),
  model_id                  TEXT NOT NULL,
  prompt_version            TEXT NOT NULL,
  schema_version            TEXT NOT NULL,
  rules_version             TEXT NOT NULL,
  services_version          TEXT NOT NULL,
  timings_json              TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(timings_json)),
  token_usage_json          TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(token_usage_json)),
  estimated_cost_usd_micros INTEGER CHECK (estimated_cost_usd_micros IS NULL OR estimated_cost_usd_micros >= 0),
  expires_at                TEXT,
  error_code                TEXT,
  error_json                TEXT CHECK (error_json IS NULL OR json_valid(error_json)),
  created_at                TEXT NOT NULL,
  completed_at              TEXT
);

CREATE TABLE scan_requests (
  id              TEXT PRIMARY KEY,
  profile_id      TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  analysis_id     TEXT NOT NULL REFERENCES analyses(id),
  channel         TEXT NOT NULL CHECK (channel IN ('web', 'whatsapp')),
  idempotency_key TEXT NOT NULL,
  language        TEXT NOT NULL CHECK (language IN
    ('en','hi','mr','bn','ta','te','kn','gu','ml','pa','or','ur')),
  created_at      TEXT NOT NULL,
  UNIQUE (channel, idempotency_key)
);

CREATE TABLE products (
  id                      TEXT PRIMARY KEY,
  slug                    TEXT NOT NULL UNIQUE,
  gtin                    TEXT UNIQUE,
  normalized_key          TEXT UNIQUE,
  display_name            TEXT NOT NULL,
  category                TEXT NOT NULL DEFAULT 'unknown',
  latest_observation_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(latest_observation_json)),
  scan_count              INTEGER NOT NULL DEFAULT 0 CHECK (scan_count >= 0),
  updated_at              TEXT NOT NULL
);

CREATE TABLE whatsapp_jobs (
  id                   TEXT PRIMARY KEY,
  inbound_message_id   TEXT NOT NULL UNIQUE,
  payload_digest       TEXT NOT NULL,
  profile_id           TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scan_request_id      TEXT REFERENCES scan_requests(id),
  recipient_ciphertext BLOB,
  recipient_nonce      BLOB,
  media_id_ciphertext  BLOB,
  media_id_nonce       BLOB,
  language             TEXT NOT NULL CHECK (language IN
    ('en','hi','mr','bn','ta','te','kn','gu','ml','pa','or','ur')),
  status               TEXT NOT NULL CHECK (status IN
    ('received', 'queued', 'processing', 'ready', 'sent', 'failed')),
  send_attempts        INTEGER NOT NULL DEFAULT 0 CHECK (send_attempts >= 0),
  last_error_code      TEXT,
  expires_at           TEXT NOT NULL,
  created_at           TEXT NOT NULL,
  completed_at         TEXT
);

CREATE INDEX analyses_status_created_idx ON analyses(status, created_at);
CREATE INDEX analyses_image_language_idx ON analyses(image_hash, language);
CREATE INDEX scan_requests_analysis_idx ON scan_requests(analysis_id);
CREATE INDEX scan_requests_profile_idx ON scan_requests(profile_id, created_at);
CREATE INDEX whatsapp_jobs_status_created_idx ON whatsapp_jobs(status, created_at);
CREATE INDEX whatsapp_jobs_expiry_idx ON whatsapp_jobs(expires_at);
