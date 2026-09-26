export const REQUEST_ID_HEADER = "X-Request-ID"

const REQUEST_ID_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9._:-]{6,62}[A-Za-z0-9])?$/
const MAX_REQUEST_ID_LENGTH = 64
const MIN_REQUEST_ID_LENGTH = 8

export function isValidRequestId(value: string | null | undefined): value is string {
  if (!value) {
    return false
  }

  return (
    value.length >= MIN_REQUEST_ID_LENGTH &&
    value.length <= MAX_REQUEST_ID_LENGTH &&
    REQUEST_ID_PATTERN.test(value)
  )
}

export function resolveRequestId(
  candidate: string | null | undefined,
  generate: () => string = () => crypto.randomUUID(),
): string {
  return isValidRequestId(candidate) ? candidate : generate()
}
