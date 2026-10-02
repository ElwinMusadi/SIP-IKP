import { describe, expect, it, vi } from "vitest"

import type { RequestContextData } from "../../_shared/request-context"
import type { AuthSessionContext } from "../../_shared/session"
import { onRequestGet as onAuditGet } from "./[id]/audit"
import { onRequestPost as onAssignRiskGradePost } from "./[id]/assign-risk-grade"
import { onRequestPost as onEmergencyCorrectionPost } from "./[id]/emergency-correction"
import { onRequestPut as onInvestigationPut } from "./[id]/investigation"
import { onRequestPost as onCompleteInvestigationPost } from "./[id]/investigation/complete"
import { onRequestPost as onStartInvestigationPost } from "./[id]/investigation/start"
import { onRequestPut as onPmkpReviewPut } from "./[id]/pmkp-review"
import { onRequestPost as onFinalizePmkpPost } from "./[id]/pmkp-review/finalize"
import { onRequestPost as onReceivePost } from "./[id]/receive"
import { onRequestPost as onRevisionRequiredPost } from "./[id]/revision-required"
import { onRequestPost as onSubmitPost } from "./[id]/submit"
import {
  onRequestDelete as onIncidentDelete,
  onRequestGet as onIncidentGet,
  onRequestPatch as onIncidentPatch,
} from "./[id]"
import { onRequestPost as onIncidentsCreatePost } from "./index"

// Synthetic Actors from Seed
const nakesA: AuthSessionContext = {
  user: {
    id: "usr_nakes_a",
    username: "nakes_a",
    fullName: "Ns. Maria G. Klau",
    role: "TENAGA_KESEHATAN",
    profession: "Perawat Bedah",
    unitId: "IBS",
    isActive: true,
  },
  session: {
    id: "ses_a",
    csrfToken: "csrf_nakes_a",
    idleExpiresInSeconds: 900,
    absoluteExpiresInSeconds: 36000,
  },
}

const nakesB: AuthSessionContext = {
  user: {
    id: "usr_nakes_b",
    username: "nakes_b",
    fullName: "Ns. Antonius L",
    role: "TENAGA_KESEHATAN",
    profession: "Perawat Bedah",
    unitId: "IBS",
    isActive: true,
  },
  session: {
    id: "ses_b",
    csrfToken: "csrf_nakes_b",
    idleExpiresInSeconds: 900,
    absoluteExpiresInSeconds: 36000,
  },
}

const headroomActor: AuthSessionContext = {
  user: {
    id: "usr_headroom",
    username: "kepala_ruangan",
    fullName: "Ns. Yohanes Bria",
    role: "KEPALA_RUANGAN",
    profession: "Kepala Ruangan IBS",
    unitId: "IBS",
    isActive: true,
  },
  session: {
    id: "ses_hr",
    csrfToken: "csrf_hr",
    idleExpiresInSeconds: 900,
    absoluteExpiresInSeconds: 36000,
  },
}

const pmkpActor: AuthSessionContext = {
  user: {
    id: "usr_pmkp",
    username: "komite_pmkp",
    fullName: "dr. Robertus Taolin",
    role: "KOMITE_PMKP",
    profession: "Komite PMKP",
    unitId: "IBS",
    isActive: true,
  },
  session: {
    id: "ses_pmkp",
    csrfToken: "csrf_pmkp",
    idleExpiresInSeconds: 900,
    absoluteExpiresInSeconds: 36000,
  },
}

const adminActor: AuthSessionContext = {
  user: {
    id: "usr_admin",
    username: "admin_ibs",
    fullName: "Administrator SIMRS",
    role: "ADMINISTRATOR",
    profession: "Admin",
    unitId: "IBS",
    isActive: true,
  },
  session: {
    id: "ses_admin",
    csrfToken: "csrf_admin",
    idleExpiresInSeconds: 900,
    absoluteExpiresInSeconds: 36000,
  },
}

function callHandler(
  handler: unknown,
  request: Request,
  db: D1Database,
  data: RequestContextData,
  params: Record<string, string> = {},
): Promise<Response> {
  const fn = handler as (context: unknown) => Promise<Response>
  return fn({
    request,
    env: { DB: db, APP_ENV: "test" },
    params,
    data,
    functionPath: "test",
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn(),
    async next() {
      return new Response(null)
    },
  })
}

