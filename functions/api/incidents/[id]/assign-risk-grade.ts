import type { CloudflareEnv } from "../../../../src/types/cloudflare-env"
import {
  RISK_GRADES,
  type IncidentReportRow,
  type RiskGrade,
} from "../../../_shared/incident-service"
import { canAssignRiskGrade } from "../../../_shared/rbac"
import type { RequestContextData } from "../../../_shared/request-context"
import { jsonResponse, problemResponse } from "../../../_shared/response"

export const onRequestPost: PagesFunction<CloudflareEnv, "id", RequestContextData> = async ({
  env,
  data,
  params,
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

  const incidentId = typeof params.id === "string" ? params.id : (params.id[0] ?? "")
  const report = await env.DB.prepare("SELECT * FROM incident_reports WHERE id = ? LIMIT 1;")
    .bind(incidentId)
    .first<IncidentReportRow>()

  if (!report) {
    return problemResponse(
      {
        status: 404,
        code: "INCIDENT_NOT_FOUND",
        title: "Laporan Tidak Ditemukan",
        detail: "Laporan insiden dengan ID yang ditentukan tidak ditemukan.",
        instance: url.pathname,
      },
      requestId,
    )
  }

  const user = auth.user
  if (!canAssignRiskGrade(user, report)) {
    return problemResponse(
      {
        status: 403,
        code: "FORBIDDEN",
        title: "Akses Ditolak",
        detail:
          "Hanya Kepala Ruangan IBS yang dapat menetapkan pita grading risiko pada status UNDER_REVIEW.",
        instance: url.pathname,
      },
      requestId,
    )
  }

  let body: Record<string, unknown> = {}
  try {
    const raw: unknown = await request.json()
    if (typeof raw === "object" && raw !== null) {
      body = raw as Record<string, unknown>
    }
  } catch {
    return problemResponse(
      {
        status: 400,
        code: "MALFORMED_REQUEST",
        title: "Permintaan Tidak Valid",
        detail: "Format JSON pada request body tidak valid.",
        instance: url.pathname,
      },
      requestId,
    )
  }

  const riskGrade = body.risk_grade as RiskGrade
  if (!RISK_GRADES.includes(riskGrade)) {
    return problemResponse(
      {
        status: 422,
        code: "INVALID_RISK_GRADE",
        title: "Pita Grading Risiko Tidak Valid",
        detail: "Grading risiko harus salah satu dari: BIRU, HIJAU, KUNING, atau MERAH.",
        instance: url.pathname,
        errors: [
          {
            path: "risk_grade",
            code: "INVALID_ENUM",
            message: "Pilih salah satu pita risiko yang sah.",
          },
        ],
      },
      requestId,
    )
  }

  const mitigationNotes =
    typeof body.high_risk_mitigation_notes === "string"
      ? body.high_risk_mitigation_notes.trim()
      : ""

  if ((riskGrade === "KUNING" || riskGrade === "MERAH") && !mitigationNotes) {
    return problemResponse(
      {
        status: 422,
        code: "MITIGATION_NOTES_REQUIRED",
        title: "Catatan Awal Mitigasi Wajib Diisi",
        detail:
          "Untuk insiden dengan risiko tinggi (KUNING / MERAH), catatan awal mitigasi atau tindakan pencegahan segera wajib diisi.",
        instance: url.pathname,
        errors: [
          {
            path: "high_risk_mitigation_notes",
            code: "REQUIRED_WHEN_HIGH_RISK",
            message: "Catatan awal mitigasi wajib diisi untuk risiko Kuning atau Merah.",
          },
        ],
      },
      requestId,
    )
  }

  const nowIso = new Date().toISOString()
  const nextVersion = report.row_version + 1
  const nextStatus =
    riskGrade === "BIRU" || riskGrade === "HIJAU" ? "SIMPLE_INVESTIGATION" : "PMKP_REVIEW"

  const statements: D1PreparedStatement[] = []

  // 1. Update incident report status and risk grade
  statements.push(
    env.DB.prepare(
      `UPDATE incident_reports SET
        status = ?,
        risk_grade = ?,
        risk_graded_at = ?,
        high_risk_mitigation_notes = ?,
        row_version = ?,
        updated_at = ?
      WHERE id = ?`,
    ).bind(nextStatus, riskGrade, nowIso, mitigationNotes || null, nextVersion, nowIso, incidentId),
  )

  // 2. If BIRU/HIJAU, initialize simple_investigations row if not exists
  if (nextStatus === "SIMPLE_INVESTIGATION") {
    statements.push(
      env.DB.prepare(
        `INSERT OR IGNORE INTO simple_investigations (
          id, incident_id, recommendations, actions, created_at, updated_at
        ) VALUES (?, ?, '[]', '[]', ?, ?)`,
      ).bind(crypto.randomUUID(), incidentId, nowIso, nowIso),
    )
  }

  await env.DB.batch(statements)

  const updatedReport = await env.DB.prepare("SELECT * FROM incident_reports WHERE id = ? LIMIT 1;")
    .bind(incidentId)
    .first<IncidentReportRow>()

  return jsonResponse(updatedReport, requestId, 200, {
    ETag: `"W/${String(nextVersion)}"`,
  })
}
