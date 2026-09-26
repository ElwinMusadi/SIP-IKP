# Identity and Access Architecture Stakeholder Approval Package

## Document Purpose

This document provides hospital leadership, clinical department heads, the PMKP committee, and IT security officers with an executive decision package for identity, session, and credential governance in the **Sistem Informasi Pelaporan Insiden Keselamatan Pasien (IKP) IBS RSUD Prof. Dr. W. Z. Johannes Kupang**.

**CRITICAL NOTICE:** No decision in this package is pre-approved. Technical recommendations are marked **`TECHNICAL RECOMMENDATION — NOT A DECISION`**. Implementation of identity and authentication in Cloudflare D1 remains strictly blocked until formal approval is documented.

---

# Decision Package 1: Session & Authentication Architecture (ADR-004)

### 1. The Decision to be Made

What session and token architecture should be adopted for authenticating hospital personnel on Cloudflare Pages Functions and D1? Specifically: Does hospital governance approve deviating from the literal Product Blueprint phrase "Auth JWT" to "Server-Side Opaque Sessions in HttpOnly Cookies"?

### 2. Available Options

- **Option A: Server-Side Opaque Session in HttpOnly Cookie**
  - Browser holds a cryptographically random session token in a secure, host-only `__Host-` cookie with `HttpOnly` and `SameSite=Strict`.
  - Cloudflare D1 holds a SHA-256 hash of the token, user ID, issuance time, last activity, and revocation status.
- **Option B: Pure Stateless JWT Authentication**
  - Browser receives a signed JSON Web Token holding claims and expiration. No database session records are kept.
- **Option C: Hybrid Short-Lived Access Token + Rotating Refresh Session**
  - 2–5 minute signed access token + stateful refresh token stored in D1.

### 3. Technical & Operational Consequences

| Dimension                  | Option A (Opaque Session)                                             | Option B (Stateless JWT)                                         | Option C (Hybrid)                                  |
| -------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------- |
| **15-Min Idle Timeout**    | Immediate, exact server enforcement                                   | Impossible server-side (fixed token expiry)                      | Bounded by refresh interval (2–5 min lag)          |
| **Immediate Revocation**   | 100% immediate on logout / account disable                            | Impossible without server revocation table                       | 100% immediate for refresh, 2–5 min lag for access |
| **Shared Terminal Safety** | Maximum: clearing cookie + killing DB row guarantees complete lockout | Poor: intercepted or cached tokens remain valid until expiration | Moderate                                           |
| **Edge Serverless Fit**    | Native Web Crypto hash + single indexed D1 read                       | Native Web Crypto verify                                         | Complex token refresh race conditions              |
| **D1 Overhead**            | 1 fast read per request; throttled write every 60s                    | Zero reads/writes                                                | Moderate write load during token rotation bursts   |
| **Blueprint Wording**      | Deviates from literal "Auth JWT"                                      | Matches literal text                                             | Partial match                                      |

### 4. Technical Recommendation

> **TECHNICAL RECOMMENDATION — NOT A DECISION:**  
> Adopt **Option A (Server-Side Opaque Session in HttpOnly Cookie)**.  
> _Reasoning:_ Frontline surgical theaters use shared PC terminals where clinicians rotate frequently. Pure stateless JWTs cannot safely terminate sessions immediately upon logout or enforce true sliding 15-minute idle expirations, posing an unacceptable risk of unauthorized access to confidential incident reports.

### 5. Approval Metadata Block

- **Decision Status:** STAKEHOLDER DECISION REQUIRED
- **Technical Owner:** PENDING — technical owner not assigned
- **Required Approvers:**
  - Product Owner / Hospital IT Lead
  - Head of Central Surgical Installation (IBS)
  - Chair of PMKP Committee
  - Hospital Information Security / Data Protection Officer
- **Approved Decision:** PENDING
- **Approved by:** PENDING
- **Approval Evidence / Document Reference:** PENDING
- **Decision Date:** PENDING
- **Review Date:** PENDING
- **Supersedes:** None

---

# Decision Package 2: Password Security, Credential Lifecycle, and MFA (ADR-018)

### 1. The Decision to be Made

What credential storage algorithm, password complexity standard, account lockout threshold, and Multi-Factor Authentication (MFA) policy should be established for hospital staff?

### 2. Available Options

- **Password Hashing:**
  - _Option 2.1:_ Argon2id via WebAssembly (RFC 9106, highest GPU resistance).
  - _Option 2.2:_ PBKDF2-HMAC-SHA-256 via native Web Crypto API (>=600,000 iterations, native edge performance).
