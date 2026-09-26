import { describe, expect, it } from "vitest"

import { hashPassword, verifyPassword } from "./password"

describe("password hashing abstraction", () => {
  it("hashes password and verifies successfully", async () => {
    const password = "TestPassword#2026"
    const hash = await hashPassword(password)

    expect(hash).toMatch(/^\$pbkdf2-sha256\$i=100000\$[a-f0-9]{32}\$[a-f0-9]{64}$/)

    const isValid = await verifyPassword(password, hash)
    expect(isValid).toBe(true)
  })

  it("rejects incorrect password", async () => {
    const hash = await hashPassword("CorrectPassword#123")
    const isValid = await verifyPassword("WrongPassword#999", hash)
    expect(isValid).toBe(false)
  })

  it("verifies seed accounts generated with deterministic salt", async () => {
    const nakesHash =
      "$pbkdf2-sha256$i=100000$a1b2c3d4e5f607182930415263748596$72463f2817140fe2c65fdb1233191508f959d241e6ccf5948880fb753a33c607"
    expect(await verifyPassword("NakesIbs#2026", nakesHash)).toBe(true)
    expect(await verifyPassword("WrongPassword", nakesHash)).toBe(false)
  })

  it("handles malformed hash string gracefully", async () => {
    expect(await verifyPassword("pass", "invalid-hash-string")).toBe(false)
    expect(await verifyPassword("pass", "$pbkdf2-sha256$malformed")).toBe(false)
  })
})
