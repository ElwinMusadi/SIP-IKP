# Production Post-Deployment Smoke Test Protocol

## 1. Protocol Purpose and Safety Guidelines

This document provides a step-by-step verification checklist for a human deployment engineer or hospital IT operator to validate the **Sistem Informasi Pelaporan Insiden Keselamatan Pasien (IKP) IBS RSUD Prof. Dr. W. Z. Johannes Kupang** following deployment.

**TEST DATA SAFETY MANDATE:**
All smoke test data entered during verification MUST use explicit test markers:

- Patient Name: `[TEST PASIEN SMOKE]`
- Medical Record Number: `MR-TEST-000`
- Incident Title: `[TEST SMOKE] Uji Coba Pasca-Deploy`
- Chronology: `Ini adalah pengujian asap (smoke test) pasca-deployment produksi. Bukan insiden nyata.`

---

## 2. Smoke Test Execution Checklist

### Scenario 1: Authentication & Session Verification

- [ ] **1.1 Login Success:** Navigate to `/login`. Enter valid credentials. Click "Masuk ke Sistem".
  - _Expected:_ Redirects to `/`. Header renders staff name, role badge, unit badge, and "Keluar" button.
- [ ] **1.2 Cookie Inspection:** Open browser developer tools -> Application -> Cookies.
  - _Expected:_ Cookie name is `__Host-session_id` (or `session_id` on localhost) with `HttpOnly`, `Secure`, and `SameSite=Strict`. No tokens stored in `localStorage` or `sessionStorage`.
- [ ] **1.3 Protected Route:** Log out. Attempt to navigate directly to `/laporan` in the browser address bar.
  - _Expected:_ Automatically redirected to `/login`.
- [ ] **1.4 Invalid Login:** Enter wrong password on `/login`.
  - _Expected:_ Error alert: _"Kredensial tidak valid"_ (HTTP 401).

---

### Scenario 2: Frontline Healthcare Worker (Nakes IBS) Reporting

- [ ] **2.1 Minimum Draft Creation:** Log in as Nakes IBS. Click "Buat Laporan Baru" (`/laporan/baru`). Fill only:
  - Pelapor: Ns. Maria G. Klau (Perawat Bedah)
  - Waktu: Current datetime
  - Jenis Insiden: KNC
  - _Expected:_ Save indicator displays _"Semua perubahan tersimpan"_. Status is `DRAFT`.
- [ ] **2.2 Auto-Save Interaction:** Type into the "Judul Insiden" and "Kronologi" fields. Stop typing.
  - _Expected:_ Indicator transitions from _"Menyimpan..."_ to _"Semua perubahan tersimpan"_.
- [ ] **2.3 Browser Refresh Test:** Refresh the browser page (`F5`).
  - _Expected:_ Draft data reloads intact from D1.
- [ ] **2.4 Incomplete Submission Check:** Click "Kirim Laporan Resmi" without filling patient demographics.
  - _Expected:_ Error banner appears highlighting missing mandatory fields. Submission is blocked.
- [ ] **2.5 Complete Submission:** Fill all required fields in Bagian I & II. Click "Kirim Laporan Resmi". Confirm modal dialog.
  - _Expected:_ Redirects to report detail. Green success banner appears. Report number allocated (`IKP/IBS/YYYYMM/XXXX`). Status is `SUBMITTED`. Draft editing is locked.
- [ ] **2.6 Peer Visibility:** Log in as a second Nakes IBS account. Navigate to `/laporan`.
  - _Expected:_ Can view Nakes 1's submitted report in the list and read details. No edit or workflow action buttons are shown.

---

### Scenario 3: Kepala Ruangan IBS Review & Simple Investigation

- [ ] **3.1 Review Intake:** Log in as Kepala Ruangan IBS. Open the submitted report.
  - _Expected:_ Head Room Review Panel is visible. Click _"Terima & Mulai Peninjauan"_.
  - _Expected:_ Status advances to `UNDER_REVIEW`.
- [ ] **3.2 Revision Loop Test (Optional):** Click _"Minta Perbaikan / Revisi ke Pelapor"_. Enter reason.
  - _Expected:_ Status advances to `REVISION_REQUIRED`. Log in as creator; verify creator can edit and resubmit.
