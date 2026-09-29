const DATE_PATTERN = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
const DATE_TIME_PATTERN = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2})$/

function isValidParts(year: number, month: number, day: number, hour = 0, minute = 0): boolean {
  if (year < 1000 || month < 1 || month > 12 || hour > 23 || minute > 59) return false
  const date = new Date(year, month - 1, day, hour, minute)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

export function parseIndonesianDate(value: string): string | null {
  const match = DATE_PATTERN.exec(value)
  if (!match) return null
  const dayText = match[1] ?? ""
  const monthText = match[2] ?? ""
  const yearText = match[3] ?? ""
  const day = Number(dayText)
  const month = Number(monthText)
  const year = Number(yearText)
  return isValidParts(year, month, day)
    ? `${yearText}-${monthText.padStart(2, "0")}-${dayText.padStart(2, "0")}`
    : null
}

export function parseIndonesianDateTime(value: string): string | null {
  const match = DATE_TIME_PATTERN.exec(value)
  if (!match) return null
  const dayText = match[1] ?? ""
  const monthText = match[2] ?? ""
  const yearText = match[3] ?? ""
  const hourText = match[4] ?? ""
  const minuteText = match[5] ?? ""
  const day = Number(dayText)
  const month = Number(monthText)
  const year = Number(yearText)
  const hour = Number(hourText)
  const minute = Number(minuteText)
  return isValidParts(year, month, day, hour, minute)
    ? `${yearText}-${monthText.padStart(2, "0")}-${dayText.padStart(2, "0")}T${hourText.padStart(2, "0")}:${minuteText.padStart(2, "0")}`
    : null
}

export function formatBackendDate(value: string | null | undefined): string {
  if (!value) return ""
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return ""
  const year = match[1] ?? ""
  const month = match[2] ?? ""
  const day = match[3] ?? ""
  return `${day}/${month}/${year}`
}

export function formatBackendDateTime(value: string | null | undefined): string {
  if (!value) return ""
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(value)
  if (!match) return ""
  const year = match[1] ?? ""
  const month = match[2] ?? ""
  const day = match[3] ?? ""
  const hour = match[4] ?? ""
  const minute = match[5] ?? ""
  return `${day}/${month}/${year} ${hour}:${minute}`
}

export function maskIndonesianDate(value: string, withTime = false): string {
  if (value.includes("/")) {
    const sanitized = value
      .replace(withTime ? /[^\d/: ]/g : /[^\d/]/g, "")
      .replace(/\s+/g, " ")
    const [datePart = "", typedTime = ""] = sanitized.split(" ", 2)
    const parts = datePart.split("/")
    const day = (parts[0] ?? "").slice(0, 2)
    let month = parts[1] ?? ""
    let year = parts[2] ?? ""

    // Continue auto-masking when the separators were inserted by a previous keystroke.
    if (parts.length === 2 && day.length === 2 && month.length > 2) {
      year = month.slice(2)
      month = month.slice(0, 2)
    }
    month = month.slice(0, 2)

    let carriedTime = typedTime
    if (withTime && parts.length >= 3 && year.length > 4) {
      carriedTime = `${year.slice(4)}${typedTime}`
      year = year.slice(0, 4)
    } else {
      year = year.slice(0, 4)
    }

    const visiblePartCount = year ? 3 : Math.min(parts.length, 2)
    const date = [day, month, year].slice(0, visiblePartCount).join("/")
    if (!withTime || (!carriedTime && year.length < 4)) return date

    const timeParts = carriedTime.split(":", 2)
    const hour = (timeParts[0] ?? "").replace(/\D/g, "").slice(0, 2)
    const minute = (timeParts[1] ?? "").replace(/\D/g, "").slice(0, 2)
    const time = timeParts.length > 1 ? `${hour}:${minute}` : hour
    return time ? `${date} ${time}` : date
  }
  const digits = value.replace(/\D/g, "").slice(0, withTime ? 12 : 8)
  const date = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join("/")
  if (!withTime || digits.length <= 8) return date
  return `${date} ${digits.slice(8, 10)}${digits.length > 10 ? `:${digits.slice(10, 12)}` : ""}`
}
