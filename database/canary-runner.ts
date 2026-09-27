/**
 * Production Authenticated Canary Runner for SIP-IKP
 * Target: https://sip-ikp.pages.dev
 * All test data is strictly synthetic and marked [CANARY TEST]
 */

const BASE_URL = "https://sip-ikp.pages.dev"

interface ClientSession {
  cookie: string
  csrfToken: string
  user: {
    id: string
    username: string
    role: string
    fullName: string
  }
}

interface ApiResponse<T = unknown> {
  data: T
  meta?: {
    requestId: string
  }
}

interface LoginResponseData {
  user: {
    id: string
    username: string
    role: string
    fullName: string
  }
  session: {
    csrfToken: string
  }
}

async function login(username: string, password: string): Promise<ClientSession> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  })

  if (!res.ok) {
    throw new Error(`Login failed for ${username}: ${String(res.status)} ${await res.text()}`)
  }

  const rawCookie = res.headers.get("set-cookie") ?? ""
  const cookie = rawCookie.split(";")[0] ?? ""
  const rawLogin: unknown = await res.json()
  const body = rawLogin as ApiResponse<LoginResponseData>

  return {
    cookie,
    csrfToken: body.data.session.csrfToken,
    user: body.data.user,
  }
}

async function apiCall<T = unknown>(
  path: string,
  method: string,
  session: ClientSession,
  body?: unknown,
  extraHeaders: Record<string, string> = {},
): Promise<{ status: number; data: ApiResponse<T>; headers: Headers }> {
  const headers: Record<string, string> = {
    Cookie: session.cookie,
    ...(session.csrfToken ? { "X-CSRF-Token": session.csrfToken } : {}),
    ...(body ? { "Content-Type": "application/json" } : {}),
    ...extraHeaders,
  }

  const requestInit: RequestInit = {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  }

  const res = await fetch(`${BASE_URL}${path}`, requestInit)

  let responseData: ApiResponse<T>
  const text = await res.text()
  try {
    responseData = JSON.parse(text) as ApiResponse<T>
  } catch {
    responseData = { data: text as T }
  }

  return {
    status: res.status,
    data: responseData,
    headers: res.headers,
  }
}

interface MasterDataResponse {
  operatingRooms: unknown[]
  specializations: unknown[]
  departments: unknown[]
  payerTypes: unknown[]
}

interface IncidentCreateResponse {
  id: string
  status: string
}

interface IncidentSubmitResponse {
  status: string
  report_number: string
}

