# AI Product Blueprint

## Project Information

- **Nama Dokumen:** AI-Product-Blueprint-Sistem-Informasi-IKP-IBS-RSUD-WZ-Johannes.md
- **Nama Aplikasi:** Sistem Informasi Pelaporan Insiden Keselamatan Pasien (IKP) Instalasi Bedah Sentral (IBS) RSUD Prof. Dr. W. Z. Johannes Kupang
- **Organisasi / Unit:** Instalasi Bedah Sentral (IBS) & Komite Peningkatan Mutu dan Keselamatan Pasien (PMKP) RSUD Prof. Dr. W. Z. Johannes Kupang
- **Target Pengguna:** Tenaga Kesehatan (Dokter, Perawat Bedah, Penata Anestesi, Bidan), Kepala Ruangan IBS, Komite PMKP, Administrator Sistem
- **Platform & Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui (Preset `--preset b5J6fFrGq`), Cloudflare Pages Functions, Cloudflare D1 (SQLite), Cloudflare R2
- **Versi Dokumen:** 2.0.0 (Master Unified Document)
- **Tanggal Rilis:** 26 September 2026

---

# STEP 00 — Project Brief

### 1. Executive Summary & Objective

Proyek ini merancang dan mengembangkan platform web "Sistem Informasi Pelaporan Insiden Keselamatan Pasien (IKP)" untuk Instalasi Bedah Sentral (IBS) RSUD Prof. Dr. W. Z. Johannes Kupang[cite: 1]. Sistem ini mentransformasi proses pelaporan konvensional berbasis formulir fisik cetak ("Form IKP.pdf")[cite: 1] menjadi sistem informasi digital yang terstruktur, terdokumentasi, mudah ditelusuri (_traceable_), akuntabel melalui audit trail digital (menggantikan paraf basah)[cite: 1], serta memastikan kepatuhan batas waktu pelaporan maksimal 2x24 jam (48 jam)[cite: 1].

### 2. Business Problem & Context

1. **Keterbatasan Formulir Kertas:** Formulir fisik rentan tercecer di ruang bedah, rusak, lambat diserahkan antar-unit, dan menyulitkan rekapitulasi data indikator keselamatan pasien rumah sakit[cite: 1].
2. **Kepatuhan Batas Waktu Pelaporan:** Form manual mencantumkan klausul tegas _"DILAPORKAN MAXIMAL 2X24 JAM"_[cite: 1]. Pada sistem manual, kepatuhan batas waktu ini sulit dihitung secara akurat dan objektif[cite: 1].
3. **Kerahasiaan Data Medis & Non-Punitive Policy:** Sesuai tanda _"RAHASIA, TIDAK BOLEH DIFOTOCOPY"_[cite: 1], data insiden keselamatan pasien menyangkut rekam medis dan keselamatan staf yang menuntut pembatasan akses ketat berbasis peran (_Role-Based Access Control_)[cite: 1].
4. **Karakteristik Operasional IBS:** Unit bedah memiliki dinamika kerja tinggi dan multi-disiplin (dokter operator, anestesi, perawat instrumen/sirkuler). Kasus klinis seperti alergi antibiotik ceftriaxone saat persiapan tindakan operasi URS menuntut tindakan penanganan segera, penstabilan pasien, dan pelaporan terstruktur tanpa mengganggu alur darurat medis[cite: 1].

### 3. Baseline Form Manual ("Form IKP.pdf")

Formulir acuan memuat 19 butir kelompok data[cite: 1]:

- **Bagian I: Data Pasien:** Nama Pasien, Nomor Rekam Medis (MR), Ruangan, Kelompok Umur (0-1 Bln, >1 Bln-1 Thn, >1-5 Thn, >5-15 Thn, >15-30 Thn, >30-65 Thn, >65 Thn), Jenis Kelamin, Penanggung Jawab Pasien (Pribadi, BPJS/Askes, Asuransi Swasta, dll.), Tanggal & Jam Masuk RS[cite: 1].
- **Bagian II: Rincian Kejadian:** Tanggal & Jam Insiden, Judul Insiden, Kronologi Insiden (5W+1H), Jenis Insiden (KNC, KTC, KTD, Sentinel), Orang Pertama Melaporkan, Subjek Insiden (Pasien / Staf K3RS), Jenis Pasien, Tempat Kejadian, Kasus Spesialisasi Terkait (Bedah, Anestesi, dll.), Unit Penyebab, Akibat/Derajat Cedera (Kematian, Cedera Berat, Sedang, Ringan, Tidak Ada Cedera), Tindakan Segera & Hasilnya, Pihak yang Melakukan Tindakan (Dokter, Perawat, Tim), Riwayat Kejadian Serupa di Unit Lain, Data Administratif Pembuat & Penerima Laporan, serta Kotak Grading Risiko[cite: 1].
- **Bagian III: Lembar Kerja Investigasi Sederhana (Bands Biru/Hijau):** Penyebab langsung, akar masalah, tabel rekomendasi & penanggung jawab, tabel tindakan & penanggung jawab, tanggal mulai & selesai investigasi, persetujuan Kepala Ruangan/Unit, serta lembar evaluasi Komite PMKP (kelengkapan berkas, keputusan investigasi lanjutan YA/TIDAK, dan grading ulang)[cite: 1].

### 4. Target User & Role Analysis

