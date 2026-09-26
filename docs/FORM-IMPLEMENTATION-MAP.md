# Form IKP Implementation Mapping

## 1. Document Scope and Purpose

This document provides the definitive field-by-field implementation mapping for the digital **Formulir Pelaporan Insiden Keselamatan Pasien (IKP)** for the **Instalasi Bedah Sentral (IBS) RSUD Prof. Dr. W. Z. Johannes Kupang**.

It traces every field from the physical official document (`docs/Form IKP.pdf`) to:

1. `docs/FORM-I-KP-DATA-TRACEABILITY.md` (Design Specification)
2. Cloudflare D1 Database schema (`database/migrations/0001_initial_production_schema.sql` & `0002_submission_snapshots.sql`)
3. Pages Functions Backend API DTOs (`functions/_shared/incident-service.ts`)
4. React Hook Form UI Components (`src/features/incidents/components/`)

---

## 2. Bagian I: Data Pasien (Patient Demographics & Admission Data)

| No  | Field Name on Physical Form | Form Traceability Key   | Database Column (`incident_reports`)                      | Backend API Property    | Frontend Form Control & Component           |
| --- | --------------------------- | ----------------------- | --------------------------------------------------------- | ----------------------- | ------------------------------------------- |
| 1   | Nama Pasien                 | `patient_name`          | `patient_name TEXT`                                       | `patient_name`          | Input Text (`FormSectionPatient`)           |
| 2   | No. Rekam Medis (No. MR)    | `medical_record_number` | `medical_record_number TEXT`                              | `medical_record_number` | Input Text (`FormSectionPatient`)           |
| 3   | Ruangan / Bangsal           | `patient_room`          | `patient_room TEXT`                                       | `patient_room`          | Input Text (`FormSectionPatient`)           |
| 4   | Umur / Kelompok Umur        | `patient_age_category`  | `patient_age_category TEXT`                               | `patient_age_category`  | Dropdown Select (`FormSectionPatient`)      |
| 5   | Jenis Kelamin               | `patient_gender`        | `patient_gender TEXT CHECK IN ('LAKI_LAKI', 'PEREMPUAN')` | `patient_gender`        | Dropdown Select (`FormSectionPatient`)      |
| 6   | Penanggung Biaya Pasien     | `patient_payer_type`    | `patient_payer_type TEXT`                                 | `patient_payer_type`    | Dropdown Select (`FormSectionPatient`)      |
| 7   | Tanggal & Jam Masuk RS      | `admission_datetime`    | `admission_datetime TEXT`                                 | `admission_datetime`    | Input Datetime-Local (`FormSectionPatient`) |

---

## 3. Bagian II: Rincian Kejadian Insiden (Incident Facts, Chronology & Immediate Action)

| No  | Field Name on Physical Form     | Form Traceability Key         | Database Column (`incident_reports`)                              | Backend API Property          | Frontend Form Control & Component                          |
| --- | ------------------------------- | ----------------------------- | ----------------------------------------------------------------- | ----------------------------- | ---------------------------------------------------------- |
| 8   | Tanggal & Jam Insiden           | `incident_datetime`           | `incident_datetime TEXT NOT NULL`                                 | `incident_datetime`           | Input Datetime-Local (`FormSectionIncident`)               |
| 9   | Zona Waktu Insiden              | `incident_timezone`           | `incident_timezone TEXT DEFAULT 'Asia/Makassar'`                  | `incident_timezone`           | Hidden Default `Asia/Makassar` (WITA)                      |
| 10  | Judul / Ringkasan Insiden       | `incident_title`              | `incident_title TEXT`                                             | `incident_title`              | Input Text (`FormSectionIncident`)                         |
| 11  | Kronologi Insiden (5W+1H)       | `chronology`                  | `chronology TEXT` (Max 10,000 chars)                              | `chronology`                  | Textarea (`FormSectionIncident`)                           |
| 12  | Jenis Insiden                   | `incident_type`               | `incident_type TEXT CHECK IN ('KNC', 'KTC', 'KTD', 'SENTINEL')`   | `incident_type`               | Dropdown Select (`FormSectionIncident`)                    |
| 13  | Orang Pertama Melaporkan        | `initial_reporter_category`   | `initial_reporter_category TEXT`                                  | `initial_reporter_category`   | Dropdown Select (`FormSectionIncident`)                    |
| 14  | Detail Pelapor Awal             | `initial_reporter_detail`     | `initial_reporter_detail TEXT`                                    | `initial_reporter_detail`     | Input Text (`FormSectionIncident`)                         |
| 15  | Insiden Terjadi Pada            | `incident_target`             | `incident_target TEXT CHECK IN ('PASIEN', 'KARYAWAN_NAKES', ...)` | `incident_target`             | Dropdown Select (`FormSectionIncident`)                    |
| 16  | Keterangan Sasaran Lainnya      | `incident_target_other`       | `incident_target_other TEXT`                                      | `incident_target_other`       | Conditional Input Text (`FormSectionIncident`)             |
| 17  | Jenis Pasien                    | `patient_care_type`           | `patient_care_type TEXT`                                          | `patient_care_type`           | Input Text (`FormSectionIncident`)                         |
| 18  | Tempat Kejadian (IBS)           | `incident_location`           | `incident_location TEXT`                                          | `incident_location`           | Dropdown Select (`FormSectionIncident`)                    |
| 19  | Kasus Spesialisasi Terkait      | `clinical_specialization`     | `clinical_specialization TEXT`                                    | `clinical_specialization`     | Dropdown Select (`FormSectionIncident`)                    |
| 20  | Unit Penyebab Insiden           | `causing_unit`                | `causing_unit TEXT`                                               | `causing_unit`                | Dropdown Select (`FormSectionIncident`)                    |
| 21  | Akibat / Derajat Cedera         | `patient_impact`              | `patient_impact TEXT`                                             | `patient_impact`              | Dropdown Select (`FormSectionIncident`)                    |
| 22  | Tindakan Segera & Hasil         | `immediate_action_and_result` | `immediate_action_and_result TEXT`                                | `immediate_action_and_result` | Textarea (`FormSectionImmediateAction`)                    |
| 23  | Tindakan Dilakukan Oleh         | `action_taken_by`             | `action_taken_by TEXT`                                            | `action_taken_by`             | Dropdown Select (`FormSectionImmediateAction`)             |
| 24  | Kejadian Serupa Pernah Terjadi? | `similar_incident_occurred`   | `similar_incident_occurred TEXT`                                  | `similar_incident_occurred`   | Dropdown Select (`FormSectionImmediateAction`)             |
| 25  | Detail Kejadian Serupa          | `similar_incident_details`    | `similar_incident_details TEXT`                                   | `similar_incident_details`    | Conditional Textarea (`FormSectionImmediateAction`)        |
| 26  | Alasan Keterlambatan Pelaporan  | `overdue_reason`              | `overdue_reason TEXT`                                             | `overdue_reason`              | Conditional Textarea (>48h) (`FormSectionImmediateAction`) |

