# Architecture Audit

**Proyek:** Sistem Informasi Pelaporan Insiden Keselamatan Pasien (IKP) — IBS RSUD Prof. Dr. W. Z. Johannes Kupang  
**Tanggal audit:** 26 September 2026  
**Lokasi audit:** `D:\Herd\SIP-IKP`  
**Sifat audit:** Read-only terhadap artefak yang telah ada; satu-satunya perubahan adalah pembuatan dokumen audit ini.

## 1. Executive Summary

Repository saat diaudit **belum merupakan repository aplikasi**. Kondisi awal hanya memuat dua dokumen baseline:

- `docs/AI-Product-Blueprint-Sistem-Informasi-IKP-IBS-RSUD-WZ-Johannes.md`
- `docs/Form IKP.pdf`

Tidak ditemukan source code frontend/backend, `package.json`, lockfile, konfigurasi TypeScript/Vite/Tailwind/shadcn, konfigurasi Cloudflare, Pages Functions, binding D1/R2, schema atau migration database, test suite, maupun CI/CD. Pada awal audit direktori belum berupa Git repository; selama jendela audit repository diinisialisasi secara eksternal dengan branch `main`, initial commit `f33cfe7`, dan remote `origin`. Karena itu, target stack dan seluruh arsitektur teknis di Blueprint masih berstatus **rancangan**, bukan implementasi yang dapat diverifikasi.

Blueprint telah memberikan fondasi domain yang luas: empat role, workflow laporan, rancangan halaman, model data konseptual, SLA 48 jam, audit trail, dan target Cloudflare. Namun, audit menemukan keputusan penting yang belum cukup formal untuk coding yang aman, khususnya state machine, session architecture, RBAC per resource dan unit, legalitas e-paraf, perlindungan draft lokal, audit-log immutability, versioning proses revisi, serta kebijakan attachment dan data kesehatan.

Klaim Blueprint bahwa dokumen bebas kontradiksi dan siap langsung diimplementasikan belum didukung oleh artefak implementasi, test evidence, traceability requirements, atau bukti persetujuan. Isi `Form IKP.pdf` juga belum dapat diverifikasi secara independen pada lingkungan audit karena parser yang tersedia tidak dapat membaca isi PDF hasil scan; PDF terdeteksi sebagai dokumen tiga halaman dan tetap diperlakukan sebagai sumber referensi yang harus dipertahankan.

**Status Phase 1: NOT READY.** Repository dapat digunakan sebagai titik awal discovery, tetapi keputusan arsitektur dan tata kelola berisiko tinggi harus diselesaikan sebelum implementasi fitur klinis dimulai.

## 2. Current Technology Stack

### 2.1 Stack aktual repository

| Area                | Kondisi aktual                      | Bukti                                                                                                       |
| ------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Application runtime | Tidak ada                           | Tidak ditemukan source code atau manifest proyek                                                            |
| Frontend            | Tidak ada                           | Tidak ditemukan `src/`, `app/`, HTML entry point, atau komponen                                             |
| Backend/API         | Tidak ada                           | Tidak ditemukan `functions/`, `server/`, handler, atau route API                                            |
| Package manager     | Tidak ada                           | Tidak ditemukan `package.json` atau lockfile                                                                |
| Build system        | Tidak ada                           | Tidak ditemukan `vite.config.*` atau build script                                                           |
| Type system         | Tidak ada                           | Tidak ditemukan file TypeScript atau `tsconfig*.json`                                                       |
| CSS/UI system       | Tidak ada                           | Tidak ditemukan stylesheet, Tailwind config, atau `components.json`                                         |
| Database            | Tidak ada                           | Tidak ditemukan schema, migration, seed, atau binding D1                                                    |
| Object storage      | Tidak ada                           | Tidak ditemukan binding atau akses R2                                                                       |
| Testing             | Tidak ada                           | Tidak ditemukan test, runner, config, atau script                                                           |
| Deployment          | Tidak ada                           | Tidak ditemukan konfigurasi Cloudflare atau CI/CD                                                           |
| Version control     | Diinisialisasi selama jendela audit | Awal audit: `fatal: not a git repository`; validasi akhir: branch `main`, commit `f33cfe7`, remote `origin` |

### 2.2 Stack target menurut Blueprint

Blueprint baris 9 dan 222–228 menetapkan:

- React 19;
- TypeScript;
- Vite;
- Tailwind CSS v4;
- shadcn/ui preset `b5J6fFrGq`;
- Cloudflare Pages;
- Cloudflare Pages Functions;
- Cloudflare D1/SQLite;
- Cloudflare R2;
- REST API di edge;
- JWT yang diverifikasi melalui Web Crypto API.

Semua item tersebut **belum terpasang dan belum dapat diverifikasi**.

### 2.3 Package dan dependency audit

`package.json`, lockfile, serta `node_modules` tidak ditemukan. Konsekuensinya:

- React 19 belum terbukti digunakan;
- TypeScript belum dikonfigurasi;
- Tailwind CSS v4 belum terbukti digunakan;
- shadcn/ui belum diinisialisasi;
- React Hook Form tidak tersedia;
- Zod tidak tersedia;
- library API/data fetching seperti TanStack Query, SWR, Axios, atau alternatif lain tidak tersedia;
- tidak ada dependency yang dapat dinilai redundant, obsolete, vulnerable, atau tidak diperlukan;
- reproducible installation belum tersedia karena tidak ada manifest dan lockfile.

Audit ini tidak menambahkan dependency apa pun.

## 3. Repository Structure

### 3.1 Struktur awal yang ditemukan

```text
D:\Herd\SIP-IKP\
└── docs\
    ├── AI-Product-Blueprint-Sistem-Informasi-IKP-IBS-RSUD-WZ-Johannes.md
    └── Form IKP.pdf
```

