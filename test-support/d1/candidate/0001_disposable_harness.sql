-- NON-PRODUCTION / DISPOSABLE / SUBJECT TO ADR APPROVAL
-- Purpose: prove local D1 setup, reset, constraints, transactions, and fixture loading.
-- This is not a production migration and must never be applied remotely.

PRAGMA foreign_keys = ON;

CREATE TABLE harness_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
) STRICT;

CREATE TABLE synthetic_harness_users (
  id TEXT PRIMARY KEY CHECK (id LIKE 'USER-TEST-%'),
  display_name TEXT NOT NULL CHECK (display_name LIKE 'SYNTHETIC TEST %'),
  role_code TEXT NOT NULL CHECK (
    role_code IN ('TENAGA_KESEHATAN', 'KEPALA_RUANGAN', 'KOMITE_PMKP', 'ADMINISTRATOR')
  )
) STRICT;

CREATE TABLE synthetic_harness_incidents (
  id TEXT PRIMARY KEY CHECK (id LIKE 'INC-TEST-%'),
  patient_reference TEXT NOT NULL CHECK (patient_reference LIKE 'PATIENT-TEST-%'),
  medical_record_reference TEXT NOT NULL CHECK (medical_record_reference LIKE 'MR-TEST-%'),
  title TEXT NOT NULL CHECK (title LIKE 'SYNTHETIC TEST %'),
  created_by_user_id TEXT NOT NULL,
  row_version INTEGER NOT NULL DEFAULT 1 CHECK (row_version > 0),
  fixture_marker TEXT NOT NULL CHECK (fixture_marker = 'SYNTHETIC_TEST_DATA_ONLY'),
  FOREIGN KEY (created_by_user_id) REFERENCES synthetic_harness_users(id) ON DELETE RESTRICT
) STRICT;

INSERT INTO harness_meta (key, value)
VALUES ('schema_status', 'NON_PRODUCTION_DISPOSABLE_CANDIDATE');
