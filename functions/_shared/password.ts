const HASH_PREFIX = "$pbkdf2-sha256$i="
const ITERATIONS = 100_000
const KEY_LEN_BYTES = 32
const SALT_LEN_BYTES = 16

function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

function hexToBuffer(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error("Invalid hex string length.")
  }
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16)
  }
  return bytes
}

export async function hashPassword(password: string, providedSalt?: Uint8Array): Promise<string> {
  const salt = providedSalt ?? crypto.getRandomValues(new Uint8Array(SALT_LEN_BYTES))
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  )

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as unknown as ArrayBuffer,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    KEY_LEN_BYTES * 8,
  )

  const saltHex = bufferToHex(salt)
  const hashHex = bufferToHex(derivedBits)

  return `${HASH_PREFIX}${String(ITERATIONS)}$${saltHex}$${hashHex}`
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash.startsWith(HASH_PREFIX)) {
    return false
  }

  const parts = storedHash.slice(1).split("$")
  // parts: ["pbkdf2-sha256", "i=100000", "<saltHex>", "<hashHex>"]
  if (parts.length !== 4) {
    return false
  }

  const iterationsPart = parts[1]
  const saltHex = parts[2]
  const expectedHashHex = parts[3]

  if (!iterationsPart || !saltHex || !expectedHashHex) {
    return false
  }

  const iterations = Number.parseInt(iterationsPart.replace("i=", ""), 10)
  if (Number.isNaN(iterations) || iterations < 10_000) {
    return false
  }

  const salt = hexToBuffer(saltHex)
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  )

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as unknown as ArrayBuffer,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    KEY_LEN_BYTES * 8,
  )

  const calculatedHashHex = bufferToHex(derivedBits)

  // Constant-time string equality
  if (calculatedHashHex.length !== expectedHashHex.length) {
    return false
  }

  let mismatch = 0
  for (let i = 0; i < calculatedHashHex.length; i++) {
    mismatch |= calculatedHashHex.charCodeAt(i) ^ expectedHashHex.charCodeAt(i)
  }

  return mismatch === 0
}
