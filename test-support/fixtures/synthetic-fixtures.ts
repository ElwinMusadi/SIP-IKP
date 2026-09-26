export const SYNTHETIC_FIXTURE_MARKER = "SYNTHETIC_TEST_DATA_ONLY" as const

export interface SyntheticUserFixture {
  id: string
  displayName: string
  role: "TENAGA_KESEHATAN" | "KEPALA_RUANGAN" | "KOMITE_PMKP" | "ADMINISTRATOR"
}

export interface SyntheticIncidentFixture {
  id: string
  patientReference: string
  medicalRecordReference: string
  title: string
  marker: typeof SYNTHETIC_FIXTURE_MARKER
}

export interface SyntheticFixtureSet {
  users: readonly SyntheticUserFixture[]
  incident: SyntheticIncidentFixture
}

export function createSyntheticFixtureSet(): SyntheticFixtureSet {
  return {
    users: [
      {
        id: "USER-TEST-NURSE",
        displayName: "SYNTHETIC TEST NURSE",
        role: "TENAGA_KESEHATAN",
      },
      {
        id: "USER-TEST-HEADROOM",
        displayName: "SYNTHETIC TEST HEADROOM",
        role: "KEPALA_RUANGAN",
      },
      {
        id: "USER-TEST-PMKP",
        displayName: "SYNTHETIC TEST PMKP",
        role: "KOMITE_PMKP",
      },
      {
        id: "USER-TEST-ADMIN",
        displayName: "SYNTHETIC TEST ADMIN",
        role: "ADMINISTRATOR",
      },
    ],
    incident: {
      id: "INC-TEST-001",
      patientReference: "PATIENT-TEST-001",
      medicalRecordReference: "MR-TEST-001",
      title: "SYNTHETIC TEST INCIDENT",
      marker: SYNTHETIC_FIXTURE_MARKER,
    },
  }
}
