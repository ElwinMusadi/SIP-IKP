-- SYNTHETIC TEST DATA ONLY
INSERT INTO synthetic_harness_users (id, display_name, role_code) VALUES
  ('USER-TEST-NURSE', 'SYNTHETIC TEST NURSE', 'TENAGA_KESEHATAN'),
  ('USER-TEST-HEADROOM', 'SYNTHETIC TEST HEADROOM', 'KEPALA_RUANGAN'),
  ('USER-TEST-PMKP', 'SYNTHETIC TEST PMKP', 'KOMITE_PMKP'),
  ('USER-TEST-ADMIN', 'SYNTHETIC TEST ADMIN', 'ADMINISTRATOR');

INSERT INTO synthetic_harness_incidents (
  id,
  patient_reference,
  medical_record_reference,
  title,
  created_by_user_id,
  fixture_marker
) VALUES (
  'INC-TEST-001',
  'PATIENT-TEST-001',
  'MR-TEST-001',
  'SYNTHETIC TEST INCIDENT',
  'USER-TEST-NURSE',
  'SYNTHETIC_TEST_DATA_ONLY'
);
