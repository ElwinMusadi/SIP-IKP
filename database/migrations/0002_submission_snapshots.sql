-- Production Schema Migration: 0002_submission_snapshots.sql
-- Project: Sistem Informasi Pelaporan Insiden Keselamatan Pasien (IKP) IBS RSUD Prof. Dr. W. Z. Johannes Kupang
-- Engine: Cloudflare D1 / SQLite STRICT Mode

PRAGMA foreign_keys = ON;

ALTER TABLE incident_reports ADD COLUMN similar_incident_details TEXT;

CREATE TABLE incident_submission_snapshots (
  id TEXT PRIMARY KEY,
  incident_id TEXT NOT NULL UNIQUE,
  report_number TEXT NOT NULL,
  snapshot_data TEXT NOT NULL,
  patient_name TEXT,
  medical_record_number TEXT,
  incident_datetime TEXT NOT NULL,
  incident_type TEXT NOT NULL,
  is_overdue_sla INTEGER NOT NULL DEFAULT 0 CHECK (is_overdue_sla IN (0, 1)),
  overdue_reason TEXT,
  submitted_by_user_id TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (incident_id) REFERENCES incident_reports(id) ON DELETE CASCADE,
  FOREIGN KEY (submitted_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
) STRICT;

CREATE INDEX idx_snapshots_incident_id ON incident_submission_snapshots(incident_id);
