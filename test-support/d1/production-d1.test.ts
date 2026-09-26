import { afterAll, beforeAll, describe, expect, it } from "vitest"

import {
  queryProductionDatabase,
  resetProductionDatabase,
  teardownProductionDatabase,
  validateProductionDatabase,
} from "../../database/d1-manager"
import { verifyPassword } from "../../functions/_shared/password"

describe("Production D1 Schema & Foundation Integration", () => {
  beforeAll(() => {
    resetProductionDatabase()
  })

  afterAll(() => {
    teardownProductionDatabase()
  })

  it("applies production migrations and seed successfully", () => {
    expect(validateProductionDatabase()).toBe(true)

    const users = queryProductionDatabase<{ username: string; role: string }>(
      "SELECT username, role FROM users ORDER BY username ASC;",
    )
    expect(users).toEqual([
      { username: "admin_ibs", role: "ADMINISTRATOR" },
      { username: "kepala_ruangan", role: "KEPALA_RUANGAN" },
      { username: "komite_pmkp", role: "KOMITE_PMKP" },
      { username: "nakes_ibs", role: "TENAGA_KESEHATAN" },
    ])
  })

  it("verifies seed passwords against stored hashes using PBKDF2 abstraction", async () => {
    const nakesUser = queryProductionDatabase<{ password_hash: string }>(
      "SELECT password_hash FROM users WHERE username = 'nakes_ibs';",
    )[0]
    expect(nakesUser).toBeDefined()
    if (nakesUser) {
      expect(await verifyPassword("NakesIbs#2026", nakesUser.password_hash)).toBe(true)
      expect(await verifyPassword("WrongPassword", nakesUser.password_hash)).toBe(false)
    }
  })

  it("enforces foreign key constraints on incident creation", () => {
    expect(() =>
      queryProductionDatabase(
        `INSERT INTO incident_reports (
          id, status, created_by_user_id, reporter_name, reporter_role, owning_unit_id,
          incident_datetime, incident_type, incident_target, row_version, created_at, updated_at
        ) VALUES (
          'inc_invalid_fk', 'DRAFT', 'non_existent_user_id', 'Fake Name', 'Perawat', 'IBS',
          '2026-09-26T10:00:00.000Z', 'KNC', 'PASIEN', 1, '2026-09-26T10:00:00.000Z', '2026-09-26T10:00:00.000Z'
        );`,
      ),
    ).toThrow()
  })

  it("enforces strict check constraints on incident_reports status", () => {
    expect(() =>
      queryProductionDatabase(
        `INSERT INTO incident_reports (
          id, status, created_by_user_id, reporter_name, reporter_role, owning_unit_id,
          incident_datetime, incident_type, incident_target, row_version, created_at, updated_at
        ) VALUES (
          'inc_invalid_status', 'ILLEGAL_STATUS', 'usr_nakes_test', 'Ns. Maria', 'Perawat', 'IBS',
          '2026-09-26T10:00:00.000Z', 'KNC', 'PASIEN', 1, '2026-09-26T10:00:00.000Z', '2026-09-26T10:00:00.000Z'
        );`,
      ),
    ).toThrow()
  })

  it("enforces strict check constraints on audit_records minimal 7 events", () => {
    // Valid event insert succeeds
    queryProductionDatabase(
      `INSERT INTO incident_reports (
        id, status, created_by_user_id, reporter_name, reporter_role, owning_unit_id,
        incident_datetime, incident_type, incident_target, row_version, created_at, updated_at
      ) VALUES (
        'inc_audit_test', 'DRAFT', 'usr_nakes_test', 'Ns. Maria', 'Perawat', 'IBS',
        '2026-09-26T10:00:00.000Z', 'KNC', 'PASIEN', 1, '2026-09-26T10:00:00.000Z', '2026-09-26T10:00:00.000Z'
      );`,
    )

    queryProductionDatabase(
      `INSERT INTO audit_records (
        id, incident_id, event_type, actor_user_id, actor_name, actor_role, occurred_at_utc, request_id
      ) VALUES (
        'aud_01', 'inc_audit_test', 'DRAFT_CREATED', 'usr_nakes_test', 'Ns. Maria', 'TENAGA_KESEHATAN',
        '2026-09-26T10:00:00.000Z', 'req_01'
      );`,
    )

    // Unapproved event type is strictly rejected by CHECK constraint
    expect(() =>
      queryProductionDatabase(
        `INSERT INTO audit_records (
          id, incident_id, event_type, actor_user_id, actor_name, actor_role, occurred_at_utc, request_id
        ) VALUES (
          'aud_02', 'inc_audit_test', 'RISK_GRADE_CHANGED', 'usr_nakes_test', 'Ns. Maria', 'TENAGA_KESEHATAN',
          '2026-09-26T10:00:00.000Z', 'req_02'
        );`,
      ),
    ).toThrow()
  })

  it("enforces 1:1 constraint on simple_investigations and date range check", () => {
    // Inserting investigation with end date before start date is rejected
    expect(() =>
      queryProductionDatabase(
        `INSERT INTO simple_investigations (
          id, incident_id, direct_cause, underlying_root_cause, investigation_start_date, investigation_end_date, created_at, updated_at
        ) VALUES (
          'inv_01', 'inc_audit_test', 'Cause', 'Root', '2026-09-26', '2026-09-20', '2026-09-26T10:00:00.000Z', '2026-09-26T10:00:00.000Z'
        );`,
      ),
    ).toThrow()

    // Valid investigation succeeds
    queryProductionDatabase(
      `INSERT INTO simple_investigations (
        id, incident_id, direct_cause, underlying_root_cause, investigation_start_date, investigation_end_date, created_at, updated_at
      ) VALUES (
        'inv_01', 'inc_audit_test', 'Cause', 'Root', '2026-09-20', '2026-09-26', '2026-09-26T10:00:00.000Z', '2026-09-26T10:00:00.000Z'
      );`,
    )

    // Second investigation for same incident violates UNIQUE constraint (1:1 enforced)
    expect(() =>
      queryProductionDatabase(
        `INSERT INTO simple_investigations (
          id, incident_id, direct_cause, underlying_root_cause, investigation_start_date, investigation_end_date, created_at, updated_at
        ) VALUES (
          'inv_02', 'inc_audit_test', 'Cause 2', 'Root 2', '2026-09-20', '2026-09-26', '2026-09-26T10:00:00.000Z', '2026-09-26T10:00:00.000Z'
        );`,
      ),
    ).toThrow()
  })
})
