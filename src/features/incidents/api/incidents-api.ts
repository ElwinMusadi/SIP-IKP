import type { InvestigationFormData } from "../schemas/incident-form-schema"
import type {
  AuditRecord,
  IncidentReport,
  MasterDataPayload,
  SimpleInvestigation,
} from "../types/incident"

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = "Terjadi kesalahan saat memproses permintaan."
    try {
      const problem: { detail?: string; message?: string } = await res.json()
      if (problem.detail) {
        errorDetail = problem.detail
      } else if (problem.message) {
        errorDetail = problem.message
      }
    } catch {
      // fallback error
    }
    throw new Error(errorDetail)
  }

  const payload: { data: T } = await res.json()
  return payload.data
}

export async function fetchMasterData(): Promise<MasterDataPayload> {
  const res = await fetch("/api/master-data")
  return handleResponse<MasterDataPayload>(res)
}

export async function fetchIncidents(status?: string): Promise<IncidentReport[]> {
  const url = status ? `/api/incidents?status=${encodeURIComponent(status)}` : "/api/incidents"
  const res = await fetch(url)
  return handleResponse<IncidentReport[]>(res)
}

export async function fetchIncidentById(id: string): Promise<IncidentReport> {
  const res = await fetch(`/api/incidents/${id}`)
  return handleResponse<IncidentReport>(res)
}

export async function createDraft(
  data: Partial<IncidentReport>,
  csrfToken?: string,
): Promise<IncidentReport> {
  const res = await fetch("/api/incidents", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
    },
    body: JSON.stringify(data),
  })
  return handleResponse<IncidentReport>(res)
}

export async function saveDraft(
  id: string,
  data: Partial<IncidentReport>,
  rowVersion: number,
  csrfToken?: string,
): Promise<IncidentReport> {
  const res = await fetch(`/api/incidents/${id}/draft`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "If-Match": `"W/${String(rowVersion)}"`,
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
    },
    body: JSON.stringify({ ...data, row_version: rowVersion }),
  })
  return handleResponse<IncidentReport>(res)
}

export async function deleteDraft(id: string, csrfToken?: string): Promise<{ deleted: boolean }> {
  const res = await fetch(`/api/incidents/${id}`, {
    method: "DELETE",
    headers: {
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
    },
  })
  return handleResponse<{ deleted: boolean }>(res)
}

export async function submitIncident(id: string, csrfToken?: string): Promise<IncidentReport> {
  const res = await fetch(`/api/incidents/${id}/submit`, {
    method: "POST",
    headers: {
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
    },
  })
  return handleResponse<IncidentReport>(res)
}

export async function receiveIncident(id: string, csrfToken?: string): Promise<IncidentReport> {
  const res = await fetch(`/api/incidents/${id}/receive`, {
    method: "POST",
    headers: {
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
    },
  })
  return handleResponse<IncidentReport>(res)
}

export async function requestRevision(
  id: string,
  revisionReason?: string,
  csrfToken?: string,
): Promise<IncidentReport> {
  const res = await fetch(`/api/incidents/${id}/revision-required`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
    },
    body: JSON.stringify({ revision_reason: revisionReason }),
  })
  return handleResponse<IncidentReport>(res)
}

export async function assignRiskGrade(
  id: string,
  riskGrade: string,
  highRiskMitigationNotes?: string,
  csrfToken?: string,
): Promise<IncidentReport> {
  const res = await fetch(`/api/incidents/${id}/assign-risk-grade`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
    },
    body: JSON.stringify({
      risk_grade: riskGrade,
      high_risk_mitigation_notes: highRiskMitigationNotes,
    }),
  })
  return handleResponse<IncidentReport>(res)
}

export async function emergencyCorrection(
  id: string,
  reason: string,
  fields: Partial<IncidentReport>,
  csrfToken?: string,
): Promise<IncidentReport> {
  const res = await fetch(`/api/incidents/${id}/emergency-correction`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
    },
    body: JSON.stringify({ reason, fields }),
  })
  return handleResponse<IncidentReport>(res)
}

export async function fetchInvestigation(id: string): Promise<SimpleInvestigation | null> {
  const res = await fetch(`/api/incidents/${id}/investigation`)
  return handleResponse<SimpleInvestigation | null>(res)
}

export async function saveInvestigation(
  id: string,
  data: InvestigationFormData,
  csrfToken?: string,
): Promise<SimpleInvestigation> {
  const res = await fetch(`/api/incidents/${id}/investigation`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
    },
    body: JSON.stringify(data),
  })
  return handleResponse<SimpleInvestigation>(res)
}

export async function completeInvestigation(
  id: string,
  csrfToken?: string,
): Promise<IncidentReport> {
  const res = await fetch(`/api/incidents/${id}/investigation/complete`, {
    method: "POST",
    headers: {
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
    },
  })
  return handleResponse<IncidentReport>(res)
}

export async function fetchPmkpReview(
  id: string,
): Promise<{ pmkp_reviewed: boolean; pmkp_review_notes: string | null }> {
  const res = await fetch(`/api/incidents/${id}/pmkp-review`)
  return handleResponse<{ pmkp_reviewed: boolean; pmkp_review_notes: string | null }>(res)
}

export async function savePmkpReview(
  id: string,
  reviewNotes: string,
  csrfToken?: string,
): Promise<{ pmkp_reviewed: boolean; pmkp_review_notes: string | null }> {
  const res = await fetch(`/api/incidents/${id}/pmkp-review`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
    },
    body: JSON.stringify({ pmkp_review_notes: reviewNotes }),
  })
  return handleResponse<{ pmkp_reviewed: boolean; pmkp_review_notes: string | null }>(res)
}

export async function finalizePmkpReview(id: string, csrfToken?: string): Promise<IncidentReport> {
  const res = await fetch(`/api/incidents/${id}/pmkp-review/finalize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
    },
    body: JSON.stringify({ confirmed: true }),
  })
  return handleResponse<IncidentReport>(res)
}

export async function fetchIncidentAudit(id: string): Promise<AuditRecord[]> {
  const res = await fetch(`/api/incidents/${id}/audit`)
  return handleResponse<AuditRecord[]>(res)
}
