import { useEffect, useId, useRef, useState } from "react"
import { IconCalendar, IconClock } from "@tabler/icons-react"
import { id as idLocale } from "react-day-picker/locale"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
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
  const [open, setOpen] = useState(false)
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

  const selectedDate = (() => {
    if (!value) return undefined
    const datePart = value.slice(0, 10)
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart)
    if (!match) return undefined
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  })()

  const timeValue = mode === "datetime" && value.includes("T") ? value.slice(11, 16) : ""

  const handleCalendarSelect = (date: Date | undefined) => {
    if (!date) return
    const year = String(date.getFullYear())
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const nextValue =
      mode === "datetime" ? `${year}-${month}-${day}T${timeValue || "00:00"}` : `${year}-${month}-${day}`
    setDisplayValue(format(nextValue))
    setInvalid(false)
    emitValue(nextValue)
    if (mode === "date") setOpen(false)
  }

  const handleTimeChange = (nextTime: string) => {
    if (!selectedDate || !/^\d{2}:\d{2}$/.test(nextTime)) return
    const year = String(selectedDate.getFullYear())
    const month = String(selectedDate.getMonth() + 1).padStart(2, "0")
    const day = String(selectedDate.getDate()).padStart(2, "0")
    const nextValue = `${year}-${month}-${day}T${nextTime}`
    setDisplayValue(format(nextValue))
    setInvalid(false)
    emitValue(nextValue)
  }

  return (
    <>
      <div className={cn("relative", className)}>
        <Input
          {...ariaProps}
          aria-describedby={[ariaProps["aria-describedby"], descriptionId].filter(Boolean).join(" ")}
          aria-invalid={invalid || undefined}
          className="h-10 pr-11 tabular-nums"
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
            if (parsed) setDisplayValue(format(parsed))
            emitValue(parsed ?? "")
          }}
          onChange={(event) => {
            const masked = maskIndonesianDate(event.target.value, mode === "datetime")
            setDisplayValue(masked)
            setInvalid(false)
            emitValue(parse(masked) ?? "")
          }}
          placeholder={mode === "datetime" ? "dd/mm/yyyy HH:mm" : "dd/mm/yyyy"}
          required={required}
          type="text"
          value={displayValue}
        />
        <Popover onOpenChange={setOpen} open={open}>
          <PopoverTrigger
            disabled={disabled}
            render={
              <Button
                aria-label={mode === "datetime" ? "Pilih tanggal dan waktu" : "Pilih tanggal"}
                className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground"
                size="icon-sm"
                type="button"
                variant="ghost"
              />
            }
          >
            <IconCalendar />
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-0">
            <PopoverTitle className="sr-only">
              {mode === "datetime" ? "Pilih tanggal dan waktu" : "Pilih tanggal"}
            </PopoverTitle>
            <Calendar
              captionLayout="dropdown"
              {...(selectedDate ? { defaultMonth: selectedDate, selected: selectedDate } : {})}
              locale={idLocale}
              mode="single"
              onSelect={handleCalendarSelect}
            />
            {mode === "datetime" && (
              <div className="border-t p-3">
                <label className="flex flex-col gap-1.5 text-xs font-medium" htmlFor={`${id ?? generatedId}-time`}>
                  Waktu
                  <span className="relative">
                    <Input
                      className="h-9 pr-9 tabular-nums"
                      disabled={!selectedDate}
                      id={`${id ?? generatedId}-time`}
                      onChange={(event) => {
                        handleTimeChange(event.target.value)
                      }}
                      step="60"
                      type="time"
                      value={timeValue}
                    />
                    <IconClock className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  </span>
                </label>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
      <span className="sr-only" id={descriptionId}>
        {mode === "datetime"
          ? "Gunakan format tanggal dan waktu dd/mm/yyyy HH:mm."
          : "Gunakan format tanggal dd/mm/yyyy."}
      </span>
    </>
  )
}
