-- Provider-side accounting fields are nullable so pre-tracking rows remain
-- explicitly unknown rather than being misreported as zero-cost analyses.
ALTER TABLE analyses ADD COLUMN provider_model_id TEXT;
ALTER TABLE analyses ADD COLUMN service_tier TEXT;
ALTER TABLE analyses ADD COLUMN web_search_call_count INTEGER
  CHECK (web_search_call_count IS NULL OR web_search_call_count >= 0);
ALTER TABLE analyses ADD COLUMN cost_basis_version TEXT;
