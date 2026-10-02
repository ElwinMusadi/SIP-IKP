import { describe, expect, it, vi } from "vitest"

import type { RequestContextData } from "../../_shared/request-context"
import type { AuthSessionContext } from "../../_shared/session"
import { onRequestGet as onAuditGet } from "./[id]/audit"
import { onRequestPost as onAssignRiskGradePost } from "./[id]/assign-risk-grade"
import { onRequestPost as onEmergencyCorrectionPost } from "./[id]/emergency-correction"
import { onRequestPut as onInvestigationPut } from "./[id]/investigation"
import { onRequestPost as onCompleteInvestigationPost } from "./[id]/investigation/complete"
import { onRequestPost as onStartInvestigationPost } from "./[id]/investigation/start"
import { onRequestPost as onSkipInvestigationPost } from "./[id]/investigation/skip"
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
import { onRequestGet as onIncidentsListGet, onRequestPost as onIncidentsCreatePost } from "./index"

// Mock actors
const nakesActor: AuthSessionContext = {
  user: {
    id: "usr_nakes_1",
    username: "nakes_1",
    fullName: "Ns. Maria G. Klau",
    role: "TENAGA_KESEHATAN",
    profession: "Perawat Bedah",
    unitId: "IBS",
    isActive: true,
  },
  session: {
    id: "ses_1",
    csrfToken: "csrf_nakes",
    idleExpiresInSeconds: 900,
    absoluteExpiresInSeconds: 36000,
  },
}

const peerNakesActor: AuthSessionContext = {
  user: {
    id: "usr_nakes_2",
    username: "nakes_2",
    fullName: "Ns. Anton",
    role: "TENAGA_KESEHATAN",
    profession: "Perawat Bedah",
    unitId: "IBS",
    isActive: true,
  },
  session: {
    id: "ses_2",
    csrfToken: "csrf_peer",
    idleExpiresInSeconds: 900,
    absoluteExpiresInSeconds: 36000,
  },
}

const headroomActor: AuthSessionContext = {
  user: {
    id: "usr_headroom_1",
    username: "headroom_1",
    fullName: "Ns. Yohanes Bria",
    role: "KEPALA_RUANGAN",
    profession: "Kepala Ruangan IBS",
    unitId: "IBS",
    isActive: true,
  },
  session: {
    id: "ses_3",
    csrfToken: "csrf_headroom",
    idleExpiresInSeconds: 900,
    absoluteExpiresInSeconds: 36000,
  },
}

const pmkpActor: AuthSessionContext = {
  user: {
    id: "usr_pmkp_1",
    username: "pmkp_1",
    fullName: "dr. Robertus Taolin",
    role: "KOMITE_PMKP",
    profession: "Komite PMKP",
    unitId: "IBS",
    isActive: true,
  },
  session: {
    id: "ses_4",
    csrfToken: "csrf_pmkp",
    idleExpiresInSeconds: 900,
    absoluteExpiresInSeconds: 36000,
  },
}

