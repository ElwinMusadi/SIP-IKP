# Phase 10 Formal Incident Print and PDF Layout Audit

## 1. Overview and Standards

This document audits the formal print and PDF rendering implementation for the **Sistem Informasi Pelaporan Insiden Keselamatan Pasien (IKP) IBS RSUD Prof. Dr. W. Z. Johannes Kupang**.

- **Print Route:** `/laporan/:id/cetak` and `/insiden/:id/cetak`
- **Component:** `src/features/incidents/pages/incident-print-page.tsx`
- **Backend API:** `GET /api/incidents/:id/print` (`functions/api/incidents/[id]/print.ts`)
- **Paper Target:** Standard ISO A4 (`210mm x 297mm`), Portrait orientation
- **Print Mechanism:** Browser native print engine (`window.print()`) targeting physical printers and PDF generators ("Save as PDF")

---

## 2. Form Section and Printed Field Mapping

| Form Section                   | Field on Official Physical Form      | Printed Field in Digital Layout                | Data Source Entity                                            | Handling when Field is Empty or Stripped                  | Verification Status |
| ------------------------------ | ------------------------------------ | ---------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------- | ------------------- |
| **Kop Surat Resmi**            | Lambang / Identitas RS & Pemprov NTT | Kop Resmi: RSUD Prof. Dr. W. Z. Johannes & IBS | Static institutional metadata                                 | Rendered at document header                               | **PASS**            |
| Kop Surat                      | Nomor Laporan                        | `IKP/IBS/YYYYMM/XXXX`                          | `incident_reports.report_number`                              | If draft: `DRAF-IKP` with prominent warning banner        | **PASS**            |
| Kop Surat                      | Tanggal/Waktu Cetak                  | Waktu cetak dalam zona WITA                    | Server `printedAt` instant                                    | Format: `DD/MM/YYYY HH:MM:SS WITA`                        | **PASS**            |
| **Status Dokumen**             | Status Alur Pelaporan                | Status Badge/Textual Bar                       | `incident_reports.status`                                     | Canonical status string (e.g. `COMPLETED`, `SUBMITTED`)   | **PASS**            |
| Status Dokumen                 | Pita Grading Risiko                  | Pita Risiko Label & Box                        | `incident_reports.risk_grade`                                 | `BIRU`, `HIJAU`, `KUNING`, `MERAH`, or `BELUM DITENTUKAN` | **PASS**            |
| **Bagian I: Data Pasien**      | 1. Nama Pasien                       | Nama Pasien                                    | `incident_reports.patient_name`                               | Masked for Administrator; displays `"-"` if null          | **PASS**            |
| Bagian I                       | 2. No. Rekam Medis (No. MR)          | No. Rekam Medis                                | `incident_reports.medical_record_number`                      | Masked for Administrator; displays `"-"` if null          | **PASS**            |
| Bagian I                       | 3. Ruangan / Bangsal Pasien          | Ruangan / Bangsal                              | `incident_reports.patient_room`                               | Displays room string or `"-"`                             | **PASS**            |
| Bagian I                       | 4. Kelompok Umur                     | Kelompok Umur                                  | `incident_reports.patient_age_category`                       | Standard KNKP age cohort                                  | **PASS**            |
| Bagian I                       | 5. Jenis Kelamin                     | Jenis Kelamin                                  | `incident_reports.patient_gender`                             | Displays `Laki-laki` / `Perempuan` / `"-"`                | **PASS**            |
| Bagian I                       | 6. Penanggung Biaya Pasien           | Penanggung Biaya                               | `incident_reports.patient_payer_type`                         | BPJS, Umum, Asuransi, dll.                                | **PASS**            |
| Bagian I                       | 7. Tanggal & Jam Masuk RS            | Tanggal & Jam Masuk RS                         | `incident_reports.admission_datetime`                         | Formatted to WITA                                         | **PASS**            |
| Bagian I                       | 8. Jenis Pelayanan Pasien            | Jenis Pelayanan                                | `incident_reports.patient_care_type`                          | Rawat Inap, Rawat Jalan, IGD, ODC Bedah                   | **PASS**            |
| **Bagian II: Rincian Insiden** | 1. Tanggal & Waktu Insiden           | Tanggal & Waktu Insiden                        | `incident_reports.incident_datetime`                          | Authoritative incident instant formatted to WITA          | **PASS**            |
| Bagian II                      | 2. Jenis Insiden                     | Jenis Insiden                                  | `incident_reports.incident_type`                              | KNC, KTC, KTD, or SENTINEL with full name                 | **PASS**            |
| Bagian II                      | 3. Judul Insiden                     | Judul / Ringkasan                              | `incident_reports.incident_title`                             | Single-line incident summary                              | **PASS**            |
| Bagian II                      | 4. Sasaran Insiden                   | Insiden Terjadi Pada                           | `incident_reports.incident_target`                            | Pasien, Karyawan/Nakes, Pengunjung, dll.                  | **PASS**            |
| Bagian II                      | 5. Orang Pertama Melaporkan          | Pelapor Pertama                                | `incident_reports.initial_reporter_category`                  | Category + detail if non-nakes                            | **PASS**            |
| Bagian II                      | 6. Tempat / Kamar Operasi            | Lokasi Kejadian                                | `incident_reports.incident_location`                          | OK 1–8, Pre-Op, PACU                                      | **PASS**            |
| Bagian II                      | 7. Spesialisasi Kasus                | Kasus Spesialisasi                             | `incident_reports.clinical_specialization`                    | Bedah Umum, Ortopedi, Anestesi, dll.                      | **PASS**            |
| Bagian II                      | 8. Unit Penyebab Insiden             | Unit Penyebab                                  | `incident_reports.causing_unit`                               | IBS, Farmasi, Lab, dll.                                   | **PASS**            |
| Bagian II                      | 9. Derajat Cedera Pasien             | Akibat / Derajat Cedera                        | `incident_reports.patient_impact`                             | Kematian, Cedera Berat, Sedang, Ringan, Tidak Ada         | **PASS**            |
| Bagian II                      | 10. Kronologi Insiden (5W+1H)        | Kronologi Lengkap                              | `incident_reports.chronology`                                 | Masked for Administrator; multiline plain-text wrapped    | **PASS**            |
| Bagian II                      | 11. Tindakan Segera & Hasil          | Tindakan Segera Dilakukan                      | `incident_reports.immediate_action_and_result`                | Multiline text, wrapped                                   | **PASS**            |
| Bagian II                      | 12. Tindakan Dilakukan Oleh          | Tindakan Dilakukan Oleh                        | `incident_reports.action_taken_by`                            | Dokter DPJP, Perawat, Tim Bedah, dll.                     | **PASS**            |
| Bagian II                      | 13. Kejadian Serupa                  | Riwayat Kejadian Serupa                        | `incident_reports.similar_incident_occurred`                  | `YA` (with details), `TIDAK`, `TIDAK_TAHU`                | **PASS**            |
| Bagian II                      | 14. Kepatuhan SLA 48 Jam             | Kepatuhan Pelaporan                            | `incident_reports.is_overdue_sla`                             | Tepat Waktu vs Terlambat (>48h) with overdue reason       | **PASS**            |
| Bagian II                      | Catatan Mitigasi Risiko Tinggi       | Catatan Mitigasi Unit                          | `incident_reports.high_risk_mitigation_notes`                 | Rendered when risk grade is KUNING or MERAH               | **PASS**            |
| **Bagian III: Investigasi**    | 1. Penyebab Langsung                 | Penyebab Langsung                              | `simple_investigations.direct_cause`                          | Rendered when Simple Investigation exists                 | **PASS**            |
| Bagian III                     | 2. Akar Masalah                      | Akar Masalah                                   | `simple_investigations.underlying_root_cause`                 | Rendered when Simple Investigation exists                 | **PASS**            |
| Bagian III                     | 3. Rentang Tanggal                   | Rentang Waktu                                  | `simple_investigations.investigation_start_date` / `end_date` | Date range YYYY-MM-DD                                     | **PASS**            |
| Bagian III                     | 4. Tabel Rekomendasi                 | Tabel Rekomendasi                              | `simple_investigations.recommendations`                       | Dynamic rows: No, Rekomendasi, PIC, Target Waktu          | **PASS**            |
| Bagian III                     | 5. Tabel Tindakan Perbaikan          | Tabel Tindakan Perbaikan                       | `simple_investigations.actions`                               | Dynamic rows: No, Tindakan, PIC, Target Waktu             | **PASS**            |
| Bagian III: PMKP               | Catatan Komite PMKP                  | Catatan Arahan PMKP                            | `incident_reports.pmkp_review_notes`                          | Rendered when PMKP review notes exist                     | **PASS**            |
| **Atribusi Dokumen**           | Pelapor (Pembuat)                    | Kotak Dibuat oleh                              | `report.reporter_name`, `reporter_role`, `submitted_at`       | Neutral attribution block (no fake signature image)       | **PASS**            |
| Atribusi Dokumen               | Penerima (Kepala Ruangan)            | Kotak Diverifikasi oleh                        | Kepala Ruangan IBS, `report.received_at`                      | Neutral attribution block                                 | **PASS**            |
| Atribusi Dokumen               | Pengesahan Akhir                     | Kotak Status Akhir                             | Status, `report.completed_at`                                 | Neutral attribution block                                 | **PASS**            |
| **Audit Trail Ringkas**        | Catatan Jejak Audit                  | Tabel Riwayat Audit                            | `audit_records` (minimal 7 events)                            | Waktu, Jenis Tindakan, Pelaku, Catatan (no diffs)         | **PASS**            |