Dokumen ini kemudian ditambahkan sesuai output wajib:

```text
docs\ARCHITECTURE-AUDIT.md
```

### 3.2 Area struktur yang belum tersedia

- **Frontend:** `src/`, entry point, route, page, layout, component, hook, utility, type, style.
- **Backend:** `functions/`, API routes, middleware, service, repository/data-access layer.
- **Configuration:** `package.json`, lockfile, Vite, TypeScript, Tailwind, shadcn, ESLint, formatter.
- **Cloudflare:** Wrangler config, Pages config, D1/R2 bindings, environment definitions.
- **Database:** schema, migrations, seeds, local database artifacts.
- **Public assets:** `public/`, logo, font, favicon, print assets.
- **Testing:** unit, integration, E2E, fixtures, coverage.
- **Operations:** CI/CD, monitoring, runbook, threat model, backup/restore documentation.
- **Version control controls:** Git telah muncul selama jendela audit, tetapi `.gitignore`, `.gitattributes`, dan CODEOWNERS belum tersedia.

### 3.3 Baseline documents

`docs/AI-Product-Blueprint-Sistem-Informasi-IKP-IBS-RSUD-WZ-Johannes.md` adalah spesifikasi produk versi 2.0.0. Dokumen ini memuat project brief, FR/BR, PRD, sitemap, data model konseptual, target technical architecture, serta UI specification.

`docs/Form IKP.pdf` adalah sumber formulir manual dan acuan format cetak. File harus dianggap sebagai baseline bisnis terkontrol. Isi aktual belum dapat dibandingkan field-by-field dengan Blueprint pada lingkungan audit karena PDF berupa scan dan text extraction tidak menghasilkan isi. Blueprint mengklaim 19 kelompok data dari formulir telah terakomodasi, tetapi klaim tersebut belum diverifikasi independen.

## 4. Frontend Architecture

### 4.1 Kondisi aktual

Belum ada frontend. Tidak ditemukan:

- React application;
- component tree;
- routing implementation;
- layouts/pages;
- hooks;
- state management;
- utility modules;
- TypeScript types;
- form architecture;
- API client/data-fetching layer;
- error boundary;
- styles atau assets publik;
- build output.

Karena itu, kualitas struktur, bundle, rendering, accessibility, performance, responsive behavior, dan type safety frontend belum dapat dinilai.

### 4.2 Arsitektur frontend yang direncanakan Blueprint

Blueprint baris 155–175 merencanakan SPA dengan route:

- `/login`;
- `/dashboard`;
- `/insiden`;
- `/insiden/baru`;
- `/insiden/:id`;
- `/insiden/:id/edit`;
- `/insiden/:id/verifikasi`;
- `/insiden/:id/investigasi-sederhana`;
- `/insiden/:id/cetak`;
- `/pmkp-inbox`;
- `/pmkp-inbox/:id/evaluasi`;
- `/laporan-rekap`;
- `/admin`.

Belum ada keputusan/implementasi mengenai:

- router yang akan digunakan;
- route guards dan authorization boundaries;
- pembagian server/client validation;
- caching dan invalidation data;
- handling optimistic concurrency;
- state form multi-step;
- draft persistence yang aman;
- error/loading/empty states yang konsisten;
- print rendering strategy;
- code splitting dan bundle budget.

### 4.3 Vite dan TypeScript

`vite.config.*` serta `tsconfig*.json` tidak ditemukan. Hal berikut belum dapat diaudit secara implementatif:

- plugin React;
- path alias seperti `@/*`;
- target JavaScript;
- strict mode TypeScript;
- module resolution;
- build output;
- source map policy;
- environment variable prefix dan typing;
- asset handling;
- dev proxy;
- Cloudflare adapter/integration.

Untuk sistem data kesehatan, TypeScript sebaiknya kelak menggunakan konfigurasi strict dan tipe domain eksplisit. Ini rekomendasi phase berikutnya, bukan kondisi repository saat ini.

### 4.4 Environment variables

Tidak ditemukan `.env`, `.env.example`, typing `ImportMetaEnv`, atau dokumentasi variables. Belum ada bukti secrets ditempatkan di repository. Namun, kontrak environment untuk local, preview, dan production juga belum ditetapkan.

## 5. Backend Architecture

### 5.1 Kondisi aktual

Backend belum tersedia. Tidak ditemukan Pages Functions, API endpoint, route convention, handler, middleware, validation, authentication, authorization, database access, error handling, atau logging.

Dengan demikian:

- tidak ada endpoint yang dapat diinventarisasi;
- request/response contract belum ada;
- input validation belum ada;
- format error belum ada;
- auth/authz API belum ada;
- data access belum ada;
- transactional workflow belum ada;
- logging dan observability belum ada.

### 5.2 Target menurut Blueprint

Blueprint baris 224–227 merencanakan Cloudflare Pages Functions sebagai REST API, Web Crypto API untuk JWT, D1 untuk relational data, R2 untuk attachment, dan `db.batch()` untuk mutasi laporan beserta audit event.

Target tersebut masih konseptual. `db.batch()` dapat membantu atomicity, tetapi **tidak menjadikan audit log immutable**. Immutability memerlukan enforcement tambahan, pembatasan privileged mutation, strategi append-only, dan bukti integritas/retensi.

### 5.3 Cloudflare configuration

Tidak ditemukan:

- `wrangler.toml`, `wrangler.json`, atau `wrangler.jsonc`;
- Pages Functions directory;
- D1 database binding;
- R2 bucket binding;
- compatibility date/flags;
- environment `local`, `preview`, atau `production`;
- secrets declaration;
- migration commands;
- local development command;
- deployment script;
- binding type generation.

Klaim automated daily snapshot D1 pada Blueprint belum didukung konfigurasi, runbook restore, RPO/RTO, atau bukti pengujian pemulihan.

