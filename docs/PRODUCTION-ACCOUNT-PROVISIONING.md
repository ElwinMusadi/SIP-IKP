# Production Account Provisioning and Identity Management Protocol

## 1. Governance and Identity Boundary

This document outlines the standard operating procedure (SOP) for provisioning, onboarding, maintaining, and offboarding staff user accounts for the **Sistem Informasi Pelaporan Insiden Keselamatan Pasien (IKP) IBS RSUD Prof. Dr. W. Z. Johannes Kupang**.

**CRITICAL MANDATE:**

- Zero production credentials, real staff NIPs, or real employee names may be stored in repository source code, seeds, or migrations.
- Production accounts must be provisioned exclusively through authorized administrative workflows following hospital employment verification.
- Roles are strictly restricted to the four canonical roles: `TENAGA_KESEHATAN`, `KEPALA_RUANGAN`, `KOMITE_PMKP`, and `ADMINISTRATOR`.

---

## 2. Canonical Role Profiles & Access Privileges

| Canonical Role Code    | Display Role Name    | Target Staff Population                                       | Primary Operational Responsibilities                                                                                                                                                                                                             | Default Access Scope                                                 |
| ---------------------- | -------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| **`TENAGA_KESEHATAN`** | Tenaga Kesehatan IBS | Dokter Operator, Perawat Bedah, Penata Anestesi, Bidan di IBS | Menulis draf laporan insiden, mengirimkan laporan resmi, melihat laporan insiden sesama Nakes IBS (pembelajaran mutu).                                                                                                                           | Unit IBS (Draf privat; laporan terkirim peer-view).                  |
| **`KEPALA_RUANGAN`**   | Kepala Ruangan IBS   | Kepala Ruangan / Kepala Instalasi Bedah Sentral               | Menerima laporan (`SUBMITTED` -> `UNDER_REVIEW`), meminta revisi draf, menetapkan grading risiko (`BIRU`/`HIJAU`/`KUNING`/`MERAH`), melakukan koreksi darurat, menyelesaikan investigasi sederhana (`COMPLETED_BY_UNIT`), serah terima RCA PMKP. | Unit IBS (Wewenang administratif & klinis penuh tingkat unit).       |
| **`KOMITE_PMKP`**      | Komite PMKP          | Anggota Subkomite Mutu & Keselamatan Pasien RS                | Mengawasi laporan insiden IBS terkirim, meninjau insiden risiko tinggi (`KUNING`/`MERAH`), mencatat arahan evaluasi mutu, mengesahkan serah terima RCA eksternal (`COMPLETED`).                                                                  | Pengawasan Mutu RS (Fokus IBS).                                      |
| **`ADMINISTRATOR`**    | Administrator SIMRS  | Tim IT / Pranata Komputer SIMRS RSUD Prof. Dr. W. Z. Johannes | Mengelola akun pengguna, mengatur master data ruangan/spesialisasi, memantau kesehatan operasional server dan integritas jejak audit.                                                                                                            | Global Administratif (Narasi klinis & PII pasien disensor otomatis). |

---

## 3. Account Provisioning Lifecycle

### Step 1: Verification of Clinical Staff Identity

Before an account is created:

1. The IT Department must receive an official user request verified by the Head of IBS or Chair of PMKP.
2. The user's official NIP (Nomor Induk Pegawai) or verified hospital employee ID must be established as the unique `username`.

### Step 2: Generation of Secure Initial Credentials

1. Initial passwords must meet the minimum password policy (`ADR-018`):
   - Minimum length: 12 characters.
   - High entropy: Recommend a 3-word or 4-word random passphrase (e.g. `Mawar-Kupang-Bedah#2026`).
2. Passwords must be hashed using the project's native Web Crypto PBKDF2-HMAC-SHA-256 standard (100,000 iterations, 16-byte cryptographically random salt).
3. Plaintext passwords must NEVER be sent over unencrypted channels (prohibit SMS or unsecured WhatsApp messages; deliver via secure internal memo or encrypted email).

### Step 3: Database Insertion (Production SQL Template)

Administrators execute the insertion via Wrangler CLI or Cloudflare D1 dashboard:

```sql
-- Production Staff Provisioning Template (Executed via Cloudflare Console)
INSERT INTO users (
  id,
  username,
  password_hash,
  full_name,
  role,
  profession,
  unit_id,
  is_active,
  created_at,
  updated_at
) VALUES (
  'usr_' || lower(hex(randomblob(16))),
  '198501152010011002', -- NIP Staf
  '<PBKDF2_HASH_STRING>', -- Generated via functions/_shared/password.ts
  'Nama Lengkap Staf, Gelar',
  'TENAGA_KESEHATAN', -- Role
  'Perawat Bedah', -- Profesi
  'IBS', -- Unit
  1,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);
```

---

## 4. Credential Reset and Session Revocation Protocol

### Account Password Reset

When a staff member forgets their password or suspects credential compromise:

1. The identity of the requester is verified in person or via verified hospital telephone protocol.
2. The administrator generates a new compliant temporary password and derives its PBKDF2 hash.
3. The password hash is updated in the database, and **ALL active sessions for that user ID are immediately revoked**:
   ```sql
   -- Update password hash
   UPDATE users
   SET password_hash = '<NEW_PBKDF2_HASH>', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
   WHERE username = '198501152010011002';

   -- Revoke all active sessions immediately
   UPDATE sessions
   SET revoked_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), revocation_reason = 'ADMINISTRATIVE_PASSWORD_RESET'
   WHERE user_id = (SELECT id FROM users WHERE username = '198501152010011002') AND revoked_at IS NULL;
   ```

---

## 5. Account Deactivation (Offboarding Protocol)

When an employee resigns, is transferred outside IBS, or retires:

1. **NEVER execute hard `DELETE FROM users`:** Hard deletion destroys foreign key references in historical reports and invalidates the clinical audit trail.
2. **Execute Soft Deactivation:**
   ```sql
   -- 1. Deactivate account
   UPDATE users
   SET is_active = 0, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
   WHERE username = '198501152010011002';

   -- 2. Terminate all active sessions immediately
   UPDATE sessions
   SET revoked_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), revocation_reason = 'USER_OFFBOARDED'
   WHERE user_id = (SELECT id FROM users WHERE username = '198501152010011002') AND revoked_at IS NULL;
   ```
3. Once deactivated, the login handler will strictly reject authentication attempts, and any in-flight session cookies are rejected with `HTTP 401 Unauthorized`.
