import { describe, expect, it, vi } from "vitest"

import type { CloudflareEnv } from "../../../src/types/cloudflare-env"
import type { AuthSessionContext } from "../../_shared/session"
import { onRequestGet as onRecapGet } from "./recap"

type RecapContext = Parameters<typeof onRecapGet>[0]

const nakesUser: AuthSessionContext = {
  user: {
    id: "usr_nakes_1",
    username: "nakes_ibs",
    fullName: "Ns. Maria G. Klau",
    role: "TENAGA_KESEHATAN",
    profession: "Perawat Bedah",
    unitId: "IBS",
    isActive: true,
  },
  session: {
    id: "ses_1",
    csrfToken: "csrf_1",
    idleExpiresInSeconds: 900,
    absoluteExpiresInSeconds: 36000,
  },
}

interface MockIncident {
  id: string
  report_number: string | null
  status: string
  created_by_user_id: string
  owning_unit_id: string
  incident_datetime: string
  incident_timezone: string
  incident_title: string | null
  incident_type: string
  incident_target: string
  incident_location: string | null
  clinical_specialization: string | null
  causing_unit: string | null
  patient_impact: string | null
  risk_grade: string | null
  is_overdue_sla: number
  created_at: string
  submitted_at: string | null
  completed_at: string | null
}

function createMockRecapD1(items: MockIncident[] = []) {
  return {
    prepare(sql: string) {
      let boundParams: unknown[] = []
      return {
        bind(...params: unknown[]) {
          boundParams = params
          return this
        },
        async all() {
          const userId = boundParams[0] as string

          // Filter by IBS unit and draft privacy rule
          let filtered = items.filter(
            (item) =>
              item.owning_unit_id === "IBS" &&
              (item.status !== "DRAFT" || item.created_by_user_id === userId),
          )

          let paramIdx = 1

          if (sql.includes("incident_datetime >=")) {
            const start = boundParams[paramIdx++] as string
            filtered = filtered.filter((i) => i.incident_datetime >= start)
          }

          if (sql.includes("incident_datetime <=")) {
            const end = boundParams[paramIdx++] as string
            filtered = filtered.filter((i) => i.incident_datetime <= end)
          }

          if (sql.includes("incident_type = ?")) {
            const type = boundParams[paramIdx++] as string
            filtered = filtered.filter((i) => i.incident_type === type)
          }

          if (sql.includes("risk_grade = ?")) {
            const grade = boundParams[paramIdx++] as string
            filtered = filtered.filter((i) => i.risk_grade === grade)
          } else if (sql.includes("risk_grade IS NULL")) {
            filtered = filtered.filter((i) => i.risk_grade === null)
          }

          if (sql.includes("status = ?")) {
            const st = boundParams[paramIdx++] as string
            filtered = filtered.filter((i) => i.status === st)
          }

          if (sql.includes("incident_target = ?")) {
            const target = boundParams[paramIdx] as string
            filtered = filtered.filter((i) => i.incident_target === target)
          }

          return { results: filtered }
        },
      }
    },
  } as unknown as D1Database
}

