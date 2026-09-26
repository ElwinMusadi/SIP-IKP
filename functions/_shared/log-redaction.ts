const REDACTED = "[REDACTED]"
const MAX_DEPTH = 8

const sensitiveKeys = new Set([
  "authorization",
  "cookie",
  "setcookie",
  "password",
  "passwordhash",
  "session",
  "sessionid",
  "sessiontoken",
  "csrftoken",
  "token",
  "refreshtoken",
  "patientname",
  "medicalrecordnumber",
  "mrnumber",
  "chronology",
  "r2storagekey",
  "objectkey",
])

function normalizeKey(key: string): string {
  return key.toLowerCase().replaceAll(/[^a-z0-9]/g, "")
}

function isSensitiveKey(key: string): boolean {
  const normalizedKey = normalizeKey(key)
  return sensitiveKeys.has(normalizedKey) || normalizedKey.endsWith("password")
}

function redactValue(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (depth > MAX_DEPTH) {
    return "[MAX_DEPTH]"
  }

  if (value === null || typeof value !== "object") {
    return value
  }

  if (seen.has(value)) {
    return "[CIRCULAR]"
  }

  seen.add(value)

  if (value instanceof Headers) {
    const headerObject: Record<string, string> = {}
    value.forEach((headerValue, headerName) => {
      headerObject[headerName] = headerValue
    })
    return redactValue(headerObject, depth + 1, seen)
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, depth + 1, seen))
  }

  const redactedEntries = Object.entries(value).map(([key, item]) => [
    key,
    isSensitiveKey(key) ? REDACTED : redactValue(item, depth + 1, seen),
  ])

  return Object.fromEntries(redactedEntries)
}

/** Baseline application logging protection; not a complete compliance control. */
export function redactForLogging(value: unknown): unknown {
  return redactValue(value, 0, new WeakSet())
}

export interface SafeLogRecord {
  event: string
  requestId: string
  timestamp: string
  [key: string]: unknown
}

export function createSafeLogRecord(
  event: string,
  requestId: string,
  details: Record<string, unknown> = {},
  now: () => Date = () => new Date(),
): SafeLogRecord {
  return redactForLogging({
    event,
    requestId,
    timestamp: now().toISOString(),
    ...details,
  }) as SafeLogRecord
}
