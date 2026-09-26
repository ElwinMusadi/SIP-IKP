-- Production Schema Migration: 0001_initial_production_schema.sql
-- Project: Sistem Informasi Pelaporan Insiden Keselamatan Pasien (IKP) IBS RSUD Prof. Dr. W. Z. Johannes Kupang
-- Engine: Cloudflare D1 / SQLite STRICT Mode

PRAGMA foreign_keys = ON;

-- ====================================================================
-- 1. Master Data Tables (IBS Canonical References)
-- ====================================================================

CREATE TABLE master_operating_rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL
) STRICT;

CREATE TABLE master_specializations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL
) STRICT;

CREATE TABLE master_departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL
) STRICT;

CREATE TABLE master_payer_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL
) STRICT;

-- ====================================================================
-- 2. Identity and Credentials
-- ====================================================================

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (
    role IN ('TENAGA_KESEHATAN', 'KEPALA_RUANGAN', 'KOMITE_PMKP', 'ADMINISTRATOR')
  ),
  profession TEXT NOT NULL,
  unit_id TEXT NOT NULL DEFAULT 'IBS',
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role_active ON users(role, is_active);

-- ====================================================================
-- 3. Sessions (Opaque Cookie Architecture with CSRF Token)
-- ====================================================================

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  csrf_token TEXT NOT NULL,
  issued_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  revocation_reason TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) STRICT;

CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX idx_sessions_user_active ON sessions(user_id, revoked_at, expires_at);

-- ====================================================================
-- 4. Sequence Counter for Canonical Report Numbers
-- ====================================================================

CREATE TABLE report_number_sequences (
  year_month TEXT PRIMARY KEY,
  current_sequence INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
) STRICT;

-- ====================================================================
-- 5. Incident Reports Root Aggregate
-- ====================================================================

CREATE TABLE incident_reports (
  id TEXT PRIMARY KEY,
  report_number TEXT UNIQUE,
  status TEXT NOT NULL CHECK (
    status IN (
      'DRAFT',
      'SUBMITTED',
      'REVISION_REQUIRED',
      'UNDER_REVIEW',
      'SIMPLE_INVESTIGATION',
      'PMKP_REVIEW',
      'COMPLETED_BY_UNIT',
      'COMPLETED'
    )
  ),
  created_by_user_id TEXT NOT NULL,
  reporter_name TEXT NOT NULL,
  reporter_role TEXT NOT NULL,
  owning_unit_id TEXT NOT NULL DEFAULT 'IBS',

  -- Bagian I: Data Pasien
  patient_name TEXT,
  medical_record_number TEXT,
  patient_room TEXT,
  patient_age_category TEXT,
  patient_gender TEXT CHECK (patient_gender IS NULL OR patient_gender IN ('LAKI_LAKI', 'PEREMPUAN')),
  patient_payer_type TEXT,
  admission_datetime TEXT,

  -- Bagian II: Rincian Kejadian & Kronologi
  incident_datetime TEXT NOT NULL,
  incident_timezone TEXT NOT NULL DEFAULT 'Asia/Makassar',
  incident_title TEXT,
  chronology TEXT,
  incident_type TEXT NOT NULL CHECK (
    incident_type IN ('KNC', 'KTC', 'KTD', 'SENTINEL')
  ),
  initial_reporter_category TEXT,
  initial_reporter_detail TEXT,
  incident_target TEXT NOT NULL CHECK (
    incident_target IN (
      'PASIEN',
      'KARYAWAN_NAKES',
      'PENGUNJUNG',
      'PENDAMPING',
      'KELUARGA_PASIEN',
      'LAIN_LAIN'
    )
  ),
  incident_target_other TEXT,
  patient_care_type TEXT,
  incident_location TEXT,
  clinical_specialization TEXT,
  causing_unit TEXT,
  patient_impact TEXT,
  immediate_action_and_result TEXT,
  action_taken_by TEXT,
  similar_incident_occurred TEXT,

  -- SLA & Tracking
  sla_deadline_utc TEXT,
  is_overdue_sla INTEGER NOT NULL DEFAULT 0 CHECK (is_overdue_sla IN (0, 1)),
  overdue_reason TEXT,

  -- Risk Grade
  risk_grade TEXT CHECK (risk_grade IS NULL OR risk_grade IN ('BIRU', 'HIJAU', 'KUNING', 'MERAH')),
  risk_graded_at TEXT,
  high_risk_mitigation_notes TEXT,

  -- Workflow & Operational Metadata
  received_by_user_id TEXT,
  received_at TEXT,
  revision_reason TEXT,
  pmkp_reviewed INTEGER NOT NULL DEFAULT 0 CHECK (pmkp_reviewed IN (0, 1)),
  pmkp_review_notes TEXT,
  row_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  submitted_at TEXT,
  completed_at TEXT,

  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (received_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
) STRICT;

CREATE INDEX idx_incidents_status ON incident_reports(status);
CREATE INDEX idx_incidents_created_by ON incident_reports(created_by_user_id);
CREATE INDEX idx_incidents_owning_unit ON incident_reports(owning_unit_id);
CREATE INDEX idx_incidents_report_number ON incident_reports(report_number);
CREATE INDEX idx_incidents_incident_datetime ON incident_reports(incident_datetime);

-- ====================================================================
-- 6. Simple Investigations (1:1 with Incident, Overwritten on Revision)
-- ====================================================================

CREATE TABLE simple_investigations (
  id TEXT PRIMARY KEY,
  incident_id TEXT NOT NULL UNIQUE,
  direct_cause TEXT,
  underlying_root_cause TEXT,
  investigation_start_date TEXT,
  investigation_end_date TEXT,
  recommendations TEXT NOT NULL DEFAULT '[]',
  actions TEXT NOT NULL DEFAULT '[]',
  completed_by_user_id TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (investigation_end_date IS NULL OR investigation_start_date IS NULL OR investigation_end_date >= investigation_start_date),
  FOREIGN KEY (incident_id) REFERENCES incident_reports(id) ON DELETE CASCADE,
  FOREIGN KEY (completed_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
) STRICT;

CREATE INDEX idx_investigations_incident_id ON simple_investigations(incident_id);

-- ====================================================================
-- 7. Audit Records (Restricted Minimal 7-Event Append-Only Trail)
-- ====================================================================

CREATE TABLE audit_records (
  id TEXT PRIMARY KEY,
  incident_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'DRAFT_CREATED',
      'REPORT_SUBMITTED',
      'REVISION_REQUIRED',
      'SIMPLE_INVESTIGATION_COMPLETED',
      'REPORT_COMPLETED',
      'EMERGENCY_CORRECTION'
    )
  ),
  actor_user_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  occurred_at_utc TEXT NOT NULL,
  notes TEXT,
  request_id TEXT NOT NULL,
  FOREIGN KEY (incident_id) REFERENCES incident_reports(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE RESTRICT
) STRICT;

CREATE INDEX idx_audit_incident_id ON audit_records(incident_id, occurred_at_utc);
CREATE INDEX idx_audit_actor_id ON audit_records(actor_user_id);
