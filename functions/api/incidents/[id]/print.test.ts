import { describe, expect, it, vi } from "vitest"

import type { CloudflareEnv } from "../../../../src/types/cloudflare-env"
import type { AuthSessionContext } from "../../../_shared/session"
import { onRequestGet as onPrintGet } from "./print"

type PrintContext = Parameters<typeof onPrintGet>[0]

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
    csrfToken: "csrf_a",
    idleExpiresInSeconds: 900,
    absoluteExpiresInSeconds: 36000,
  },
}

const nakesB: AuthSessionContext = {
  user: {
    id: "usr_nakes_b",
    username: "nakes_b",
    fullName: "Ns. Anton",
    role: "TENAGA_KESEHATAN",
    profession: "Perawat Bedah",
    unitId: "IBS",
    isActive: true,
  },
  session: {
    id: "ses_b",
    csrfToken: "csrf_b",
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

function createMockPrintD1() {
  const incidents = new Map<string, Record<string, unknown>>()
  const investigations = new Map<string, Record<string, unknown>>()
  const snapshots = new Map<string, Record<string, unknown>>()
  const auditRecords: Array<Record<string, unknown>> = []

  return {
    incidents,
    investigations,
    snapshots,
    auditRecords,
    db: {
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
            return null
          },
          async all() {
            if (sql.includes("FROM audit_records") && sql.includes("incident_id = ?")) {
              const id = boundParams[0] as string
              const list = auditRecords.filter((a) => a.incident_id === id)
              return { results: list }
            }
            return { results: [] }
          },
        }
      },
    } as unknown as D1Database,
  }
}

