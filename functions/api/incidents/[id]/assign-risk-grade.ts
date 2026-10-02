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

  // If-Match is mandatory for concurrency safety
  const ifMatchHeader = request.headers.get("If-Match")
  if (!ifMatchHeader) {
    return problemResponse(
      {
        status: 428,
        code: "PRECONDITION_REQUIRED",
        title: "Header If-Match Wajib",
        detail:
          "Header If-Match wajib disertakan untuk mencegah pembaruan bersamaan yang tidak terdeteksi.",
        instance: url.pathname,
      },
      requestId,
    )
  }

  const versionMatch = /^"W\/(\d+)"$/.exec(ifMatchHeader)
  if (!versionMatch?.[1]) {
    return problemResponse(
      {
        status: 400,
        code: "INVALID_IF_MATCH",
        title: "Format If-Match Tidak Valid",
        detail: 'Header If-Match harus dalam format "W/<version>", misalnya "W/3".',
        instance: url.pathname,
      },
      requestId,
    )
  }
  const expectedVersion = Number.parseInt(versionMatch[1], 10)

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

  // BIRU/HIJAU: stay UNDER_REVIEW so Kepala Ruangan can choose to start or skip investigation.
  // KUNING/MERAH: move to PMKP_REVIEW immediately.
  const nextStatus =
    riskGrade === "BIRU" || riskGrade === "HIJAU" ? "UNDER_REVIEW" : "PMKP_REVIEW"

  // Atomic guarded update: WHERE id=? AND row_version=? AND status='UNDER_REVIEW'
  // If row_version has changed since the client last read, changes=0 → 412.
  const updateResult = await env.DB.prepare(
    `UPDATE incident_reports SET
      status = ?,
      risk_grade = ?,
      risk_graded_at = ?,
      high_risk_mitigation_notes = ?,
      row_version = ?,
      updated_at = ?
    WHERE id = ? AND row_version = ? AND status = 'UNDER_REVIEW'`,
  )
    .bind(
      nextStatus,
      riskGrade,
      nowIso,
      mitigationNotes || null,
      nextVersion,
      nowIso,
      incidentId,
      expectedVersion,
    )
    .run()

  if (!updateResult.meta.changes || updateResult.meta.changes === 0) {
    return problemResponse(
      {
        status: 412,
        code: "PRECONDITION_FAILED",
        title: "Konflik Versi Data (Concurrency Error)",
        detail:
          "Data telah diubah oleh sesi lain atau status tidak lagi UNDER_REVIEW. Muat ulang halaman untuk mendapatkan versi terbaru.",
        instance: url.pathname,
      },
      requestId,
    )
  }

  const updatedReport = await env.DB.prepare("SELECT * FROM incident_reports WHERE id = ? LIMIT 1;")
    .bind(incidentId)
    .first<IncidentReportRow>()

  return jsonResponse(updatedReport, requestId, 200, {
    ETag: `"W/${String(nextVersion)}"`,
  })
}