---

## 3. Page Layout & Print CSS Validation

The print stylesheet (`src/styles/globals.css`) enforces strict print media rules:

- `@page { size: A4 portrait; margin: 12mm 15mm; }`
- `.no-print`: Hides top navigation bar, buttons, and action chrome completely during print.
- `print-break-inside-avoid`: Applied to Bagian I, Bagian II, Bagian III, and Attribution blocks to prevent unnatural splits across paper page boundaries.
- **Word Wrapping:** `break-words` and `whitespace-pre-wrap` prevent long chronology text or recommendation rows from overflowing the right margin.
- **Color Preservation:** `-webkit-print-color-adjust: exact` and `print-color-adjust: exact` preserve subtle borders, headers, and risk badges in print output.

---

## 4. Privacy & Authorization Validation

- **RBAC Enforcement:** Evaluated server-side in `functions/api/incidents/[id]/print.ts`. Non-owners cannot print private drafts (`403 Forbidden`). Unauthenticated callers receive `401 Unauthorized`.
- **Administrator Data Masking:** When an `ADMINISTRATOR` prints a report, the server strips `patient_name`, `medical_record_number`, and `chronology`. The print template renders `[Disensor Sesuai Kebijakan Privasi Administrator]`, completely eliminating any print-route privacy bypass.

---

## 5. Digital Attribution Compliance

In accordance with Section 6 and Section 25 of the project instructions:

- The print layout uses neutral terminology: `"Dibuat oleh (Pelapor)"`, `"Diterima / Diverifikasi oleh"`, `"Disahkan / Ditutup oleh"`.
- It explicitly avoids unapproved legal claims (zero mentions of "tanda tangan elektronik", "e-paraf", "disahkan secara hukum", or "dokumen terakreditasi").
- Zero signature images or fake handwritten signatures are rendered.

---

## 6. Known Visual Limitations

1. **Browser-Dependent Page Breaks on Very Long Narratives:** If a clinician writes a chronology narrative exceeding 5,000 characters, browser print layout engines will naturally split the narrative block across Page 1 and Page 2.
2. **Browser Print Margins:** Users should leave browser print margin settings at "Default" or "None" to preserve the 12mm x 15mm design margins.