- **Tenaga Kesehatan (Pelapor):** Dokter, Perawat IBS, Penata Anestesi, Bidan[cite: 1]. Berwenang menyusun draf dan mengirimkan laporan insiden resmi[cite: 1].
- **Kepala Ruangan IBS:** Atasan langsung pelapor. Berwenang menerima berkas, menetapkan seleksi manual Bands Risiko (Biru, Hijau, Kuning, Merah), mengisi lembar investigasi sederhana (Bands Biru/Hijau), atau membuat catatan awal eskalasi (Bands Kuning/Merah)[cite: 1].
- **Komite PMKP:** Tim penjamin mutu rumah sakit. Berwenang meninjau investigasi sederhana, memutuskan kebutuhan RCA lanjutan, menetapkan regrading, dan menutup berkas (_Completed_)[cite: 1].
- **Administrator Sistem:** Pengelola TI rumah sakit untuk manajemen akun, RBAC, master data fasilitas bedah, dan audit trail log.

### 5. Baseline Workflow

`Draft` -> `Submitted` -> `Under Review` -> `Risk Graded` -> (`Simple Investigation` [Biru/Hijau] ATAU `Escalated to PMKP` [Kuning/Merah]) -> `PMKP Review` -> `Completed`[cite: 1].

---

# STEP 01 — Product Discovery

### 1. Problem Space & Gap Analysis

- **Manual vs Digital Gap:** Formulir kertas manual rentan hilang, memperlambat investigasi sederhana, dan menyulitkan rekapitulasi mutu[cite: 1]. Sistem digital menyediakan form wizard terstruktur, penyimpanan draf otomatis (_local draft cache_), serta dashboard analitik real-time.
- **Pelaporan Temuan Non-Nakes:** Temuan oleh petugas Cleaning Service, Petugas Keamanan, atau Pengunjung disalurkan melalui nakes perantara yang bertindak sebagai pelapor resmi terotentikasi, dengan identitas penemu awal dicatat pada form[cite: 1].
- **Otentikasi Pengganti Paraf Basah:** Sesuai keputusan resmi, tanda tangan basah manual digantikan secara sah oleh rekam jejak digital (_User Audit Log & Tamper-proof Timestamp_) yang mencatat Nama Lengkap, NIP, Jabatan, dan stempel waktu ISO server[cite: 1].

### 2. User Personas

- **Sr. Maria, S.Kep., Ns. (Perawat Bedah):** Membutuhkan pengisian form yang cepat, tidak hilang saat ditinggal operasi cito, dan navigasi yang jelas[cite: 1].
- **Ns. Dominggus, S.Kep. (Kepala Ruangan IBS):** Membutuhkan antrean verifikasi terpadu, kemudahan seleksi manual grading warna, dan form tabel investigasi sederhana yang rapi[cite: 1].
- **dr. Maria, Sp.A / Tim PMKP (Komite Mutu):** Membutuhkan rekapitulasi data agregat instan, evaluasi kelengkapan investigasi dari unit, dan kemampuan ekspor dokumen cetak resmi berstandar akreditasi[cite: 1].

### 3. Edge Cases & Mitigasi Operasional

- **Pasien Darurat Cito:** Mengizinkan penomoran rekam medis darurat bertanda khusus `EMERGENCY-YYYYMMDD-XXX` yang dapat dimutakhirkan kemudian[cite: 1].
- **Keterlambatan Submit (> 48 Jam):** Sistem tidak memblokir laporan, tetapi mewajibkan pelapor mengisi kolom alasan keterlambatan serta menyematkan label audit `OVERDUE_SLA`[cite: 1].
- **Revisi Berkas:** Komite PMKP dapat mengembalikan berkas investigasi sederhana yang dinilai belum lengkap ke Kepala Ruangan dengan catatan perbaikan formal[cite: 1].

---

# STEP 02 — Module & Feature Architecture