### 5.4 API design gaps

Sebelum endpoint dibuat, dibutuhkan keputusan mengenai:

- versioning/base path API;
- canonical resource model;
- state transition endpoints versus generic update;
- idempotency submit/grading/completion;
- pagination, filter, dan sorting;
- standard success/error envelope;
- validation error shape;
- request correlation ID;
- optimistic locking/version column;
- atomic D1/R2 behavior saat salah satu operasi gagal;
- file authorization dan short-lived download URLs;
- safe logging/redaction untuk data pasien.

## 6. Database Architecture

### 6.1 Kondisi aktual

Tidak ditemukan D1 database, schema SQL, migration, index, foreign key definition, seed data, atau local database. Database architecture belum diimplementasikan dan tidak ada migration yang diubah pada audit ini.

### 6.2 Model konseptual Blueprint

Blueprint baris 190–220 mengusulkan:

- `users`;
- `incident_reports`;
- `simple_investigations`;
- `investigation_recommendations`;
- `investigation_actions`;
- `pmkp_evaluations`;
- `report_audit_logs`;
- `incident_attachments`;
- `master_operating_rooms`;
- `master_specializations`;
- `master_departments`;
- `master_payer_types`.

Konsep tersebut mencakup entity utama, tetapi belum menjadi DDL. Tipe, nullability, `CHECK`, foreign key actions, indexes, timestamps, timezone, soft delete/retention, concurrency, dan versioning belum ditentukan.

### 6.3 Temuan desain data

1. Diagram hubungan pada Blueprint ambigu: posisi `incident_attachments` dan `pmkp_evaluations` dapat dibaca sebagai relasi satu-ke-satu satu sama lain, sedangkan kamus data menempatkan keduanya pada laporan.
2. `pmkp_evaluations.incident_report_id` direncanakan unik, tetapi alur return/revise/resubmit dapat membutuhkan beberapa siklus evaluasi. Model satu record berisiko menimpa histori.
3. `simple_investigations` satu-ke-satu tanpa versioning tidak cukup menjelaskan penyimpanan revisi.
4. BR-07 mensyaratkan snapshot Nama, NIP, Peran, dan timestamp, tetapi rancangan `report_audit_logs` tidak mencantumkan snapshot NIP/jabatan.
5. Ordinary table dan `db.batch()` tidak cukup membuktikan audit trail immutable.
6. Emergency MR boleh diperbarui setelahnya, tetapi BR-04 mengunci data utama setelah submit. Pengecualian, approval, dan histori before/after belum ditentukan.
7. Insiden dapat menarget pasien atau staf K3RS, tetapi model laporan sangat patient-centric. Nullability dan conditional validation belum dijelaskan.
8. `investigation_actions` belum memuat status realisasi, tanggal selesai aktual, bukti, verifikator, dan hasil evaluasi efektivitas.
9. Unique report number `IKP/IBS/YYYYMM/XXXX` memerlukan counter/sequence atomik dan strategi retry saat concurrent submission; constraint unik saja belum menjelaskan mekanisme generasinya.
10. BR-04 mensyaratkan addendum resmi setelah submit, tetapi tidak ada entity/model addendum yang menyimpan author, reason, content, timestamp, dan sifat append-only.
11. Belum ada kebijakan penghapusan/deaktivasi user agar foreign key dan audit history tetap utuh.

### 6.4 Naming dan timestamp

Rancangan menggunakan `snake_case`, yang sesuai dengan SQLite/D1 dan cukup konsisten pada kamus data. Namun, belum ada aturan baku untuk:

- UUID generation;
- enum representation;
- UTC versus waktu lokal rumah sakit;
- `created_at`/`updated_at` source of truth;
- actor snapshot;
- record version;
- audit retention.

## 7. Authentication & Authorization

### 7.1 Kondisi aktual

Authentication dan authorization belum ada. Tidak ditemukan:

- login endpoint/UI;
- password hashing;
- user store;
- session/token handling;
- secure cookie;
- role enforcement;
- route guard;
- API authorization;
- account lifecycle;
- reset password;
- account lockout;
- MFA;
- logout/revocation.

### 7.2 Target role

Blueprint menetapkan:

- `TENAGA_KESEHATAN`;
- `KEPALA_RUANGAN`;
- `KOMITE_PMKP`;
- `ADMINISTRATOR`.

RBAC masih naratif. Belum ada matriks endpoint/resource/action/field per role dan unit. Ketegangan scope juga ada: produk disebut khusus IBS, tetapi PMKP direncanakan mengakses laporan seluruh rumah sakit. Belum jelas apakah sistem single-unit, multi-unit, atau hospital-wide.

### 7.3 Konflik session design

Blueprint sekaligus menyebut:

- JWT stateless;
- HttpOnly Secure Cookie;
- idle timeout 15 menit;
- Remember Me;
- logout/reset password.

Kombinasi ini belum memiliki desain yang konsisten. JWT stateless murni tidak otomatis mendukung reliable idle timeout, immediate revocation, perubahan role, atau logout semua sesi. Cookie-based JWT juga membutuhkan keputusan CSRF protection, `SameSite`, token rotation, refresh/session store, dan expiry. “Remember Me” berpotensi bertentangan dengan idle timeout 15 menit bila semantiknya tidak diperjelas.

### 7.4 Password

Blueprint menggunakan frasa “password terenkripsi”, sedangkan model menyebut `password_hash`. Password seharusnya disimpan dengan password hashing yang sesuai, bukan reversible encryption. Algoritme, work factor, rehash policy, reset flow, breach response, dan credential policy belum diputuskan.

## 8. UI/UX Architecture

### 8.1 Kondisi aktual

