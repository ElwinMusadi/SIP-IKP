# Panduan Pelatihan Pengguna (User Training Guide)

## Sistem Informasi Pelaporan Insiden Keselamatan Pasien (SIP-IKP)

### Instalasi Bedah Sentral (IBS) — RSUD Prof. Dr. W. Z. Johannes Kupang

---

## 1. Status Dokumen dan Kesiapan Pelatihan

**STATUS: PANDUAN PELATIHAN KANDIDAT / PROVISIONAL TRAINING GUIDE**

> **PERNYATAAN TATA KELOLA:**  
> Dokumen ini merupakan bahan ajar dan pedoman alur kerja operasional untuk persiapan pelatihan staf rumah sakit. Dokumen ini **BUKAN** bukti bahwa pelatihan staf telah dilaksanakan. Pelaksanaan pelatihan pengguna secara faktual di lapangan (_user training execution_) berstatus **`PENDING`** dan dijadwalkan oleh Instalasi SIMRS bersama Komite PMKP dan Kepala Ruangan IBS sebelum pelepasan klinis penuh.

---

## 2. Gambaran Umum Sistem & Prinsip Keselamatan

SIP-IKP IBS adalah aplikasi berbasis web yang digunakan untuk mendokumentasikan, memverifikasi, menginvestigasi, dan memantau Insiden Keselamatan Pasien (IKP) yang terjadi di lingkungan kamar operasi (Instalasi Bedah Sentral).

**Prinsip Utama:**

1. **Budaya Adil & Non-Punitif (_Just Culture_):** Pelaporan insiden ditujukan untuk pembelajaran mutu dan pencegahan kejadian serupa di masa depan, bukan untuk menghukum individu.
2. **Kerahasiaan Medis Ketat (_Confidentiality_):** Laporan bersifat rahasia (_"RAHASIA, TIDAK BOLEH DIFOTOCOPY"_). Data pasien dilindungi oleh kontrol akses berbasis peran (RBAC).
3. **Batas Waktu Pelaporan 2 x 24 Jam (SLA 48 Jam):** Insiden harus dilaporkan maksimal 48 jam sejak kejadian. Jika melewati 48 jam, sistem mewajibkan pengisian alasan keterlambatan.
4. **Sesi Keamanan 15 Menit:** Untuk mencegah kebocoran data pada komputer bersama (_shared PC_) di ruang perawat/kamar bedah, sistem akan mengunci sesi secara otomatis jika tidak ada aktivitas selama 15 menit.

---

## 3. Panduan Alur Kerja Berdasarkan Peran

### 3.1 Peran: TENAGA KESEHATAN (Nakes IBS)

_Dokter Operator, Perawat Bedah, Penata Anestesi, Bidan di IBS._

#### A. Membuat Draf Laporan Baru

1. Buka tautan sistem: `https://sip-ikp.pages.dev/` (atau domain internal RSUD).
2. Masuk menggunakan Username/NIP dan kata sandi Anda.
3. Klik tombol **"Buat Laporan Baru"** di sudut kanan atas.
4. Isi **Syarat Minimum Draf**:
   - Nama & Peran Pelapor (otomatis terisi nama Anda, dapat disesuaikan jika melaporkan atas nama tim).
   - Tanggal & Waktu Kejadian Insiden.
   - Jenis Insiden: Pilih salah satu dari `KNC` (Nyaris Cedera), `KTC` (Tidak Cedera), `KTD` (Tidak Diharapkan), atau `SENTINEL` (Kematian/Cedera Berat).
5. Segera setelah 4 field minimum terisi, draf resmi pertama akan tersimpan otomatis di server (_Auto-Save_ aktif) dan memunculkan indikator hijau: _"Semua perubahan tersimpan"_.

#### B. Mengisi Lengkap Formulir IKP (Bagian I & Bagian II)

1. **Bagian I (Data Pasien):**
   - Nama Pasien & Nomor Rekam Medis (No. MR). _Jika insiden darurat dan No. MR belum terbit dari loket, gunakan format sementara: `EMERGENCY-YYYYMMDD-01`._
   - Ruangan/Bangsal Pasien, Kelompok Umur, Jenis Kelamin, Penanggung Biaya (BPJS/Umum/dll.), serta Tanggal & Jam Masuk RS.
