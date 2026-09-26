import type { AuthenticatedUser } from "./session"

export const ALLOWED_AUDIT_EVENTS = [
  "DRAFT_CREATED",
  "REPORT_SUBMITTED",
  "REVISION_REQUIRED",
  "SIMPLE_INVESTIGATION_COMPLETED",
  "REPORT_COMPLETED",
  "EMERGENCY_CORRECTION",
] as const

export type AuditEventType = (typeof ALLOWED_AUDIT_EVENTS)[number]

export interface AuditRecordRow {
  id: string
  incident_id: string
  event_type: AuditEventType
  actor_user_id: string
  actor_name: string
  actor_role: string
  occurred_at_utc: string
  notes: string | null
  request_id: string
}

export interface RecordAuditEventOptions {
  incidentId: string
  eventType: AuditEventType
  actor: Pick<AuthenticatedUser, "id" | "fullName" | "role">
  requestId: string
  notes?: string | null
  occurredAt?: string
}

export function isValidAuditEventType(type: string): type is AuditEventType {
  return (ALLOWED_AUDIT_EVENTS as readonly string[]).includes(type)
}

/**
 * Returns a D1PreparedStatement to allow atomic inclusion inside db.batch()
 */
export function createAuditPreparedStatement(
  db: D1Database,
  options: RecordAuditEventOptions,
): D1PreparedStatement {
  const eventTypeString = options.eventType as string
  if (!isValidAuditEventType(eventTypeString)) {
    throw new Error(`Unauthorized audit event type: ${eventTypeString}`)
  }

  const id = crypto.randomUUID()
  const occurredAt = options.occurredAt ?? new Date().toISOString()
  const notes = options.notes ?? null

  return db
    .prepare(
      `INSERT INTO audit_records (
        id, incident_id, event_type, actor_user_id, actor_name, actor_role, occurred_at_utc, notes, request_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      options.incidentId,
      options.eventType,
      options.actor.id,
      options.actor.fullName,
      options.actor.role,
      occurredAt,
      notes,
      options.requestId,
    )
}

export async function insertAuditEvent(
  db: D1Database,
  options: RecordAuditEventOptions,
): Promise<void> {
  const statement = createAuditPreparedStatement(db, options)
  await statement.run()
}

export async function queryIncidentAuditRecords(
  db: D1Database,
  incidentId: string,
): Promise<AuditRecordRow[]> {
  const result = await db
    .prepare(
      `SELECT id, incident_id, event_type, actor_user_id, actor_name, actor_role, occurred_at_utc, notes, request_id
       FROM audit_records
       WHERE incident_id = ?
       ORDER BY occurred_at_utc ASC, id ASC`,
    )
    .bind(incidentId)
    .all<AuditRecordRow>()

  return result.results
}
