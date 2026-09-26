import { afterAll, beforeEach, describe, expect, it } from "vitest"

import {
  loadSyntheticFixtures,
  queryCandidateDatabase,
  resetCandidateDatabase,
  setupCandidateDatabase,
  teardownCandidateDatabase,
} from "./harness"

describe("disposable local D1 candidate harness", () => {
  beforeEach(() => {
    setupCandidateDatabase()
  })

  afterAll(() => {
    teardownCandidateDatabase()
  })

  it("sets up the non-production candidate schema", () => {
    expect(
      queryCandidateDatabase<{ value: string }>(
        "SELECT value FROM harness_meta WHERE key = 'schema_status';",
      ),
    ).toEqual([{ value: "NON_PRODUCTION_DISPOSABLE_CANDIDATE" }])
  })

  it("loads only synthetic fixtures", () => {
    loadSyntheticFixtures()

    expect(
      queryCandidateDatabase<{ id: string; fixture_marker: string }>(
        "SELECT id, fixture_marker FROM synthetic_harness_incidents ORDER BY id;",
      ),
    ).toEqual([
      {
        id: "INC-TEST-001",
        fixture_marker: "SYNTHETIC_TEST_DATA_ONLY",
      },
    ])
  })

  it("resets candidate data and can reload fixtures", () => {
    loadSyntheticFixtures()
    resetCandidateDatabase()

    expect(
      queryCandidateDatabase<{ count: number }>(
        "SELECT COUNT(*) AS count FROM synthetic_harness_incidents;",
      ),
    ).toEqual([{ count: 0 }])

    loadSyntheticFixtures()
    expect(
      queryCandidateDatabase<{ count: number }>(
        "SELECT COUNT(*) AS count FROM synthetic_harness_incidents;",
      ),
    ).toEqual([{ count: 1 }])
  })

  it("enforces synthetic-only fixture constraints", () => {
    expect(() =>
      queryCandidateDatabase(
        "INSERT INTO synthetic_harness_users (id, display_name, role_code) VALUES ('USER-001', 'REAL-LIKE USER', 'TENAGA_KESEHATAN');",
      ),
    ).toThrow()
  })
})