2. **Bagian II (Rincian Kejadian & Kronologi):**
   - Judul/Ringkasan Insiden.
   - **Kronologi Insiden (5W+1H):** Uraikan urutan kejadian secara objektif dan faktual (apa yang terjadi, siapa yang terlibat, di mana kamar operasi kejadian, kapan, dan bagaimana situasi saat insiden terjadi).
   - Sasaran Insiden: Pasien, Karyawan/Nakes (K3RS), Pengunjung, dll.
   - Kamar Operasi (OK 1 s/d OK 8, Pre-Op, PACU) & Spesialisasi Bedah terkait.
   - Unit Penyebab & Derajat Cedera Pasien.
   - Tindakan segera yang dilakukan untuk menolong pasien serta hasilnya.
   - Keterangan apakah kejadian serupa pernah terjadi sebelumnya.

#### C. Menyimpan Draf vs Mengirim Laporan Resmi

- **Simpan Draf:** Anda dapat mengklik "Simpan Draf" kapan saja atau membiarkan auto-save bekerja. Draf berstatus `DRAFT` bersifat **privat mutlak** dan tidak dapat dilihat oleh staf lain.
- **Kirim Laporan Resmi:**
  - Klik **"Kirim Laporan Resmi"**.
  - Sistem akan memeriksa kelengkapan seluruh field wajib. Jika ada yang terlewat, ringkasan field merah akan muncul di bagian atas.
  - Jika lengkap, jendela konfirmasi pernyataan pelapor akan muncul. Klik **"Ya, Kirimkan Laporan Resmi"**.
  - Laporan Anda akan menerima Nomor Laporan resmi (`IKP/IBS/YYYYMM/XXXX`), status berubah menjadi `SUBMITTED`, dan masuk ke antrean Kepala Ruangan IBS. Form pengiriman terkunci permanen.

#### D. Memperbaiki Laporan Jika Diminta Revisi

1. Jika Kepala Ruangan menemukan data yang perlu diperjelas, status laporan Anda akan berubah menjadi `REVISION_REQUIRED`.
2. Buka laporan Anda, baca catatan arahan revisi dari Kepala Ruangan.
3. Lakukan perbaikan data yang diminta.
4. Klik **"Kirim Laporan Resmi"** kembali.

---

### 3.2 Peran: KEPALA RUANGAN (IBS)

_Kepala Ruangan / Kasubag Instalasi Bedah Sentral._

#### A. Menerima Laporan Insiden

1. Masuk menggunakan akun Kepala Ruangan.
2. Buka menu **"Laporan Insiden"**, cari laporan berstatus `SUBMITTED`.
3. Buka detail laporan. Pada bilah atas peninjauan, klik **"Terima & Mulai Peninjauan"**.
4. Status laporan berubah menjadi `UNDER_REVIEW`.

#### B. Meminta Perbaikan / Revisi ke Pelapor

1. Pada status `SUBMITTED` atau `UNDER_REVIEW`, jika data belum lengkap/kurang jelas, klik tombol **"Minta Perbaikan / Revisi ke Pelapor"**.
2. Tuliskan arahan perbaikan pada kotak teks (opsional namun disarankan).
3. Laporan akan dikembalikan ke pelapor (`REVISION_REQUIRED`).

#### C. Melakukan Koreksi Darurat (Emergency Correction)

1. Wewenang khusus Kepala Ruangan pada status `SUBMITTED` atau `UNDER_REVIEW`.
2. Klik tombol **"Koreksi Darurat Kepala Ruangan"**.
3. Masukkan **Alasan Koreksi Wajib** (1–500 karakter), misalnya: _"Pembaruan nomor MR definitif dari Rekam Medis menggantikan nomor darurat"_.
4. Perbarui data yang perlu dikoreksi (termasuk nomor MR, nama, atau pita risiko). Klik simpan.
5. _Perhatian:_ Koreksi darurat dilarang keras setelah Investigasi Sederhana atau Tinjauan PMKP dimulai.