- [ ] **3.3 Manual Risk Grading (BIRU / HIJAU):** In `UNDER_REVIEW`, select `BIRU` or `HIJAU`. Click _"Tetapkan Pita Risiko"_.
  - _Expected:_ Status advances to `SIMPLE_INVESTIGATION`. Lembar Kerja Investigasi Sederhana appears below.
- [ ] **3.4 Investigation Worksheet:** Fill direct cause, root cause, start/end dates (`end >= start`), 1 recommendation, 1 action plan. Click _"Selesaikan Investigasi & Tutup di Tingkat Unit"_.
  - _Expected:_ Status advances to `COMPLETED_BY_UNIT` (terminal). Case is permanently frozen.

---

### Scenario 4: High-Risk Incident Escalation & PMKP Finalization

- [ ] **4.1 High-Risk Grading:** Create and submit a second incident report. Log in as Kepala Ruangan. In `UNDER_REVIEW`, select `KUNING` or `MERAH`. Enter mandatory initial mitigation notes.
  - _Expected:_ Status advances to `PMKP_REVIEW`.
- [ ] **4.2 PMKP Review:** Log in as Komite PMKP. Open the report.
  - _Expected:_ PMKP Review Panel is visible. High-risk mitigation notes from unit head are displayed. Save optional PMKP notes.
- [ ] **4.3 External RCA Handoff Finalization:** Click _"Konfirmasi Serah Terima RCA & Tutup Kasus"_. Confirm modal dialog.
  - _Expected:_ Status advances to `COMPLETED` (terminal). Audit event `REPORT_COMPLETED` is recorded.

---

### Scenario 5: Emergency Correction by Kepala Ruangan

- [ ] **5.1 Emergency Correction Execution:** Open an incident in status `SUBMITTED` or `UNDER_REVIEW`. Click _"Koreksi Darurat Kepala Ruangan"_. Enter reason (e.g. _"Pembaruan nomor MR definitif"_) and update MR number. Click save.
  - _Expected:_ Incident and snapshot are updated in sync. Audit trail records `EMERGENCY_CORRECTION` with reason.
- [ ] **5.2 Correction Boundary Check:** Open an incident in `SIMPLE_INVESTIGATION`, `PMKP_REVIEW`, or `COMPLETED`.
  - _Expected:_ Emergency correction button is not available.

---

### Scenario 6: Administrator Privacy Masking

- [ ] **6.1 Admin Clinical Narrative Gate:** Log in as `ADMINISTRATOR`. Open `/laporan`. Click on an incident.
  - _Expected:_ Administrative metadata (Report number, status, date, location) is visible. Patient Name, No. MR, and Chronology are replaced with `"-"` or omitted.

---

### Scenario 7: Formal A4 Print & Operational Reporting

- [ ] **7.1 Formal Print Preview:** On an incident detail page, click _"Cetak Laporan"_.
  - _Expected:_ Navigates to `/laporan/:id/cetak`. Clean A4 sheet renders with official kop, Bagian I, Bagian II, Bagian III (if applicable), and neutral attribution boxes. Top action bar is visible on screen but hidden in print preview.
- [ ] **7.2 Browser Print Dialog:** Press `Ctrl+P` or click _"Cetak Dokumen"_.
  - _Expected:_ Print preview displays clean A4 portrait layout with no horizontal overflow.
- [ ] **7.3 Operational Recap:** Navigate to `/laporan/rekap`.
  - _Expected:_ Summary cards calculate total reports, risk distribution, and 48h SLA compliance accurately.
  - _Expected:_ Apply Date/Risk filters; verify list updates dynamically.
  - _Expected:_ Click _"Cetak Rekapitulasi"_; verify printable operational summary sheet.

---

## 3. Post-Test Cleanup

Once smoke testing is complete:

- If executed in a dedicated staging/preview environment: Retain or wipe test database via `npm run d1:reset`.
- If executed on initial production database: Mark the test reports clearly as `[TEST SMOKE]` or void via approved administrative database procedure if mandated by hospital policy.