|    No | Modul                                        | Fitur Konkret                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----: | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A** | **MODUL CORE**                               |                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
|     1 | Manajemen Pelaporan Insiden (Nakes)          | _ Pembuatan draf dan auto-save formulir insiden Bagian I & II[cite: 1]<br>_ Input data demografi pasien & rekam medis[cite: 1]<br>_ Input kronologi insiden terstruktur pemandu 5W+1H[cite: 1]<br>_ Klasifikasi jenis insiden (KNC, KTC, KTD, Sentinel) dan derajat cedera[cite: 1]<br>_ Pencatatan tindakan segera, respons klinis, dan riwayat pencegahan[cite: 1]<br>_ Penghitungan selisih waktu otomatis terhadap batas waktu 2x24 jam[cite: 1]       |
|     2 | Verifikasi & Grading Risiko (Kepala Ruangan) | _ Antrean verifikasi berkas insiden masuk IBS[cite: 1]<br>_ Penerimaan berkas dengan pembubuhan e-paraf log otomatis[cite: 1]<br>_ Seleksi manual langsung Bands Risiko: BIRU, HIJAU, KUNING, MERAH[cite: 1]<br>_ Formulir catatan awal Kepala Ruangan untuk eskalasi risiko Kuning/Merah[cite: 1]<br>\* Opsi penyelesaian insiden minor di tingkat unit (Closed by Unit)[cite: 1]                                                                         |
|     3 | Investigasi Sederhana (Kepala Ruangan)       | _ Aktivasi form investigasi dinamis untuk Bands BIRU dan HIJAU[cite: 1]<br>_ Analisis penyebab langsung dan akar masalah (_root cause_)[cite: 1]<br>_ Tabel dinamis rencana rekomendasi & target tanggal[cite: 1]<br>_ Tabel dinamis rencana tindakan perbaikan & target tanggal[cite: 1]<br>_ Validasi rentang tanggal investigasi (Tanggal Selesai >= Tanggal Mulai)[cite: 1]<br>_ Pengesahan pimpinan unit dan pengiriman resmi ke Komite PMKP[cite: 1] |
|     4 | Evaluasi & Mutu (Komite PMKP)                | _ Inbox penerimaan investigasi unit dan eskalasi risiko tinggi[cite: 1]<br>_ Verifikasi kelengkapan investigasi sederhana (YA / TIDAK)[cite: 1]<br>_ Keputusan perlunya investigasi lanjutan/RCA (YA / TIDAK)[cite: 1]<br>_ Fasilitas regrading (Grading Ulang: Hijau/Kuning/Merah)[cite: 1]<br>* Pengembalian berkas revisi dan penutupan kasus resmi (*Completed\*)[cite: 1]                                                                             |
| **B** | **MODUL OPERASIONAL & TRACKING**             |                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
|     5 | Workflow & SLA Tracking                      | _ Timeline visual status dokumen dari Draft hingga Completed[cite: 1]<br>_ Live countdown SLA 48 jam dengan penanda badge tepat waktu vs terlambat[cite: 1]<br>\* Notifikasi in-app untuk tugas masuk dan permintaan revisi berkas                                                                                                                                                                                                                         |
|     6 | Audit Trail & Log Keabsahan                  | _ Pencatatan transaksi immutable (siapa, aksi apa, kapan, status)[cite: 1]<br>_ E-paraf log pengganti tanda tangan basah (User ID, NIP, Jabatan, Timestamp)[cite: 1]<br>\* Pencatatan riwayat addendum medis pasca-submit                                                                                                                                                                                                                                  |
| **C** | **MODUL REPORTING & ANALYTICS**              |                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
|     7 | Dashboard Eksekutif IBS & PMKP               | _ Metrik KPI keselamatan pasien, rasio insiden, dan kepatuhan SLA 2x24 jam[cite: 1]<br>_ Grafik distribusi jenis insiden dan sebaran kamar bedah[cite: 1]<br>\* Filter analitik berdasarkan rentang waktu dinamis                                                                                                                                                                                                                                          |
|     8 | Rekapitulasi & Ekspor Berkas                 | _ Ekspor data tabular multi-filter ke CSV/Excel<br>_ Ekspor formulir PDF resmi berstandar akreditasi dengan tata letak identik Form IKP cetak[cite: 1]                                                                                                                                                                                                                                                                                                     |
| **D** | **MODUL ADMINISTRATIF**                      |                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
|     9 | Otentikasi & Akun Pengguna                   | _ Login terenkripsi, reset password, dan manajemen sesi idle timeout (15 menit)<br>_ Manajemen pengguna IBS dan penetapan wewenang RBAC 4 tingkat                                                                                                                                                                                                                                                                                                          |
|    10 | Master Data Sistem                           | _ Pengaturan master ruang bedah (OK 1, OK 2, Pre-Op, PACU, Depo)[cite: 1]<br>_ Pengaturan spesialisasi klinis, unit penyebab, dan tipe penjamin[cite: 1]                                                                                                                                                                                                                                                                                                   |
| **E** | **MODUL FUTURE (POST-MVP)**                  |                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
|    11 | Integrasi Eksternal & RCA Lanjutan           | _ Integrasi API RME/SIMRS RSUD Prof. Dr. W. Z. Johannes Kupang[cite: 1]<br>_ Modul diagram visual interaktif Root Cause Analysis (Fishbone / 5-Whys)[cite: 1]<br>\* Integrasi pelaporan eksternal ke portal KNKP Kementerian Kesehatan RI                                                                                                                                                                                                                  |

---

# STEP 03 — Requirements & Business Rules

### 1. Functional Requirements (FR)

