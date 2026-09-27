# Phase 10 Operational Reporting and Recap Audit

## 1. Scope and Objective

This document audits the operational reporting, filtering, and summary metrics capabilities implemented for the **Instalasi Bedah Sentral (IBS) RSUD Prof. Dr. W. Z. Johannes Kupang**.

- **Web Route:** `/laporan/rekap`
- **Component:** `src/features/incidents/pages/incidents-recap-page.tsx`
- **Backend API:** `GET /api/reports/recap` (`functions/api/reports/recap.ts`)
- **Reporting Purpose:** Real-time departmental operational monitoring of incident volumes, risk distribution, status queues, and 48-hour SLA reporting compliance.

---

## 2. Filter Definitions

| Filter Name                 | Query Parameter  | Input Type in UI          | Values & Constraints                                                                                                      | Target SQL Predicate                             |
| --------------------------- | ---------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **Rentang Tanggal Mulai**   | `startDate`      | Date Input (`YYYY-MM-DD`) | Valid ISO date string; defaults to beginning of day                                                                       | `AND incident_datetime >= ?`                     |
| **Rentang Tanggal Selesai** | `endDate`        | Date Input (`YYYY-MM-DD`) | Valid ISO date string; defaults to end of day (`23:59:59.999Z`)                                                           | `AND incident_datetime <= ?`                     |
| **Jenis Insiden**           | `incidentType`   | Dropdown Select           | `KNC`, `KTC`, `KTD`, `SENTINEL` (or empty for all)                                                                        | `AND incident_type = ?`                          |
| **Pita Risiko**             | `riskGrade`      | Dropdown Select           | `BIRU`, `HIJAU`, `KUNING`, `MERAH`, `UNASSIGNED`                                                                          | `AND risk_grade = ?` or `AND risk_grade IS NULL` |
| **Status Alur**             | `status`         | Dropdown Select           | Canonical statuses (`SUBMITTED`, `UNDER_REVIEW`, `SIMPLE_INVESTIGATION`, `PMKP_REVIEW`, `COMPLETED_BY_UNIT`, `COMPLETED`) | `AND status = ?`                                 |
| **Sasaran Insiden**         | `incidentTarget` | Dropdown Select           | `PASIEN`, `KARYAWAN_NAKES`, `PENGUNJUNG`, `PENDAMPING`, `KELUARGA_PASIEN`, `LAIN_LAIN`                                    | `AND incident_target = ?`                        |

---

## 3. Aggregation and Summary Metric Definitions

All aggregations are computed directly from the filtered incident dataset:

1. **Total Laporan:** Total count of incident reports matching active filters (`items.length`).
2. **Distribusi Tipe Insiden:**
   - `KNC` (Kejadian Nyaris Cedera / Near Miss)
   - `KTC` (Kejadian Tidak Cedera / No Harm)
   - `KTD` (Kejadian Tidak Diharapkan / Adverse Event)
   - `SENTINEL` (Kejadian Sentinel / Death or Serious Harm)
3. **Distribusi Pita Risiko:**
   - `BIRU` (Risiko Rendah)
   - `HIJAU` (Risiko Sedang)
   - `KUNING` (Risiko Tinggi)
   - `MERAH` (Risiko Ekstrem)
   - `UNASSIGNED` (Belum Ditetapkan / Masih dalam draf/antrean verifikasi)
4. **Kepatuhan Batas Waktu Pelaporan (SLA 48 Jam):**
   - `onTime`: Count of reports submitted within 48 hours (`is_overdue_sla = 0`).
   - `overdue`: Count of reports submitted after 48 hours (`is_overdue_sla = 1`).
   - `Kepatuhan (%)`: Calculated as `Math.round((onTime / totalReports) * 100)`.

---

## 4. Role-Based Access Control (RBAC) and Visibility

- **Authentication:** Mandatory. Unauthenticated calls return `HTTP 401 Unauthorized`.
- **IBS Scope Enforcement:** Enforced in SQL query: `WHERE owning_unit_id = 'IBS'`. All reporting is strictly departmental.
- **Draft Privacy Rule:** D1 query enforces `AND (status != 'DRAFT' OR created_by_user_id = ?)` with the authenticated user ID. Other users' unsubmitted drafts are completely excluded from recap lists and count metrics.
- **Roles Permitted:** `TENAGA_KESEHATAN`, `KEPALA_RUANGAN`, `KOMITE_PMKP`, and `ADMINISTRATOR` can query the recap within IBS scope.

---

## 5. Reporting Privacy & Data Masking

In strict compliance with Section 17 of the project instructions:

1. **Zero Patient PII in Aggregate Recap:** The list items returned by `GET /api/reports/recap` completely omit:
   - `patient_name`
   - `medical_record_number`
   - `chronology`
2. **Operational Metadata Only:** Recap list items only include operational categories: `id`, `report_number`, `status`, `incident_datetime`, `incident_type`, `incident_target`, `incident_location`, `clinical_specialization`, `causing_unit`, `patient_impact`, `risk_grade`, `is_overdue_sla`, `created_at`, `submitted_at`, `completed_at`.
3. **No Clinical Narrative Leakage:** Operational recap tables and printed summary sheets are completely safe to share in departmental quality meetings without disclosing confidential patient identities.

---

## 6. Performance Considerations

- **Single Query Execution:** The D1 endpoint executes one indexed query with parameters, retrieving matching operational rows and calculating in-memory summary metrics in O(N) time.
- **Indexed Search Fields:** Table `incident_reports` possesses composite B-tree indexes:
  - `idx_incidents_status`
  - `idx_incidents_owning_unit`
  - `idx_incidents_created_by`
  - `idx_incidents_incident_datetime`
- **Zero Full-Database Dumping:** Filtering occurs server-side at the database layer; the client never downloads raw un-filtered database dumps.
- **No Heavy BI Tooling:** Implemented with native React components, avoiding heavy visualization libraries or charting overhead.