Tidak ada implementasi layout, navigation, sidebar, responsive behavior, theme, shadcn components, design tokens, typography, forms, tables, dialogs, toast, atau notification system.

### 8.2 Target desain Blueprint

Blueprint baris 232–292 menentukan:

- clinical deep teal sebagai warna brand;
- semantic colors untuk BIRU, HIJAU, KUNING, MERAH;
- status badge SLA;
- font Inter;
- login card;
- dashboard grid dan charts;
- wizard lima langkah;
- verification split layout;
- simple investigation form;
- PMKP evaluation layout;
- A4 print preview.

Target shadcn preset `b5J6fFrGq` disebutkan, tetapi `components.json` belum ada sehingga preset tidak dapat diverifikasi.

### 8.3 UI/UX risks

- Semantic risk bands tidak boleh mengandalkan warna saja; label teks/icon dan contrast perlu menjadi acceptance criteria.
- Klaim PDF “100% identik” melalui client-side rendering tidak realistis lintas browser, font, margin, dan printer. Dibutuhkan versioned template dan visual regression dengan toleransi.
- Wizard memerlukan recovery dan validation yang jelas tanpa menyimpan data pasien secara tidak aman di browser.
- Blueprint menyebut in-app notification, tetapi tidak mendefinisikan entity, recipient, read state, atau delivery semantics.
- `patient_type` ada pada data dictionary tetapi tidak terlihat eksplisit pada langkah wizard.
- Attachment ada pada model data/R2 tetapi tidak dijabarkan pada screen, validation, atau permission.
- Responsive dan accessibility behavior belum memiliki acceptance criteria terukur.

## 9. Testing Infrastructure

### 9.1 Kondisi aktual

Tidak ditemukan:

- unit-test setup;
- integration/API-test setup;
- E2E-test setup;
- test scripts;
- test files;
- fixtures/factories;
- coverage configuration;
- accessibility tests;
- performance tests;
- security tests;
- CI test pipeline.

Tidak ada test yang dapat dijalankan karena aplikasi dan package manifest belum ada.

### 9.2 Blueprint quality gate

Status `PASSED` pada Blueprint baris 312–329 adalah self-assessment dokumen, bukan hasil testing repository. Tidak ada test case, reviewer, tanggal eksekusi, evidence, coverage, atau traceability yang menyertainya.

### 9.3 Minimum test strategy yang dibutuhkan

Pada phase implementasi mendatang, strategi minimal perlu mencakup:

- unit tests untuk domain rules dan transition guards;
- D1 integration tests termasuk constraints dan transactions;
- API contract/authorization negative tests;
- E2E per role dan workflow branch;
- SLA boundary tepat 48 jam dan lebih dari 48 jam;
- revision/resubmission dan concurrency tests;
- security tests untuk CSRF, XSS, broken access control, upload/download;
- accessibility tests;
- print/PDF visual regression;
- backup/restore drill;
- performance tests terhadap NFR 1,5 detik dan 800 ms.

## 10. Security Baseline

### 10.1 Kontrol aktual repository

| Control                  | Status aktual                                                                |
| ------------------------ | ---------------------------------------------------------------------------- |
| Authentication           | Tidak ada                                                                    |
| Authorization/RBAC       | Tidak ada                                                                    |
| Password hashing         | Tidak ada                                                                    |
| Session management       | Tidak ada                                                                    |
| Secure cookies           | Tidak ada                                                                    |
| Input validation         | Tidak ada                                                                    |
| API authorization        | Tidak ada                                                                    |
| Security headers         | Tidak ada                                                                    |
| CORS configuration       | Tidak ada                                                                    |
| CSRF protection          | Tidak ada                                                                    |
| Rate limiting            | Tidak ada                                                                    |
| Sensitive-data redaction | Tidak ada                                                                    |
| Audit logging            | Tidak ada                                                                    |
| Dependency scanning      | Tidak dapat dilakukan; manifest tidak ada                                    |
| Secret management        | Tidak ada config; tidak ada secret yang terdeteksi dari dua dokumen baseline |

### 10.2 Critical security gaps dalam rancangan

1. **Local draft cache versus kerahasiaan:** Blueprint mengusulkan draft lokal, tetapi tidak menetapkan storage, encryption, expiry, logout cleanup, shared-device handling, dan cache prevention.
2. **Legalitas e-paraf:** user ID dan timestamp tidak otomatis setara dengan tanda tangan elektronik yang sah. Dasar kebijakan/legal, authentication intent, re-authentication, retention, dan non-repudiation belum ada.
3. **Audit immutability:** append-only enforcement, privileged access monitoring, tamper evidence, dan retention belum didefinisikan.
4. **Sensitive logging:** Blueprint menyebut IP address dan notes pada audit log, tetapi tidak ada klasifikasi/redaction policy untuk PHI/PII.
5. **Attachment security:** file type/size, malware handling, object authorization, signed URL lifetime, encryption, retention, legal hold, dan failure recovery belum ditetapkan.
6. **Cookie/JWT:** CSRF, rotation, revocation, `SameSite`, expiry, dan idle session enforcement belum diputuskan.
7. **Scope control:** pembatasan data per unit belum formal; risiko broken object-level authorization tinggi.
8. **Data lifecycle:** retention, deletion, archival, backup encryption, restore access, dan data residency belum ditetapkan.
9. **Web security:** CSP, HSTS, frame protection, MIME sniffing protection, referrer policy, CORS, XSS prevention, dan rate limiting belum disebut secara operasional.
10. **Operational security:** monitoring, alerting, incident response, secret rotation, administrator activity review, dan break-glass access belum dirancang.
11. **Print/export confidentiality:** belum ada authorization khusus, audit download/print/export, watermark, `Cache-Control: no-store`, data minimization, batas baris, atau mitigasi CSV formula injection.
12. **R2 upload integrity:** belum ada pemeriksaan magic bytes, checksum, scanning/quarantine, two-phase upload, atau rekonsiliasi orphan object ketika operasi D1/R2 gagal sebagian.