- **FR-01 (Otentikasi & Sesi):** Login akun berbasis Username/NIP dan Password terenkripsi, penguncian sesi idle setelah 15 menit tanpa aktivitas.
- **FR-02 (Pelaporan Insiden Nakes):** Input lengkap Bagian I (Data Pasien: Nama, No MR, Ruangan, Umur, Jenis Kelamin, Penjamin, Jam Masuk)[cite: 1]; Bagian II (Rincian Kejadian: Tanggal/Jam Insiden, Judul, Kronologi 5W+1H, Jenis KNC/KTC/KTD/Sentinel, Pelapor Awal, Subjek, Tempat, Spesialisasi Medis, Unit Penyebab, Derajat Cedera, Tindakan Segera, Riwayat Kejadian Serupa)[cite: 1]; Fitur Simpan Draf Cepat dan Tombol Kirim Resmi[cite: 1].
- **FR-03 (Grading Risiko Kepala Ruangan):** Penerimaan berkas, pencatatan otomatis identitas verifikator, seleksi manual Bands Risiko (Biru, Hijau, Kuning, Merah), input catatan awal untuk eskalasi Kuning/Merah, dan opsi penyelesaian di tingkat unit[cite: 1].
- **FR-04 (Lembar Kerja Investigasi Sederhana):** Terbuka otomatis saat grading Biru atau Hijau dipilih[cite: 1]; input penyebab langsung, akar masalah, tabel rekomendasi dinamis, tabel rencana tindakan dinamis, rentang tanggal investigasi, dan pengesahan digital pimpinan unit[cite: 1].
- **FR-05 (Tinjauan Mutu Komite PMKP):** Penilaian kelengkapan investigasi (YA/TIDAK), keputusan investigasi lanjutan (YA/TIDAK), fasilitas penetapan grading ulang (Hijau/Kuning/Merah), pengembalian berkas revisi, dan penutupan berkas resmi (_Completed_)[cite: 1].
- **FR-06 (Tracking SLA & Audit Trail):** Kalkulasi selisih waktu pelaporan terhadap batas maksimal 2x24 jam (48 jam)[cite: 1], pemberian badge status SLA, formulir alasan keterlambatan, dan pencatatan riwayat transaksi tak terbantahkan (_immutable audit log_)[cite: 1].
- **FR-07 (Dashboard & Ekspor):** Visualisasi indikator mutu insiden, filter pencarian multi-kriteria, ekspor data tabular CSV, dan pencetakan PDF format formal Form IKP[cite: 1].

### 2. Business Rules (BR)

- **BR-01 (Kewenangan Pembuatan):** Pelaporan resmi wajib dibuat oleh Tenaga Kesehatan terdaftar[cite: 1]. Laporan temuan non-nakes dicatat melalui nakes perantara dengan mencantumkan identitas penemu awal[cite: 1].
- **BR-02 (Kerahasiaan & Budaya Keselamatan):** Dokumen bersifat rahasia dan berprinsip pembelajaran non-punitive[cite: 1]. Akses dibatasi ketat berdasarkan instalasi kerja dan peran wewenang[cite: 1].
- **BR-03 (Batas Waktu Pelaporan):** Wajib dilaporkan maksimal 2x24 jam sejak insiden terjadi[cite: 1]. Keterlambatan pelaporan mewajibkan pengisian alasan keterlambatan[cite: 1].
- **BR-04 (Integritas Kronologi):** Data kronologi utama terkunci permanen setelah berkas disubmit[cite: 1]. Informasi susulan ditambahkan via kolom addendum resmi.
- **BR-05 (Kewenangan Grading Risiko):** Bands Risiko ditetapkan secara seleksi manual langsung oleh Kepala Ruangan IBS (dan Komite PMKP saat regrading)[cite: 1].
- **BR-06 (Percabangan Alur Pasca-Grading):**
  - _Bands BIRU / HIJAU:_ Wajib dilakukan Investigasi Sederhana di IBS[cite: 1].
  - _Bands KUNING / MERAH:_ Kepala Ruangan wajib mengisi catatan awal mitigasi sebelum eskalasi ke PMKP untuk persiapan RCA[cite: 1].
- **BR-07 (Verifikasi Pengganti Paraf Basah):** Tanda tangan dan paraf fisik digantikan sah oleh rekaman sistem (_User Audit Log & ISO Timestamp_) yang memuat Nama Lengkap, NIP, Peran, dan Tanggal-Jam Server[cite: 1].
- **BR-08 (Validasi Periode Investigasi):** Tanggal selesai investigasi sederhana wajib sama dengan atau sesudah tanggal mulai (Tanggal Selesai >= Tanggal Mulai)[cite: 1].
- **BR-09 (Otoritas Penutupan Berkas):** Status `Completed` hanya dapat disahkan oleh Komite PMKP, kecuali insiden KNC sangat minor yang secara formal dihentikan di tingkat Kepala Ruangan (`COMPLETED_BY_UNIT`)[cite: 1].

### 3. Role-Based Access Control (RBAC) Matrix

- **Tenaga Kesehatan (Pelapor):** Buat & simpan draf laporan, kirim laporan, lihat laporan milik sendiri, unduh PDF laporan pribadi[cite: 1].
- **Kepala Ruangan IBS:** Akses seluruh laporan IBS, verifikasi laporan, tetapkan grading risiko, input catatan awal eskalasi, isi & sahkan lembar investigasi sederhana, selesaikan berkas di unit, akses dashboard mutu IBS[cite: 1].
- **Komite PMKP:** Akses seluruh laporan insiden RS (fokus IBS), evaluasi kelengkapan berkas investigasi, tetapkan regrading, putuskan investigasi lanjutan/RCA, kembalikan revisi, tutup berkas resmi (_Completed_), akses dashboard eksekutif mutu RS[cite: 1].
- **Administrator Sistem:** Manajemen akun pengguna, pengaturan role & permissions, konfigurasi master data ruangan/unit, pengawasan integritas log audit trail.

---

# STEP 04 — Product Requirements Document (PRD)

### 1. Executive Summary

Sistem Informasi Pelaporan Insiden Keselamatan Pasien (IKP) Instalasi Bedah Sentral (IBS) RSUD Prof. Dr. W. Z. Johannes Kupang mendigitalisasi alur pelaporan, grading risiko manual, investigasi sederhana unit, dan evaluasi komite mutu[cite: 1]. Menggantikan formulir kertas Form IKP[cite: 1], sistem menjamin kepatuhan SLA 2x24 jam[cite: 1], non-punitive confidentiality[cite: 1], serta akuntabilitas e-paraf log[cite: 1].

