# Phase 16 — Workflow Revision Report

## 1. Existing Workflow

Laporan berpindah dari `SUBMITTED` ke `UNDER_REVIEW` melalui aksi **Terima & Mulai Peninjauan**. Sebelum Phase 16, grading BIRU/HIJAU langsung memindahkan laporan ke `SIMPLE_INVESTIGATION` dan membuat record investigasi.

## 2. Workflow Baru

Grading BIRU/HIJAU kini tetap berada pada `UNDER_REVIEW` dan menampilkan decision point eksplisit. Pilihan YES memulai `SIMPLE_INVESTIGATION`; pilihan NO menyelesaikan laporan sebagai `COMPLETED_BY_UNIT`. KUNING/MERAH tetap menuju `PMKP_REVIEW`.

## 3. Perubahan Risk Grading Routing

Semantik empat grade tidak berubah. BIRU/HIJAU menyimpan grade tanpa langsung membuat investigasi. KUNING/MERAH tetap membutuhkan catatan mitigasi dan mengikuti jalur PMKP.

## 4. Decision Point Investigasi Sederhana

Kepala Ruangan IBS memilih **Lanjut ke Investigasi Sederhana** atau **Selesaikan Tanpa Investigasi**. Keputusan diproses server-side, bukan hanya state frontend, serta memerlukan `If-Match` dan `row_version` terkini.

## 5. Completion Without Investigation

Penyelesaian langsung memerlukan konfirmasi terminal, berpindah dari `UNDER_REVIEW` BIRU/HIJAU ke `COMPLETED_BY_UNIT`, dan tidak membuat record `simple_investigations`.

## 6. PMKP Workflow Preservation

KUNING/MERAH tetap berpindah dari `UNDER_REVIEW` ke `PMKP_REVIEW`. Mekanisme catatan PMKP dan finalisasi serah-terima RCA eksternal tidak diubah.

## 7. RBAC

Hanya Kepala Ruangan aktif dalam scope unit IBS yang dapat menjalankan keputusan. Nakes, role lain, unit lain, status invalid, dan laporan terminal ditolak di server.

## 8. Audit

Jalur tanpa investigasi menghasilkan `REPORT_COMPLETED` saja. Jalur investigasi mempertahankan `SIMPLE_INVESTIGATION_COMPLETED` dan `REPORT_COMPLETED` pada completion. Tidak ada event start baru karena taxonomy audit minimal existing tidak menyediakannya.

## 9. Data Model Impact

Tidak ada status, tabel, kolom, tipe audit, atau migration baru. Tidak ada reset database atau perubahan data production.

## 10. API Impact

`assign-risk-grade` menggunakan optimistic concurrency dan mempertahankan `UNDER_REVIEW` untuk BIRU/HIJAU. Endpoint start dan skip investigasi memvalidasi role, unit, grade, status, confirmation, dan versi record di server.

## 11. Tests

Regression coverage mencakup kedua grade BIRU/HIJAU pada kedua jalur, preservasi KUNING/MERAH, RBAC, unit scope, invalid state, stale/double submission, direct API calls, record investigation, dan audit event. Pipeline final lulus: 26 file pengujian dan 173 test, typecheck, lint, production build, Cloudflare Functions build, validasi D1 lokal, dan diff check.

## 12. UI/UX Validation

Decision panel memakai komponen shadcn/ui, primary action untuk memulai investigasi, terminal secondary action dengan confirmation dialog, loading/error state, serta layout responsif untuk 360, 390, 414, 1280, dan 1440 piksel. Audit kode responsif dan accessibility lulus; browser back/refresh selalu memuat state canonical dari backend.

## 13. Production Safety

Tidak ada perubahan authentication, session, arsitektur RBAC, emergency correction, security controls, data production, atau fake data. Perubahan bersifat additive pada command workflow existing.

## 14. Known Limitations

Taxonomy audit minimal tidak merekam event ketika investigasi dimulai. Keputusan dapat direkonstruksi dari status/keberadaan record dan completion audit, tetapi start tidak memiliki event tersendiri. Browser back mengandalkan reload state server untuk menampilkan state canonical.