describe("Incident Print / Formal Document API (GET /api/incidents/:id/print)", () => {
  it("rejects unauthenticated request with 401", async () => {
    const { db } = createMockPrintD1()
    const request = new Request("https://example.test/api/incidents/inc_1/print")

    const res = await onPrintGet({
      request,
      env: { DB: db, APP_ENV: "test" } as unknown as CloudflareEnv,
      params: { id: "inc_1" },
      data: { requestId: "req_p1", auth: null },
      functionPath: "functions/api/incidents/[id]/print.ts",
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
      async next() {
        return new Response(null)
      },
    } as unknown as PrintContext)

    expect(res.status).toBe(401)
  })

  it("returns 404 when incident does not exist", async () => {
    const { db } = createMockPrintD1()
    const request = new Request("https://example.test/api/incidents/non_existent/print")

    const res = await onPrintGet({
      request,
      env: { DB: db, APP_ENV: "test" } as unknown as CloudflareEnv,
      params: { id: "non_existent" },
      data: { requestId: "req_p2", auth: nakesA },
      functionPath: "functions/api/incidents/[id]/print.ts",
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
      async next() {
        return new Response(null)
      },
    } as unknown as PrintContext)

    expect(res.status).toBe(404)
  })

  it("denies print view of a private draft to another user with 403", async () => {
    const { db, incidents } = createMockPrintD1()
    incidents.set("inc_draft_1", {
      id: "inc_draft_1",
      status: "DRAFT",
      created_by_user_id: "usr_nakes_a",
      owning_unit_id: "IBS",
      incident_title: "Private Draft Nakes A",
    })

    const request = new Request("https://example.test/api/incidents/inc_draft_1/print")
    const res = await onPrintGet({
      request,
      env: { DB: db, APP_ENV: "test" } as unknown as CloudflareEnv,
      params: { id: "inc_draft_1" },
      data: { requestId: "req_p3", auth: nakesB },
      functionPath: "functions/api/incidents/[id]/print.ts",
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
      async next() {
        return new Response(null)
      },
    } as unknown as PrintContext)

    expect(res.status).toBe(403)
  })

  it("returns full clinical print payload for authorized clinical roles", async () => {
    const { db, incidents, investigations, snapshots, auditRecords } = createMockPrintD1()

    incidents.set("inc_formal_1", {
      id: "inc_formal_1",
      report_number: "IKP/IBS/202609/0001",
      status: "COMPLETED_BY_UNIT",
      created_by_user_id: "usr_nakes_a",
      reporter_name: "Ns. Maria G. Klau",
      reporter_role: "Perawat Bedah",
      owning_unit_id: "IBS",
      patient_name: "Tn. Yohanes Bria",
      medical_record_number: "MR-112233",
      patient_room: "OK 1",
      admission_datetime: "2026-09-25T08:00:00.000Z",
      incident_datetime: "2026-09-26T09:00:00.000Z",
      incident_title: "Diskrepansi kassa",
      chronology: "Urutan kejadian lengkap 5W+1H...",
      incident_type: "KNC",
      risk_grade: "BIRU",
      is_overdue_sla: 0,
      row_version: 3,
    })

    investigations.set("inc_formal_1", {
      id: "inv_1",
      incident_id: "inc_formal_1",
      direct_cause: "Label kassa pudar",
      underlying_root_cause: "SOP depo belum optimal",
      investigation_start_date: "2026-09-26",
      investigation_end_date: "2026-09-27",
      recommendations: JSON.stringify([
        { text: "Rekomendasi 1", responsible: "Kasubag", target_date: "2026-10-01" },
      ]),
      actions: JSON.stringify([
        { text: "Tindakan 1", responsible: "Staf", target_date: "2026-10-02" },
      ]),
      completed_by_user_id: "usr_headroom",
      completed_at: "2026-09-27T10:00:00.000Z",
    })

    snapshots.set("inc_formal_1", {
      incident_id: "inc_formal_1",
      report_number: "IKP/IBS/202609/0001",
      patient_name: "Tn. Yohanes Bria",
      medical_record_number: "MR-112233",
      submitted_at: "2026-09-26T10:00:00.000Z",
    })

    auditRecords.push({
      id: "aud_1",
      incident_id: "inc_formal_1",
      event_type: "REPORT_SUBMITTED",
      actor_user_id: "usr_nakes_a",
      actor_name: "Ns. Maria G. Klau",
      actor_role: "TENAGA_KESEHATAN",
      occurred_at_utc: "2026-09-26T10:00:00.000Z",
      notes: "Laporan resmi dikirim",
      request_id: "req_sub",
    })

    const request = new Request("https://example.test/api/incidents/inc_formal_1/print")
    const res = await onPrintGet({
      request,
      env: { DB: db, APP_ENV: "test" } as unknown as CloudflareEnv,
      params: { id: "inc_formal_1" },
      data: { requestId: "req_p4", auth: headroomActor },
      functionPath: "functions/api/incidents/[id]/print.ts",
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
      async next() {
        return new Response(null)
      },
    } as unknown as PrintContext)

    expect(res.status).toBe(200)
    const body: {
      data: {
        report: { patient_name: string; chronology: string; report_number: string }
        investigation: { direct_cause: string }
        submissionSnapshot: { report_number: string }
        auditRecords: Array<{ eventType: string }>
        printedAt: string
      }
    } = await res.json()

    expect(body.data.report.report_number).toBe("IKP/IBS/202609/0001")
    expect(body.data.report.patient_name).toBe("Tn. Yohanes Bria")
    expect(body.data.report.chronology).toBe("Urutan kejadian lengkap 5W+1H...")
    expect(body.data.investigation.direct_cause).toBe("Label kassa pudar")
    expect(body.data.submissionSnapshot.report_number).toBe("IKP/IBS/202609/0001")
    expect(body.data.auditRecords).toHaveLength(1)
    expect(body.data.printedAt).toBeDefined()
  })

  it("sanitizes patient PII and clinical narratives when printed by Administrator", async () => {
    const { db, incidents } = createMockPrintD1()
    incidents.set("inc_admin_print", {
      id: "inc_admin_print",
      report_number: "IKP/IBS/202609/0002",
      status: "SUBMITTED",
      created_by_user_id: "usr_nakes_a",
      owning_unit_id: "IBS",
      patient_name: "Confidential Patient X",
      medical_record_number: "MR-CONFIDENTIAL",
      chronology: "Sensitive surgical incident details...",
      incident_type: "KTD",
      incident_datetime: "2026-09-26T10:00:00.000Z",
    })

    const request = new Request("https://example.test/api/incidents/inc_admin_print/print")
    const res = await onPrintGet({
      request,
      env: { DB: db, APP_ENV: "test" } as unknown as CloudflareEnv,
      params: { id: "inc_admin_print" },
      data: { requestId: "req_p5", auth: adminActor },
      functionPath: "functions/api/incidents/[id]/print.ts",
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
      async next() {
        return new Response(null)
      },
    } as unknown as PrintContext)

    expect(res.status).toBe(200)
    const body: {
      data: {
        report: {
          report_number: string
          incident_type: string
          patient_name?: unknown
          medical_record_number?: unknown
          chronology?: unknown
        }
      }
    } = await res.json()

    // Operational metadata is present
    expect(body.data.report.report_number).toBe("IKP/IBS/202609/0002")
    expect(body.data.report.incident_type).toBe("KTD")

    // Sensitive patient PII and clinical narrative are stripped
    expect(body.data.report.patient_name).toBeUndefined()
    expect(body.data.report.medical_record_number).toBeUndefined()
    expect(body.data.report.chronology).toBeUndefined()
  })
})