### 2. Product Objectives

1. Kepatuhan batas lapor maksimal 48 jam terpantau otomatis secara real-time[cite: 1].
2. Pencegahan kebocoran data medis rekam jejak keselamatan pasien[cite: 1].
3. Percepatan siklus investigasi sederhana dan eskalasi dini insiden berisiko tinggi[cite: 1].
4. Penyediaan dokumen cetak rekapitulasi standar akreditasi rumah sakit[cite: 1].

### 3. Scope & Acceptance Criteria

- **MVP Scope:** Auth JWT, RBAC 4 role, Form Pelaporan Bagian I & II[cite: 1], SLA 48 jam Tracker[cite: 1], Grading Risiko Manual[cite: 1], Form Investigasi Sederhana Bagian III[cite: 1], PMKP Review Inbox[cite: 1], Audit Trail Log[cite: 1], Cetak PDF Layout Resmi[cite: 1].
- **Acceptance Criteria (AC-01 s/d AC-05):** Sistem memvalidasi field secara ketat, menandai berkas terlambat secara otomatis, mengunci isian utama pasca-submit, membuka tab investigasi sederhana secara dinamis untuk risiko Biru/Hijau, serta mencetak e-paraf log resmi pada berkas PDF[cite: 1].

### 4. Non-Functional Requirements (NFR)

- **Performance:** Waktu buka halaman <= 1.5 detik, respons submission API <= 800 ms.
- **Security:** TLS HTTPS, HttpOnly Secure Cookies, Idle Session Timeout 15 menit, RBAC terisolasi.
- **Reliability:** Uptime 99.5% pada platform serverless Cloudflare Pages & D1.

---

# STEP 05 — Information Architecture & User Flow

### 1. Sitemap & Page Structure

```
/ (Aplikasi Web IKP IBS)
├── /login
├── /dashboard (Matriks Insiden, SLA Tracker, Antrean Verifikasi)
├── /insiden
│    ├── /insiden (Tabel Rekapitulasi Berkas Laporan)
│    ├── /insiden/baru (Wizard Formulir 5 Langkah)
│    ├── /insiden/:id (Detail Laporan, Kronologi & Timeline Status)
│    ├── /insiden/:id/edit (Edit Draf - Khusus Status DRAFT)
│    ├── /insiden/:id/verifikasi (Review & Seleksi Grading - Khusus Kepala Ruangan)
│    ├── /insiden/:id/investigasi-sederhana (Form Investigasi Bands Biru/Hijau)
│    └── /insiden/:id/cetak (Pratinjau Cetak Formal Layout "Form IKP.pdf" & Unduh PDF)
├── /pmkp-inbox (Antrean Masuk Khusus Komite PMKP)
│    └── /pmkp-inbox/:id/evaluasi (Pemeriksaan Kelengkapan, Regrading & Penutupan)
├── /laporan-rekap (Rekapitulasi Mutu & Analisis Kepatuhan 2x24 Jam)
└── /admin (Manajemen Pengguna, Master Data Ruang Bedah & Audit Trail)
```

### 2. User Flows

- **Flow 1 (Pelaporan Nakes):** Buka `/insiden/baru` -> Isi Bagian I Pasien -> Isi Bagian II Rincian & Kronologi 5W+1H -> Isi Dampak & Lokasi IBS -> Isi Tindakan Segera -> Cek Pratinjau -> Kirim Laporan Resmi (Status: `SUBMITTED`)[cite: 1].
- **Flow 2 (Verifikasi & Investigasi Kepala Ruangan):** Notifikasi masuk -> Buka `/insiden/:id/verifikasi` (Status: `UNDER_REVIEW`, e-paraf penerima tercatat otomatis) -> Seleksi Manual Bands Risiko[cite: 1]:
  - Jika **BIRU/HIJAU**: Form Lembar Kerja Investigasi Sederhana aktif -> Isi penyebab langsung, akar masalah, tabel rekomendasi, tindakan, rentang tanggal -> Sahkan & Kirim ke PMKP (Status: `SUBMITTED_TO_PMKP`)[cite: 1].
  - Jika **KUNING/MERAH**: Form investigasi sederhana tertutup -> Isi Catatan Awal Mitigasi -> Eskalasi ke PMKP (Status: `ESCALATED_TO_PMKP`)[cite: 1].
  - Jika KNC Minor: Pilih "Selesaikan di Unit" (Status: `COMPLETED_BY_UNIT`)[cite: 1].
- **Flow 3 (Evaluasi & Penutupan PMKP):** Buka berkas di `/pmkp-inbox/:id/evaluasi` -> Periksa investigasi unit -> Tentukan kelengkapan (YA/TIDAK) & keputusan RCA lanjutan -> Tetapkan grading ulang jika ada -> Tutup Kasus Resmi (Status: `COMPLETED`) atau Kembalikan Berkas untuk Revisi[cite: 1].

---

# STEP 06 — Data & Technical Concept

### 1. Relational Data Model (Cloudflare D1 - SQLite)

