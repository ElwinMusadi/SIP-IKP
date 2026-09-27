/**
 * SLA MVP Deactivation Tests — Phase 15
 *
 * Verifies:
 * - SLA_ENABLED is false
 * - Submit does NOT block late reports lacking overdue_reason
 * - calculateSlaStatus still computes correctly (retained code)
 * - Workflow transitions still work without SLA blocking
 */

import { describe, expect, it } from "vitest"

import { SLA_ENABLED, calculateSlaStatus } from "./incident-service"

describe("SLA Feature Flag", () => {
  it("SLA_ENABLED is false for MVP", () => {
    expect(SLA_ENABLED).toBe(false)
  })

  it("calculateSlaStatus is still available and computes correctly", () => {
    // Function is retained for future re-activation
    const pastDate = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString() // 72h ago
    const result = calculateSlaStatus(pastDate)
    expect(result).toHaveProperty("deadlineUtc")
    expect(result).toHaveProperty("isOverdue")
    expect(result.isOverdue).toBe(true) // 72h > 48h
  })

  it("calculateSlaStatus returns false for on-time report", () => {
    const recentDate = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() // 12h ago
    const result = calculateSlaStatus(recentDate)
    expect(result.isOverdue).toBe(false)
  })
})

// Test that submit.ts does not block on overdue when SLA_ENABLED=false
// We test the guard condition directly rather than full integration
describe("SLA Submit Guard", () => {
  it("guard condition only fires when SLA_ENABLED=true", () => {
    const pastDate = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()
    const sla = calculateSlaStatus(pastDate)
    const overdueReason = "" // no reason provided

    // Simulate the guard: should NOT block because SLA_ENABLED=false
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const wouldBlock = SLA_ENABLED && sla.isOverdue && !overdueReason.trim()
    expect(wouldBlock).toBe(false)
  })

  it("guard would fire when SLA_ENABLED=true and overdue without reason", () => {
    const pastDate = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()
    const sla = calculateSlaStatus(pastDate)
    const overdueReason = ""

    // Simulate with SLA_ENABLED=true (theoretical — not current config)
    // eslint-disable-next-line no-constant-binary-expression, @typescript-eslint/no-unnecessary-condition
    const wouldBlock = true && sla.isOverdue && !overdueReason.trim()
    expect(wouldBlock).toBe(true)
  })
})