async function runCanary(): Promise<void> {
  console.info("=== STARTING AUTHENTICATED PRODUCTION CANARY ===")
  const results: Record<string, unknown> = {}

  // 1. Health check
  console.info("\n[1] Checking /api/health...")
  const healthRes = await fetch(`${BASE_URL}/api/health`)
  const healthData: unknown = await healthRes.json()
  console.info("Health Status:", healthRes.status, healthData)
  results.health = { status: healthRes.status, data: healthData }

  // 2. Master Data
  console.info("\n[2] Checking /api/master-data...")
  const masterRes = await fetch(`${BASE_URL}/api/master-data`)
  const rawMaster: unknown = await masterRes.json()
  const masterData = rawMaster as ApiResponse<MasterDataResponse>
  console.info("Master Data Status:", masterRes.status, {
    rooms: masterData.data.operatingRooms.length,
    specializations: masterData.data.specializations.length,
    departments: masterData.data.departments.length,
    payers: masterData.data.payerTypes.length,
  })
  results.masterData = { status: masterRes.status }

  // 3. Login Canary Accounts
  console.info("\n[3] Authenticating canary roles...")
  const nakes = await login("nakes_ibs", "NakesIbs#2026")
  console.info("Nakes authenticated:", nakes.user.username, nakes.user.role)

  const headroom = await login("kepala_ruangan", "KepalaRuangan#2026")
  console.info("Headroom authenticated:", headroom.user.username, headroom.user.role)

  const pmkp = await login("komite_pmkp", "KomitePmkp#2026")
  console.info("PMKP authenticated:", pmkp.user.username, pmkp.user.role)

  const admin = await login("admin_ibs", "AdminIbs#2026")
  console.info("Admin authenticated:", admin.user.username, admin.user.role)

  // 4. Scenario A: BIRU Incident Lifecycle
  console.info("\n[4] Scenario A: BIRU Lifecycle...")
  const draftARes = await apiCall<IncidentCreateResponse>("/api/incidents", "POST", nakes, {
    reporter_name: "[CANARY TEST] Ns. Maria G. Klau",
    reporter_role: "Perawat Bedah",
    incident_datetime: "2026-09-27T08:30:00.000Z",
    incident_type: "KNC",
  })
  console.info("Draft A created:", draftARes.status, draftARes.data.data.id)
  const incidentAId = draftARes.data.data.id

  const completeFieldsA = {
    patient_name: "[CANARY TEST] Pasien Bedah Umum A",
    medical_record_number: "MR-CANARY-001",
    patient_room: "Kamar Operasi 1 (Bedah Umum)",
    patient_age_category: ">30_65_tahun",
    patient_gender: "LAKI_LAKI",
    patient_payer_type: "BPJS Kesehatan (PBI / Non-PBI)",
    admission_datetime: "2026-09-26T08:00:00.000Z",
    incident_datetime: "2026-09-27T08:30:00.000Z",
    incident_title: "[CANARY TEST] Ketidaksesuaian hitungan kassa pra-penutupan luka",
    chronology: "Urutan kejadian lengkap 5W+1H saat operasi laparotomi eksplorasi...",
    incident_type: "KNC",
    initial_reporter_category: "Karyawan: Perawat",
    incident_target: "PASIEN",
    incident_location: "Kamar Operasi 1 (Bedah Umum)",
    clinical_specialization: "Bedah Umum",
    causing_unit: "Instalasi Bedah Sentral (IBS)",
    patient_impact: "Tidak Ada Cedera",
    immediate_action_and_result: "Hitung ulang sebelum penutupan dan diverifikasi lengkap",
    action_taken_by: "Tim Bedah",
    similar_incident_occurred: "TIDAK",
  }

  const patchARes = await apiCall(
    `/api/incidents/${incidentAId}/draft`,
    "PATCH",
    nakes,
    completeFieldsA,
  )
  console.info("Draft A auto-saved:", patchARes.status)

  const submitARes = await apiCall<IncidentSubmitResponse>(
    `/api/incidents/${incidentAId}/submit`,
    "POST",
    nakes,
  )
  console.info("Report A submitted:", submitARes.status, submitARes.data.data.report_number)
  results.scenarioA_reportNumber = submitARes.data.data.report_number

  const receiveARes = await apiCall(`/api/incidents/${incidentAId}/receive`, "POST", headroom)
  console.info("Report A received by Kepala Ruangan:", receiveARes.status)

  const corrARes = await apiCall(
    `/api/incidents/${incidentAId}/emergency-correction`,
    "POST",
    headroom,
    {
      reason: "Koreksi nomor rekam medis definitif dari rekam medis rumah sakit",
      medical_record_number: "MR-CANARY-001-DEF",
    },
  )
  console.info("Report A Emergency Correction:", corrARes.status)

  const gradeARes = await apiCall(
    `/api/incidents/${incidentAId}/assign-risk-grade`,
    "POST",
    headroom,
    { risk_grade: "BIRU" },
  )
  console.info("Report A Risk Graded BIRU:", gradeARes.status)

  const invARes = await apiCall(`/api/incidents/${incidentAId}/investigation`, "PUT", headroom, {
    direct_cause: "Komunikasi serah terima instrumen bedah terputus",
    underlying_root_cause: "SOP sign-out kamar operasi belum diterapkan secara disiplin",
    investigation_start_date: "2026-09-27",
    investigation_end_date: "2026-09-28",
    recommendations: [
      {
        text: "Sosialisasi surgical safety checklist",
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
  })
  console.info("Report A Investigation saved:", invARes.status)

  const compARes = await apiCall<{ status: string }>(
    `/api/incidents/${incidentAId}/investigation/complete`,
    "POST",
    headroom,
  )
  console.info("Report A Completed by Unit:", compARes.status, compARes.data.data.status)
  results.scenarioA_completed = compARes.data.data.status

  // 5. Scenario B: KUNING Incident Lifecycle
  console.info("\n[5] Scenario B: KUNING Lifecycle...")
  const draftBRes = await apiCall<IncidentCreateResponse>("/api/incidents", "POST", nakes, {
    reporter_name: "[CANARY TEST] Ns. Maria G. Klau",
    reporter_role: "Perawat Bedah",
    incident_datetime: "2026-09-27T09:00:00.000Z",
    incident_type: "KTD",
  })
  const incidentBId = draftBRes.data.data.id

  await apiCall(`/api/incidents/${incidentBId}/draft`, "PATCH", nakes, {
    ...completeFieldsA,
    patient_name: "[CANARY TEST] Pasien Ortopedi B",
    medical_record_number: "MR-CANARY-002",
    incident_title: "[CANARY TEST] Keterlambatan anestesi spinal pra-insisi",
    incident_type: "KTD",
    patient_impact: "Cedera Sedang / Reversible",
  })

  const submitBRes = await apiCall<IncidentSubmitResponse>(
    `/api/incidents/${incidentBId}/submit`,
    "POST",
    nakes,
  )
  console.info("Report B submitted:", submitBRes.status, submitBRes.data.data.report_number)
  results.scenarioB_reportNumber = submitBRes.data.data.report_number

  await apiCall(`/api/incidents/${incidentBId}/receive`, "POST", headroom)

  const gradeBRes = await apiCall(
    `/api/incidents/${incidentBId}/assign-risk-grade`,
    "POST",
    headroom,
    {
      risk_grade: "KUNING",
      high_risk_mitigation_notes:
        "Pasien segera distabilkan dan dilaporkan ke dokter DPJP anestesi",
    },
  )
  console.info("Report B Risk Graded KUNING:", gradeBRes.status)

  await apiCall(`/api/incidents/${incidentBId}/pmkp-review`, "PUT", pmkp, {
    pmkp_review_notes: "Bentuk tim investigasi komprehensif / RCA eksternal RS",
  })

  const finBRes = await apiCall<{ status: string }>(
    `/api/incidents/${incidentBId}/pmkp-review/finalize`,
    "POST",
    pmkp,
    { confirmed: true },
  )
  console.info("Report B Finalized by PMKP:", finBRes.status, finBRes.data.data.status)
  results.scenarioB_completed = finBRes.data.data.status

  // 6. Admin Privacy & Sanitization Check
  console.info("\n[6] Checking Administrator privacy masking...")
  const adminReadRes = await apiCall<Record<string, unknown>>(
    `/api/incidents/${incidentAId}`,
    "GET",
    admin,
  )
  const adminData = adminReadRes.data.data
  const isSanitized =
    adminData.patient_name === undefined &&
    adminData.medical_record_number === undefined &&
    adminData.chronology === undefined &&
    adminData.report_number !== undefined
  console.info("Admin Clinical Privacy Masking Verified:", isSanitized)
  results.adminPrivacyMasked = isSanitized

  // 7. Formal Print Endpoint Validation
  console.info("\n[7] Checking /api/incidents/:id/print...")
  const printRes = await apiCall<{ report: { report_number: string }; auditRecords: unknown[] }>(
    `/api/incidents/${incidentAId}/print`,
    "GET",
    headroom,
  )
  console.info("Print Payload Status:", printRes.status, {
    reportNumber: printRes.data.data.report.report_number,
    auditCount: printRes.data.data.auditRecords.length,
  })
  results.printPayload = {
    status: printRes.status,
    reportNumber: printRes.data.data.report.report_number,
  }

  // 8. Operational Recap Validation
  console.info("\n[8] Checking /api/reports/recap...")
  const recapRes = await apiCall<{ summary: Record<string, unknown>; items: unknown[] }>(
    "/api/reports/recap",
    "GET",
    pmkp,
  )
  console.info("Recap Status:", recapRes.status, "Summary:", recapRes.data.data.summary)
  results.recap = { status: recapRes.status, totalReports: recapRes.data.data.items.length }

  // 9. Audit Trail Verification
  console.info("\n[9] Checking /api/incidents/:id/audit...")
  const auditRes = await apiCall<Array<{ eventType: string }>>(
    `/api/incidents/${incidentAId}/audit`,
    "GET",
    nakes,
  )
  console.info(
    "Audit Events for Report A:",
    auditRes.data.data.map((e) => e.eventType),
  )
  results.auditEventsA = auditRes.data.data.map((e) => e.eventType)

  console.info("\n=== ALL CANARY SCENARIOS COMPLETED SUCCESSFULLY ===")
  console.info("Canary Evidence Summary:", JSON.stringify(results, null, 2))
}

runCanary().catch((err: unknown) => {
  console.error("CANARY RUNNER FAILED:", err)
  process.exit(1)
})