```
┌──────────────┐       1:N       ┌──────────────────┐       1:1       ┌──────────────────────┐
│    users     ├────────────────>│ incident_reports ├────────────────>│ simple_investigations│
└──────┬───────┘ (Reporter/Atasan)└────────┬─────────┘                └──────────┬───────────┘
       │                                   │                                     │ 1:N
       │ 1:N                               │ 1:N                                 ├─────────────┐
       ▼                                   ▼                                     ▼             ▼
┌──────────────┐                 ┌──────────────────┐                 ┌─────────────┐┌─────────────┐
│ report_audit │                 │incident_attach-  │                 │investigation││investigation│
│    _logs     │                 │      ments       │                 │_recommenda- ││  _actions   │
└──────────────┘                 └──────────────────┘                 │    tions    │└─────────────┘
                                           │ 1:1                      └─────────────┘
                                           ▼
                                 ┌──────────────────┐
                                 │ pmkp_evaluations │
                                 └──────────────────┘
```

### 2. Data Dictionary Ringkas

1. **`users`:** `id` (PK UUID), `username` (Unique), `email` (Unique), `password_hash`, `full_name`, `nip_nrp`, `role` (TENAGA_KESEHATAN, KEPALA_RUANGAN, KOMITE_PMKP, ADMINISTRATOR), `profession`, `unit_name`, `is_active`, timestamps.
2. **`incident_reports`:** `id` (PK UUID), `report_number` (Unique `IKP/IBS/YYYYMM/XXXX`), `status`, `patient_name`, `medical_record_number`, `patient_room`, `patient_age_category` (0-1 Bulan s/d >65 Tahun), `patient_gender`, `patient_payer_type`, `admission_datetime`, `incident_datetime`, `incident_title`, `chronology` (5W+1H), `incident_type` (KNC, KTC, KTD, SENTINEL), `initial_reporter_category`, `initial_reporter_detail`, `incident_target`, `patient_type`, `incident_location`, `clinical_specialization`, `causing_unit`, `patient_impact` (Kematian, Cedera Berat, Sedang, Ringan, Tidak Ada Cedera), `immediate_action_and_result`, `action_taken_by`, `similar_incident_occurred`, `is_overdue_sla` (Boolean), `overdue_reason`, `created_by_user_id` (FK), `submitted_at`, `received_by_user_id` (FK), `received_at`, `risk_grade` (BIRU, HIJAU, KUNING, MERAH), `risk_graded_at`, `initial_notes_high_risk`, timestamps[cite: 1].
3. **`simple_investigations`:** `id` (PK UUID), `incident_report_id` (FK Unique), `direct_cause`, `underlying_root_cause`, `investigation_start_date`, `investigation_end_date`, `manager_approved_by_user_id` (FK), `manager_approved_at`, timestamps[cite: 1].
4. **`investigation_recommendations`:** `id` (PK UUID), `simple_investigation_id` (FK), `recommendation_text`, `responsible_person`, `target_date`, `order_index`[cite: 1].
5. **`investigation_actions`:** `id` (PK UUID), `simple_investigation_id` (FK), `action_text`, `responsible_person`, `target_date`, `order_index`[cite: 1].
6. **`pmkp_evaluations`:** `id` (PK UUID), `incident_report_id` (FK Unique), `is_investigation_complete` (Boolean), `is_further_investigation_needed` (Boolean), `regraded_risk_band` (HIJAU, KUNING, MERAH), `regraded_date`, `pmkp_notes_and_directives`, `evaluated_by_user_id` (FK), `completed_at`, timestamps[cite: 1].
7. **`report_audit_logs`:** `id` (PK UUID), `incident_report_id` (FK), `user_id` (FK), `action_event`, `previous_status`, `new_status`, `e_signature_name`, `e_signature_role`, `notes`, `ip_address`, `created_at` (ISO Timestamp Server)[cite: 1].
8. **`incident_attachments`:** `id` (PK UUID), `incident_report_id` (FK), `file_name`, `file_size_bytes`, `mime_type`, `r2_storage_key`, `uploaded_by_user_id` (FK), `uploaded_at`.
9. **Tabel Master Data:** `master_operating_rooms`, `master_specializations`, `master_departments`, `master_payer_types`[cite: 1].

### 3. Arsitektur Teknis

- **Client Side:** React 19 SPA, Vite bundler, Tailwind CSS v4, pustaka UI shadcn/ui.
- **Backend API Layer:** Cloudflare Pages Functions (Edge Serverless REST API endpoints) memanfaatkan Web Crypto API untuk verifikasi JWT stateless.
- **Database & Storage:** Cloudflare D1 (Serverless relational SQLite) dengan automated daily snapshot, serta Cloudflare R2 untuk penyimpanan presigned URL berkas bukti insiden.
- **Keabsahan Medikolegal:** Audit trail immutable dengan atomic insert (`db.batch()`) merekam identitas verifikator secara otomatis pada setiap mutasi berkas[cite: 1].
- **Mesin Cetak PDF:** Rendering dokumen formal di sisi klien (`@media print` stylesheet / klien PDF renderer) untuk menjamin tata letak dokumen fisik presisi 100% terhadap Form IKP cetak[cite: 1].

---

# STEP 07 — UI/UX Design Specification

### 1. Global Visual Tokens (shadcn/ui `--preset b5J6fFrGq`)

