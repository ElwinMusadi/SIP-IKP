import type { ReactNode } from "react"
import { IconChevronDown } from "@tabler/icons-react"
import type { Path, UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form"

import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { IncidentFormData } from "../schemas/incident-form-schema"
import { cn } from "@/lib/utils"
import { IndonesianDateInput } from "@/components/shared/indonesian-date-input"

type FormFieldName = Path<IncidentFormData>

interface BaseFieldProps {
  name: FormFieldName
  label: ReactNode
  required?: boolean
  hint?: ReactNode | undefined
  error?: string | undefined
  disabled?: boolean
  register: UseFormRegister<IncidentFormData>
  className?: string | undefined
}

interface DateFieldProps extends Omit<BaseFieldProps, "register"> {
  mode?: "date" | "datetime"
  setValue: UseFormSetValue<IncidentFormData>
  watch: UseFormWatch<IncidentFormData>
}

export function DateField({ name, label, required, error, disabled, mode = "date", setValue, watch, className }: DateFieldProps) {
  const value = watch(name)
  return (
    <Field className={className} data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={name}>
        {label}
        {required && <span aria-hidden="true" className="text-destructive">*</span>}
      </FieldLabel>
      <IndonesianDateInput
        disabled={disabled}
        id={name}
        mode={mode}
        onChange={(nextValue) => {
          setValue(name, nextValue, { shouldDirty: true, shouldValidate: true })
        }}
        required={required}
        value={typeof value === "string" ? value : ""}
      />
      {error && <FieldDescription className="text-destructive">{error}</FieldDescription>}
    </Field>
  )
}

const controlHeight = "h-10"

interface TextFieldProps extends BaseFieldProps {
  type?: string
  placeholder?: string | undefined
}

export function TextField({
  name,
  label,
  required,
  hint,
  error,
  disabled,
  register,
  type = "text",
  placeholder,
  className,
}: TextFieldProps) {
  return (
    <Field className={className} data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={name}>
        {label}
        {required && <span aria-hidden="true" className="text-destructive">*</span>}
      </FieldLabel>
      <Input
        {...register(name)}
        aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined}
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        className={controlHeight}
        disabled={disabled}
        id={name}
        placeholder={placeholder}
        type={type}
      />
      {hint && !error && <FieldDescription id={`${name}-hint`}>{hint}</FieldDescription>}
      {error && <FieldDescription className="text-destructive" id={`${name}-error`}>{error}</FieldDescription>}
    </Field>
  )
}

interface TextAreaFieldProps extends BaseFieldProps {
  placeholder?: string | undefined
  rows?: number
  counter?: ReactNode | undefined
}

export function TextAreaField({
  name,
  label,
  required,
  hint,
  error,
  disabled,
  register,
  placeholder,
  rows = 3,
  counter,
  className,
}: TextAreaFieldProps) {
  return (
    <Field className={className} data-invalid={error ? true : undefined}>
      <div className="flex items-center justify-between gap-2">
        <FieldLabel htmlFor={name}>
          {label}
          {required && <span aria-hidden="true" className="text-destructive">*</span>}
        </FieldLabel>
        {counter && <span className="text-[11px] text-muted-foreground">{counter}</span>}
      </div>
      <Textarea
        {...register(name)}
        aria-invalid={error ? true : undefined}
        className="min-h-20"
        disabled={disabled}
        id={name}
        placeholder={placeholder}
        rows={rows}
      />
      {hint && !error && <FieldDescription>{hint}</FieldDescription>}
      {error && <FieldDescription className="text-destructive">{error}</FieldDescription>}
    </Field>
  )
}

export interface SelectOption {
  value: string
  label: string
}

interface SelectFieldProps extends BaseFieldProps {
  options: SelectOption[]
  placeholder?: string | undefined
  value?: string | undefined
}

export function SelectField({
  name,
  label,
  required,
  hint,
  error,
  disabled,
  register,
  options,
  placeholder,
  className,
  value,
}: SelectFieldProps) {
  return (
    <Field className={className} data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={name}>
        {label}
        {required && <span aria-hidden="true" className="text-destructive">*</span>}
      </FieldLabel>
      <div className="relative">
        <select
          {...register(name)}
          aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined}
          aria-invalid={error ? true : undefined}
          aria-required={required || undefined}
          className={cn(
            "w-full appearance-none rounded-lg border border-input bg-transparent px-2.5 py-1 pr-8 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30",
            controlHeight,
          )}
          disabled={disabled}
          id={name}
          value={value}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <IconChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        />
      </div>
      {hint && !error && <FieldDescription id={`${name}-hint`}>{hint}</FieldDescription>}
      {error && <FieldDescription className="text-destructive" id={`${name}-error`}>{error}</FieldDescription>}
    </Field>
  )
}