describe("Operational Reporting Recap API (GET /api/reports/recap)", () => {
  const sampleIncidents: MockIncident[] = [
    {
      id: "inc_01",
      report_number: "IKP/IBS/202609/0001",
      status: "SUBMITTED",
      created_by_user_id: "usr_nakes_1",
      owning_unit_id: "IBS",
      incident_datetime: "2026-09-10T08:00:00.000Z",
      incident_timezone: "Asia/Makassar",
      incident_title: "Insiden A KNC",
      incident_type: "KNC",
      incident_target: "PASIEN",
      incident_location: "OK 1",
      clinical_specialization: "Bedah Umum",
      causing_unit: "IBS",
      patient_impact: "Tidak Ada Cedera",
      risk_grade: "BIRU",
      is_overdue_sla: 0,
      created_at: "2026-09-10T08:00:00.000Z",
      submitted_at: "2026-09-10T09:00:00.000Z",
      completed_at: null,
    },
    {
      id: "inc_02",
      report_number: "IKP/IBS/202609/0002",
      status: "COMPLETED",
      created_by_user_id: "usr_nakes_1",
      owning_unit_id: "IBS",
      incident_datetime: "2026-09-15T10:00:00.000Z",
      incident_timezone: "Asia/Makassar",
      incident_title: "Insiden B KTD",
      incident_type: "KTD",
      incident_target: "PASIEN",
      incident_location: "OK 2",
      clinical_specialization: "Ortopedi",
      causing_unit: "IBS",
      patient_impact: "Cedera Sedang",
      risk_grade: "KUNING",
      is_overdue_sla: 1,
      created_at: "2026-09-15T10:00:00.000Z",
      submitted_at: "2026-09-17T14:00:00.000Z",
      completed_at: "2026-09-20T10:00:00.000Z",
    },
    {
      id: "inc_03",
      report_number: null,
      status: "DRAFT",
      created_by_user_id: "usr_nakes_2",
      owning_unit_id: "IBS",
      incident_datetime: "2026-09-20T12:00:00.000Z",
      incident_timezone: "Asia/Makassar",
      incident_title: "Private Draft Nakes 2",
      incident_type: "KTC",
      incident_target: "KARYAWAN_NAKES",
      incident_location: "PACU",
      clinical_specialization: "Anestesi",
      causing_unit: "IBS",
      patient_impact: "Tidak Ada Cedera",
      risk_grade: null,
      is_overdue_sla: 0,
      created_at: "2026-09-20T12:00:00.000Z",
      submitted_at: null,
      completed_at: null,
    },
  ]

  it("rejects unauthenticated request with 401", async () => {
    const db = createMockRecapD1(sampleIncidents)
    const request = new Request("https://example.test/api/reports/recap")

    const res = await onRecapGet({
      request,
      env: { DB: db, APP_ENV: "test" } as unknown as CloudflareEnv,
      params: {},
      data: { requestId: "req_test", auth: null },
      functionPath: "functions/api/reports/recap.ts",
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
      async next() {
        return new Response(null)
      },
    } as unknown as RecapContext)

    expect(res.status).toBe(401)
  })

  it("calculates correct summary metrics and enforces draft privacy", async () => {
    const db = createMockRecapD1(sampleIncidents)
    const request = new Request("https://example.test/api/reports/recap")

    // Nakes 1 queries: sees inc_01 (submitted) and inc_02 (completed); does NOT see Nakes 2's draft
    const res = await onRecapGet({
      request,
      env: { DB: db, APP_ENV: "test" } as unknown as CloudflareEnv,
      params: {},
      data: { requestId: "req_recap_1", auth: nakesUser },
      functionPath: "functions/api/reports/recap.ts",
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
      async next() {
        return new Response(null)
      },
    } as unknown as RecapContext)

    expect(res.status).toBe(200)
    const body: {
      data: {
        summary: {
          totalReports: number
          byIncidentType: { KNC: number; KTD: number; KTC: number; SENTINEL: number }
          byRiskGrade: { BIRU: number; KUNING: number }
          bySla: { onTime: number; overdue: number }
        }
        items: Array<{ id: string; patient_name?: unknown; chronology?: unknown }>
      }
    } = await res.json()

    expect(body.data.summary.totalReports).toBe(2)
    expect(body.data.summary.byIncidentType.KNC).toBe(1)
    expect(body.data.summary.byIncidentType.KTD).toBe(1)
    expect(body.data.summary.byIncidentType.KTC).toBe(0)
    expect(body.data.summary.byRiskGrade.BIRU).toBe(1)
    expect(body.data.summary.byRiskGrade.KUNING).toBe(1)
    expect(body.data.summary.bySla.onTime).toBe(1)
    expect(body.data.summary.bySla.overdue).toBe(1)

    // Verify reporting privacy: patient name and chronology must NEVER be returned in recap items
    expect(body.data.items[0]?.patient_name).toBeUndefined()
    expect(body.data.items[0]?.chronology).toBeUndefined()
  })

  it("filters operational recap by date range", async () => {
    const db = createMockRecapD1(sampleIncidents)
    const request = new Request(
      "https://example.test/api/reports/recap?startDate=2026-09-01&endDate=2026-09-12",
    )

    const res = await onRecapGet({
      request,
      env: { DB: db, APP_ENV: "test" } as unknown as CloudflareEnv,
      params: {},
      data: { requestId: "req_recap_2", auth: nakesUser },
      functionPath: "functions/api/reports/recap.ts",
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
      async next() {
        return new Response(null)
      },
    } as unknown as RecapContext)

    expect(res.status).toBe(200)
    const body: {
      data: {
        summary: { totalReports: number }
        items: Array<{ id: string }>
      }
    } = await res.json()

    // Only inc_01 falls in 2026-09-01 to 2026-09-12
    expect(body.data.summary.totalReports).toBe(1)
    expect(body.data.items[0]?.id).toBe("inc_01")
  })

  it("filters operational recap by risk grade and incident type", async () => {
    const db = createMockRecapD1(sampleIncidents)
    const request = new Request(
      "https://example.test/api/reports/recap?riskGrade=KUNING&incidentType=KTD",
    )

    const res = await onRecapGet({
      request,
      env: { DB: db, APP_ENV: "test" } as unknown as CloudflareEnv,
      params: {},
      data: { requestId: "req_recap_3", auth: nakesUser },
      functionPath: "functions/api/reports/recap.ts",
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
      async next() {
        return new Response(null)
      },
    } as unknown as RecapContext)

    expect(res.status).toBe(200)
    const body: {
      data: {
        summary: { totalReports: number }
        items: Array<{ id: string; incident_type: string; risk_grade: string }>
      }
    } = await res.json()

    expect(body.data.summary.totalReports).toBe(1)
    expect(body.data.items[0]?.incident_type).toBe("KTD")
    expect(body.data.items[0]?.risk_grade).toBe("KUNING")
  })
})
