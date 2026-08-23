ALTER TABLE analyses ADD COLUMN engine_version TEXT;
CREATE INDEX IF NOT EXISTS analyses_engine_version_idx ON analyses(engine_version, created_at);
