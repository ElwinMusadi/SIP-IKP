-- Synthetic Development Seed: 0001_initial_seed.sql
-- Project: Sistem Informasi Pelaporan Insiden Keselamatan Pasien (IKP) IBS RSUD Prof. Dr. W. Z. Johannes Kupang
-- ALL RECORDS ARE STRICTLY SYNTHETIC DEVELOPMENT DATA FOR TESTING PURPOSES ONLY.

-- 1. Master Operating Rooms
INSERT INTO master_operating_rooms (id, name, code, is_active, created_at) VALUES
  ('mor_ok1', 'Kamar Operasi 1 (Bedah Umum)', 'OK-01', 1, '2026-09-26T00:00:00.000Z'),
  ('mor_ok2', 'Kamar Operasi 2 (Ortopedi)', 'OK-02', 1, '2026-09-26T00:00:00.000Z'),
  ('mor_ok3', 'Kamar Operasi 3 (Urologi)', 'OK-03', 1, '2026-09-26T00:00:00.000Z'),
  ('mor_ok4', 'Kamar Operasi 4 (Bedah Saraf)', 'OK-04', 1, '2026-09-26T00:00:00.000Z'),
  ('mor_ok5', 'Kamar Operasi 5 (Obgyn / Caesar)', 'OK-05', 1, '2026-09-26T00:00:00.000Z'),
  ('mor_ok6', 'Kamar Operasi 6 (Mata / THT)', 'OK-06', 1, '2026-09-26T00:00:00.000Z'),
  ('mor_ok7', 'Kamar Operasi 7 (Emergency / CITO)', 'OK-07', 1, '2026-09-26T00:00:00.000Z'),
  ('mor_ok8', 'Kamar Operasi 8 (Elektif)', 'OK-08', 1, '2026-09-26T00:00:00.000Z'),
  ('mor_preop', 'Ruang Pre-Operasi (Holding Area)', 'PRE-OP', 1, '2026-09-26T00:00:00.000Z'),
  ('mor_pacu', 'Ruang Pulih Sadar (PACU)', 'PACU', 1, '2026-09-26T00:00:00.000Z');

-- 2. Master Specializations
INSERT INTO master_specializations (id, name, code, is_active, created_at) VALUES
  ('msp_bedah', 'Bedah Umum', 'SP-BEDAH', 1, '2026-09-26T00:00:00.000Z'),
  ('msp_ortopedi', 'Bedah Ortopedi & Traumatologi', 'SP-ORTO', 1, '2026-09-26T00:00:00.000Z'),
  ('msp_urologi', 'Bedah Urologi', 'SP-URO', 1, '2026-09-26T00:00:00.000Z'),
  ('msp_anestesi', 'Anestesiologi & Terapi Intensif', 'SP-ANES', 1, '2026-09-26T00:00:00.000Z'),
  ('msp_obgyn', 'Obstetri & Ginekologi', 'SP-OBGYN', 1, '2026-09-26T00:00:00.000Z'),
  ('msp_saraf', 'Bedah Saraf', 'SP-SARAF', 1, '2026-09-26T00:00:00.000Z');

-- 3. Master Departments / Units
INSERT INTO master_departments (id, name, code, is_active, created_at) VALUES
  ('mdep_ibs', 'Instalasi Bedah Sentral (IBS)', 'DEP-IBS', 1, '2026-09-26T00:00:00.000Z'),
  ('mdep_farmasi', 'Instalasi Farmasi (Depo IBS)', 'DEP-FARM', 1, '2026-09-26T00:00:00.000Z'),
  ('mdep_lab', 'Laboratorium Patologi Klinik', 'DEP-LAB', 1, '2026-09-26T00:00:00.000Z'),
  ('mdep_rad', 'Instalasi Radiologi', 'DEP-RAD', 1, '2026-09-26T00:00:00.000Z'),
  ('mdep_ranap', 'Ruang Rawat Inap Bedah', 'DEP-RANAP', 1, '2026-09-26T00:00:00.000Z');

-- 4. Master Payer Types
INSERT INTO master_payer_types (id, name, code, is_active, created_at) VALUES
  ('mpay_bpjs', 'BPJS Kesehatan (PBI / Non-PBI)', 'PAY-BPJS', 1, '2026-09-26T00:00:00.000Z'),
  ('mpay_umum', 'Umum / Pembayaran Pribadi', 'PAY-UMUM', 1, '2026-09-26T00:00:00.000Z'),
  ('mpay_swasta', 'Asuransi Kesehatan Swasta', 'PAY-SWASTA', 1, '2026-09-26T00:00:00.000Z'),
  ('mpay_perusahaan', 'Jaminan Perusahaan / Instansi', 'PAY-INST', 1, '2026-09-26T00:00:00.000Z');

-- 5. Synthetic Staff Accounts
-- Credential mapping:
-- username: nakes_ibs       -> NakesIbs#2026
-- username: kepala_ruangan  -> KepalaRuangan#2026
-- username: komite_pmkp     -> KomitePmkp#2026
-- username: admin_ibs       -> AdminIbs#2026

INSERT INTO users (id, username, password_hash, full_name, role, profession, unit_id, is_active, created_at, updated_at) VALUES
  (
    'usr_nakes_test',
    'nakes_ibs',
    '$pbkdf2-sha256$i=100000$a1b2c3d4e5f607182930415263748596$72463f2817140fe2c65fdb1233191508f959d241e6ccf5948880fb753a33c607',
    '[SYNTHETIC TEST] Ns. Maria G. Klau, S.Kep',
    'TENAGA_KESEHATAN',
    'Perawat Bedah',
    'IBS',
    1,
    '2026-09-26T00:00:00.000Z',
    '2026-09-26T00:00:00.000Z'
  ),
  (
    'usr_headroom_test',
    'kepala_ruangan',
    '$pbkdf2-sha256$i=100000$b1c2d3e4f506172839405162738495a6$ef72709737fe006c900edbf2b4ac1cd9758a583bcb2efeadfe694326aeb07496',
    '[SYNTHETIC TEST] Ns. Yohanes Bria, S.Kep',
    'KEPALA_RUANGAN',
    'Kepala Ruangan IBS',
    'IBS',
    1,
    '2026-09-26T00:00:00.000Z',
    '2026-09-26T00:00:00.000Z'
  ),
  (
    'usr_pmkp_test',
    'komite_pmkp',
    '$pbkdf2-sha256$i=100000$c1d2e3f405162738495061728394a5b6$60ed632cf6a0cb5b2b42826094569fe87a00b519c45080569c703cf2b640d194',
    '[SYNTHETIC TEST] dr. Robertus Taolin, Sp.A',
    'KOMITE_PMKP',
    'Ketua Subkomite Mutu & Keselamatan Pasien',
    'IBS',
    1,
    '2026-09-26T00:00:00.000Z',
    '2026-09-26T00:00:00.000Z'
  ),
  (
    'usr_admin_test',
    'admin_ibs',
    '$pbkdf2-sha256$i=100000$d1e2f304152637485960718293a4b5c6$2b1cda4401bf222c88874e12cbf2f101d68298d7fc483875cec972dad3cb30fc',
    '[SYNTHETIC TEST] Administrator SIMRS IBS',
    'ADMINISTRATOR',
    'Pranata Komputer / SIMRS',
    'IBS',
    1,
    '2026-09-26T00:00:00.000Z',
    '2026-09-26T00:00:00.000Z'
  );
