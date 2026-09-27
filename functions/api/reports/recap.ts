import type { CloudflareEnv } from "../../../src/types/cloudflare-env"
import type { RequestContextData } from "../../_shared/request-context"
import { jsonResponse, problemResponse } from "../../_shared/response"

interface RecapItem {
  id: string
  report_number: string | null
  status: string
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

export const onRequestGet: PagesFunction<CloudflareEnv, string, RequestContextData> = async ({
  env,
  data,
  request,
}) => {
  const requestId = data.requestId
  const url = new URL(request.url)
  const auth = data.auth

  if (!auth) {
    return problemResponse(
      {
        status: 401,
        code: "AUTHENTICATION_REQUIRED",
        title: "Otentikasi Diperlukan",
        detail: "Sesi otentikasi tidak ditemukan atau telah berakhir.",
        instance: url.pathname,
      },
      requestId,
    )
  }

  const user = auth.user
  const params = url.searchParams
  const startDate = params.get("startDate")?.trim() ?? ""
  const endDate = params.get("endDate")?.trim() ?? ""
  const incidentType = params.get("incidentType")?.trim() ?? ""
  const riskGrade = params.get("riskGrade")?.trim() ?? ""
  const status = params.get("status")?.trim() ?? ""
  const incidentTarget = params.get("incidentTarget")?.trim() ?? ""

  let query = `
    SELECT
      id, report_number, status, incident_datetime, incident_timezone,
      incident_title, incident_type, incident_target, incident_location,
      clinical_specialization, causing_unit, patient_impact, risk_grade,
      is_overdue_sla, created_at, submitted_at, completed_at
    FROM incident_reports
    WHERE owning_unit_id = 'IBS'
  `
  const sqlBindings: unknown[] = []

  // Drafts strictly private to created_by; non-drafts visible in IBS scope
  query += ` AND (status != 'DRAFT' OR created_by_user_id = ?)`
  sqlBindings.push(user.id)

  if (startDate) {
    // If date-only YYYY-MM-DD, match from beginning of that date
    const formattedStart = startDate.length === 10 ? `${startDate}T00:00:00.000Z` : startDate
    query += ` AND incident_datetime >= ?`
    sqlBindings.push(formattedStart)
  }

  if (endDate) {
    // If date-only YYYY-MM-DD, match through end of that date
    const formattedEnd = endDate.length === 10 ? `${endDate}T23:59:59.999Z` : endDate
    query += ` AND incident_datetime <= ?`
    sqlBindings.push(formattedEnd)
  }

  if (incidentType) {
    query += ` AND incident_type = ?`
    sqlBindings.push(incidentType)
  }

  if (riskGrade) {
    if (riskGrade === "UNASSIGNED") {
      query += ` AND risk_grade IS NULL`
    } else {
      query += ` AND risk_grade = ?`
      sqlBindings.push(riskGrade)
    }
  }

  if (status) {
    query += ` AND status = ?`
    sqlBindings.push(status)
  }

  if (incidentTarget) {
    query += ` AND incident_target = ?`
    sqlBindings.push(incidentTarget)
  }

  query += ` ORDER BY incident_datetime DESC, created_at DESC;`

  const result = await env.DB.prepare(query)
    .bind(...sqlBindings)
    .all<RecapItem>()
  const items = result.results

  // Compute operational summary metrics
  const totalReports = items.length

  const byIncidentType = {
    KNC: 0,
    KTC: 0,
    KTD: 0,
    SENTINEL: 0,
  }

  const byRiskGrade = {
    BIRU: 0,
    HIJAU: 0,
    KUNING: 0,
    MERAH: 0,
    UNASSIGNED: 0,
  }

  const byStatus: Record<string, number> = {}

  let slaOnTimeCount = 0
  let slaOverdueCount = 0

  for (const item of items) {
    // By incident type
    if (item.incident_type in byIncidentType) {
      byIncidentType[item.incident_type as keyof typeof byIncidentType] += 1
    }

    // By risk grade
    if (item.risk_grade && item.risk_grade in byRiskGrade) {
      byRiskGrade[item.risk_grade as keyof typeof byRiskGrade] += 1
    } else {
      byRiskGrade.UNASSIGNED += 1
    }

    // By status
    byStatus[item.status] = (byStatus[item.status] ?? 0) + 1

    // By SLA
    if (item.is_overdue_sla === 1) {
      slaOverdueCount += 1
    } else {
      slaOnTimeCount += 1
    }
  }

  return jsonResponse(
    {
      summary: {
        totalReports,
        byIncidentType,
        byRiskGrade,
        byStatus,
        bySla: {
          onTime: slaOnTimeCount,
          overdue: slaOverdueCount,
        },
      },
      items,
      filters: {
        startDate: startDate || null,
        endDate: endDate || null,
        incidentType: incidentType || null,
        riskGrade: riskGrade || null,
        status: status || null,
        incidentTarget: incidentTarget || null,
      },
    },
    requestId,
  )
}