## 11. Existing Strengths

Walaupun belum ada aplikasi, baseline dokumentasi memiliki kekuatan berikut:

1. Tujuan produk dan konteks klinis dijelaskan jelas.
2. Empat persona/role utama telah diidentifikasi.
3. Happy-path workflow dari draft hingga completion telah disusun.
4. Percabangan risiko BIRU/HIJAU dan KUNING/MERAH dinyatakan eksplisit.
5. SLA 48 jam, alasan keterlambatan, dan kebutuhan audit trail telah menjadi concern utama.
6. Sitemap dan screen specification memberi arah implementasi UI.
7. Model data konseptual mencakup laporan, investigasi, PMKP, attachment, dan audit log.
8. Target stack konsisten dengan deployment serverless yang dipilih.
9. Kerahasiaan, non-punitive policy, dan pembatasan berbasis peran telah diakui sebagai kebutuhan inti.
10. Form manual asli disimpan sebagai artefak baseline, bukan hanya dideskripsikan secara informal.

## 12. Technical Debt

Karena implementasi belum dimulai, technical debt saat ini terutama berupa **architecture and specification debt**:

1. Repository belum diinisialisasi sebagai proyek aplikasi; Git baru diinisialisasi selama jendela audit dan belum memiliki kontrol repository seperti `.gitignore`, `.gitattributes`, atau CODEOWNERS.
2. Tidak ada reproducible dependency manifest/lockfile.
3. Tidak ada state machine kanonis.
4. Tidak ada RBAC/ABAC matrix per resource, action, field, dan unit.
5. Tidak ada requirements traceability matrix ke Form IKP.
6. Placeholder `[cite: 1]` tidak memiliki daftar sumber atau nomor halaman.
7. Tidak ada schema DDL, constraint, index, atau migration strategy.
8. Model revisi/evaluasi tidak mendukung history dengan jelas.
9. Security/privacy architecture belum memadai untuk data kesehatan.
10. Session strategy menggabungkan JWT stateless, cookie, idle timeout, dan Remember Me tanpa lifecycle formal.
11. Audit immutability hanya berupa klaim.
12. Tidak ada API contract dan error model.
13. Tidak ada test strategy yang executable.
14. Tidak ada Cloudflare environment/deployment/rollback design.
15. Tidak ada operational runbook, monitoring, retention, RTO/RPO, atau restore evidence.
16. Tidak ada linting, formatting, static analysis, atau code quality baseline.
17. Tidak ada code yang dapat diperiksa untuk duplication, naming inconsistency, unsafe pattern, atau penggunaan `any`; hal ini adalah **not applicable**, bukan bukti bahwa masalah tersebut tidak ada.

## 13. Risks

| Priority | Risk                                                                         | Impact                                                                                             |
| -------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Critical | Coding dimulai sebelum state machine dan authority boundaries disetujui      | Rework besar, workflow ilegal, atau akses data tidak sah                                           |
| Critical | Draft data pasien disimpan lokal tanpa threat model                          | Kebocoran data pada shared device/browser cache                                                    |
| Critical | E-paraf dianggap sah tanpa dasar kebijakan/legal dan kontrol non-repudiation | Bukti audit/medikolegal dapat dipersoalkan                                                         |
| Critical | Audit log diklaim immutable padahal hanya ordinary D1 table                  | Perubahan tidak sah tidak terdeteksi; false assurance                                              |
| High     | PMKP `1:1` evaluation dan investigasi tanpa versioning                       | Histori revisi hilang atau ditimpa                                                                 |
| High     | JWT stateless tidak selaras dengan idle timeout/revocation                   | Sesi tidak dapat dihentikan sesuai kebijakan                                                       |
| High     | Scope IBS versus rumah sakit tidak jelas                                     | Salah desain tenant/unit dan risiko cross-unit disclosure                                          |
| High     | Attachment design belum lengkap                                              | Malware, unauthorized download, exposure lewat URL, dan orphan object saat kegagalan parsial D1/R2 |
| High     | Print/export belum memiliki kontrol kerahasiaan                              | PHI dapat tertinggal di download, printer queue, cache, atau spreadsheet                           |
| High     | Model addendum belum tersedia                                                | Kronologi utama berisiko diubah langsung atau histori susulan tidak dapat dibuktikan               |
| High     | Formula SLA dan timezone belum formal                                        | Salah klasifikasi overdue dan laporan mutu tidak akurat                                            |
| High     | PDF baseline belum diverifikasi field-by-field                               | Digital form dapat tidak sesuai formulir resmi                                                     |
| High     | Tidak ada schema/migration/deployment baseline                               | Implementasi tidak reproducible dan rawan drift                                                    |
| Medium   | Klaim PDF identik 100%                                                       | Acceptance criteria tidak realistis dan sulit diuji                                                |
| Medium   | `COMPLETED_BY_UNIT` tidak punya kriteria objektif                            | Kasus dapat ditutup tanpa oversight memadai                                                        |
| Medium   | Regrading tidak memasukkan BIRU                                              | Perilaku tidak konsisten atau tidak lengkap                                                        |
| Medium   | CSV/Excel tidak konsisten antara modul dan FR                                | Scope dan test expectation berbeda                                                                 |
| Medium   | Tidak ada NFR operasional rinci                                              | Reliability dan supportability tidak terukur                                                       |

## 14. Blueprint vs Repository Gap Analysis