- **MFA Scope:**
  - _Option 2.3:_ Role-Based Mandatory MFA (TOTP for `ADMINISTRATOR` and `KOMITE_PMKP` only; single-factor password for frontline theater nurses and surgeons).
  - _Option 2.4:_ Hospital-Wide Mandatory MFA (TOTP for all clinical staff).
  - _Option 2.5:_ No MFA for Initial Release (Single-factor passwords for all roles).
- **Lockout Policy:**
  - _Option 2.6:_ Progressive delay after 5 failed attempts; 15-minute temporary lockout after 10 failed attempts.
  - _Option 2.7:_ Administrative unlock required after 5 failed attempts.

### 3. Technical & Operational Consequences

- **Argon2id vs PBKDF2:** Argon2id offers superior memory hardness against offline hash cracking if D1 backups are breached, but requires runtime Wasm execution benchmarking. PBKDF2 executes natively with zero external dependencies.
- **MFA Scope:** Mandatory MFA for all staff (Option 2.4) creates critical operational bottlenecks in emergency operating theaters if mobile devices are unavailable. Role-based MFA (Option 2.3) secures high-privilege administrative oversight while preserving emergency clinical agility.
- **Lockout:** Automatic 15-minute temporary unlock (Option 2.6) mitigates denial-of-service against hospital staff during night shifts while halting brute-force attacks.

### 4. Technical Recommendation

> **TECHNICAL RECOMMENDATION — NOT A DECISION:**
>
> 1. Use **Argon2id** if edge Wasm execution benchmarking completes within <=50ms CPU time; fallback to **PBKDF2-HMAC-SHA-256 (600,000 iterations)**.
> 2. Adopt **Role-Based MFA (TOTP)** for `ADMINISTRATOR` and `KOMITE_PMKP` roles; defer MFA for frontline `TENAGA_KESEHATAN` and `KEPALA_RUANGAN` to prevent clinical delays.
> 3. Enforce a minimum 12-character passphrase policy with no arbitrary symbol rules.
> 4. Enforce 10-attempt threshold with automatic 15-minute temporary lock.

### 5. Approval Metadata Block

- **Decision Status:** STAKEHOLDER DECISION REQUIRED
- **Technical Owner:** PENDING — technical owner not assigned
- **Required Approvers:**
  - Product Owner / Hospital IT Lead
  - Hospital Information Security / Data Protection Officer
  - Clinical Governance Lead
- **Approved Decision:** PENDING
- **Approved by:** PENDING
- **Approval Evidence / Document Reference:** PENDING
- **Decision Date:** PENDING
- **Review Date:** PENDING
- **Supersedes:** None

---

# Decision Package 3: Organizational Scope & Unit Assignment (ADR-001 / ADR-003)

### 1. The Decision to be Made

Should the application be deployed strictly as an **IBS-only reporting tool**, or should it support **hospital-wide reporting** with PMKP oversight from Day 1?

### 2. Available Options

- **Option 3.1: IBS-First Deployment with Multi-Unit Capable Architecture**
  - All current database schemas, role assignments, and interfaces use explicit organizational unit identifiers. Initial production data and role assignments are restricted exclusively to IBS. PMKP visibility is scoped to IBS incidents until formal hospital-wide rollout.
- **Option 3.2: Immediate Hospital-Wide Deployment**
  - All hospital wards (ICU, Emergency, Outpatient, Inpatient) are onboarded simultaneously. PMKP has full visibility across all hospital installations.
- **Option 3.3: Hard-Coded IBS Single-Unit Application**
  - Database schema hard-codes "IBS" and omits unit relational structures entirely.

### 3. Technical Recommendation

> **TECHNICAL RECOMMENDATION — NOT A DECISION:**  
> Adopt **Option 3.1 (IBS-First with Multi-Unit Capable Architecture)**.  
> _Reasoning:_ Avoids hard-coding technical debt while strictly upholding the patient confidentiality requirements of BR-02 during the initial rollout in the surgical unit.

### 4. Approval Metadata Block

- **Decision Status:** STAKEHOLDER DECISION REQUIRED
- **Technical Owner:** PENDING — technical owner not assigned
- **Required Approvers:**
  - Hospital Director / Medical Services Directorate
  - Head of IBS
  - Chair of PMKP Committee
- **Approved Decision:** PENDING
- **Approved by:** PENDING
- **Approval Evidence:** PENDING
- **Decision Date:** PENDING
- **Review Date:** PENDING