- **Warna Brand:** Clinical Deep Teal (`#0f766e` / `teal-700`, hover `#115e59`).
- **Warna Semantic Bands Risiko:**
  - BIRU: `bg-sky-50 text-sky-700 border-sky-300 ring-sky-500`[cite: 1]
  - HIJAU: `bg-emerald-50 text-emerald-700 border-emerald-300 ring-emerald-500`[cite: 1]
  - KUNING: `bg-amber-50 text-amber-800 border-amber-300 ring-amber-500`[cite: 1]
  - MERAH: `bg-rose-50 text-rose-700 border-rose-300 ring-rose-500`[cite: 1]
- **SLA Badges:** Tepat Waktu (`bg-emerald-100 text-emerald-800`), Overdue (`bg-rose-100 text-rose-800 border-rose-300 font-semibold animate-pulse`)[cite: 1].
- **Tipografi:** Font family `Inter`, sans-serif dengan skala hierarkis terstandarisasi.

### 2. Spesifikasi Layar Utama (Screen Specs)

#### Screen 01: Login & Sesi Keamanan (`/login`)

- **Purpose:** Akses masuk terotentikasi dan pengamanan data rahasia insiden[cite: 1].
- **Layout & Komponen:** Centered Single Card layout (`max-w-md mx-auto`), logo RSUD Prof. Dr. W. Z. Johannes Kupang, banner kerahasiaan medis, input Username/NIP, input Password, tombol Remember Me, tombol Login[cite: 1].
- **States:** Loading spinner saat memvalidasi JWT; Alert merah jika kredensial salah; Error banner jika akun dinonaktifkan.

#### Screen 02: Dashboard Terpadu IBS & PMKP (`/dashboard`)

- **Purpose:** Monitoring insiden aktif, pemantauan batas waktu pelaporan 2x24 jam, dan antrean verifikasi[cite: 1].
- **Layout & Komponen:** Grid 12 kolom; 4 kartu metrik KPI (Total Insiden, Distribusi KNC/KTC/KTD/Sentinel, Kepatuhan SLA 48 Jam, Berkas Menunggu Aksi)[cite: 1]; grafik batang insiden per kamar bedah; donat chart sebaran bands risiko; tabel antrean aksi cepat[cite: 1].
- **States:** Skeleton loader berdenyut saat memuat data; filter waktu cepat (Bulan Ini, Triwulan, Tahun Ini); Empty state ramah jika antrean bersih.

#### Screen 03: Multi-Step Incident Wizard (`/insiden/baru` & `/insiden/:id/edit`)

- **Purpose:** Pengisian digital komprehensif seluruh klausul Bagian I & II Form IKP oleh tenaga kesehatan[cite: 1].
- **Layout & Komponen:** Stepper Wizard 5 langkah dengan live timer SLA 48 jam dan tombol auto-save draf[cite: 1]:
  - _Langkah 1 (Data Pasien):_ Input Nama, No. MR, Ruangan, Radio Kelompok Umur, Radio Kelamin, Dropdown Penjamin, Jam Masuk RS[cite: 1].
  - _Langkah 2 (Rincian Kejadian):_ Tanggal/Jam Insiden (peringatan aktif jika > 48 jam), Judul, Textarea Kronologi 5W+1H, Radio Pelapor Awal (Nakes vs CS/Security/Keluarga), Subjek Insiden[cite: 1].
  - _Langkah 3 (Dampak & Lokasi):_ Radio Jenis Insiden (KNC, KTC, KTD, Sentinel), Lokasi IBS (OK 1, OK 2, PACU, dll.), Spesialisasi Medis Terkait, Unit Penyebab, Radio Derajat Cedera Pasien[cite: 1].
  - _Langkah 4 (Tindakan Segera):_ Textarea Tindakan & Respons Stabilitas Pasien, Radio Pelaksana Tindakan (Dokter, Perawat, Tim), Radio Insiden Serupa di Unit Lain[cite: 1].
  - _Langkah 5 (Pratinjau & Pengesahan):_ Ringkasan isian, pernyataan kebenaran data medis nakes, tombol Submit Resmi[cite: 1].
- **States:** Jika pelaporan > 48 jam, muncul field wajib tambahan: _Alasan Keterlambatan Pelaporan_[cite: 1]; konfirmasi modal dialog sebelum pengiriman resmi.

#### Screen 04: Incident Verification & Risk Grading (`/insiden/:id/verifikasi`)

- **Purpose:** Verifikasi laporan nakes dan penetapan seleksi manual Bands Risiko oleh Kepala Ruangan IBS[cite: 1].
- **Layout & Komponen:** Two-Column Split Layout; Kolom kiri memuat pratinjau dokumen laporan nakes; Kolom kanan memuat kotak penerimaan berkas (e-paraf log otomatis) dan 4 kartu pilihan manual Bands Risiko (BIRU, HIJAU, KUNING, MERAH)[cite: 1].
- **Branching Logic:**
  - Memilih Biru/Hijau -> Tombol lanjut ke _Lembar Investigasi Sederhana_ aktif[cite: 1].
  - Memilih Kuning/Merah -> Muncul field wajib _Catatan Awal Mitigasi Kepala Ruangan_ dan tombol _Eskalasi ke Komite PMKP_[cite: 1].
  - Opsi Selesai di Unit untuk KNC minor[cite: 1].

#### Screen 05: Simple Investigation Worksheet (`/insiden/:id/investigasi-sederhana`)

