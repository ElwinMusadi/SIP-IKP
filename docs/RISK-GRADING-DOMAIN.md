# Risk Grading Domain Specification

## 1. Scope and Authority

This document defines the domain rules, actors, data structures, and lifecycle constraints for clinical **Risk Grading (Bands Risiko: BIRU, HIJAU, KUNING, MERAH)** in the **Sistem Informasi Pelaporan Insiden Keselamatan Pasien (IKP) IBS RSUD Prof. Dr. W. Z. Johannes Kupang**.

**CRITICAL MANDATE:**

- Do NOT invent clinical definitions or risk matrices.
- Do NOT implement an automatic risk scoring formula (e.g. 5x5 impact x probability matrix calculation).
- Risk grading is strictly **MANUAL HUMAN CLINICAL SELECTION** by authorized clinical supervisors.
- Branch-changing regrades remain **BLOCKED / PENDING POLICY** until hospital governance defines the transition consequences.

---

## 2. Risk Bands and Clinical Downstream Workflows

The Product Blueprint (`docs/AI-Product-Blueprint-*.md:33-34, 100-102, 180-184, 237-241`) defines four canonical risk bands:

| Risk Band  | Clinical Meaning              | Downstream Workflow Triggered                        | Initial Responsible Actor | Downstream Work Entity                                         |
| ---------- | ----------------------------- | ---------------------------------------------------- | ------------------------- | -------------------------------------------------------------- |
| **BIRU**   | Low Risk (Risiko Rendah)      | Simple Investigation by Unit Head                    | `KEPALA_RUANGAN`          | Lembar Kerja Investigasi Sederhana (`investigation_revisions`) |
| **HIJAU**  | Moderate Risk (Risiko Sedang) | Simple Investigation by Unit Head                    | `KEPALA_RUANGAN`          | Lembar Kerja Investigasi Sederhana (`investigation_revisions`) |
| **KUNING** | High Risk (Risiko Tinggi)     | Immediate Escalation to PMKP with Initial Mitigation | `KEPALA_RUANGAN`          | Catatan Awal Mitigasi & Eskalasi (`ESCALATED_TO_PMKP`)         |
| **MERAH**  | Extreme Risk (Risiko Ekstrem) | Immediate Escalation to PMKP with Initial Mitigation | `KEPALA_RUANGAN`          | Catatan Awal Mitigasi & Eskalasi (`ESCALATED_TO_PMKP`)         |

---

## 3. Initial Risk Grading Rules

1. **Actor Authority:** Only an authenticated user with an active `KEPALA_RUANGAN` role covering the owning clinical unit (`IBS`) may perform initial risk grading (`FR-03`, `BR-05`).
2. **Precondition State:** The incident must be in status `UNDER_REVIEW`.
3. **No Automatic Inference:** The system must never pre-select or automatically assign a risk grade based on incident type or degree of harm. The unit head must exercise clinical judgment.
4. **Branch Branching Requirements:**
   - Selecting **`BIRU` or `HIJAU`**:
     - Transitions incident status from `UNDER_REVIEW` to `SIMPLE_INVESTIGATION`.
     - Opens the Lembar Kerja Investigasi Sederhana workspace.
     - Does NOT require initial mitigation notes at this step.
   - Selecting **`KUNING` or `MERAH`**:
     - Transitions incident status from `UNDER_REVIEW` to `ESCALATED_TO_PMKP`.
     - Requires non-empty `high_risk_mitigation_notes` within the same transaction (`BR-06`).
     - Closes the simple investigation workspace for the unit.
5. **Atomic Audit Capture:** The initial grade, timestamp, actor identity snapshot, rationale, and resulting state transition must be committed atomically to D1 in a single transaction.

---

## 4. Regrading Rules and Restrictions (PMKP)

The Product Blueprint (`FR-05`, line 102 & line 217) grants the **Komite PMKP** the authority to assign a revised risk grade during their quality evaluation.

### 4.1 Allowed Regrading Target Bands

The Product Blueprint explicitly lists only:

- `HIJAU`
- `KUNING`
- `MERAH`

`BIRU` is explicitly **omitted** from the Blueprint's regrading specification.

### 4.2 Prohibited & Blocked Regrade Transitions (Branch-Changing Regrades)

Until hospital PMKP governance explicitly ratifies the downstream transition consequences, **BRANCH-CHANGING REGRADES REMAIN BLOCKED**:

| Scenario        | From Initial Grade | To PMKP Regrade    | Status                                | Architectural Blocker & Unresolved Question                                                                                   |
| --------------- | ------------------ | ------------------ | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Same-Branch** | `BIRU`             | `HIJAU`            | Permitted in draft review             | Stays within Simple Investigation branch; does not alter workflow state.                                                      |
| **Same-Branch** | `KUNING`           | `MERAH`            | Permitted in draft review             | Stays within High-Risk escalation branch.                                                                                     |
| **Low → High**  | `BIRU` / `HIJAU`   | `KUNING` / `MERAH` | **BLOCKED / PENDING POLICY**          | Does this abort the unit's simple investigation? Does it immediately mandate a PMKP RCA? Who writes the high-risk mitigation? |
| **High → Low**  | `KUNING` / `MERAH` | `HIJAU`            | **BLOCKED / PENDING POLICY**          | Does this re-route the incident back to Kepala Ruangan IBS to conduct a simple investigation that was previously skipped?     |
| **Any → BIRU**  | Any                | `BIRU`             | **BLOCKED / PROHIBITED BY BLUEPRINT** | Blueprint lines 102 & 217 omit BIRU. Regrading to BIRU is not permitted without formal Blueprint amendment.                   |

---

## 5. Risk Decision History Model

To ensure medicolegal traceability, risk grading must never overwrite the original grade. Each grading event creates an immutable `RiskDecision` record:

```text
incident_report_id: FK -> incident_reports
decision_type:      INITIAL_GRADING | REGRADING
risk_grade:         BIRU | HIJAU | KUNING | MERAH
previous_grade:     NULL (for initial) | BIRU | HIJAU | KUNING | MERAH
mitigation_notes:   TEXT (mandatory if grade IN ('KUNING', 'MERAH'))
clinical_rationale: TEXT
decided_by_user_id: FK -> users
decided_at_utc:     TEXT (ISO 8601 UTC timestamp)
request_id:         TEXT (trace correlation)
```

Both the initial Head of Room grade and any subsequent PMKP regrades remain visible on the incident timeline and in the formal PDF accreditation printout.