#### D. Menetapkan Pita Grading Risiko

1. Pada status `UNDER_REVIEW`, pilih salah satu pita risiko secara manual klinis:
   - **BIRU (Rendah)** atau **HIJAU (Sedang):** Klik tombol penetapan. Status tetap `UNDER_REVIEW` dan aplikasi menampilkan pilihan tindak lanjut.
   - **KUNING (Tinggi)** atau **MERAH (Ekstrem):** Wajib mengisi **Catatan Awal Mitigasi & Tindakan Pencegahan Segera**. Laporan otomatis dialihkan ke status `PMKP_REVIEW` untuk eskalasi ke Komite Mutu.

#### E. Memilih Tindak Lanjut BIRU / HIJAU

1. Setelah grading BIRU/HIJAU tersimpan, jawab pertanyaan **"Apakah laporan ini perlu dilanjutkan ke Investigasi Sederhana?"**.
2. Pilih **"Lanjut ke Investigasi Sederhana"** jika penyebab dan rencana perbaikan perlu didokumentasikan. Status berubah menjadi `SIMPLE_INVESTIGATION` dan lembar investigasi muncul.
3. Pilih **"Selesaikan Tanpa Investigasi"** bila peninjauan unit menyimpulkan investigasi sederhana tidak diperlukan.
4. Untuk penyelesaian langsung, baca dialog konfirmasi dan pilih **"Ya, Selesaikan Permanen"**. Status berubah menjadi `COMPLETED_BY_UNIT`, laporan terkunci, dan tidak ada lembar investigasi yang dibuat.

#### F. Mengisi & Menyelesaikan Lembar Investigasi Sederhana (BIRU / HIJAU)

1. Pada laporan berstatus `SIMPLE_INVESTIGATION`, gulir ke **Bagian III**.
2. Isi Penyebab Langsung Insiden (_Direct Cause_) dan Akar Masalah (_Root Cause_).
3. Isi Tanggal Mulai dan Tanggal Selesai investigasi (tanggal selesai tidak boleh sebelum tanggal mulai).
4. Tambahkan minimal 1 Rekomendasi (uraian, penanggung jawab, target tanggal).
5. Tambahkan minimal 1 Tindakan Perbaikan (uraian, penanggung jawab, target tanggal).
6. Anda dapat mengklik _"Simpan Draf Investigasi"_ untuk mencicil pengisian.
7. Setelah tuntas, klik **"Selesaikan Investigasi & Tutup di Tingkat Unit"**.
8. Status laporan berubah menjadi `COMPLETED_BY_UNIT` (kasus resmi ditutup dan terkunci permanen).

---

### 3.3 Peran: KOMITE PMKP

_Ketua & Anggota Subkomite Mutu & Keselamatan Pasien RS._

#### A. Mengawasi Laporan Insiden Bedah

1. Masuk menggunakan akun Komite PMKP.
2. Buka menu **"Laporan Insiden"** atau **"Rekapitulasi"** (`/laporan/rekap`) untuk melihat sebaran insiden IBS secara menyeluruh.

#### B. Meninjau Insiden Risiko Tinggi (KUNING / MERAH)

1. Buka laporan yang berstatus `PMKP_REVIEW`.
2. Baca rincian kejadian dan catatan mitigasi awal yang dibuat oleh Kepala Ruangan IBS.
3. Masukkan catatan evaluasi mutu atau arahan pembentukan tim investigasi komprehensif pada kotak teks. Klik _"Simpan Catatan PMKP"_.

#### C. Finalisasi Serah Terima RCA Eksternal

1. Setelah koordinasi pembentukan tim RCA eksternal rumah sakit selesai dilakukan, klik tombol **"Konfirmasi Serah Terima RCA & Tutup Kasus"**.
2. Konfirmasikan dialog persetujuan.
3. Status laporan berubah menjadi `COMPLETED` (kasus pelaporan SIP-IKP resmi ditutup; pelaksanaan RCA lanjutan berjalan di luar aplikasi).

