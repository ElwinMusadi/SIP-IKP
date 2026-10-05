import { IconPlus, IconTrash } from "@tabler/icons-react"
import { useFieldArray, useWatch, type Control, type FieldErrors, type Path, type UseFormRegister } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { FieldDescription, FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field"
import { createInitialReporter, isNamelessLegacyReporter } from "../lib/initial-reporters"
import type { IncidentFormData } from "../schemas/incident-form-schema"
import { SelectField, TextField } from "./form-controls"

const categories = [
  "Karyawan: Dokter", "Karyawan: Perawat", "Karyawan: Petugas Lainnya", "Pasien",
  "Keluarga / Pendamping Pasien", "Pengunjung", "Lain-lain",
].map((value) => ({ value, label: value }))

interface Props {
  control: Control<IncidentFormData>
  register: UseFormRegister<IncidentFormData>
  errors: FieldErrors<IncidentFormData>
  disabled?: boolean
}

export function InitialReportersFields({ control, register, errors, disabled = false }: Props) {
  const { fields, append, remove } = useFieldArray({ control, name: "initial_reporters" })
  // Field-array fields are identity snapshots, not current input values.
  const rows = useWatch({ control, name: "initial_reporters" })
  const preserveLegacy = isNamelessLegacyReporter(rows)
  const listError = errors.initial_reporters?.root?.message ?? errors.initial_reporters?.message

  return (
    <FieldSet className="min-w-0 sm:col-span-2" disabled={disabled}>
      <FieldLegend>Orang Pertama yang Melaporkan</FieldLegend>
      <FieldDescription>Tambahkan setiap pelapor beserta nama/identitas dan kategorinya. Detail bersifat opsional.</FieldDescription>
      <FieldGroup>
        {fields.map((row, index) => {
          const rowErrors = errors.initial_reporters?.[index]
          const category = rows[index]?.category ?? row.category
          const options = category && !categories.some((option) => option.value === category)
            ? [...categories, { value: category, label: category }] : categories
          return (
            <FieldSet key={row.id} className="min-w-0 rounded-lg border p-3" disabled={disabled}>
              <FieldLegend variant="label">Pelapor {index + 1}</FieldLegend>
              <FieldGroup className="grid gap-4 sm:grid-cols-2">
                <TextField
                  disabled={disabled} error={rowErrors?.name?.message}
                  hint={preserveLegacy ? "Data lama: nama/identitas belum tercatat; tidak wajib dibuat-buat." : undefined}
                  label="Nama/Identitas Pelapor" name={`initial_reporters.${index.toString()}.name` as Path<IncidentFormData>}
                  register={register} required={!preserveLegacy}
                />
                <SelectField
                  disabled={disabled} error={rowErrors?.category?.message}
                  label="Kategori Pelapor" name={`initial_reporters.${index.toString()}.category` as Path<IncidentFormData>}
                  value={category}
                  options={options} placeholder="-- Pilih Kategori Pelapor --" register={register} required
                />
                <TextField
                  className="sm:col-span-2" disabled={disabled} error={rowErrors?.detail?.message}
                  hint="Opsional — isi jika pelapor pertama bukan nakes."
                  label="Detail Pelapor" name={`initial_reporters.${index.toString()}.detail` as Path<IncidentFormData>}
                  placeholder="Contoh: Petugas Kebersihan, Petugas Keamanan" register={register}
                />
              </FieldGroup>
              <Button aria-label={`Hapus pelapor ${(index + 1).toString()}`} className="self-start" disabled={disabled || fields.length <= 1}
                onClick={() => { remove(index) }} size="sm" type="button" variant="outline">
                <IconTrash data-icon="inline-start" /> Hapus Pelapor
              </Button>
            </FieldSet>
          )
        })}
      </FieldGroup>
      {listError && <FieldDescription className="text-destructive" role="alert">{listError}</FieldDescription>}
      <Button className="self-start" disabled={disabled} onClick={() => { append(createInitialReporter()) }} size="sm" type="button" variant="outline">
        <IconPlus data-icon="inline-start" /> Tambah Pelapor
      </Button>
    </FieldSet>
  )
}