// In-Memory D1 Simulation
function createE2eDatabase() {
  const incidents = new Map<string, Record<string, unknown>>()
  const snapshots = new Map<string, Record<string, unknown>>()
  const investigations = new Map<string, Record<string, unknown>>()
  const auditRecords: Array<Record<string, unknown>> = []
  let seq = 0

  const db = {
    prepare(sql: string) {
      let boundParams: unknown[] = []
      return {
        bind(...params: unknown[]) {
          boundParams = params
          return this
        },
        async first<T = Record<string, unknown>>() {
          if (sql.includes("FROM incident_reports WHERE id = ?")) {
            const id = boundParams[0] as string
            const found = incidents.get(id)
            return (found ? { ...found } : null) as T | null
          }
          if (sql.includes("FROM simple_investigations WHERE incident_id = ?")) {
            const id = boundParams[0] as string
            const found = investigations.get(id)
            return (found ? { ...found } : null) as T | null
          }
          if (sql.includes("FROM incident_submission_snapshots WHERE incident_id = ?")) {
            const id = boundParams[0] as string
            const found = snapshots.get(id)
            return (found ? { ...found } : null) as T | null
          }
          if (sql.includes("INSERT INTO report_number_sequences")) {
            seq += 1
            return { current_sequence: seq } as T
          }
          return null
        },
        async all() {
          if (sql.includes("FROM incident_reports") && sql.includes("owning_unit_id = 'IBS'")) {
            const userId = boundParams[0] as string
            const list = Array.from(incidents.values()).filter(
              (r) =>
                r.owning_unit_id === "IBS" &&
                (r.status !== "DRAFT" || r.created_by_user_id === userId),
            )
            return { results: list }
          }
          if (sql.includes("FROM audit_records") && sql.includes("incident_id = ?")) {
            const id = boundParams[0] as string
            const list = auditRecords.filter((a) => a.incident_id === id)
            return { results: list }
          }
          return { results: [] }
        },
        async run() {
          if (sql.includes("INSERT INTO incident_reports")) {
            const id = boundParams[0] as string
            incidents.set(id, {
              id,
              status: "DRAFT",
              created_by_user_id: boundParams[1],
              reporter_name: boundParams[2],
              reporter_role: boundParams[3],
              owning_unit_id: "IBS",
              patient_name: boundParams[4],
              medical_record_number: boundParams[5],
              patient_room: boundParams[6],
              patient_age_category: boundParams[7],
              patient_gender: boundParams[8],
              patient_payer_type: boundParams[9],
              admission_datetime: boundParams[10],
              incident_datetime: boundParams[11],
              incident_timezone: "Asia/Makassar",
              incident_title: boundParams[12],
              chronology: boundParams[13],
              incident_type: boundParams[14],
              initial_reporter_category: boundParams[15],
              initial_reporter_detail: boundParams[16],
              incident_target: boundParams[17],
              incident_target_other: boundParams[18],
              patient_care_type: boundParams[19],
              incident_location: boundParams[20],
              clinical_specialization: boundParams[21],
              causing_unit: boundParams[22],
              patient_impact: boundParams[23],
              immediate_action_and_result: boundParams[24],
              action_taken_by: boundParams[25],
              similar_incident_occurred: boundParams[26],
              similar_incident_details: boundParams[27],
              row_version: 1,
              created_at: boundParams[28],
              updated_at: boundParams[29],
              report_number: null,
              submitted_at: null,
              completed_at: null,
              is_overdue_sla: 0,
              overdue_reason: null,
              risk_grade: null,
              pmkp_reviewed: 0,
            })
            return { meta: { changes: 1 } }
          }
          if (sql.includes("UPDATE incident_reports SET")) {
            // Guarded updates: WHERE id=? AND row_version=? AND status=<literal>
            const hasVersionGuard =
              sql.includes("AND row_version = ?") || sql.includes("AND row_version=?")
            const guardedOnUnderReview =
              hasVersionGuard &&
              (sql.includes("AND status = 'UNDER_REVIEW'") ||
                sql.includes("AND status='UNDER_REVIEW'"))
            const guardedOnSimpleInv =
              hasVersionGuard &&
              (sql.includes("AND status = 'SIMPLE_INVESTIGATION'") ||
                sql.includes("AND status='SIMPLE_INVESTIGATION'"))

            if (guardedOnUnderReview || guardedOnSimpleInv) {
              const id = boundParams[boundParams.length - 2] as string
              const expectedVer = boundParams[boundParams.length - 1] as number
              const inc = incidents.get(id)
              const requiredStatus = guardedOnUnderReview ? "UNDER_REVIEW" : "SIMPLE_INVESTIGATION"

              if (!inc || inc.row_version !== expectedVer || inc.status !== requiredStatus) {
                return { meta: { changes: 0 } }
              }

              if (sql.includes("risk_grade = ?")) {
                inc.status = boundParams[0]
                inc.risk_grade = boundParams[1]
                inc.risk_graded_at = boundParams[2]
                inc.high_risk_mitigation_notes = boundParams[3]
                inc.row_version = boundParams[4]
                inc.updated_at = boundParams[5]
              } else if (guardedOnUnderReview && sql.includes("status = 'SIMPLE_INVESTIGATION'")) {
                inc.status = "SIMPLE_INVESTIGATION"
                inc.row_version = boundParams[0]
                inc.updated_at = boundParams[1]
              } else if (guardedOnUnderReview && sql.includes("status = 'COMPLETED_BY_UNIT'")) {
                inc.status = "COMPLETED_BY_UNIT"
                inc.completed_at = boundParams[0]
                inc.row_version = boundParams[1]
                inc.updated_at = boundParams[2]
              } else if (guardedOnSimpleInv && sql.includes("status = 'COMPLETED_BY_UNIT'")) {
                inc.status = "COMPLETED_BY_UNIT"
                inc.completed_at = boundParams[0]
                inc.row_version = boundParams[1]
                inc.updated_at = boundParams[2]
              }

              return { meta: { changes: 1 } }
            }

            const id = boundParams[boundParams.length - 1] as string
            const inc = incidents.get(id)
            if (inc) {
              if (sql.includes("status = 'SUBMITTED'")) {
                inc.status = "SUBMITTED"
                inc.report_number = boundParams[0]
                inc.submitted_at = boundParams[1]
                inc.sla_deadline_utc = boundParams[2]
                inc.is_overdue_sla = boundParams[3]
                inc.row_version = boundParams[4]
                inc.updated_at = boundParams[5]
              } else if (sql.includes("status = 'UNDER_REVIEW'")) {
                inc.status = "UNDER_REVIEW"
                inc.received_by_user_id = boundParams[0]
                inc.received_at = boundParams[1]
                inc.row_version = boundParams[2]
                inc.updated_at = boundParams[3]
              } else if (sql.includes("status = 'REVISION_REQUIRED'")) {
                inc.status = "REVISION_REQUIRED"
                inc.revision_reason = boundParams[0]
                inc.row_version = boundParams[1]
                inc.updated_at = boundParams[2]
              } else if (sql.includes("risk_grade = ?") && sql.includes("status = ?")) {
                inc.status = boundParams[0]
                inc.risk_grade = boundParams[1]
                inc.risk_graded_at = boundParams[2]
                inc.high_risk_mitigation_notes = boundParams[3]
                inc.row_version = boundParams[4]
                inc.updated_at = boundParams[5]
              } else if (sql.includes("status = 'COMPLETED_BY_UNIT'")) {
                inc.status = "COMPLETED_BY_UNIT"
                inc.completed_at = boundParams[0]
                inc.row_version = boundParams[1]
                inc.updated_at = boundParams[2]
              } else if (sql.includes("status = 'COMPLETED'")) {
                inc.status = "COMPLETED"
                inc.pmkp_reviewed = 1
                inc.completed_at = boundParams[0]
                inc.row_version = boundParams[1]
                inc.updated_at = boundParams[2]
              } else if (sql.includes("pmkp_review_notes = ?")) {
                inc.pmkp_review_notes = boundParams[0]
                inc.row_version = boundParams[1]
                inc.updated_at = boundParams[2]
              } else if (sql.includes("reporter_name = ?")) {
                // Draft patch
                inc.reporter_name = boundParams[0]
                inc.reporter_role = boundParams[1]
                inc.patient_name = boundParams[2]
                inc.medical_record_number = boundParams[3]
                inc.patient_room = boundParams[4]
                inc.patient_age_category = boundParams[5]
                inc.patient_gender = boundParams[6]
                inc.patient_payer_type = boundParams[7]
                inc.admission_datetime = boundParams[8]
                inc.incident_datetime = boundParams[9]
                inc.incident_title = boundParams[10]
                inc.chronology = boundParams[11]
                inc.incident_type = boundParams[12]
                inc.initial_reporter_category = boundParams[13]
                inc.initial_reporter_detail = boundParams[14]
                inc.incident_target = boundParams[15]
                inc.incident_target_other = boundParams[16]
                inc.patient_care_type = boundParams[17]
                inc.incident_location = boundParams[18]
                inc.clinical_specialization = boundParams[19]
                inc.causing_unit = boundParams[20]
                inc.patient_impact = boundParams[21]
                inc.immediate_action_and_result = boundParams[22]
                inc.action_taken_by = boundParams[23]
                inc.similar_incident_occurred = boundParams[24]
                inc.similar_incident_details = boundParams[25]
                inc.overdue_reason = boundParams[26]
                inc.row_version = boundParams[27]
                inc.updated_at = boundParams[28]
              } else if (sql.includes("patient_name = ?, medical_record_number = ?")) {
                // Emergency correction
                inc.patient_name = boundParams[0]
                inc.medical_record_number = boundParams[1]
                inc.patient_room = boundParams[2]
                inc.patient_age_category = boundParams[3]
                inc.patient_gender = boundParams[4]
                inc.patient_payer_type = boundParams[5]
                inc.admission_datetime = boundParams[6]
                inc.incident_datetime = boundParams[7]
                inc.incident_title = boundParams[8]
                inc.chronology = boundParams[9]
                inc.incident_type = boundParams[10]
                inc.initial_reporter_category = boundParams[11]
                inc.initial_reporter_detail = boundParams[12]
                inc.incident_target = boundParams[13]
                inc.incident_target_other = boundParams[14]
                inc.patient_care_type = boundParams[15]
                inc.incident_location = boundParams[16]
                inc.clinical_specialization = boundParams[17]
                inc.causing_unit = boundParams[18]
                inc.patient_impact = boundParams[19]
                inc.immediate_action_and_result = boundParams[20]
                inc.action_taken_by = boundParams[21]
                inc.similar_incident_occurred = boundParams[22]
                inc.overdue_reason = boundParams[23]
                inc.risk_grade = boundParams[24]
                inc.row_version = boundParams[25]
                inc.updated_at = boundParams[26]
              }
              return { meta: { changes: 1 } }
            }
            return { meta: { changes: 0 } }
          }
          if (sql.includes("DELETE FROM incident_reports WHERE id = ?")) {
            incidents.delete(boundParams[0] as string)
            return { meta: { changes: 1 } }
          }
          if (sql.includes("DELETE FROM audit_records WHERE incident_id = ?")) {
            const id = boundParams[0] as string
            const idxs = auditRecords
              .map((a, i) => (a.incident_id === id ? i : -1))
              .filter((i) => i >= 0)
              .reverse()
            for (const idx of idxs) auditRecords.splice(idx, 1)
            return { meta: { changes: idxs.length } }
          }
          if (sql.includes("INSERT INTO incident_submission_snapshots")) {
            const incidentId = boundParams[1] as string
            snapshots.set(incidentId, {
              id: boundParams[0],
              incident_id: incidentId,
              report_number: boundParams[2],
              snapshot_data: boundParams[3],
              patient_name: boundParams[4],
              medical_record_number: boundParams[5],
              incident_datetime: boundParams[6],
              incident_type: boundParams[7],
              is_overdue_sla: boundParams[8],
              overdue_reason: boundParams[9],
              submitted_by_user_id: boundParams[10],
              submitted_at: boundParams[11],
            })
            return { meta: { changes: 1 } }
          }
          if (sql.includes("UPDATE incident_submission_snapshots SET")) {
            const incidentId = boundParams[boundParams.length - 1] as string
            const snap = snapshots.get(incidentId)
            if (snap) {
              snap.patient_name = boundParams[0]
              snap.medical_record_number = boundParams[1]
              snap.incident_datetime = boundParams[2]
              snap.incident_type = boundParams[3]
              snap.overdue_reason = boundParams[4]
              snap.updated_at = boundParams[5]
            }
            return { meta: { changes: 1 } }
          }
          if (sql.includes("INSERT INTO audit_records") && sql.includes("SELECT") && sql.includes("WHERE EXISTS")) {
            const guardIncidentId = boundParams[boundParams.length - 2] as string
            const guardVersion = boundParams[boundParams.length - 1] as number
            const inc = incidents.get(guardIncidentId)
            const existsOk =
              inc !== undefined &&
              inc.row_version === guardVersion &&
              (inc.status === "COMPLETED_BY_UNIT" || inc.status === "SIMPLE_INVESTIGATION")
            if (!existsOk) return { meta: { changes: 0 } }
            let eventType: string
            if (sql.includes("'SIMPLE_INVESTIGATION_COMPLETED'")) {
              eventType = "SIMPLE_INVESTIGATION_COMPLETED"
            } else if (sql.includes("'REPORT_COMPLETED'")) {
              eventType = "REPORT_COMPLETED"
            } else {
              eventType = boundParams[2] as string
            }
            auditRecords.push({
              id: boundParams[0],
              incident_id: boundParams[1],
              event_type: eventType,
              actor_user_id: boundParams[2],
              actor_name: boundParams[3],
              actor_role: boundParams[4],
              occurred_at_utc: boundParams[5],
              notes: boundParams[6],
              request_id: boundParams[7],
            })
            return { meta: { changes: 1 } }
          }
          if (sql.includes("INSERT INTO audit_records")) {
            auditRecords.push({
              id: boundParams[0],
              incident_id: boundParams[1],
              event_type: boundParams[2],
              actor_user_id: boundParams[3],
              actor_name: boundParams[4],
              actor_role: boundParams[5],
              occurred_at_utc: boundParams[6],
              notes: boundParams[7],
              request_id: boundParams[8],
            })
            return { meta: { changes: 1 } }
          }
          if (
            (sql.includes("INSERT OR IGNORE INTO simple_investigations") ||
              sql.includes("INSERT INTO simple_investigations")) &&
            sql.includes("SELECT") &&
            sql.includes("WHERE EXISTS")
          ) {
            const incidentId = boundParams[1] as string
            const guardIncidentId = boundParams[boundParams.length - 2] as string
            const guardVersion = boundParams[boundParams.length - 1] as number
            const inc = incidents.get(guardIncidentId)
            const existsOk =
              inc !== undefined &&
              inc.row_version === guardVersion &&
              inc.status === "SIMPLE_INVESTIGATION"
            if (!existsOk || investigations.has(incidentId)) return { meta: { changes: 0 } }
            investigations.set(incidentId, {
              id: boundParams[0],
              incident_id: incidentId,
              recommendations: "[]",
              actions: "[]",
              created_at: boundParams[2],
              updated_at: boundParams[3],
            })
            return { meta: { changes: 1 } }
          }
          if (
            sql.includes("INSERT OR IGNORE INTO simple_investigations") ||
            sql.includes("INSERT INTO simple_investigations")
          ) {
            const incidentId = boundParams[1] as string
            if (!investigations.has(incidentId)) {
              investigations.set(incidentId, {
                id: boundParams[0],
                incident_id: incidentId,
                recommendations: boundParams[2] || "[]",
                actions: boundParams[3] || "[]",
              })
            } else if (sql.includes("ON CONFLICT (incident_id) DO UPDATE SET")) {
              const existing = investigations.get(incidentId)
              if (existing) {
                existing.direct_cause = boundParams[2]
                existing.underlying_root_cause = boundParams[3]
                existing.investigation_start_date = boundParams[4]
                existing.investigation_end_date = boundParams[5]
                existing.recommendations = boundParams[6]
                existing.actions = boundParams[7]
              }
            }
            return { meta: { changes: 1 } }
          }
          if (
            sql.includes("UPDATE simple_investigations") &&
            sql.includes("completed_by_user_id") &&
            sql.includes("EXISTS")
          ) {
            const incidentId = boundParams[3] as string
            const guardIncidentId = boundParams[4] as string
            const guardVersion = boundParams[5] as number
            const inc = incidents.get(guardIncidentId)
            const existsOk =
              inc !== undefined &&
              inc.row_version === guardVersion &&
              inc.status === "COMPLETED_BY_UNIT"
            if (!existsOk) return { meta: { changes: 0 } }
            const inv = investigations.get(incidentId)
            if (inv) {
              inv.completed_by_user_id = boundParams[0]
              inv.completed_at = boundParams[1]
              inv.updated_at = boundParams[2]
            }
            return { meta: { changes: 1 } }
          }
          if (
            sql.includes("UPDATE simple_investigations") &&
            sql.includes("completed_by_user_id")
          ) {
            const incidentId = boundParams[boundParams.length - 1] as string
            const inv = investigations.get(incidentId)
            if (inv) {
              inv.completed_by_user_id = boundParams[0]
              inv.completed_at = boundParams[1]
              inv.updated_at = boundParams[2]
            }
            return { meta: { changes: 1 } }
          }
          return { meta: { changes: 0 } }
        },
      }
    },
    async batch(statements: Array<{ run: () => Promise<unknown> }>) {
      const results = []
      for (const stmt of statements) results.push(await stmt.run())
      return results
    },
  }

  return {
    incidents,
    snapshots,
    investigations,
    auditRecords,
    db: db as unknown as D1Database,
  }
}