| Area              | Blueprint Requirement                      | Current Repository                      | Gap                                                                       | Impact                                   | Recommendation                                                                            |
| ----------------- | ------------------------------------------ | --------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------- |
| React             | React 19 SPA                               | Tidak ada source atau dependency        | Belum diimplementasikan                                                   | Tidak dapat build/render                 | Scaffold setelah keputusan blocking selesai                                               |
| TypeScript        | TypeScript                                 | Tidak ada `tsconfig`/`.ts`/`.tsx`       | Belum dikonfigurasi                                                       | Type safety tidak ada                    | Tetapkan strict TypeScript baseline                                                       |
| Vite              | Vite bundler                               | Tidak ada config/script                 | Belum diimplementasikan                                                   | Build/dev server tidak ada               | Definisikan build dan env strategy                                                        |
| Tailwind          | Tailwind CSS v4                            | Tidak ada CSS/config                    | Belum diimplementasikan                                                   | Token/design tidak dapat diverifikasi    | Integrasikan sesuai v4 saat scaffold                                                      |
| shadcn/ui         | Preset `b5J6fFrGq`                         | Tidak ada `components.json`             | Belum diinisialisasi                                                      | UI primitives tidak tersedia             | Validasi preset dan ownership komponen                                                    |
| Forms             | Wizard form dan strict validation          | Tidak ada form/library                  | Belum diimplementasikan                                                   | Data tidak dapat dikumpulkan             | Putuskan form/validation architecture                                                     |
| Data fetching     | Dashboard/API consumption                  | Tidak ada API client/library            | Belum ditentukan                                                          | Cache/error behavior tidak jelas         | Pilih pendekatan minimal sesuai kebutuhan                                                 |
| Routing           | Sitemap lengkap                            | Tidak ada router/routes                 | Belum diimplementasikan                                                   | Halaman dan guards tidak ada             | Definisikan router dan route authorization                                                |
| Pages Functions   | Edge REST API                              | Tidak ada `functions/`                  | Belum diimplementasikan                                                   | Tidak ada backend                        | Susun API contract sebelum handler                                                        |
| Cloudflare config | Pages, D1, R2                              | Tidak ada Wrangler config/binding       | Belum dikonfigurasi                                                       | Local/deploy tidak dapat dilakukan       | Definisikan environment dan bindings                                                      |
| D1                | Relational SQLite model                    | Hanya data dictionary konseptual        | Tidak ada DDL/migration                                                   | Integrity tidak terjamin                 | Review ERD lalu buat migration terkontrol                                                 |
| R2                | Incident attachments                       | Hanya satu entity konseptual            | Tidak ada policy/flow/binding                                             | Risiko keamanan file dan partial failure | Putuskan private bucket, two-phase upload, scanning, checksum, expiry, dan orphan cleanup |
| Addendum          | Informasi susulan pasca-submit             | Disebut di BR/audit module tanpa entity | Tidak ada model append-only                                               | Histori koreksi tidak dapat dibuktikan   | Definisikan `incident_addenda` atau model setara sebelum DDL                              |
| Authentication    | Username/NIP, password, JWT                | Tidak ada implementasi                  | Seluruh auth belum ada                                                    | Akses tidak terlindungi                  | Setujui session architecture lebih dulu                                                   |
| Session           | Idle timeout 15 menit, cookie, Remember Me | Tidak ada; requirement saling tegang    | Semantik/lifecycle belum jelas                                            | Session policy dapat gagal               | ADR untuk token/session/revocation/CSRF                                                   |
| Authorization     | Empat role dan unit scope                  | Naratif saja                            | Tidak ada enforcement matrix                                              | Broken access control                    | Buat RBAC/ABAC matrix eksplisit                                                           |
| Workflow          | Draft sampai Completed                     | Status tidak kanonis                    | Transition/revision tidak lengkap                                         | State corruption dan bypass              | Buat state transition table                                                               |
| Revision          | PMKP return for revision                   | Tidak ada status/version model          | History tidak terjaga                                                     | Auditability lemah                       | Model revision cycle dan snapshots                                                        |
| SLA               | Maksimal 48 jam                            | Tidak ada formula executable            | Boundary/timezone belum jelas                                             | KPI salah                                | Formalisasi clock, timezone, boundary                                                     |
| Audit trail       | Immutable, e-paraf                         | Hanya model konseptual biasa            | Immutability dan NIP snapshot kurang                                      | False assurance/legal risk               | Putuskan integrity/evidence architecture                                                  |
| Database history  | Traceable/accountable                      | Relasi 1:1 berpotensi overwrite         | Versioning belum ada                                                      | Histori hilang                           | Gunakan append/history model yang disetujui                                               |
| Local draft       | Auto-save/local cache                      | Tidak ada security design               | Bertentangan dengan confidentiality                                       | Data pasien bocor                        | Putuskan server draft atau protected local strategy                                       |
| PDF               | Layout resmi identik                       | PDF sumber ada; renderer tidak ada      | Belum teruji dan target absolut                                           | Output akreditasi tidak pasti            | Validasi template dan visual tolerance                                                    |
| Testing           | AC dan quality gate                        | Tidak ada tests/config/scripts          | Tidak ada execution evidence                                              | Kualitas tidak terukur                   | Buat test pyramid dan traceability                                                        |
| Security headers  | HTTPS/security baseline                    | Tidak ada configuration                 | Kontrol browser tidak ada                                                 | Exposure web attacks                     | Definisikan headers dan Cloudflare policy                                                 |
| CORS              | API web application                        | Tidak disebut/diimplementasikan         | Origin policy belum ada                                                   | Exposure atau integration failure        | Default same-origin; dokumentasikan exception                                             |
| Logging           | Audit/logging                              | Tidak ada logger/redaction              | Observability tidak ada                                                   | Insiden sulit dilacak; PHI risk          | Definisikan structured safe logging                                                       |
| Print/export      | PDF dan CSV/Excel                          | Tidak ada output control                | Authorization, audit, watermark, cache, dan CSV injection belum ditangani | Kebocoran data sensitif                  | Tetapkan kontrol print/export dan audit event                                             |
| Operations        | Uptime 99,5% dan snapshot                  | Tidak ada monitoring/runbook            | NFR tidak operasional                                                     | Reliability tidak terbukti               | Tetapkan SLI/SLO, RPO/RTO, restore test                                                   |
| Source baseline   | Blueprint final/PASSED                     | Hanya self-assessment                   | Tidak ada approval evidence                                               | Requirement dispute                      | Catat owner, approver, version, change control                                            |
| Form traceability | 19 kelompok data lengkap                   | PDF tidak dapat diparse saat audit      | Klaim belum diverifikasi                                                  | Field dapat terlewat                     | Review manual dan buat traceability matrix                                                |