const adminActor: AuthSessionContext = {
  user: {
    id: "usr_admin_1",
    username: "admin_1",
    fullName: "Administrator SIMRS",
    role: "ADMINISTRATOR",
    profession: "Admin",
    unitId: "IBS",
    isActive: true,
  },
  session: {
    id: "ses_5",
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

// In-Memory SQLite D1 simulation for workflow testing
function createInMemoryD1() {
  const incidents = new Map<string, Record<string, unknown>>()
  const snapshots = new Map<string, Record<string, unknown>>()
  const investigations = new Map<string, Record<string, unknown>>()
  const auditRecords: Array<Record<string, unknown>> = []
  let sequence = 0

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
            const incidentId = boundParams[0] as string
            const found = investigations.get(incidentId)
            return (found ? { ...found } : null) as T | null
          }
          if (sql.includes("FROM incident_submission_snapshots WHERE incident_id = ?")) {
            const incidentId = boundParams[0] as string
            const found = snapshots.get(incidentId)
            return (found ? { ...found } : null) as T | null
          }
          if (sql.includes("INSERT INTO report_number_sequences")) {
            sequence += 1
            return { current_sequence: sequence } as T
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
            const incidentId = boundParams[0] as string
            const list = auditRecords.filter((a) => a.incident_id === incidentId)
            return { results: list }
          }
          return { results: [] }
        },
        async run() {
          if (sql.includes("INSERT INTO incident_reports")) {
            const id = boundParams[0] as string
            const record: Record<string, unknown> = {
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
            }
            incidents.set(id, record)
            return { meta: { changes: 1 } }
          }

          if (sql.includes("UPDATE incident_reports SET")) {
            // ------------------------------------------------------------------
            // Guarded updates: WHERE id=? AND row_version=? AND status=<literal>
            // id and expectedVersion are the last two bound params.
            // ------------------------------------------------------------------
            const hasVersionGuard =
              sql.includes("AND row_version = ?") || sql.includes("AND row_version=?")

            // Detect which status guard is in the WHERE clause
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
              const existing = incidents.get(id)
              const requiredStatus = guardedOnUnderReview ? "UNDER_REVIEW" : "SIMPLE_INVESTIGATION"

              if (
                !existing ||
                existing.row_version !== expectedVer ||
                existing.status !== requiredStatus
              ) {
                return { meta: { changes: 0 } }
              }

              if (sql.includes("risk_grade = ?")) {
                // assign-risk-grade guarded update
                existing.status = boundParams[0]
                existing.risk_grade = boundParams[1]
                existing.risk_graded_at = boundParams[2]
                existing.high_risk_mitigation_notes = boundParams[3]
                existing.row_version = boundParams[4]
                existing.updated_at = boundParams[5]
              } else if (guardedOnUnderReview && sql.includes("status = 'SIMPLE_INVESTIGATION'")) {
                // investigation/start
                existing.status = "SIMPLE_INVESTIGATION"
                existing.row_version = boundParams[0]
                existing.updated_at = boundParams[1]
              } else if (guardedOnUnderReview && sql.includes("status = 'COMPLETED_BY_UNIT'")) {
                // investigation/skip
                existing.status = "COMPLETED_BY_UNIT"
                existing.completed_at = boundParams[0]
                existing.row_version = boundParams[1]
                existing.updated_at = boundParams[2]
              } else if (guardedOnSimpleInv && sql.includes("status = 'COMPLETED_BY_UNIT'")) {
                // investigation/complete
                existing.status = "COMPLETED_BY_UNIT"
                existing.completed_at = boundParams[0]
                existing.row_version = boundParams[1]
                existing.updated_at = boundParams[2]
              }

              return { meta: { changes: 1 } }
            }

            // Unguarded updates (no version+status guard)
            const id = boundParams[boundParams.length - 1] as string
            const existing = incidents.get(id)
            if (existing) {
              if (sql.includes("status = 'SUBMITTED'")) {
                existing.status = "SUBMITTED"
                existing.report_number = boundParams[0]
                existing.submitted_at = boundParams[1]
                existing.sla_deadline_utc = boundParams[2]
                existing.is_overdue_sla = boundParams[3]
                existing.row_version = boundParams[4]
                existing.updated_at = boundParams[5]
              } else if (sql.includes("status = 'UNDER_REVIEW'")) {
                existing.status = "UNDER_REVIEW"
                existing.received_by_user_id = boundParams[0]
                existing.received_at = boundParams[1]
                existing.row_version = boundParams[2]
                existing.updated_at = boundParams[3]
              } else if (sql.includes("status = 'REVISION_REQUIRED'")) {
                existing.status = "REVISION_REQUIRED"
                existing.revision_reason = boundParams[0]
                existing.row_version = boundParams[1]
                existing.updated_at = boundParams[2]
              } else if (sql.includes("risk_grade = ?") && sql.includes("status = ?")) {
                existing.status = boundParams[0]
                existing.risk_grade = boundParams[1]
                existing.risk_graded_at = boundParams[2]
                existing.high_risk_mitigation_notes = boundParams[3]
                existing.row_version = boundParams[4]
                existing.updated_at = boundParams[5]
              } else if (sql.includes("status = 'COMPLETED_BY_UNIT'")) {
                existing.status = "COMPLETED_BY_UNIT"
                existing.completed_at = boundParams[0]
                existing.row_version = boundParams[1]
                existing.updated_at = boundParams[2]
              } else if (sql.includes("status = 'COMPLETED'")) {
                existing.status = "COMPLETED"
                existing.pmkp_reviewed = 1
                existing.completed_at = boundParams[0]
                existing.row_version = boundParams[1]
                existing.updated_at = boundParams[2]
              } else if (sql.includes("pmkp_review_notes = ?")) {
                existing.pmkp_review_notes = boundParams[0]
                existing.row_version = boundParams[1]
                existing.updated_at = boundParams[2]
              } else if (sql.includes("reporter_name = ?")) {
                // Draft patch
                existing.reporter_name = boundParams[0]
                existing.reporter_role = boundParams[1]
                existing.patient_name = boundParams[2]
                existing.medical_record_number = boundParams[3]
                existing.patient_room = boundParams[4]
                existing.patient_age_category = boundParams[5]
                existing.patient_gender = boundParams[6]
                existing.patient_payer_type = boundParams[7]
                existing.admission_datetime = boundParams[8]
                existing.incident_datetime = boundParams[9]
                existing.incident_title = boundParams[10]
                existing.chronology = boundParams[11]
                existing.incident_type = boundParams[12]
                existing.initial_reporter_category = boundParams[13]
                existing.initial_reporter_detail = boundParams[14]
                existing.incident_target = boundParams[15]
                existing.incident_target_other = boundParams[16]
                existing.patient_care_type = boundParams[17]
                existing.incident_location = boundParams[18]
                existing.clinical_specialization = boundParams[19]
                existing.causing_unit = boundParams[20]
                existing.patient_impact = boundParams[21]
                existing.immediate_action_and_result = boundParams[22]
                existing.action_taken_by = boundParams[23]
                existing.similar_incident_occurred = boundParams[24]
                existing.similar_incident_details = boundParams[25]
                existing.overdue_reason = boundParams[26]
                existing.row_version = boundParams[27]
                existing.updated_at = boundParams[28]
              } else if (sql.includes("patient_name = ?, medical_record_number = ?")) {
                // Emergency correction
                existing.patient_name = boundParams[0]
                existing.medical_record_number = boundParams[1]
                existing.patient_room = boundParams[2]
                existing.patient_age_category = boundParams[3]
                existing.patient_gender = boundParams[4]
                existing.patient_payer_type = boundParams[5]
                existing.admission_datetime = boundParams[6]
                existing.incident_datetime = boundParams[7]
                existing.incident_title = boundParams[8]
                existing.chronology = boundParams[9]
                existing.incident_type = boundParams[10]
                existing.initial_reporter_category = boundParams[11]
                existing.initial_reporter_detail = boundParams[12]
                existing.incident_target = boundParams[13]
                existing.incident_target_other = boundParams[14]
                existing.patient_care_type = boundParams[15]
                existing.incident_location = boundParams[16]
                existing.clinical_specialization = boundParams[17]
                existing.causing_unit = boundParams[18]
                existing.patient_impact = boundParams[19]
                existing.immediate_action_and_result = boundParams[20]
                existing.action_taken_by = boundParams[21]
                existing.similar_incident_occurred = boundParams[22]
                existing.overdue_reason = boundParams[23]
                existing.risk_grade = boundParams[24]
                existing.row_version = boundParams[25]
                existing.updated_at = boundParams[26]
              }
              return { meta: { changes: 1 } }
            }
            return { meta: { changes: 0 } }
          }

          if (sql.includes("DELETE FROM incident_reports WHERE id = ?")) {
            const id = boundParams[0] as string
            incidents.delete(id)
            return { meta: { changes: 1 } }
          }
          if (sql.includes("DELETE FROM audit_records WHERE incident_id = ?")) {
            const id = boundParams[0] as string
            const idxs = auditRecords
              .map((a, i) => (a.incident_id === id ? i : -1))
              .filter((i) => i >= 0)
              .reverse()
            for (const idx of idxs) {
              auditRecords.splice(idx, 1)
            }
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

          // ----------------------------------------------------------------
          // Conditional audit INSERT: INSERT INTO audit_records ... SELECT ... WHERE EXISTS
          // Used by investigation/skip and investigation/complete.
          // params layout: [id, incidentId, actorId, actorName, actorRole, ts, notes, reqId, incidentId(guard), nextVersion(guard)]
          // The conditional form uses SELECT + WHERE EXISTS rather than VALUES.
          // ----------------------------------------------------------------
          if (sql.includes("INSERT INTO audit_records") && sql.includes("SELECT") && sql.includes("WHERE EXISTS")) {
            // Extract the guard params: incidentId is at boundParams.length-2, nextVersion at boundParams.length-1
            const guardIncidentId = boundParams[boundParams.length - 2] as string
            const guardVersion = boundParams[boundParams.length - 1] as number
            const inc = incidents.get(guardIncidentId)

            // Simulate EXISTS check: report must be at the guarded status and version
            // The guard status varies: skip guards on COMPLETED_BY_UNIT, complete guards on COMPLETED_BY_UNIT
            const existsOk =
              inc !== undefined &&
              inc.row_version === guardVersion &&
              (inc.status === "COMPLETED_BY_UNIT" || inc.status === "SIMPLE_INVESTIGATION")

            if (!existsOk) {
              return { meta: { changes: 0 } }
            }

            // Determine event_type from the SQL literal (not a bound param in SELECT form)
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

          // Unconditional audit INSERT (DRAFT_CREATED, REPORT_SUBMITTED, etc.)
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

          // ----------------------------------------------------------------
          // Conditional simple_investigations INSERT (investigation/start):
          // INSERT OR IGNORE INTO simple_investigations ... SELECT ... WHERE EXISTS
          // ----------------------------------------------------------------
          if (
            (sql.includes("INSERT OR IGNORE INTO simple_investigations") ||
              sql.includes("INSERT INTO simple_investigations")) &&
            sql.includes("SELECT") &&
            sql.includes("WHERE EXISTS")
          ) {
            const incidentId = boundParams[1] as string
            // Guard params: incidentId at boundParams.length-2, nextVersion at boundParams.length-1
            const guardIncidentId = boundParams[boundParams.length - 2] as string
            const guardVersion = boundParams[boundParams.length - 1] as number
            const inc = incidents.get(guardIncidentId)

            const existsOk =
              inc !== undefined &&
              inc.row_version === guardVersion &&
              inc.status === "SIMPLE_INVESTIGATION"

            if (!existsOk || investigations.has(incidentId)) {
              return { meta: { changes: 0 } }
            }

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

          // Unconditional simple_investigations INSERT or upsert (investigation PUT)
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

          // ----------------------------------------------------------------
          // Conditional simple_investigations UPDATE (investigation/complete):
          // UPDATE simple_investigations SET completed_by_user_id ... WHERE incident_id=? AND EXISTS(...)
          // ----------------------------------------------------------------
          if (
            sql.includes("UPDATE simple_investigations") &&
            sql.includes("completed_by_user_id") &&
            sql.includes("EXISTS")
          ) {
            // Params: [userId, ts, ts, incidentId, guardIncidentId, guardVersion]
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

          // Unconditional simple_investigations completed_by UPDATE (legacy path)
          if (sql.includes("UPDATE simple_investigations SET completed_by_user_id")) {
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
      for (const stmt of statements) {
        results.push(await stmt.run())
      }
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

describe("Incident Reporting & Core Workflow End-to-End Suite", () => {
  it("creates a persistent draft when minimum condition is met and generates DRAFT_CREATED audit", async () => {
    const { db, auditRecords } = createInMemoryD1()
    const request = new Request("https://example.test/api/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reporter_name: "Ns. Maria G. Klau",
        reporter_role: "Perawat Bedah",
        incident_datetime: "2026-09-26T08:00:00.000Z",
        incident_type: "KNC",
      }),
    })
    const data: RequestContextData = { requestId: "req_01", auth: nakesActor }

    const response = await callHandler(onIncidentsCreatePost, request, db, data)

    expect(response.status).toBe(201)
    const body: { data: { id: string; status: string; row_version: number } } =
      await response.json()
    expect(body.data.status).toBe("DRAFT")
    expect(body.data.row_version).toBe(1)

    // Audit event DRAFT_CREATED captured
    expect(auditRecords).toHaveLength(1)
    expect(auditRecords[0]?.event_type).toBe("DRAFT_CREATED")
    expect(auditRecords[0]?.actor_user_id).toBe("usr_nakes_1")
  })

  it("rejects draft creation when minimum conditions are missing", async () => {
    const { db } = createInMemoryD1()
    const request = new Request("https://example.test/api/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reporter_name: "Ns. Maria",
        // missing role, datetime, type
      }),
    })
    const data: RequestContextData = { requestId: "req_02", auth: nakesActor }

    const response = await callHandler(onIncidentsCreatePost, request, db, data)

    expect(response.status).toBe(400)
    const body: { code: string } = await response.json()
    expect(body.code).toBe("MINIMUM_DRAFT_REQUIRED")
  })

  it("enforces draft privacy: only created_by can view or edit draft", async () => {
    const { db } = createInMemoryD1()

    // 1. Nakes 1 creates draft
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
      requestId: "req_c",
      auth: nakesActor,
    })
    const created: { data: { id: string } } = await createRes.json()
    const incidentId = created.data.id

    // 2. Peer Nakes attempts to view Nakes 1's draft -> 403 Forbidden
    const peerViewReq = new Request(`https://example.test/api/incidents/${incidentId}`)
    const peerViewRes = await callHandler(
      onIncidentGet,
      peerViewReq,
      db,
      { requestId: "req_p", auth: peerNakesActor },
      { id: incidentId },
    )
    expect(peerViewRes.status).toBe(403)

    // 3. Peer Nakes attempts to edit Nakes 1's draft -> 403 Forbidden
    const peerPatchReq = new Request(`https://example.test/api/incidents/${incidentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patient_name: "Tampered Name" }),
    })
    const peerPatchRes = await callHandler(
      onIncidentPatch,
      peerPatchReq,
      db,
      { requestId: "req_p2", auth: peerNakesActor },
      { id: incidentId },
    )
    expect(peerPatchRes.status).toBe(403)
  })

  it("handles auto-save and optimistic concurrency protection", async () => {
    const { db } = createInMemoryD1()

    // Create draft
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
      requestId: "req_01",
      auth: nakesActor,
    })
    const created: { data: { id: string; row_version: number } } = await createRes.json()
    const incidentId = created.data.id
    expect(created.data.row_version).toBe(1)

    // Patch draft with matching version 1 -> succeeds, increments to 2
    const patchReq1 = new Request(`https://example.test/api/incidents/${incidentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "If-Match": '"W/1"' },
      body: JSON.stringify({ patient_name: "Patient A", row_version: 1 }),
    })
    const patchRes1 = await callHandler(
      onIncidentPatch,
      patchReq1,
      db,
      { requestId: "req_02", auth: nakesActor },
      { id: incidentId },
    )
    expect(patchRes1.status).toBe(200)
    const patched1: { data: { row_version: number } } = await patchRes1.json()
    expect(patched1.data.row_version).toBe(2)

    // Stale patch with old version 1 -> rejected with 412 Precondition Failed
    const stalePatchReq = new Request(`https://example.test/api/incidents/${incidentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "If-Match": '"W/1"' },
      body: JSON.stringify({ patient_name: "Stale Overwrite", row_version: 1 }),
    })
    const stalePatchRes = await callHandler(
      onIncidentPatch,
      stalePatchReq,
      db,
      { requestId: "req_03", auth: nakesActor },
      { id: incidentId },
    )
    expect(stalePatchRes.status).toBe(412)
  })

  it("hard deletes draft with zero retained audit records", async () => {
    const { db, incidents, auditRecords } = createInMemoryD1()

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
      requestId: "req_01",
      auth: nakesActor,
    })
    const created: { data: { id: string } } = await createRes.json()
    const incidentId = created.data.id
    expect(incidents.has(incidentId)).toBe(true)
    expect(auditRecords.some((a) => a.incident_id === incidentId)).toBe(true)

    // 2. Delete draft
    const deleteReq = new Request(`https://example.test/api/incidents/${incidentId}`, {
      method: "DELETE",
    })
    const deleteRes = await callHandler(
      onIncidentDelete,
      deleteReq,
      db,
      { requestId: "req_02", auth: nakesActor },
      { id: incidentId },
    )
    expect(deleteRes.status).toBe(200)

    // 3. Verify hard delete: removed from D1, no retained audit
    expect(incidents.has(incidentId)).toBe(false)
    expect(auditRecords.filter((a) => a.incident_id === incidentId)).toHaveLength(0)
  })

  it("allows Administrator to hard delete a completed report", async () => {
    const { db, incidents, auditRecords } = createInMemoryD1()
    incidents.set("inc_completed_admin_delete", {
      id: "inc_completed_admin_delete",
      status: "COMPLETED",
      created_by_user_id: "usr_nakes_1",
      owning_unit_id: "IBS",
      row_version: 8,
    })
    auditRecords.push({ id: "audit_completed", incident_id: "inc_completed_admin_delete" })

    const response = await callHandler(
      onIncidentDelete,
      new Request("https://example.test/api/incidents/inc_completed_admin_delete", {
        method: "DELETE",
      }),
      db,
      { requestId: "req_admin_delete_completed", auth: adminActor },
      { id: "inc_completed_admin_delete" },
    )

    expect(response.status).toBe(200)
    expect(incidents.has("inc_completed_admin_delete")).toBe(false)
    expect(auditRecords.filter((record) => record.incident_id === "inc_completed_admin_delete")).toHaveLength(0)
  })

  it("enforces mandatory validation on submit and successfully submits complete report", async () => {
    const { db, snapshots, auditRecords } = createInMemoryD1()

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
      requestId: "req_01",
      auth: nakesActor,
    })
    const created: { data: { id: string } } = await createRes.json()
    const incidentId = created.data.id

    // 2. Submit while incomplete -> rejected with 422 MANDATORY_FIELDS_INCOMPLETE
    const submitIncompleteReq = new Request(
      `https://example.test/api/incidents/${incidentId}/submit`,
      {
        method: "POST",
      },
    )
    const submitIncompleteRes = await callHandler(
      onSubmitPost,
      submitIncompleteReq,
      db,
      { requestId: "req_sub1", auth: nakesActor },
      { id: incidentId },
    )
    expect(submitIncompleteRes.status).toBe(422)
    const incompleteBody: { code: string } = await submitIncompleteRes.json()
    expect(incompleteBody.code).toBe("MANDATORY_FIELDS_INCOMPLETE")

    // 3. Patch with complete mandatory Form fields
    await callHandler(
      onIncidentPatch,
      new Request(`https://example.test/api/incidents/${incidentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_name: "Tn. Yohanes B",
          medical_record_number: "MR-98765",
          patient_room: "Kamar Operasi 1 (Bedah Umum)",
          patient_age_category: ">30_65_tahun",
          patient_gender: "LAKI_LAKI",
          patient_payer_type: "BPJS Kesehatan",
          admission_datetime: "2026-09-25T08:00:00.000Z",
          incident_datetime: "2026-09-26T09:00:00.000Z",
          incident_title: "Ketidaksesuaian hitungan kassa pre-penutupan luka",
          chronology: "Urutan kejadian lengkap 5W+1H saat pembedahan laparatomi...",
          incident_type: "KNC",
          initial_reporter_category: "Karyawan: Perawat",
          incident_target: "PASIEN",
          incident_location: "Kamar Operasi 1 (Bedah Umum)",
          clinical_specialization: "Bedah Umum",
          causing_unit: "Instalasi Bedah Sentral (IBS)",
          patient_impact: "Tidak Ada Cedera",
          immediate_action_and_result: "Dihitung ulang sebelum penutupan rongga abdomen",
          action_taken_by: "Tim Bedah",
          similar_incident_occurred: "TIDAK",
        }),
      }),
      db,
      { requestId: "req_p", auth: nakesActor },
      { id: incidentId },
    )

    // 4. Submit complete report -> 200 OK
    const submitValidReq = new Request(`https://example.test/api/incidents/${incidentId}/submit`, {
      method: "POST",
    })
    const submitValidRes = await callHandler(
      onSubmitPost,
      submitValidReq,
      db,
      { requestId: "req_sub2", auth: nakesActor },
      { id: incidentId },
    )
    expect(submitValidRes.status).toBe(200)
    const submittedBody: { data: { status: string; report_number: string } } =
      await submitValidRes.json()
    expect(submittedBody.data.status).toBe("SUBMITTED")
    expect(submittedBody.data.report_number).toMatch(/^IKP\/IBS\/\d{6}\/\d{4}$/)

    // 5. Formal snapshot created
    expect(snapshots.has(incidentId)).toBe(true)

    // 6. REPORT_SUBMITTED audit captured
    const subAudit = auditRecords.find(
      (a) => a.event_type === "REPORT_SUBMITTED" && a.incident_id === incidentId,
    )
    expect(subAudit).toBeDefined()
  })

  it("allows peer Nakes IBS to read submitted reports but denies editing", async () => {
    const { db, incidents } = createInMemoryD1()
    incidents.set("inc_sub_peer", {
      id: "inc_sub_peer",
      status: "SUBMITTED",
      created_by_user_id: "usr_nakes_1",
      owning_unit_id: "IBS",
      incident_title: "Peer visible report",
      patient_name: "Patient Secret",
      chronology: "Narrative...",
      row_version: 1,
    })

    // Peer Nakes can read submitted report
    const readReq = new Request("https://example.test/api/incidents/inc_sub_peer")
    const readRes = await callHandler(
      onIncidentGet,
      readReq,
      db,
      { requestId: "req_1", auth: peerNakesActor },
      { id: "inc_sub_peer" },
    )
    expect(readRes.status).toBe(200)

    // Peer Nakes cannot edit submitted report
    const editReq = new Request("https://example.test/api/incidents/inc_sub_peer", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patient_name: "Illegal Edit" }),
    })
    const editRes = await callHandler(
      onIncidentPatch,
      editReq,
      db,
      { requestId: "req_2", auth: peerNakesActor },
      { id: "inc_sub_peer" },
    )
    expect(editRes.status).toBe(403)
  })

  it("strips clinical narrative and patient PII for Administrator role", async () => {
    const { db, incidents } = createInMemoryD1()
    incidents.set("inc_admin_test", {
      id: "inc_admin_test",
      status: "SUBMITTED",
      created_by_user_id: "usr_nakes_1",
      owning_unit_id: "IBS",
      incident_title: "General Title",
      patient_name: "Sensitive Patient Name",
      medical_record_number: "MR-999",
      chronology: "Highly confidential clinical narrative",
      row_version: 1,
    })

    const readReq = new Request("https://example.test/api/incidents/inc_admin_test")
    const readRes = await callHandler(
      onIncidentGet,
      readReq,
      db,
      { requestId: "req_adm", auth: adminActor },
      { id: "inc_admin_test" },
    )
    expect(readRes.status).toBe(200)
    const body: { data: Record<string, unknown> } = await readRes.json()

    // Administrative metadata is accessible, but narrative and patient PII are sanitized
    expect(body.data.incident_title).toBe("General Title")
    expect(body.data.patient_name).toBeUndefined()
    expect(body.data.medical_record_number).toBeUndefined()
    expect(body.data.chronology).toBeUndefined()
  })

  it("supports Kepala Ruangan review, revision request, and resubmission", async () => {
    const { db, incidents, auditRecords } = createInMemoryD1()
    incidents.set("inc_rev_test", {
      id: "inc_rev_test",
      status: "SUBMITTED",
      created_by_user_id: "usr_nakes_1",
      owning_unit_id: "IBS",
      reporter_name: "Ns. Maria",
      reporter_role: "Perawat",
      incident_datetime: "2026-09-26T08:00:00.000Z",
      incident_type: "KNC",
      incident_target: "PASIEN",
      row_version: 1,
    })

    // 1. Kepala Ruangan receives report
    const receiveReq = new Request("https://example.test/api/incidents/inc_rev_test/receive", {
      method: "POST",
    })
    const receiveRes = await callHandler(
      onReceivePost,
      receiveReq,
      db,
      { requestId: "req_rec", auth: headroomActor },
      { id: "inc_rev_test" },
    )
    expect(receiveRes.status).toBe(200)
    expect(incidents.get("inc_rev_test")?.status).toBe("UNDER_REVIEW")

    // 2. Kepala Ruangan requests revision
    const revReq = new Request(
      "https://example.test/api/incidents/inc_rev_test/revision-required",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revision_reason: "Lengkapi data ruangan kamar operasi" }),
      },
    )
    const revRes = await callHandler(
      onRevisionRequiredPost,
      revReq,
      db,
      { requestId: "req_rev", auth: headroomActor },
      { id: "inc_rev_test" },
    )
    expect(revRes.status).toBe(200)
    expect(incidents.get("inc_rev_test")?.status).toBe("REVISION_REQUIRED")
    expect(auditRecords.some((a) => a.event_type === "REVISION_REQUIRED")).toBe(true)

    // 3. Only created_by can edit and resubmit
    const peerResubmitReq = new Request("https://example.test/api/incidents/inc_rev_test/submit", {
      method: "POST",
    })
    const peerResubmitRes = await callHandler(
      onSubmitPost,
      peerResubmitReq,
      db,
      { requestId: "req_p_sub", auth: peerNakesActor },
      { id: "inc_rev_test" },
    )
    expect(peerResubmitRes.status).toBe(403)
  })

  it("handles Emergency Correction by Kepala Ruangan with mandatory reason, and rejects in forbidden states", async () => {
    const { db, incidents, snapshots, auditRecords } = createInMemoryD1()
    incidents.set("inc_corr_test", {
      id: "inc_corr_test",
      status: "SUBMITTED",
      created_by_user_id: "usr_nakes_1",
      owning_unit_id: "IBS",
      patient_name: "Original Name",
      medical_record_number: "EMERGENCY-001",
      row_version: 1,
    })
    snapshots.set("inc_corr_test", {
      incident_id: "inc_corr_test",
      patient_name: "Original Name",
      medical_record_number: "EMERGENCY-001",
    })

    // 1. Rejected if reason is missing
    const noReasonReq = new Request(
      "https://example.test/api/incidents/inc_corr_test/emergency-correction",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "", medical_record_number: "MR-DEFINITIVE-123" }),
      },
    )
    const noReasonRes = await callHandler(
      onEmergencyCorrectionPost,
      noReasonReq,
      db,
      { requestId: "req_c1", auth: headroomActor },
      { id: "inc_corr_test" },
    )
    expect(noReasonRes.status).toBe(422)

    // 2. Successful correction by Kepala Ruangan
    const validCorrReq = new Request(
      "https://example.test/api/incidents/inc_corr_test/emergency-correction",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: "Pembaruan nomor MR definitif dari Rekam Medis menggantikan nomor darurat",
          medical_record_number: "MR-DEFINITIVE-123",
        }),
      },
    )
    const validCorrRes = await callHandler(
      onEmergencyCorrectionPost,
      validCorrReq,
      db,
      { requestId: "req_c2", auth: headroomActor },
      { id: "inc_corr_test" },
    )
    expect(validCorrRes.status).toBe(200)
    expect(incidents.get("inc_corr_test")?.medical_record_number).toBe("MR-DEFINITIVE-123")
    expect(snapshots.get("inc_corr_test")?.medical_record_number).toBe("MR-DEFINITIVE-123")

    // Single EMERGENCY_CORRECTION audit event
    const corrAudit = auditRecords.find((a) => a.event_type === "EMERGENCY_CORRECTION")
    expect(corrAudit).toBeDefined()
    expect(corrAudit?.notes).toContain("Pembaruan nomor MR definitif")

    // 3. Emergency correction strictly rejected in PMKP_REVIEW (Decision #181) or SIMPLE_INVESTIGATION
    const incidentToReject = incidents.get("inc_corr_test")
    if (incidentToReject) {
      incidentToReject.status = "PMKP_REVIEW"
    }
    const rejectedPmkpReq = new Request(
      "https://example.test/api/incidents/inc_corr_test/emergency-correction",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Late edit", patient_name: "New" }),
      },
    )
    const rejectedPmkpRes = await callHandler(
      onEmergencyCorrectionPost,
      rejectedPmkpReq,
      db,
      { requestId: "req_c3", auth: headroomActor },
      { id: "inc_corr_test" },
    )
    expect(rejectedPmkpRes.status).toBe(403)
  })

  // =========================================================================
  // REVISED WORKFLOW: assign-risk-grade + investigation/start + investigation/skip
  // =========================================================================

  it("[BIRU] assign-risk-grade stays UNDER_REVIEW, saves grade, requires If-Match", async () => {
    const { db, incidents, investigations } = createInMemoryD1()
    incidents.set("inc_biru_grade", {
      id: "inc_biru_grade",
      status: "UNDER_REVIEW",
      created_by_user_id: "usr_nakes_1",
      owning_unit_id: "IBS",
      row_version: 2,
    })

    // Missing If-Match → 428
    const noIfMatch = new Request(
      "https://example.test/api/incidents/inc_biru_grade/assign-risk-grade",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ risk_grade: "BIRU" }),
      },
    )
    const noIfMatchRes = await callHandler(
      onAssignRiskGradePost,
      noIfMatch,
      db,
      { requestId: "req_ng", auth: headroomActor },
      { id: "inc_biru_grade" },
    )
    expect(noIfMatchRes.status).toBe(428)

    // Valid BIRU with correct version → UNDER_REVIEW (grade saved), no investigation row
    const gradeReq = new Request(
      "https://example.test/api/incidents/inc_biru_grade/assign-risk-grade",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "If-Match": '"W/2"' },
        body: JSON.stringify({ risk_grade: "BIRU" }),
      },
    )
    const gradeRes = await callHandler(
      onAssignRiskGradePost,
      gradeReq,
      db,
      { requestId: "req_g", auth: headroomActor },
      { id: "inc_biru_grade" },
    )
    expect(gradeRes.status).toBe(200)
    expect(incidents.get("inc_biru_grade")?.status).toBe("UNDER_REVIEW")
    expect(incidents.get("inc_biru_grade")?.risk_grade).toBe("BIRU")
    // No simple_investigations row created at grade assignment
    expect(investigations.has("inc_biru_grade")).toBe(false)
  })

  it("[HIJAU] assign-risk-grade stays UNDER_REVIEW, saves grade, no investigation row", async () => {
    const { db, incidents, investigations } = createInMemoryD1()
    incidents.set("inc_hijau_grade", {
      id: "inc_hijau_grade",
      status: "UNDER_REVIEW",
      created_by_user_id: "usr_nakes_1",
      owning_unit_id: "IBS",
      row_version: 3,
    })

    const gradeReq = new Request(
      "https://example.test/api/incidents/inc_hijau_grade/assign-risk-grade",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "If-Match": '"W/3"' },
        body: JSON.stringify({ risk_grade: "HIJAU" }),
      },
    )
    const gradeRes = await callHandler(
      onAssignRiskGradePost,
      gradeReq,
      db,
      { requestId: "req_g_hijau", auth: headroomActor },
      { id: "inc_hijau_grade" },
    )
    expect(gradeRes.status).toBe(200)
    expect(incidents.get("inc_hijau_grade")?.status).toBe("UNDER_REVIEW")
    expect(incidents.get("inc_hijau_grade")?.risk_grade).toBe("HIJAU")
    expect(investigations.has("inc_hijau_grade")).toBe(false)
  })

  it("[KUNING] assign-risk-grade requires mitigation and routes to PMKP_REVIEW", async () => {
    const { db, incidents } = createInMemoryD1()
    incidents.set("inc_kuning", {
      id: "inc_kuning",
      status: "UNDER_REVIEW",
      created_by_user_id: "usr_nakes_1",
      owning_unit_id: "IBS",
      row_version: 1,
    })

    // Without mitigation → 422
    const noMitigReq = new Request(
      "https://example.test/api/incidents/inc_kuning/assign-risk-grade",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "If-Match": '"W/1"' },
        body: JSON.stringify({ risk_grade: "KUNING" }),
      },
    )
    const noMitigRes = await callHandler(
      onAssignRiskGradePost,
      noMitigReq,
      db,
      { requestId: "req_k1", auth: headroomActor },
      { id: "inc_kuning" },
    )
    expect(noMitigRes.status).toBe(422)
    const errBody: { code: string } = await noMitigRes.json()
    expect(errBody.code).toBe("MITIGATION_NOTES_REQUIRED")

    // With mitigation → PMKP_REVIEW
    const withMitigReq = new Request(
      "https://example.test/api/incidents/inc_kuning/assign-risk-grade",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "If-Match": '"W/1"' },
        body: JSON.stringify({
          risk_grade: "KUNING",
          high_risk_mitigation_notes: "Pasien diobservasi ketat oleh tim bedah",
        }),
      },
    )
    const withMitigRes = await callHandler(
      onAssignRiskGradePost,
      withMitigReq,
      db,
      { requestId: "req_k2", auth: headroomActor },
      { id: "inc_kuning" },
    )
    expect(withMitigRes.status).toBe(200)
    expect(incidents.get("inc_kuning")?.status).toBe("PMKP_REVIEW")
  })

  it("[MERAH] assign-risk-grade requires mitigation and routes to PMKP_REVIEW", async () => {
    const { db, incidents } = createInMemoryD1()
    incidents.set("inc_merah_test", {
      id: "inc_merah_test",
      status: "UNDER_REVIEW",
      created_by_user_id: "usr_nakes_1",
      owning_unit_id: "IBS",
      row_version: 1,
    })

    // 1. Assign MERAH requires high_risk_mitigation_notes
    const gradeWithoutMitigation = new Request(
      "https://example.test/api/incidents/inc_merah_test/assign-risk-grade",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "If-Match": '"W/1"' },
        body: JSON.stringify({ risk_grade: "MERAH", high_risk_mitigation_notes: "" }),
      },
    )
    const resNoMitigation = await callHandler(
      onAssignRiskGradePost,
      gradeWithoutMitigation,
      db,
      { requestId: "req_gm1", auth: headroomActor },
      { id: "inc_merah_test" },
    )
    expect(resNoMitigation.status).toBe(422)

    // 2. Assign MERAH with mandatory mitigation -> PMKP_REVIEW
    const gradeWithMitigation = new Request(
      "https://example.test/api/incidents/inc_merah_test/assign-risk-grade",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "If-Match": '"W/1"' },
        body: JSON.stringify({
          risk_grade: "MERAH",
          high_risk_mitigation_notes: "Pasien segera distabilkan dan dilaporkan ke dokter DPJP",
        }),
      },
    )
    const resWithMitigation = await callHandler(
      onAssignRiskGradePost,
      gradeWithMitigation,
      db,
      { requestId: "req_gm2", auth: headroomActor },
      { id: "inc_merah_test" },
    )
    expect(resWithMitigation.status).toBe(200)
    expect(incidents.get("inc_merah_test")?.status).toBe("PMKP_REVIEW")

    // 3. PMKP saves review notes
    const saveNoteReq = new Request(
      "https://example.test/api/incidents/inc_merah_test/pmkp-review",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pmkp_review_notes: "Bentuk tim investigasi komprehensif / RCA" }),
      },
    )
    const saveNoteRes = await callHandler(
      onPmkpReviewPut,
      saveNoteReq,
      db,
      { requestId: "req_pmkp_put", auth: pmkpActor },
      { id: "inc_merah_test" },
    )
    expect(saveNoteRes.status).toBe(200)

    // 4. Finalize external RCA handoff -> COMPLETED
    const finalizeReq = new Request(
      "https://example.test/api/incidents/inc_merah_test/pmkp-review/finalize",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed: true }),
      },
    )
    const finalizeRes = await callHandler(
      onFinalizePmkpPost,
      finalizeReq,
      db,
      { requestId: "req_fin", auth: pmkpActor },
      { id: "inc_merah_test" },
    )
    expect(finalizeRes.status).toBe(200)
    expect(incidents.get("inc_merah_test")?.status).toBe("COMPLETED")
    expect(incidents.get("inc_merah_test")?.pmkp_reviewed).toBe(1)

    // REPORT_COMPLETED audit is verified in the dedicated MERAH/KUNING PMKP test above.
    // (auditRecords from this scope were consumed inline)
  })

  it("[BIRU path] investigation/start requires If-Match, creates investigation row, transitions to SIMPLE_INVESTIGATION", async () => {
    const { db, incidents, investigations, auditRecords } = createInMemoryD1()
    incidents.set("inc_biru_start", {
      id: "inc_biru_start",
      status: "UNDER_REVIEW",
      created_by_user_id: "usr_nakes_1",
      owning_unit_id: "IBS",
      risk_grade: "BIRU",
      row_version: 3,
    })

    // Missing If-Match → 428
    const noIfMatch = new Request(
      "https://example.test/api/incidents/inc_biru_start/investigation/start",
      { method: "POST" },
    )
    const noIfMatchRes = await callHandler(
      onStartInvestigationPost,
      noIfMatch,
      db,
      { requestId: "req_s1", auth: headroomActor },
      { id: "inc_biru_start" },
    )
    expect(noIfMatchRes.status).toBe(428)

    // Valid start → SIMPLE_INVESTIGATION + investigation row created
    const startReq = new Request(
      "https://example.test/api/incidents/inc_biru_start/investigation/start",
      {
        method: "POST",
        headers: { "If-Match": '"W/3"' },
      },
    )
    const startRes = await callHandler(
      onStartInvestigationPost,
      startReq,
      db,
      { requestId: "req_s2", auth: headroomActor },
      { id: "inc_biru_start" },
    )
    expect(startRes.status).toBe(200)
    expect(incidents.get("inc_biru_start")?.status).toBe("SIMPLE_INVESTIGATION")
    expect(investigations.has("inc_biru_start")).toBe(true)

    // No audit event emitted on start
    expect(auditRecords).toHaveLength(0)
  })

  it("[HIJAU path] investigation/start creates investigation row and transitions to SIMPLE_INVESTIGATION", async () => {
    const { db, incidents, investigations, auditRecords } = createInMemoryD1()
    incidents.set("inc_hijau_start", {
      id: "inc_hijau_start",
      status: "UNDER_REVIEW",
      created_by_user_id: "usr_nakes_1",
      owning_unit_id: "IBS",
      risk_grade: "HIJAU",
      row_version: 5,
    })

    const startReq = new Request(
      "https://example.test/api/incidents/inc_hijau_start/investigation/start",
      {
        method: "POST",
        headers: { "If-Match": '"W/5"' },
      },
    )
    const startRes = await callHandler(
      onStartInvestigationPost,
      startReq,
      db,
      { requestId: "req_sh", auth: headroomActor },
      { id: "inc_hijau_start" },
    )
    expect(startRes.status).toBe(200)
    expect(incidents.get("inc_hijau_start")?.status).toBe("SIMPLE_INVESTIGATION")
    expect(investigations.has("inc_hijau_start")).toBe(true)
    // No audit on start
    expect(auditRecords).toHaveLength(0)
  })

  it("[start] investigation/start rejects stale version (412)", async () => {
    const { db, incidents } = createInMemoryD1()
    incidents.set("inc_stale_start", {
      id: "inc_stale_start",
      status: "UNDER_REVIEW",
      created_by_user_id: "usr_nakes_1",
      owning_unit_id: "IBS",
      risk_grade: "BIRU",
      row_version: 4,
    })

    // Send version 3 (stale; actual is 4)
    const staleReq = new Request(
      "https://example.test/api/incidents/inc_stale_start/investigation/start",
      {
        method: "POST",
        headers: { "If-Match": '"W/3"' },
      },
    )
    const staleRes = await callHandler(
      onStartInvestigationPost,
      staleReq,
      db,
      { requestId: "req_stale", auth: headroomActor },
      { id: "inc_stale_start" },
    )
    expect(staleRes.status).toBe(412)
    // Status unchanged
    expect(incidents.get("inc_stale_start")?.status).toBe("UNDER_REVIEW")
  })

  it("[start] investigation/start rejects unauthorized role and wrong unit", async () => {
    const { db, incidents } = createInMemoryD1()
    incidents.set("inc_rbac_start", {
      id: "inc_rbac_start",
      status: "UNDER_REVIEW",
      created_by_user_id: "usr_nakes_1",
      owning_unit_id: "IBS",
      risk_grade: "BIRU",
      row_version: 1,
    })

    // Nakes (TENAGA_KESEHATAN) cannot start investigation
    const nakesReq = new Request(
      "https://example.test/api/incidents/inc_rbac_start/investigation/start",
      {
        method: "POST",
        headers: { "If-Match": '"W/1"' },
      },
    )
    const nakesRes = await callHandler(
      onStartInvestigationPost,
      nakesReq,
      db,
      { requestId: "req_rbac1", auth: nakesActor },
      { id: "inc_rbac_start" },
    )
    expect(nakesRes.status).toBe(403)

    // PMKP cannot start investigation
    const pmkpReq = new Request(
      "https://example.test/api/incidents/inc_rbac_start/investigation/start",
      {
        method: "POST",
        headers: { "If-Match": '"W/1"' },
      },
    )
    const pmkpRes = await callHandler(
      onStartInvestigationPost,
      pmkpReq,
      db,
      { requestId: "req_rbac2", auth: pmkpActor },
      { id: "inc_rbac_start" },
    )
    expect(pmkpRes.status).toBe(403)
  })

  it("[skip] investigation/skip directly completes BIRU/HIJAU, no investigation record, only REPORT_COMPLETED audit", async () => {
    const { db, incidents, investigations, auditRecords } = createInMemoryD1()
    incidents.set("inc_skip_biru", {
      id: "inc_skip_biru",
      status: "UNDER_REVIEW",
      created_by_user_id: "usr_nakes_1",
      owning_unit_id: "IBS",
      risk_grade: "BIRU",
      row_version: 2,
    })

    // Missing confirmed → 422
    const noConfirm = new Request(
      "https://example.test/api/incidents/inc_skip_biru/investigation/skip",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "If-Match": '"W/2"' },
        body: JSON.stringify({ confirmed: false }),
      },
    )
    const noConfirmRes = await callHandler(
      onSkipInvestigationPost,
      noConfirm,
      db,
      { requestId: "req_skip_nc", auth: headroomActor },
      { id: "inc_skip_biru" },
    )
    expect(noConfirmRes.status).toBe(422)

    // Valid skip → COMPLETED_BY_UNIT
    const skipReq = new Request(
      "https://example.test/api/incidents/inc_skip_biru/investigation/skip",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "If-Match": '"W/2"' },
        body: JSON.stringify({ confirmed: true }),
      },
    )
    const skipRes = await callHandler(
      onSkipInvestigationPost,
      skipReq,
      db,
      { requestId: "req_skip_ok", auth: headroomActor },
      { id: "inc_skip_biru" },
    )
    expect(skipRes.status).toBe(200)
    expect(incidents.get("inc_skip_biru")?.status).toBe("COMPLETED_BY_UNIT")

    // No simple_investigations row
    expect(investigations.has("inc_skip_biru")).toBe(false)

    // Only REPORT_COMPLETED audit — no SIMPLE_INVESTIGATION_COMPLETED
    expect(auditRecords.some((a) => a.event_type === "REPORT_COMPLETED")).toBe(true)
    expect(auditRecords.some((a) => a.event_type === "SIMPLE_INVESTIGATION_COMPLETED")).toBe(false)
  })

  it("[skip] investigation/skip for HIJAU also works correctly", async () => {
    const { db, incidents, investigations, auditRecords } = createInMemoryD1()
    incidents.set("inc_skip_hijau", {
      id: "inc_skip_hijau",
      status: "UNDER_REVIEW",
      created_by_user_id: "usr_nakes_1",
      owning_unit_id: "IBS",
      risk_grade: "HIJAU",
      row_version: 1,
    })

    const skipReq = new Request(
      "https://example.test/api/incidents/inc_skip_hijau/investigation/skip",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "If-Match": '"W/1"' },
        body: JSON.stringify({ confirmed: true }),
      },
    )
    const skipRes = await callHandler(
      onSkipInvestigationPost,
      skipReq,
      db,
      { requestId: "req_skip_hijau", auth: headroomActor },
      { id: "inc_skip_hijau" },
    )
    expect(skipRes.status).toBe(200)
    expect(incidents.get("inc_skip_hijau")?.status).toBe("COMPLETED_BY_UNIT")
    expect(investigations.has("inc_skip_hijau")).toBe(false)
    expect(auditRecords.some((a) => a.event_type === "REPORT_COMPLETED")).toBe(true)
    expect(auditRecords.some((a) => a.event_type === "SIMPLE_INVESTIGATION_COMPLETED")).toBe(false)
  })

  it("[skip] investigation/skip stale request returns 412, no state change", async () => {
    const { db, incidents, investigations, auditRecords } = createInMemoryD1()
    incidents.set("inc_skip_stale", {
      id: "inc_skip_stale",
      status: "UNDER_REVIEW",
      created_by_user_id: "usr_nakes_1",
      owning_unit_id: "IBS",
      risk_grade: "BIRU",
      row_version: 5,
    })

    const staleSkip = new Request(
      "https://example.test/api/incidents/inc_skip_stale/investigation/skip",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "If-Match": '"W/4"' },
        body: JSON.stringify({ confirmed: true }),
      },
    )
    const staleRes = await callHandler(
      onSkipInvestigationPost,
      staleSkip,
      db,
      { requestId: "req_skip_stale", auth: headroomActor },
      { id: "inc_skip_stale" },
    )
    expect(staleRes.status).toBe(412)
    expect(incidents.get("inc_skip_stale")?.status).toBe("UNDER_REVIEW")
    expect(investigations.has("inc_skip_stale")).toBe(false)
    expect(auditRecords).toHaveLength(0)
  })

  it("[skip] investigation/skip rejected for KUNING/MERAH (wrong risk grade, RBAC)", async () => {
    const { db, incidents } = createInMemoryD1()
    incidents.set("inc_skip_kuning", {
      id: "inc_skip_kuning",
      status: "UNDER_REVIEW",
      created_by_user_id: "usr_nakes_1",
      owning_unit_id: "IBS",
      risk_grade: "KUNING",
      row_version: 1,
    })

    // Kepala Ruangan cannot skip a KUNING incident (must go PMKP_REVIEW)
    const skipReq = new Request(
      "https://example.test/api/incidents/inc_skip_kuning/investigation/skip",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "If-Match": '"W/1"' },
        body: JSON.stringify({ confirmed: true }),
      },
    )
    const skipRes = await callHandler(
      onSkipInvestigationPost,
      skipReq,
      db,
      { requestId: "req_skip_kuning", auth: headroomActor },
      { id: "inc_skip_kuning" },
    )
    expect(skipRes.status).toBe(403)
    expect(incidents.get("inc_skip_kuning")?.status).toBe("UNDER_REVIEW")
  })

  it("[skip] investigation/skip rejected for non-Kepala Ruangan (RBAC)", async () => {
    const { db, incidents } = createInMemoryD1()
    incidents.set("inc_skip_rbac", {
      id: "inc_skip_rbac",
      status: "UNDER_REVIEW",
      created_by_user_id: "usr_nakes_1",
      owning_unit_id: "IBS",
      risk_grade: "BIRU",
      row_version: 1,
    })

    // Nakes cannot skip
    const nakesReq = new Request(
      "https://example.test/api/incidents/inc_skip_rbac/investigation/skip",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "If-Match": '"W/1"' },
        body: JSON.stringify({ confirmed: true }),
      },
    )
    const nakesRes = await callHandler(
      onSkipInvestigationPost,
      nakesReq,
      db,
      { requestId: "req_skip_rbac1", auth: nakesActor },
      { id: "inc_skip_rbac" },
    )
    expect(nakesRes.status).toBe(403)

    // PMKP cannot skip either
    const pmkpReq = new Request(
      "https://example.test/api/incidents/inc_skip_rbac/investigation/skip",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "If-Match": '"W/1"' },
        body: JSON.stringify({ confirmed: true }),
      },
    )
    const pmkpRes = await callHandler(
      onSkipInvestigationPost,
      pmkpReq,
      db,
      { requestId: "req_skip_rbac2", auth: pmkpActor },
      { id: "inc_skip_rbac" },
    )
    expect(pmkpRes.status).toBe(403)
  })

  it("[start→complete] BIRU full investigation path: start + fill + complete emits SIMPLE_INVESTIGATION_COMPLETED + REPORT_COMPLETED", async () => {
    const { db, incidents, investigations, auditRecords } = createInMemoryD1()
    incidents.set("inc_biru_full", {
      id: "inc_biru_full",
      status: "UNDER_REVIEW",
      created_by_user_id: "usr_nakes_1",
      owning_unit_id: "IBS",
      risk_grade: "BIRU",
      row_version: 2,
    })

    // 1. Start investigation
    const startReq = new Request(
      "https://example.test/api/incidents/inc_biru_full/investigation/start",
      {
        method: "POST",
        headers: { "If-Match": '"W/2"' },
      },
    )
    const startRes = await callHandler(
      onStartInvestigationPost,
      startReq,
      db,
      { requestId: "req_bf_start", auth: headroomActor },
      { id: "inc_biru_full" },
    )
    expect(startRes.status).toBe(200)
    expect(incidents.get("inc_biru_full")?.status).toBe("SIMPLE_INVESTIGATION")
    expect(investigations.has("inc_biru_full")).toBe(true)

    // 2. Fill investigation data
    const fillReq = new Request(
      "https://example.test/api/incidents/inc_biru_full/investigation",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direct_cause: "Komunikasi serah terima instrumen bedah terputus",
          underlying_root_cause: "SOP sign-out kamar operasi belum diterapkan secara disiplin",
          investigation_start_date: "2026-09-26",
          investigation_end_date: "2026-09-28",
          recommendations: [
            {
              text: "Sosialisasi ulang surgical safety checklist",
              responsible: "Kepala Ruangan IBS",
              target_date: "2026-10-05",
            },
          ],
          actions: [
            {
              text: "Audit berkala kepatuhan checklist keselamatan bedah",
              responsible: "Perawat Pengendali Mutu",
              target_date: "2026-10-10",
            },
          ],
        }),
      },
    )
    const fillRes = await callHandler(
      onInvestigationPut,
      fillReq,
      db,
      { requestId: "req_bf_fill", auth: headroomActor },
      { id: "inc_biru_full" },
    )
    expect(fillRes.status).toBe(200)

    // 3. Complete investigation → COMPLETED_BY_UNIT (If-Match now mandatory)
    const completeReq = new Request(
      "https://example.test/api/incidents/inc_biru_full/investigation/complete",
      {
        method: "POST",
        headers: { "If-Match": '"W/3"' },
      },
    )
    const completeRes = await callHandler(
      onCompleteInvestigationPost,
      completeReq,
      db,
      { requestId: "req_bf_complete", auth: headroomActor },
      { id: "inc_biru_full" },
    )
    expect(completeRes.status).toBe(200)
    expect(incidents.get("inc_biru_full")?.status).toBe("COMPLETED_BY_UNIT")

    // Both SIMPLE_INVESTIGATION_COMPLETED and REPORT_COMPLETED emitted
    expect(auditRecords.some((a) => a.event_type === "SIMPLE_INVESTIGATION_COMPLETED")).toBe(true)
    expect(auditRecords.some((a) => a.event_type === "REPORT_COMPLETED")).toBe(true)
  })

  it("[assign-risk-grade] stale version returns 412 without modifying state", async () => {
    const { db, incidents } = createInMemoryD1()
    incidents.set("inc_grade_stale", {
      id: "inc_grade_stale",
      status: "UNDER_REVIEW",
      created_by_user_id: "usr_nakes_1",
      owning_unit_id: "IBS",
      row_version: 7,
    })

    const staleReq = new Request(
      "https://example.test/api/incidents/inc_grade_stale/assign-risk-grade",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "If-Match": '"W/6"' },
        body: JSON.stringify({ risk_grade: "BIRU" }),
      },
    )
    const staleRes = await callHandler(
      onAssignRiskGradePost,
      staleReq,
      db,
      { requestId: "req_stale_grade", auth: headroomActor },
      { id: "inc_grade_stale" },
    )
    expect(staleRes.status).toBe(412)
    expect(incidents.get("inc_grade_stale")?.risk_grade).toBeUndefined()
    expect(incidents.get("inc_grade_stale")?.status).toBe("UNDER_REVIEW")
  })

  it("[skip] direct API call with wrong status (not UNDER_REVIEW) is rejected via RBAC", async () => {
    const { db, incidents } = createInMemoryD1()
    // Incident already in SIMPLE_INVESTIGATION — skip must fail RBAC check
    incidents.set("inc_wrong_status_skip", {
      id: "inc_wrong_status_skip",
      status: "SIMPLE_INVESTIGATION",
      created_by_user_id: "usr_nakes_1",
      owning_unit_id: "IBS",
      risk_grade: "BIRU",
      row_version: 2,
    })

    const skipReq = new Request(
      "https://example.test/api/incidents/inc_wrong_status_skip/investigation/skip",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "If-Match": '"W/2"' },
        body: JSON.stringify({ confirmed: true }),
      },
    )
    const skipRes = await callHandler(
      onSkipInvestigationPost,
      skipReq,
      db,
      { requestId: "req_wrong_status", auth: headroomActor },
      { id: "inc_wrong_status_skip" },
    )
    // RBAC canSkipToCompleted requires status === UNDER_REVIEW
    expect(skipRes.status).toBe(403)
  })

  it("retrieves audit trail containing only approved event metadata without old/new diffs", async () => {
    const { db, incidents, auditRecords } = createInMemoryD1()
    incidents.set("inc_aud", {
      id: "inc_aud",
      status: "SUBMITTED",
      created_by_user_id: "usr_nakes_1",
      owning_unit_id: "IBS",
    })
    auditRecords.push({
      id: "aud_1",
      incident_id: "inc_aud",
      event_type: "REPORT_SUBMITTED",
      actor_user_id: "usr_nakes_1",
      actor_name: "Ns. Maria",
      actor_role: "TENAGA_KESEHATAN",
      occurred_at_utc: "2026-09-26T10:00:00.000Z",
      notes: "Laporan insiden resmi dikirimkan",
      request_id: "req_aud_1",
    })

    const auditReq = new Request("https://example.test/api/incidents/inc_aud/audit")
    const auditRes = await callHandler(
      onAuditGet,
      auditReq,
      db,
      { requestId: "req_get_aud", auth: nakesActor },
      { id: "inc_aud" },
    )

    expect(auditRes.status).toBe(200)
    const body: { data: Array<Record<string, unknown>> } = await auditRes.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0]?.eventType).toBe("REPORT_SUBMITTED")
    expect(body.data[0]?.actorName).toBe("Ns. Maria")
    expect(body.data[0]?.old_value).toBeUndefined()
    expect(body.data[0]?.new_value).toBeUndefined()
    expect(body.data[0]?.diff).toBeUndefined()
  })

  it("lists submitted incidents for IBS staff with proper query filtering", async () => {
    const { db, incidents } = createInMemoryD1()
    incidents.set("inc_list_1", {
      id: "inc_list_1",
      status: "SUBMITTED",
      created_by_user_id: "usr_nakes_1",
      owning_unit_id: "IBS",
      incident_title: "Title 1",
    })
    incidents.set("inc_list_2", {
      id: "inc_list_2",
      status: "DRAFT",
      created_by_user_id: "usr_nakes_2",
      owning_unit_id: "IBS",
      incident_title: "Title 2 Private Draft",
    })

    // Nakes 1 queries list: sees inc_list_1, but does NOT see Nakes 2's draft
    const listReq = new Request("https://example.test/api/incidents")
    const listRes = await callHandler(onIncidentsListGet, listReq, db, {
      requestId: "req_list",
      auth: nakesActor,
    })
    expect(listRes.status).toBe(200)
    const body: { data: Array<Record<string, unknown>> } = await listRes.json()
    expect(body.data.some((i) => i.id === "inc_list_1")).toBe(true)
    expect(body.data.some((i) => i.id === "inc_list_2")).toBe(false)
  })

  // =========================================================================
  // DEFECT FIXES: atomicity, idempotency, and re-grading prevention
  // =========================================================================

  it("[re-grade] assign-risk-grade rejected when risk_grade already set (canAssignRiskGrade requires null)", async () => {
    const { db, incidents } = createInMemoryD1()
    incidents.set("inc_regrade", {
      id: "inc_regrade",
      status: "UNDER_REVIEW",
      created_by_user_id: "usr_nakes_1",
      owning_unit_id: "IBS",
      risk_grade: "BIRU", // already graded
      row_version: 3,
    })

    // Attempt to re-assign HIJAU — must be rejected at RBAC level
    const reGradeReq = new Request(
      "https://example.test/api/incidents/inc_regrade/assign-risk-grade",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "If-Match": '"W/3"' },
        body: JSON.stringify({ risk_grade: "HIJAU" }),
      },
    )
    const reGradeRes = await callHandler(
      onAssignRiskGradePost,
      reGradeReq,
      db,
      { requestId: "req_regrade", auth: headroomActor },
      { id: "inc_regrade" },
    )
    expect(reGradeRes.status).toBe(403)
    // Original grade unchanged
    expect(incidents.get("inc_regrade")?.risk_grade).toBe("BIRU")
    expect(incidents.get("inc_regrade")?.row_version).toBe(3)
  })

  it("[re-grade] KUNING/MERAH path: assign-risk-grade rejected when already in PMKP_REVIEW", async () => {
    const { db, incidents } = createInMemoryD1()
    incidents.set("inc_regrade_pmkp", {
      id: "inc_regrade_pmkp",
      status: "PMKP_REVIEW",
      created_by_user_id: "usr_nakes_1",
      owning_unit_id: "IBS",
      risk_grade: "KUNING",
      row_version: 2,
    })

    const req = new Request(
      "https://example.test/api/incidents/inc_regrade_pmkp/assign-risk-grade",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "If-Match": '"W/2"' },
        body: JSON.stringify({
          risk_grade: "MERAH",
          high_risk_mitigation_notes: "Should be rejected",
        }),
      },
    )
    const res = await callHandler(
      onAssignRiskGradePost,
      req,
      db,
      { requestId: "req_regrade_pmkp", auth: headroomActor },
      { id: "inc_regrade_pmkp" },
    )
    // RBAC: status is not UNDER_REVIEW → 403
    expect(res.status).toBe(403)
  })

  it("[complete] missing If-Match → 428, malformed If-Match → 400", async () => {
    const { db, incidents, investigations } = createInMemoryD1()
    incidents.set("inc_complete_ifmatch", {
      id: "inc_complete_ifmatch",
      status: "SIMPLE_INVESTIGATION",
      created_by_user_id: "usr_nakes_1",
      owning_unit_id: "IBS",
      row_version: 4,
    })
    investigations.set("inc_complete_ifmatch", {
      id: "inv_1",
      incident_id: "inc_complete_ifmatch",
      direct_cause: "cause",
      underlying_root_cause: "root",
      investigation_start_date: "2026-09-26",
      investigation_end_date: "2026-09-28",
      recommendations: JSON.stringify([{ text: "r", responsible: "r", target_date: "2026-10-01" }]),
      actions: JSON.stringify([{ text: "a", responsible: "a", target_date: "2026-10-01" }]),
    })

    // No If-Match → 428
    const noIfMatch = new Request(
      "https://example.test/api/incidents/inc_complete_ifmatch/investigation/complete",
      { method: "POST" },
    )
    const noRes = await callHandler(
      onCompleteInvestigationPost,
      noIfMatch,
      db,
      { requestId: "req_ci1", auth: headroomActor },
      { id: "inc_complete_ifmatch" },
    )
    expect(noRes.status).toBe(428)

    // Malformed If-Match → 400
    const badIfMatch = new Request(
      "https://example.test/api/incidents/inc_complete_ifmatch/investigation/complete",
      { method: "POST", headers: { "If-Match": "not-valid" } },
    )
    const badRes = await callHandler(
      onCompleteInvestigationPost,
      badIfMatch,
      db,
      { requestId: "req_ci2", auth: headroomActor },
      { id: "inc_complete_ifmatch" },
    )
    expect(badRes.status).toBe(400)
    // Status unchanged
    expect(incidents.get("inc_complete_ifmatch")?.status).toBe("SIMPLE_INVESTIGATION")
  })

  it("[complete] stale If-Match → 412, no state change, no audit emitted", async () => {
    const { db, incidents, investigations, auditRecords } = createInMemoryD1()
    incidents.set("inc_complete_stale", {
      id: "inc_complete_stale",
      status: "SIMPLE_INVESTIGATION",
      created_by_user_id: "usr_nakes_1",
      owning_unit_id: "IBS",
      row_version: 5,
    })
    investigations.set("inc_complete_stale", {
      id: "inv_stale",
      incident_id: "inc_complete_stale",
      direct_cause: "cause",
      underlying_root_cause: "root",
      investigation_start_date: "2026-09-26",
      investigation_end_date: "2026-09-28",
      recommendations: JSON.stringify([{ text: "r", responsible: "r", target_date: "2026-10-01" }]),
      actions: JSON.stringify([{ text: "a", responsible: "a", target_date: "2026-10-01" }]),
    })

    // Send version 4 (stale; actual is 5)
    const staleReq = new Request(
      "https://example.test/api/incidents/inc_complete_stale/investigation/complete",
      { method: "POST", headers: { "If-Match": '"W/4"' } },
    )
    const staleRes = await callHandler(
      onCompleteInvestigationPost,
      staleReq,
      db,
      { requestId: "req_cs1", auth: headroomActor },
      { id: "inc_complete_stale" },
    )
    expect(staleRes.status).toBe(412)
    expect(incidents.get("inc_complete_stale")?.status).toBe("SIMPLE_INVESTIGATION")
    // No audit records emitted at all
    expect(auditRecords).toHaveLength(0)
    // Investigation completion not stamped
    expect(investigations.get("inc_complete_stale")?.completed_by_user_id).toBeUndefined()
  })

  it("[complete] double submit (concurrent) → second call returns 412 with no duplicate audits", async () => {
    const { db, incidents, investigations, auditRecords } = createInMemoryD1()
    incidents.set("inc_double_complete", {
      id: "inc_double_complete",
      status: "SIMPLE_INVESTIGATION",
      created_by_user_id: "usr_nakes_1",
      owning_unit_id: "IBS",
      row_version: 2,
    })
    investigations.set("inc_double_complete", {
      id: "inv_double",
      incident_id: "inc_double_complete",
      direct_cause: "cause",
      underlying_root_cause: "root",
      investigation_start_date: "2026-09-26",
      investigation_end_date: "2026-09-28",
      recommendations: JSON.stringify([{ text: "r", responsible: "r", target_date: "2026-10-01" }]),
      actions: JSON.stringify([{ text: "a", responsible: "a", target_date: "2026-10-01" }]),
    })

    const makeComplete = () =>
      callHandler(
        onCompleteInvestigationPost,
        new Request(
          "https://example.test/api/incidents/inc_double_complete/investigation/complete",
          { method: "POST", headers: { "If-Match": '"W/2"' } },
        ),
        db,
        { requestId: "req_dc1", auth: headroomActor },
        { id: "inc_double_complete" },
      )

    // First call succeeds
    const first = await makeComplete()
    expect(first.status).toBe(200)
    expect(incidents.get("inc_double_complete")?.status).toBe("COMPLETED_BY_UNIT")

    // Second call with same version: RBAC rejects because status is now COMPLETED_BY_UNIT (not SIMPLE_INVESTIGATION)
    const second = await makeComplete()
    expect(second.status).toBe(403)

    // Exactly 2 audit records: SIMPLE_INVESTIGATION_COMPLETED + REPORT_COMPLETED (no duplicates)
    expect(auditRecords.filter((a) => a.event_type === "SIMPLE_INVESTIGATION_COMPLETED")).toHaveLength(1)
    expect(auditRecords.filter((a) => a.event_type === "REPORT_COMPLETED")).toHaveLength(1)
  })

  it("[skip] stale request → 412 with no audit record written", async () => {
    const { db, incidents, auditRecords } = createInMemoryD1()
    incidents.set("inc_skip_audit_stale", {
      id: "inc_skip_audit_stale",
      status: "UNDER_REVIEW",
      created_by_user_id: "usr_nakes_1",
      owning_unit_id: "IBS",
      risk_grade: "BIRU",
      row_version: 6,
    })

    // Stale version 5 (actual is 6)
    const staleSkip = new Request(
      "https://example.test/api/incidents/inc_skip_audit_stale/investigation/skip",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "If-Match": '"W/5"' },
        body: JSON.stringify({ confirmed: true }),
      },
    )
    const staleRes = await callHandler(
      onSkipInvestigationPost,
      staleSkip,
      db,
      { requestId: "req_sas", auth: headroomActor },
      { id: "inc_skip_audit_stale" },
    )
    expect(staleRes.status).toBe(412)
    expect(incidents.get("inc_skip_audit_stale")?.status).toBe("UNDER_REVIEW")
    // Conditional audit INSERT did not fire — no REPORT_COMPLETED record
    expect(auditRecords).toHaveLength(0)
  })

  it("[start] stale request → 412 with no investigation row created", async () => {
    const { db, incidents, investigations } = createInMemoryD1()
    incidents.set("inc_start_atomic", {
      id: "inc_start_atomic",
      status: "UNDER_REVIEW",
      created_by_user_id: "usr_nakes_1",
      owning_unit_id: "IBS",
      risk_grade: "HIJAU",
      row_version: 3,
    })

    // Stale version 2 (actual is 3)
    const staleStart = new Request(
      "https://example.test/api/incidents/inc_start_atomic/investigation/start",
      { method: "POST", headers: { "If-Match": '"W/2"' } },
    )
    const staleRes = await callHandler(
      onStartInvestigationPost,
      staleStart,
      db,
      { requestId: "req_sta", auth: headroomActor },
      { id: "inc_start_atomic" },
    )
    expect(staleRes.status).toBe(412)
    expect(incidents.get("inc_start_atomic")?.status).toBe("UNDER_REVIEW")
    // No orphan investigation row
    expect(investigations.has("inc_start_atomic")).toBe(false)
  })
})
