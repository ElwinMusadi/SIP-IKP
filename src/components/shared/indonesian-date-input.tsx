import { useEffect, useId, useRef, useState } from "react"

import { Input } from "@/components/ui/input"
import {
  formatBackendDate,
  formatBackendDateTime,
  maskIndonesianDate,
  parseIndonesianDate,
  parseIndonesianDateTime,
} from "@/lib/indonesian-date"
import { cn } from "@/lib/utils"

interface IndonesianDateInputProps {
  id?: string
  value: string
  onChange: (backendValue: string) => void
  mode?: "date" | "datetime"
  disabled?: boolean | undefined
  required?: boolean | undefined
  className?: string
  "aria-label"?: string
  "aria-describedby"?: string
}

export function IndonesianDateInput({
  id,
  value,
  onChange,
  mode = "date",
  disabled,
  required,
  className,
  ...ariaProps
}: IndonesianDateInputProps) {
  const generatedId = useId()
  const descriptionId = `${id ?? generatedId}-format`
  const format = mode === "datetime" ? formatBackendDateTime : formatBackendDate
  const parse = mode === "datetime" ? parseIndonesianDateTime : parseIndonesianDate
  const [displayValue, setDisplayValue] = useState(() => format(value))
  const [invalid, setInvalid] = useState(false)
  const lastEmittedValue = useRef(value)

  useEffect(() => {
    if (value !== lastEmittedValue.current) {
      setDisplayValue(format(value))
      setInvalid(false)
    }
    lastEmittedValue.current = value
  }, [format, value])

  const emitValue = (nextValue: string) => {
    lastEmittedValue.current = nextValue
    onChange(nextValue)
  }

  return (
    <>
      <Input
        {...ariaProps}
        aria-describedby={[ariaProps["aria-describedby"], descriptionId].filter(Boolean).join(" ")}
        aria-invalid={invalid || undefined}
        className={cn("h-10 tabular-nums", className)}
        disabled={disabled}
        id={id}
        inputMode="numeric"
        maxLength={mode === "datetime" ? 16 : 10}
        onBlur={() => {
          if (!displayValue) {
            setInvalid(Boolean(required))
            emitValue("")
            return
          }
          const parsed = parse(displayValue)
          setInvalid(!parsed)
          if (parsed) {
            setDisplayValue(format(parsed))
          }
          emitValue(parsed ?? "")
        }}
        onChange={(event) => {
          const masked = maskIndonesianDate(event.target.value, mode === "datetime")
          setDisplayValue(masked)
          setInvalid(false)
          const parsed = parse(masked)
          emitValue(parsed ?? "")
        }}
        placeholder={mode === "datetime" ? "dd/mm/yyyy HH:mm" : "dd/mm/yyyy"}
        required={required}
        type="text"
        value={displayValue}
      />
      <span className="sr-only" id={descriptionId}>
        {mode === "datetime"
          ? "Gunakan format tanggal dan waktu dd/mm/yyyy HH:mm."
          : "Gunakan format tanggal dd/mm/yyyy."}
      </span>
    </>
  )
}