## 15. Recommended Implementation Order

Urutan ini dimulai dengan closure arsitektur, bukan pembangunan fitur:

1. **Governance dan source control**
   - konfirmasi bahwa repository dan remote yang muncul selama jendela audit adalah repository resmi;
   - tetapkan `.gitignore`, `.gitattributes`, owner, branching, review, dan proteksi baseline documents;
   - hindari commit source sebelum keputusan blocking selesai.
2. **Requirements verification**
   - review manual `Form IKP.pdf` bersama IBS/PMKP;
   - beri versi/nomor halaman;
   - buat field-level traceability ke FR/BR.
3. **Resolve blocking decisions**
   - scope IBS versus hospital-wide;
   - state machine dan revision cycle;
   - legal/policy e-paraf;
   - local draft;
   - session strategy;
   - audit immutability;
   - attachment scope/security.
4. **Architecture contracts**
   - ADR;
   - RBAC/ABAC matrix;
   - API/error contract;
   - security/privacy threat model;
   - SLA formula/timezone.
5. **Data model review**
   - ERD final;
   - version/history model;
   - constraints, indexes, timestamp policy, retention;
   - migration/seed strategy.
6. **Project and Cloudflare foundation**
   - scaffold React/TypeScript/Vite/Tailwind/shadcn;
   - establish Pages Functions;
   - local/preview/production environment separation;
   - D1/R2 bindings and typed env.
7. **Quality and security baseline**
   - lint/typecheck/test scripts;
   - unit/integration/E2E harness;
   - CI/CD;
   - security headers, safe logging, secret handling.
8. **Authentication and authorization**
   - user lifecycle;
   - password hashing;
   - session/revocation/idle timeout;
   - route/API/resource authorization.
9. **Core incident domain**
   - draft and submit;
   - immutable-field policy/addendum;
   - SLA calculation;
   - audit events.
10. **Kepala Ruangan workflow**
    - receive/review;
    - grading;
    - simple investigation/high-risk escalation;
    - unit completion under approved criteria.
11. **PMKP workflow**
    - inbox;
    - revision cycles;
    - regrading/RCA decision;
    - completion.
12. **Attachment, reporting, and formal print**
    - only after access, retention, and security policies are ready.
13. **Hardening and acceptance**
    - RBAC negative tests;
    - security/performance/accessibility;
    - visual PDF validation;
    - backup/restore and operational rehearsal.

## 16. Decisions Required

Keputusan berikut membutuhkan persetujuan sebelum coding terkait dimulai:

1. Apakah scope production hanya IBS atau seluruh rumah sakit/multi-unit?
2. Apa daftar status kanonis dan transition table lengkap, termasuk return, revision, resubmit, cancel, void, reopen, dan RCA?
3. Siapa aktor yang berwenang pada setiap transition dan apa precondition-nya?
4. Bagaimana emergency MR dapat dikoreksi setelah submit tanpa melanggar lock dan auditability?
5. Apakah local draft cache diizinkan untuk data pasien? Jika ya, storage, encryption, expiry, cleanup, dan shared-device policy apa yang wajib?
6. Apakah e-paraf berbasis akun dan timestamp telah disetujui secara legal/kebijakan rumah sakit? Bukti dan control apa yang diwajibkan?
7. Tingkat immutability audit apa yang dibutuhkan: append-only DB policy, tamper-evident hash chain, external sink, atau kombinasi?
8. Session architecture apa yang dipilih agar idle timeout, revocation, logout, role changes, secure cookie, CSRF, dan Remember Me konsisten?
9. Password policy dan hashing approach apa yang diwajibkan?
10. Apakah MFA diwajibkan untuk PMKP/administrator atau seluruh role?
11. Bagaimana unit scoping dan field-level access diterapkan, termasuk akses administrator terhadap data klinis?
12. Apakah attachment termasuk MVP? Jika ya, tipe, ukuran, magic-byte validation, scanning/quarantine, checksum, retention, access, signed URL lifetime, two-phase upload, orphan cleanup, dan legal hold-nya apa?
13. Apa formula SLA kanonis, timezone, server clock, dan boundary tepat 48 jam?
14. Apakah `COMPLETED_BY_UNIT` dipertahankan? Apa kriteria objektif dan oversight PMKP-nya?
15. Apakah PMKP boleh melakukan regrading ke BIRU?
16. Apakah ekspor MVP mencakup CSV saja atau CSV dan Excel?
17. Bagaimana histori berulang investigasi dan evaluasi PMKP disimpan tanpa overwrite?
18. Apa retention/deletion/archive policy untuk laporan, attachment, audit event, session, dan operational log?
19. Apa RPO/RTO dan mekanisme backup/restore yang disetujui untuk D1/R2?
20. Apa acceptance standard untuk PDF: identik secara visual dengan toleransi atau template formal baru yang disetujui?
21. Siapa product owner, clinical approver, security/privacy approver, dan technical owner untuk change control?
22. Apakah source `Form IKP.pdf` yang ada merupakan versi resmi dan masih berlaku?
23. Bagaimana model addendum append-only, siapa yang boleh menambahkannya, dan apakah addendum tetap diizinkan setelah `COMPLETED`?
24. Kontrol apa yang diwajibkan untuk print/export: authorization, watermark, audit event, row limit, expiry, cache policy, dan mitigasi CSV formula injection?

