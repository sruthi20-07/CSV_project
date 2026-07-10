-- GrowEasy CRM AI CSV Importer - Database Schema Setup
-- Run this script in your Supabase project's SQL Editor to set up the required tables.

-- 1. Imports Table (Logs every uploaded file and its import processing stats)
CREATE TABLE IF NOT EXISTS imports (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_size INT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('uploaded', 'processing', 'completed', 'failed')),
  total_records INT DEFAULT 0,
  imported_count INT DEFAULT 0,
  skipped_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  duplicate_count INT DEFAULT 0,
  mappings JSONB DEFAULT '{}',
  default_values JSONB DEFAULT '{}',
  success_file_url TEXT,
  failed_file_url TEXT
);

-- 2. CRM Records Table (Stores successfully validated and imported lead contacts)
CREATE TABLE IF NOT EXISTS records (
  id BIGSERIAL PRIMARY KEY,
  import_id TEXT REFERENCES imports(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT DEFAULT '',
  email TEXT DEFAULT '',
  country_code TEXT DEFAULT '',
  mobile_without_country_code TEXT DEFAULT '',
  company TEXT DEFAULT '',
  city TEXT DEFAULT '',
  state TEXT DEFAULT '',
  country TEXT DEFAULT '',
  lead_owner TEXT DEFAULT '',
  crm_status TEXT DEFAULT 'GOOD_LEAD_FOLLOW_UP',
  crm_note TEXT DEFAULT '',
  data_source TEXT DEFAULT 'leads_on_demand',
  possession_time TEXT DEFAULT '',
  description TEXT DEFAULT ''
);

-- 3. Failed/Skipped Records Table (Diagnostic logging of records that failed Zod validation or did not meet email/phone presence checks)
CREATE TABLE IF NOT EXISTS failed_records (
  id BIGSERIAL PRIMARY KEY,
  import_id TEXT REFERENCES imports(id) ON DELETE CASCADE,
  row_index INT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('SKIPPED', 'FAILED')),
  reason TEXT NOT NULL,
  raw_data JSONB DEFAULT '{}'
);

-- Create indexes for performance optimization during bulk duplicates check (handles 10k+ rows efficiently)
CREATE INDEX IF NOT EXISTS idx_records_email ON records(email);
CREATE INDEX IF NOT EXISTS idx_records_mobile ON records(mobile_without_country_code);
CREATE INDEX IF NOT EXISTS idx_records_import_id ON records(import_id);
CREATE INDEX IF NOT EXISTS idx_failed_records_import_id ON failed_records(import_id);