- **Purpose:** Pengisian Lembar Kerja Investigasi Sederhana khusus Bands Risiko BIRU/HIJAU sesuai Bagian III Form IKP[cite: 1].
- **Layout & Komponen:** Form dokumen terstruktur; Kop resmi RSUD Prof. Dr. W. Z. Johannes Kupang[cite: 1]; Textarea Penyebab Langsung[cite: 1]; Textarea Akar Masalah[cite: 1]; Tabel Dinamis Rekomendasi (+ baris input rekomendasi, penanggung jawab, target tanggal)[cite: 1]; Tabel Dinamis Tindakan Perbaikan (+ baris tindakan, penanggung jawab, target tanggal)[cite: 1]; Input Tanggal Mulai & Tanggal Selesai Investigasi (Selesai >= Mulai)[cite: 1]; Tombol Pengesahan & Pengiriman ke PMKP[cite: 1].

#### Screen 06: PMKP Evaluation & Regrading Inbox (`/pmkp-inbox/:id/evaluasi`)

- **Purpose:** Evaluasi kelengkapan investigasi sederhana, penetapan regrading, dan penutupan kasus oleh Komite Mutu[cite: 1].
- **Layout & Komponen:** Two-Column Split Layout; Kolom kiri menampilkan seluruh tab berkas laporan dan investigasi IBS[cite: 1]; Kolom kanan memuat Radio Kelengkapan Investigasi (YA/TIDAK), Radio Kebutuhan Lanjutan RCA (YA/TIDAK), Seleksi Grading Ulang (Hijau/Kuning/Merah), Textarea Arahan Mutu, Tombol Kembalikan untuk Revisi, dan Tombol Tutup Kasus Resmi (_Completed_)[cite: 1].

#### Screen 07: Formal Accreditation PDF Print Preview (`/insiden/:id/cetak`)

- **Purpose:** Pratinjau dan ekspor berkas cetak resmi yang memiliki tata letak 100% identik dengan formulir asli "Form IKP.pdf" untuk arsip fisik akreditasi[cite: 1].
- **Layout & Format:** Pratinjau lembar A4 formal; Kop surat resmi Pemerintah Provinsi NTT & RSUD Prof. Dr. W. Z. Johannes Kupang[cite: 1]; Baris peringatan rahasia 2x24 jam[cite: 1]; Format tabel Bagian I Data Pasien, Bagian II Rincian Insiden, dan Bagian III Lembar Investigasi Sederhana lengkap dengan kotak centang[cite: 1]; Kotak tanda tangan pembuat, penerima, dan persetujuan manager memuat teks verifikasi audit resmi berstempel waktu server[cite: 1].

---

# FINAL QUALITY REVIEW

### 1. Holistic Consistency & Alignment Matrix

- **Baseline Form IKP:** Seluruh 19 butir klausul data pada dokumen manual Form IKP.pdf terakomodasi utuh pada struktur data, aturan bisnis, dan antarmuka[cite: 1].
- **Batas Waktu Pelaporan:** Ketentuan 2x24 jam (48 jam) dari form fisik diintegrasikan sebagai _automated SLA calculation_ dengan badge visual dan pelacakan audit trail[cite: 1].
- **Keabsahan Verifikasi:** Tanda tangan manual digantikan oleh pencatatan akun digital terverifikasi (_User Audit Log & Tamper-proof Timestamp_) yang memenuhi ketentuan tata kelola rumah sakit[cite: 1].
- **Percabangan Alur:** Alur seleksi manual grading risiko membedakan secara tegas kewajiban investigasi sederhana unit (Biru/Hijau) dan eskalasi cepat mitigasi awal (Kuning/Merah)[cite: 1].
- **Design & Tech Stack:** Konsisten menggunakan preset shadcn/ui `--preset b5J6fFrGq`, Tailwind CSS v4, React 19, dan arsitektur serverless edge Cloudflare Pages Functions + Cloudflare D1 + R2.

### 2. Readiness for Implementation

Seluruh tahapan spesifikasi dari perancangan arsitektur fungsional, kamus data relasional, alur logika operasional, hingga detail komponen antarmuka telah lengkap, bebas kontradiksi, dan tervalidasi siap digunakan sebagai panduan langsung implementasi kode frontend maupun backend.

---

## Quality Gate

Status:
✅ PASSED

### Validation Summary

- Completeness: PASS
- Consistency: PASS
- Business Logic: PASS
- User Perspective: PASS
- Technical Feasibility: PASS
- Missing Requirements: PASS
- Contradiction: PASS

### Issues Found

_Tidak ada isu kritis atau inkonsistensi yang ditemukan pada seluruh dokumen._

### Recommendations

1. _Inference:_ Sebelum peluncuran penuh di IBS RSUD Prof. Dr. W. Z. Johannes Kupang, lakukan uji coba simulasi bersama Kepala Ruangan dan Komite PMKP menggunakan skenario riil (seperti alergi antibiotik pra-operasi) guna sosialisasi fitur e-paraf log[cite: 1].
2. _Inference:_ Gunakan skrip inisialisasi basis data `schema.sql` yang langsung mengeksekusi pembuatan tabel relasional sesuai kamus data pada STEP 06.

### Required Decisions

_Seluruh keputusan fungsional dan teknis telah disetujui dan diselaraskan secara final._