## 17. Files Recommended for Modification

Belum ada source/config yang dapat dimodifikasi. Pada phase berikutnya, setelah keputusan blocking disetujui, area berikut kemungkinan perlu dibuat atau dikelola:

| Path/area                                                                | Tujuan                                      | Catatan                                         |
| ------------------------------------------------------------------------ | ------------------------------------------- | ----------------------------------------------- |
| Root `package.json` dan lockfile                                         | Dependency dan scripts reproducible         | Jangan dibuat pada phase audit                  |
| `src/`                                                                   | React application, routes, domain/UI layers | Struktur final mengikuti architecture decisions |
| `functions/`                                                             | Cloudflare Pages Functions API              | Gunakan authorization dan validation terpusat   |
| `public/`                                                                | Approved public assets                      | Jangan menaruh data sensitif                    |
| `vite.config.*`                                                          | Build dan dev configuration                 | Hindari secrets di client bundle                |
| `tsconfig*.json`                                                         | Strict type checking                        | Pisahkan browser/worker bila diperlukan         |
| `components.json`                                                        | shadcn/ui configuration                     | Validasi preset Blueprint                       |
| Global styles/Tailwind entry                                             | Tokens dan print styles                     | Sertakan accessibility dan print strategy       |
| `wrangler.jsonc` atau format yang dipilih                                | D1/R2/env bindings                          | Pisahkan local/preview/production               |
| `migrations/`                                                            | Versioned D1 migrations                     | Jangan gunakan untracked ad-hoc schema changes  |
| `tests/`/`e2e/`                                                          | Automated verification                      | Petakan test ke FR/BR/AC                        |
| `.github/workflows/` atau CI setara                                      | Typecheck/test/build/deploy gates           | Tidak ada saat audit                            |
| `.env.example`                                                           | Kontrak non-secret environment              | Jangan isi real secrets                         |
| Security/architecture decision records                                   | Keputusan blocking dan threat model         | Hanya setelah persetujuan stakeholder           |
| `docs/AI-Product-Blueprint-Sistem-Informasi-IKP-IBS-RSUD-WZ-Johannes.md` | Koreksi requirement terkontrol              | Hanya melalui formal change control             |

Daftar ini adalah rekomendasi scope phase mendatang, bukan perubahan yang dilakukan dalam audit.

## 18. Files That Should NOT Be Modified

1. **`docs/Form IKP.pdf`**
   - Pertahankan sebagai baseline sumber bisnis.
   - Jangan ditimpa dengan generated PDF.
   - Perubahan hanya melalui versi baru dan persetujuan pemilik proses.

2. **`docs/AI-Product-Blueprint-Sistem-Informasi-IKP-IBS-RSUD-WZ-Johannes.md`**
   - Pertahankan sebagai master baseline requirement saat ini.
   - Jangan melakukan silent correction.
   - Perubahan harus memiliki owner, approver, version increment, dan decision/change log.

3. **Migration yang kelak telah diterapkan ke environment bersama**
   - Jangan diedit ulang; buat forward migration baru. Saat audit, migration belum ada.

4. **Generated/vendor artifacts yang kelak muncul**
   - `node_modules/`, build output, coverage, generated bindings/types tidak boleh diedit manual dan sebaiknya diatur melalui `.gitignore` atau generation workflow. Saat audit, artefak ini belum ada.

5. **Secrets dan production data**
   - Tidak boleh disimpan atau dimodifikasi melalui source repository. Saat audit, file secret/data production tidak ditemukan.

## 19. Phase 1 Readiness

# NOT READY

### Alasan blocking

1. Repository belum memiliki application scaffold, package manifest, build, atau source code.
2. Git baru muncul selama jendela audit; status resmi remote, ownership, review policy, dan repository controls belum dikonfirmasi.
3. Isi Form IKP belum diverifikasi field-by-field terhadap Blueprint.
4. State machine, revisi, dan transition authorization belum formal.
5. Scope IBS versus hospital-wide belum diputuskan.
6. Session/JWT/cookie/idle-timeout/Remember-Me design belum konsisten.
7. Legalitas dan kontrol e-paraf belum disetujui secara terbukti.
8. Local draft cache belum memiliki privacy/security decision.
9. Audit immutability masih berupa klaim tanpa mekanisme.
10. Data model belum cukup menangani history revisi dan belum memiliki DDL/constraints/indexes.
11. Attachment security dan retention belum ditetapkan.
12. Tidak ada Cloudflare configuration, D1/R2 bindings, environment strategy, atau local development setup.
13. Tidak ada executable test infrastructure atau acceptance evidence.
14. Security, operations, backup/restore, RPO/RTO, dan monitoring belum memiliki baseline yang dapat diterapkan.

### Exit criteria menuju READY

Phase 1 dapat dinilai `READY` setelah minimal:

- sumber Form IKP dan Blueprint divalidasi serta disetujui;
- keputusan pada item critical/high di Bagian 16 dicatat;
- state machine dan RBAC matrix disetujui;
- session/security/privacy architecture disetujui;
- ERD dan history/version strategy disetujui;
- repository/remote dikonfirmasi resmi, source-control policy ditetapkan, dan project scaffold plan disetujui;
- Cloudflare environment/binding/migration plan tersedia;
- quality gates dan test strategy memiliki owner serta acceptance criteria.

Audit ini tidak mengimplementasikan fitur, authentication, schema, dependency, atau perubahan database apa pun.