---

### 3.4 Peran: ADMINISTRATOR SIMRS

_Tim IT / Pengelola SIMRS RSUD Prof. Dr. W. Z. Johannes._

#### A. Kebijakan Privasi Klinis Administrator

- Akun Administrator **TIDAK MEMILIKI AKSES** ke narasi kronologi klinis insiden atau data pribadi/rekam medis pasien.
- Pada layar Administrator, nama pasien, nomor MR, dan kronologi akan disensor otomatis menjadi tanda strip (`"-"`) demi mematuhi etika kerahasiaan rekam medis.

#### B. Pengelolaan Akun Pengguna

- Membuat akun staf baru sesuai memo resmi kepala ruangan/direksi.
- Menonaktifkan akun (_Soft Deactivation_) staf yang mutasi/berhenti (dilarang menghapus akun secara permanen).
- Mengatur ulang kata sandi staf yang lupa password dan mencabut sesi aktif.

#### C. Pengelolaan Master Data

- Memperbarui daftar kamar operasi (OK 1 s/d OK 8, Pre-Op, PACU).
- Memperbarui daftar spesialisasi klinis, departemen, dan jenis penjamin.

---

## 4. Penanganan Kesalahan Umum (_Common Troubleshooting_)

| Pesan / Gejala Kesalahan                                   | Penyebab                                             | Langkah Solusi untuk Pengguna                                                                         |
| ---------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **"Kredensial Tidak Valid" (401)**                         | Username/NIP atau kata sandi salah.                  | Periksa kembali huruf besar/kecil dan tombol Caps Lock. Jika lupa kata sandi, hubungi admin SIMRS.    |
| **"Sesi otentikasi telah berakhir"**                       | Tidak ada aktivitas selama 15 menit.                 | Masuk kembali menggunakan username dan kata sandi Anda. Draf yang sempat tersimpan tidak akan hilang. |
| **"Token CSRF Tidak Valid" (403)**                         | Membuka banyak tab peramban atau koneksi terputus.   | Tekan tombol `F5` (Refresh) peramban Anda untuk memperbarui token keamanan sesi aktif.                |
| **"Konflik Versi Data (412)"**                             | Data diubah bersamaan dari komputer/sesi lain.       | Muat ulang halaman (`F5`) untuk melihat versi data terbaru sebelum menyimpan ulang.                   |
| **"Kelengkapan Formulir Belum Memenuhi Syarat"**           | Ada field wajib Bagian I atau Bagian II yang kosong. | Periksa kotak merah di bagian atas form; isi field bertanda bintang merah (`*`) yang terlewat.        |
| **"Alasan Keterlambatan Wajib Diisi"**                     | Laporan insiden dikirim > 48 jam sejak kejadian.     | Tuliskan kendala/alasan keterlambatan pelaporan pada kotak teks Bagian II yang disediakan.            |
| **"Alasan Koreksi Darurat Wajib Diisi (1–500 karakter)"**  | Kotak alasan koreksi darurat kosong.                 | Tuliskan alasan mengapa data diubah (minimal 1 kata, maksimal 500 karakter).                          |
| **"Tanggal selesai tidak boleh mendahului tanggal mulai"** | Kesalahan input tanggal investigasi.                 | Periksa kembali kalender tanggal mulai dan tanggal selesai investigasi sederhana.                     |

---

## 5. Prosedur Pelaporan Kendala Teknis (_Support Escalation_)

Jika Anda menemukan kendala teknis atau kegagalan sistem yang tidak tertera pada tabel di atas:

1. **Catat ID Jejak (Request ID):** Salin kode unik `ID Jejak` yang tertera pada pesan kesalahan di layar (contoh: `req_e948215f-...`).
2. **Jangan Mengambil Foto yang Memuat Nama Pasien:** Dilarang memotret layar yang menampilkan identitas pasien untuk dikirimkan melalui grup obrolan umum.
3. **Hubungi Helpdesk SIMRS:** Sampaikan kendala kepada petugas SIMRS on-duty dengan menyebutkan ID Jejak dan peran akun Anda.