---

## 4. Bagian III: Lembar Kerja Investigasi Sederhana (Form Page 3)

| No  | Field Name on Physical Form  | Form Traceability Key      | Database Column (`simple_investigations`)        | Backend API Property       | Frontend Form Control & Component             |
| --- | ---------------------------- | -------------------------- | ------------------------------------------------ | -------------------------- | --------------------------------------------- |
| 27  | Penyebab Langsung Insiden    | `direct_cause`             | `direct_cause TEXT`                              | `direct_cause`             | Textarea (`InvestigationWorksheet`)           |
| 28  | Akar Masalah (Root Cause)    | `underlying_root_cause`    | `underlying_root_cause TEXT`                     | `underlying_root_cause`    | Textarea (`InvestigationWorksheet`)           |
| 29  | Tanggal Mulai Investigasi    | `investigation_start_date` | `investigation_start_date TEXT`                  | `investigation_start_date` | Date Input (`InvestigationWorksheet`)         |
| 30  | Tanggal Selesai Investigasi  | `investigation_end_date`   | `investigation_end_date TEXT` (CHECK `>= start`) | `investigation_end_date`   | Date Input (`InvestigationWorksheet`)         |
| 31  | Rekomendasi Pencegahan       | `recommendations`          | `recommendations TEXT DEFAULT '[]'`              | `recommendations`          | Dynamic Table Rows (`InvestigationWorksheet`) |
| 32  | Tindakan Perbaikan           | `actions`                  | `actions TEXT DEFAULT '[]'`                      | `actions`                  | Dynamic Table Rows (`InvestigationWorksheet`) |
| 33  | Pengesahan Kepala Ruangan    | `completed_by_user_id`     | `completed_by_user_id TEXT (FK -> users)`        | `completed_by_user_id`     | Server captured on complete                   |
| 34  | Tanggal Selesai / Pengesahan | `completed_at`             | `completed_at TEXT`                              | `completed_at`             | Server timestamp on complete                  |

---

## 5. Technical-Derived Fields

| Technical Field              | Database Column                   | Purpose                          | Source Classification   |
| ---------------------------- | --------------------------------- | -------------------------------- | ----------------------- |
| `id`                         | `id TEXT PRIMARY KEY`             | UUIDv7 primary identifier        | Technical Derived Field |
| `report_number`              | `report_number TEXT UNIQUE`       | Format `IKP/IBS/YYYYMM/XXXX`     | Technical Derived Field |
| `status`                     | `status TEXT NOT NULL`            | 8 canonical workflow states      | Technical Derived Field |
| `created_by_user_id`         | `created_by_user_id TEXT`         | Author account ID                | Technical Derived Field |
| `owning_unit_id`             | `owning_unit_id TEXT`             | Fixed to `'IBS'` for MVP         | Technical Derived Field |
| `row_version`                | `row_version INTEGER NOT NULL`    | Optimistic concurrency control   | Technical Derived Field |
| `sla_deadline_utc`           | `sla_deadline_utc TEXT`           | Exact 48h deadline instant       | Technical Derived Field |
| `is_overdue_sla`             | `is_overdue_sla INTEGER`          | Computed flag (0 or 1)           | Technical Derived Field |
| `risk_grade`                 | `risk_grade TEXT`                 | Manual clinical grade            | Technical Derived Field |
| `risk_graded_at`             | `risk_graded_at TEXT`             | Timestamp of grading             | Technical Derived Field |
| `high_risk_mitigation_notes` | `high_risk_mitigation_notes TEXT` | Mandatory notes for Kuning/Merah | Technical Derived Field |
| `pmkp_reviewed`              | `pmkp_reviewed INTEGER`           | Boolean flag (0 or 1)            | Technical Derived Field |
| `pmkp_review_notes`          | `pmkp_review_notes TEXT`          | Committee review notes           | Technical Derived Field |
