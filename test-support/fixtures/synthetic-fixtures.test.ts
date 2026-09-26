import { describe, expect, it } from "vitest"

import { createSyntheticFixtureSet, SYNTHETIC_FIXTURE_MARKER } from "./synthetic-fixtures"

describe("synthetic fixture foundation", () => {
  it("creates deterministic synthetic identifiers", () => {
    expect(createSyntheticFixtureSet()).toEqual(createSyntheticFixtureSet())
    expect(createSyntheticFixtureSet().incident).toMatchObject({
      id: "INC-TEST-001",
      patientReference: "PATIENT-TEST-001",
      medicalRecordReference: "MR-TEST-001",
      marker: SYNTHETIC_FIXTURE_MARKER,
    })
  })

  it("marks every fixture as test-only data", () => {
    const fixture = createSyntheticFixtureSet()

    expect(fixture.users.every((user) => user.id.includes("TEST"))).toBe(true)
    expect(fixture.users.every((user) => user.displayName.includes("SYNTHETIC TEST"))).toBe(true)
    expect(fixture.incident.marker).toBe("SYNTHETIC_TEST_DATA_ONLY")
  })
})