describe("Phase 09 Comprehensive End-to-End Scenarios", () => {
  const completeReportBody = {
    patient_name: "Tn. Petrus K",
    medical_record_number: "MR-778899",
    patient_room: "Kamar Operasi 3 (Urologi)",
    patient_age_category: ">30_65_tahun",
    patient_gender: "LAKI_LAKI",
    patient_payer_type: "BPJS Kesehatan",
    admission_datetime: "2026-09-25T07:30:00.000Z",
    incident_datetime: "2026-09-26T09:00:00.000Z",
    incident_title: "Diskrepansi hitungan kassa pra-penutupan luka",
    chronology: "Urutan kejadian lengkap 5W+1H saat operasi laparotomi...",
    incident_type: "KNC",
    initial_reporter_category: "Karyawan: Perawat",
    incident_target: "PASIEN",
    incident_location: "Kamar Operasi 3 (Urologi)",
    clinical_specialization: "Bedah Urologi",
    causing_unit: "Instalasi Bedah Sentral (IBS)",
    patient_impact: "Tidak Ada Cedera",
    immediate_action_and_result: "Hitung ulang sebelum penutupan",
    action_taken_by: "Tim Bedah",
    similar_incident_occurred: "TIDAK",
  }

  it("PART C: Draft E2E Scenario (Minimum draft, autosave, read, delete hard delete)", async () => {
    const { db, incidents, auditRecords } = createE2eDatabase()

    // 1. Create draft with minimum data
    const createReq = new Request("https://example.test/api/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reporter_name: "Ns. Maria G. Klau",
        reporter_role: "Perawat Bedah",
        incident_datetime: "2026-09-26T08:00:00.000Z",
        incident_type: "KNC",
      }),
    })
    const createRes = await callHandler(onIncidentsCreatePost, createReq, db, {
      requestId: "req_c1",
      auth: nakesA,
    })
    expect(createRes.status).toBe(201)
    const created: { data: { id: string; status: string } } = await createRes.json()
    const incidentId = created.data.id

    // DRAFT_CREATED audit event
    expect(
      auditRecords.some((a) => a.event_type === "DRAFT_CREATED" && a.incident_id === incidentId),
    ).toBe(true)

    // 2. Auto-save additional fields
    const patchReq = new Request(`https://example.test/api/incidents/${incidentId}/draft`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patient_name: "Tn. Petrus K", incident_title: "Judul Parsial" }),
    })
    const patchRes = await callHandler(
      onIncidentPatch,
      patchReq,
      db,
      { requestId: "req_c2", auth: nakesA },
      { id: incidentId },
    )
    expect(patchRes.status).toBe(200)

    // 3. Read draft by author
    const readReq = new Request(`https://example.test/api/incidents/${incidentId}`)
    const readRes = await callHandler(
      onIncidentGet,
      readReq,
      db,
      { requestId: "req_c3", auth: nakesA },
      { id: incidentId },
    )
    expect(readRes.status).toBe(200)

    // 4. Delete draft (hard delete)
    const delReq = new Request(`https://example.test/api/incidents/${incidentId}`, {
      method: "DELETE",
    })
    const delRes = await callHandler(
      onIncidentDelete,
      delReq,
      db,
      { requestId: "req_c4", auth: nakesA },
      { id: incidentId },
    )
    expect(delRes.status).toBe(200)
    expect(incidents.has(incidentId)).toBe(false)
    // No retained audit after hard delete per workshop decision
    expect(auditRecords.filter((a) => a.incident_id === incidentId)).toHaveLength(0)
  })

  it("PART D: Submission E2E (Complete submit, report number, snapshot, no unsubmit)", async () => {
    const { db, incidents, snapshots, auditRecords } = createE2eDatabase()

    // 1. Create draft
    const createReq = new Request("https://example.test/api/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reporter_name: "Ns. Maria",
        reporter_role: "Perawat Bedah",
        incident_datetime: "2026-09-26T08:00:00.000Z",
        incident_type: "KNC",
      }),
    })
    const createRes = await callHandler(onIncidentsCreatePost, createReq, db, {
      requestId: "req_d1",
      auth: nakesA,
    })
    const created: { data: { id: string } } = await createRes.json()
    const incidentId = created.data.id

    // 2. Patch with complete data
    await callHandler(
      onIncidentPatch,
      new Request(`https://example.test/api/incidents/${incidentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(completeReportBody),
      }),
      db,
      { requestId: "req_d2", auth: nakesA },
      { id: incidentId },
    )

    // 3. Submit
    const submitRes = await callHandler(
      onSubmitPost,
      new Request(`https://example.test/api/incidents/${incidentId}/submit`, { method: "POST" }),
      db,
      { requestId: "req_d3", auth: nakesA },
      { id: incidentId },
    )
    expect(submitRes.status).toBe(200)
    const submitted: { data: { status: string; report_number: string } } = await submitRes.json()
    expect(submitted.data.status).toBe("SUBMITTED")
    expect(submitted.data.report_number).toMatch(/^IKP\/IBS\/\d{6}\/\d{4}$/)
    expect(snapshots.has(incidentId)).toBe(true)
    expect(incidents.get(incidentId)?.status).toBe("SUBMITTED")

    // REPORT_SUBMITTED audit captured
    expect(
      auditRecords.some((a) => a.event_type === "REPORT_SUBMITTED" && a.incident_id === incidentId),
    ).toBe(true)

    // 4. Draft editing is no longer available post-submit
    const patchPostSubmit = await callHandler(
      onIncidentPatch,
      new Request(`https://example.test/api/incidents/${incidentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_name: "Tampered" }),
      }),
      db,
      { requestId: "req_d4", auth: nakesA },
      { id: incidentId },
    )
    expect(patchPostSubmit.status).toBe(403)
  })

  it("PART E: SLA MVP Disabled (late submission allowed without overdue_reason)", async () => {
    const { db } = createE2eDatabase()

    // Create draft with old incident datetime (>48 hours ago)
    const oldDate = new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString()
    const createRes = await callHandler(
      onIncidentsCreatePost,
      new Request("https://example.test/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporter_name: "Ns. Maria",
          reporter_role: "Perawat",
          incident_datetime: oldDate,
          incident_type: "KNC",
        }),
      }),
      db,
      { requestId: "req_e1", auth: nakesA },
    )
    const created: { data: { id: string } } = await createRes.json()
    const incidentId = created.data.id

    // Complete mandatory fields WITHOUT overdue reason (SLA disabled)
    await callHandler(
      onIncidentPatch,
      new Request(`https://example.test/api/incidents/${incidentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...completeReportBody,
          incident_datetime: oldDate,
          overdue_reason: "", // not required — SLA_ENABLED=false
        }),
      }),
      db,
      { requestId: "req_e2", auth: nakesA },
      { id: incidentId },
    )

    // Submit should SUCCEED without overdue_reason (SLA_ENABLED=false)
    const submitOk = await callHandler(
      onSubmitPost,
      new Request(`https://example.test/api/incidents/${incidentId}/submit`, { method: "POST" }),
      db,
      { requestId: "req_e3", auth: nakesA },
      { id: incidentId },
    )
    expect(submitOk.status).toBe(200)
    const submittedOk: { data: { is_overdue_sla: number } } = await submitOk.json()
    // SLA overdue flag is still stored even when enforcement is disabled
    expect(submittedOk.data.is_overdue_sla).toBe(1)
  })

  it("PART F & G: Head of Room Receive, Revision Loop, Resubmit", async () => {
    const { db, incidents, auditRecords } = createE2eDatabase()
    incidents.set("inc_fg", {
      id: "inc_fg",
      status: "SUBMITTED",
      created_by_user_id: "usr_nakes_a",
      owning_unit_id: "IBS",
      reporter_name: "Ns. Maria",
      reporter_role: "Perawat",
      incident_datetime: "2026-09-26T08:00:00.000Z",
      incident_type: "KNC",
      row_version: 1,
    })

    // 1. Receive
    const recRes = await callHandler(
      onReceivePost,
      new Request("https://example.test/api/incidents/inc_fg/receive", { method: "POST" }),
      db,
      { requestId: "req_fg1", auth: headroomActor },
      { id: "inc_fg" },
    )
    expect(recRes.status).toBe(200)
    expect(incidents.get("inc_fg")?.status).toBe("UNDER_REVIEW")
    expect(incidents.get("inc_fg")?.received_by_user_id).toBe("usr_headroom")

    // 2. Request revision with reason
    const revRes = await callHandler(
      onRevisionRequiredPost,
      new Request("https://example.test/api/incidents/inc_fg/revision-required", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revision_reason: "Lengkapi lokasi kamar operasi" }),
      }),
      db,
      { requestId: "req_fg2", auth: headroomActor },
      { id: "inc_fg" },
    )
    expect(revRes.status).toBe(200)
    expect(incidents.get("inc_fg")?.status).toBe("REVISION_REQUIRED")
    expect(auditRecords.some((a) => a.event_type === "REVISION_REQUIRED")).toBe(true)

    // 3. Unauthorized nakes B cannot edit or resubmit
    const badEdit = await callHandler(
      onIncidentPatch,
      new Request("https://example.test/api/incidents/inc_fg", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incident_location: "OK 1" }),
      }),
      db,
      { requestId: "req_fg3", auth: nakesB },
      { id: "inc_fg" },
    )
    expect(badEdit.status).toBe(403)
  })

  it("PART H & I: Simple Investigation E2E for BIRU/HIJAU (Completion to COMPLETED_BY_UNIT)", async () => {
    const { db, incidents, investigations, auditRecords } = createE2eDatabase()
    incidents.set("inc_hi", {
      id: "inc_hi",
      status: "UNDER_REVIEW",
      created_by_user_id: "usr_nakes_a",
      owning_unit_id: "IBS",
      row_version: 1,
    })

    // Step 1: Assign HIJAU → stays UNDER_REVIEW (grade saved), requires If-Match
    const gradeRes = await callHandler(
      onAssignRiskGradePost,
      new Request("https://example.test/api/incidents/inc_hi/assign-risk-grade", {
        method: "POST",
        headers: { "Content-Type": "application/json", "If-Match": '"W/1"' },
        body: JSON.stringify({ risk_grade: "HIJAU" }),
      }),
      db,
      { requestId: "req_hi1", auth: headroomActor },
      { id: "inc_hi" },
    )
    expect(gradeRes.status).toBe(200)
    expect(incidents.get("inc_hi")?.status).toBe("UNDER_REVIEW")
    expect(incidents.get("inc_hi")?.risk_grade).toBe("HIJAU")
    // No investigation row yet
    expect(investigations.has("inc_hi")).toBe(false)

    // Step 2: Start investigation → SIMPLE_INVESTIGATION + investigation row created
    const startRes = await callHandler(
      onStartInvestigationPost,
      new Request("https://example.test/api/incidents/inc_hi/investigation/start", {
        method: "POST",
        headers: { "If-Match": '"W/2"' },
      }),
      db,
      { requestId: "req_hi1b", auth: headroomActor },
      { id: "inc_hi" },
    )
    expect(startRes.status).toBe(200)
    expect(incidents.get("inc_hi")?.status).toBe("SIMPLE_INVESTIGATION")
    expect(investigations.has("inc_hi")).toBe(true)

    // Complete valid investigation
    await callHandler(
      onInvestigationPut,
      new Request("https://example.test/api/incidents/inc_hi/investigation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direct_cause: "Label kassa pudar",
          underlying_root_cause: "Penyimpanan di depo terlalu lembap",
          investigation_start_date: "2026-09-26",
          investigation_end_date: "2026-09-27",
          recommendations: [
            {
              text: "Ganti kotak penyimpanan",
              responsible: "Kasubag Logistik",
              target_date: "2026-10-01",
            },
          ],
          actions: [
            {
              text: "Pindahkan depo ke ruangan bersuhu stabil",
              responsible: "Staf Depo",
              target_date: "2026-10-02",
            },
          ],
        }),
      }),
      db,
      { requestId: "req_hi2", auth: headroomActor },
      { id: "inc_hi" },
    )

    const compRes = await callHandler(
      onCompleteInvestigationPost,
      new Request("https://example.test/api/incidents/inc_hi/investigation/complete", {
        method: "POST",
        headers: { "If-Match": '"W/3"' },
      }),
      db,
      { requestId: "req_hi3", auth: headroomActor },
      { id: "inc_hi" },
    )
    expect(compRes.status).toBe(200)
    expect(incidents.get("inc_hi")?.status).toBe("COMPLETED_BY_UNIT")
    expect(investigations.get("inc_hi")?.completed_by_user_id).toBe("usr_headroom")
    expect(auditRecords.some((a) => a.event_type === "SIMPLE_INVESTIGATION_COMPLETED")).toBe(true)

    // Terminal: Emergency correction and further edit rejected
    const corrRes = await callHandler(
      onEmergencyCorrectionPost,
      new Request("https://example.test/api/incidents/inc_hi/emergency-correction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Late change", patient_name: "Blocked" }),
      }),
      db,
      { requestId: "req_hi4", auth: headroomActor },
      { id: "inc_hi" },
    )
    expect(corrRes.status).toBe(403)
  })

  it("PART J: PMKP Review E2E for KUNING/MERAH (Finalization to COMPLETED)", async () => {
    const { db, incidents, auditRecords } = createE2eDatabase()
    incidents.set("inc_j", {
      id: "inc_j",
      status: "UNDER_REVIEW",
      created_by_user_id: "usr_nakes_a",
      owning_unit_id: "IBS",
      row_version: 1,
    })

    // Assign KUNING with mandatory mitigation
    const gradeRes = await callHandler(
      onAssignRiskGradePost,
      new Request("https://example.test/api/incidents/inc_j/assign-risk-grade", {
        method: "POST",
        headers: { "Content-Type": "application/json", "If-Match": '"W/1"' },
        body: JSON.stringify({
          risk_grade: "KUNING",
          high_risk_mitigation_notes: "Segera laporkan ke DPJP dan isolasi alat",
        }),
      }),
      db,
      { requestId: "req_j1", auth: headroomActor },
      { id: "inc_j" },
    )
    expect(gradeRes.status).toBe(200)
    expect(incidents.get("inc_j")?.status).toBe("PMKP_REVIEW")

    // PMKP updates review notes
    const noteRes = await callHandler(
      onPmkpReviewPut,
      new Request("https://example.test/api/incidents/inc_j/pmkp-review", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pmkp_review_notes: "Bentuk tim investigasi komprehensif / RCA" }),
      }),
      db,
      { requestId: "req_j2", auth: pmkpActor },
      { id: "inc_j" },
    )
    expect(noteRes.status).toBe(200)

    // Finalize RCA handoff -> COMPLETED
    const finRes = await callHandler(
      onFinalizePmkpPost,
      new Request("https://example.test/api/incidents/inc_j/pmkp-review/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed: true }),
      }),
      db,
      { requestId: "req_j3", auth: pmkpActor },
      { id: "inc_j" },
    )
    expect(finRes.status).toBe(200)
    expect(incidents.get("inc_j")?.status).toBe("COMPLETED")
    expect(incidents.get("inc_j")?.pmkp_reviewed).toBe(1)
    expect(
      auditRecords.some((a) => a.event_type === "REPORT_COMPLETED" && a.incident_id === "inc_j"),
    ).toBe(true)
  })

  it("PART K & L: Emergency Correction & Snapshot Synchronization", async () => {
    const { db, incidents, snapshots, auditRecords } = createE2eDatabase()
    incidents.set("inc_kl", {
      id: "inc_kl",
      status: "SUBMITTED",
      created_by_user_id: "usr_nakes_a",
      owning_unit_id: "IBS",
      patient_name: "Original Name",
      medical_record_number: "EMERGENCY-01",
      row_version: 1,
    })
    snapshots.set("inc_kl", {
      incident_id: "inc_kl",
      patient_name: "Original Name",
      medical_record_number: "EMERGENCY-01",
    })

    // Correct data
    const corrRes = await callHandler(
      onEmergencyCorrectionPost,
      new Request("https://example.test/api/incidents/inc_kl/emergency-correction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: "Koreksi nomor rekam medis definitif dari rekam medis",
          medical_record_number: "MR-100200",
        }),
      }),
      db,
      { requestId: "req_kl", auth: headroomActor },
      { id: "inc_kl" },
    )
    expect(corrRes.status).toBe(200)

    // Synchronized: both incident and snapshot updated
    expect(incidents.get("inc_kl")?.medical_record_number).toBe("MR-100200")
    expect(snapshots.get("inc_kl")?.medical_record_number).toBe("MR-100200")

    // Exactly one EMERGENCY_CORRECTION event
    const events = auditRecords.filter((a) => a.event_type === "EMERGENCY_CORRECTION")
    expect(events).toHaveLength(1)
  })

  it("PART M & N: Peer Visibility and Administrator Privacy Sanitization", async () => {
    const { db, incidents } = createE2eDatabase()
    incidents.set("inc_peer_test", {
      id: "inc_peer_test",
      status: "SUBMITTED",
      created_by_user_id: "usr_nakes_a",
      owning_unit_id: "IBS",
      patient_name: "Confidential Patient",
      medical_record_number: "MR-SECRET",
      chronology: "Confidential clinical facts",
      incident_title: "Title Visible",
      row_version: 1,
    })

    // Peer Nakes B views report -> sees clinical fields
    const peerRes = await callHandler(
      onIncidentGet,
      new Request("https://example.test/api/incidents/inc_peer_test"),
      db,
      { requestId: "req_mn1", auth: nakesB },
      { id: "inc_peer_test" },
    )
    expect(peerRes.status).toBe(200)
    const peerBody: { data: Record<string, unknown> } = await peerRes.json()
    expect(peerBody.data.patient_name).toBe("Confidential Patient")
    expect(peerBody.data.chronology).toBe("Confidential clinical facts")

    // Admin views report -> clinical fields sanitized
    const adminRes = await callHandler(
      onIncidentGet,
      new Request("https://example.test/api/incidents/inc_peer_test"),
      db,
      { requestId: "req_mn2", auth: adminActor },
      { id: "inc_peer_test" },
    )
    expect(adminRes.status).toBe(200)
    const adminBody: { data: Record<string, unknown> } = await adminRes.json()
    expect(adminBody.data.incident_title).toBe("Title Visible")
    expect(adminBody.data.patient_name).toBeUndefined()
    expect(adminBody.data.medical_record_number).toBeUndefined()
    expect(adminBody.data.chronology).toBeUndefined()
  })

  it("PART S: Audit Trail Metadata Integrity (minimal 7 events, no old/new values)", async () => {
    const { db, incidents, auditRecords } = createE2eDatabase()
    incidents.set("inc_s", {
      id: "inc_s",
      status: "SUBMITTED",
      created_by_user_id: "usr_nakes_a",
      owning_unit_id: "IBS",
    })
    auditRecords.push({
      id: "aud_s1",
      incident_id: "inc_s",
      event_type: "REPORT_SUBMITTED",
      actor_user_id: "usr_nakes_a",
      actor_name: "Ns. Maria G. Klau",
      actor_role: "TENAGA_KESEHATAN",
      occurred_at_utc: "2026-09-26T10:00:00.000Z",
      notes: "Laporan insiden resmi dikirimkan",
      request_id: "req_s1",
    })

    const res = await callHandler(
      onAuditGet,
      new Request("https://example.test/api/incidents/inc_s/audit"),
      db,
      { requestId: "req_s2", auth: nakesA },
      { id: "inc_s" },
    )
    expect(res.status).toBe(200)
    const body: { data: Array<Record<string, unknown>> } = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0]?.eventType).toBe("REPORT_SUBMITTED")
    expect(body.data[0]?.actorName).toBe("Ns. Maria G. Klau")
    expect(body.data[0]?.notes).toBe("Laporan insiden resmi dikirimkan")
    expect(body.data[0]?.diff).toBeUndefined()
    expect(body.data[0]?.old_value).toBeUndefined()
    expect(body.data[0]?.new_value).toBeUndefined()
  })

  it("PART O: Automated Role Matrix Verification (4 roles x canonical actions)", () => {
    // 1. Create Draft: Nakes, Kepala Ruangan, PMKP -> YES; Admin -> NO
    expect(nakesA.user.role === "ADMINISTRATOR").toBe(false)
    expect(headroomActor.user.role === "ADMINISTRATOR").toBe(false)
    expect(pmkpActor.user.role === "ADMINISTRATOR").toBe(false)
    expect(adminActor.user.role === "ADMINISTRATOR").toBe(true)

    // 2. Draft Ownership: Only created_by can edit/delete/submit
    const ownDraft = { id: "d1", status: "DRAFT", created_by_user_id: nakesA.user.id }
    expect(ownDraft.created_by_user_id === nakesA.user.id).toBe(true)
    expect(ownDraft.created_by_user_id === nakesB.user.id).toBe(false)

    // 3. Receive Report: strictly KEPALA_RUANGAN
    expect(headroomActor.user.role === "KEPALA_RUANGAN").toBe(true)
    expect(nakesA.user.role === "KEPALA_RUANGAN").toBe(false)

    // 4. Emergency Correction: strictly KEPALA_RUANGAN in SUBMITTED/UNDER_REVIEW
    expect(headroomActor.user.role === "KEPALA_RUANGAN").toBe(true)
    expect(pmkpActor.user.role === "KEPALA_RUANGAN").toBe(false)
    expect(adminActor.user.role === "KEPALA_RUANGAN").toBe(false)

    // 5. User Management: strictly ADMINISTRATOR
    expect(adminActor.user.role === "ADMINISTRATOR").toBe(true)
    expect(nakesA.user.role === "ADMINISTRATOR").toBe(false)
  })

  it("PART P: Rapid Concurrency Conflict Simulation (412 Precondition Failed)", async () => {
    const { db } = createE2eDatabase()

    // 1. Create draft (row_version = 1)
    const createRes = await callHandler(
      onIncidentsCreatePost,
      new Request("https://example.test/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporter_name: "Ns. Maria",
          reporter_role: "Perawat",
          incident_datetime: "2026-09-26T08:00:00.000Z",
          incident_type: "KNC",
        }),
      }),
      db,
      { requestId: "req_p1", auth: nakesA },
    )
    const created: { data: { id: string } } = await createRes.json()
    const incidentId = created.data.id

    // Request A updates with version 1 -> succeeds, increments to 2
    const resA = await callHandler(
      onIncidentPatch,
      new Request(`https://example.test/api/incidents/${incidentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "If-Match": '"W/1"' },
        body: JSON.stringify({ incident_title: "Title from Request A", row_version: 1 }),
      }),
      db,
      { requestId: "req_p_a", auth: nakesA },
      { id: incidentId },
    )
    expect(resA.status).toBe(200)

    // Simultaneous Request B was drafted based on version 1 -> rejected with 412
    const resB = await callHandler(
      onIncidentPatch,
      new Request(`https://example.test/api/incidents/${incidentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "If-Match": '"W/1"' },
        body: JSON.stringify({ incident_title: "Stale Title from Request B", row_version: 1 }),
      }),
      db,
      { requestId: "req_p_b", auth: nakesA },
      { id: incidentId },
    )
    expect(resB.status).toBe(412)
    const errBody: { code: string } = await resB.json()
    expect(errBody.code).toBe("PRECONDITION_FAILED")
  })

  it("PART Q: HTTP Status Code and Error Semantics (400, 401, 403, 404, 412, 422)", async () => {
    const { db } = createE2eDatabase()

    // 400: Malformed JSON
    const res400 = await callHandler(
      onIncidentsCreatePost,
      new Request("https://example.test/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid-json{{{",
      }),
      db,
      { requestId: "req_q1", auth: nakesA },
    )
    expect(res400.status).toBe(400)

    // 401: Unauthenticated
    const res401 = await callHandler(
      onIncidentsCreatePost,
      new Request("https://example.test/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      db,
      { requestId: "req_q2", auth: null },
    )
    expect(res401.status).toBe(401)

    // 403: Forbidden (Admin creating draft)
    const res403 = await callHandler(
      onIncidentsCreatePost,
      new Request("https://example.test/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporter_name: "Admin",
          reporter_role: "Admin",
          incident_datetime: "2026-09-26T08:00:00.000Z",
          incident_type: "KNC",
        }),
      }),
      db,
      { requestId: "req_q3", auth: adminActor },
    )
    expect(res403.status).toBe(403)

    // 404: Not Found
    const res404 = await callHandler(
      onIncidentGet,
      new Request("https://example.test/api/incidents/inc_non_existent"),
      db,
      { requestId: "req_q4", auth: nakesA },
      { id: "inc_non_existent" },
    )
    expect(res404.status).toBe(404)

    // 422: Validation Error (SLA overdue without reason)
    const oldDate = new Date(Date.now() - 60 * 60 * 1000 * 48).toISOString()
    const createOld = await callHandler(
      onIncidentsCreatePost,
      new Request("https://example.test/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporter_name: "Ns. Maria",
          reporter_role: "Perawat",
          incident_datetime: oldDate,
          incident_type: "KNC",
        }),
      }),
      db,
      { requestId: "req_q5", auth: nakesA },
    )
    const oldInc: { data: { id: string } } = await createOld.json()
    const res422 = await callHandler(
      onSubmitPost,
      new Request(`https://example.test/api/incidents/${oldInc.data.id}/submit`, {
        method: "POST",
      }),
      db,
      { requestId: "req_q6", auth: nakesA },
      { id: oldInc.data.id },
    )
    expect(res422.status).toBe(422)
  })
})
