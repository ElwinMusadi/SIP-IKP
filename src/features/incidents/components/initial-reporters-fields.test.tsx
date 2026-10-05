// @vitest-environment happy-dom

import { act, useEffect } from "react"
import { createRoot, type Root } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { useForm, type Path, type UseFormReturn } from "react-hook-form"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { initialReportersSchema, type IncidentFormData } from "../schemas/incident-form-schema"
import { initialReportersPayload } from "../lib/initial-reporters"
import { InitialReportersFields } from "./initial-reporters-fields"

function Fixture({ disabled = false }: { disabled?: boolean }) {
  const { control, register } = useForm<IncidentFormData>({ defaultValues: {
    initial_reporters: [
      { name: "", category: "PETUGAS", detail: "Tim lama", legacy: true },
      { name: "Ana", category: "Pasien", detail: "" },
      { name: "Budi", category: "Pengunjung", detail: "" },
    ],
  } })
  return <InitialReportersFields control={control} disabled={disabled} register={register} errors={{
    initial_reporters: [{}, { name: { type: "required", message: "Nama/Identitas Pelapor wajib diisi" } }],
  }} />
}

function InteractiveFixture({ disabled = false, onReady }: {
  disabled?: boolean
  onReady: (form: UseFormReturn<IncidentFormData>) => void
}) {
  const form = useForm<IncidentFormData>({ defaultValues: {
    initial_reporters: [{ name: "", category: "PETUGAS", detail: "Tim lama", legacy: true }],
  } })
  useEffect(() => { onReady(form) }, [form, onReady])
  return <InitialReportersFields control={form.control} disabled={disabled} register={form.register} errors={form.formState.errors} />
}

async function interact(action: () => void) {
  await act(async () => {
    action()
    await Promise.resolve()
  })
}

describe("InitialReportersFields", () => {
  it("renders unlimited indexed rows, associated labels/errors, and legacy options", () => {
    const html = renderToStaticMarkup(<Fixture />)
    expect(html).toContain("Pelapor 3")
    expect(html).toContain('for="initial_reporters.1.name"')
    expect(html).toContain('aria-describedby="initial_reporters.1.name-error"')
    expect(html).toContain('id="initial_reporters.1.name-error"')
    expect(html).toContain('aria-invalid="true"')
    expect(html).not.toContain("nama/identitas belum tercatat")
    expect(html).toContain('value="PETUGAS"')
    expect(html).toContain('aria-label="Hapus pelapor 3"')
    expect(html).toContain("Tambah Pelapor")
  })

  it("disables all inputs and row actions together", () => {
    const html = renderToStaticMarkup(<Fixture disabled />)
    const controls = html.match(/<(?:input|select|button)\b[^>]*>/g) ?? []
    expect(controls.length).toBeGreaterThan(10)
    expect(controls.every((control) => control.includes('disabled=""'))).toBe(true)
  })
})

describe("InitialReportersFields interactions", () => {
  let container: HTMLDivElement
  let root: Root
  let form: UseFormReturn<IncidentFormData>
  const onReady = (nextForm: UseFormReturn<IncidentFormData>) => { form = nextForm }

  beforeEach(async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
    await interact(() => { root.render(<InteractiveFixture onReady={onReady} />) })
  })

  afterEach(async () => {
    await interact(() => { root.unmount() })
    container.remove()
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false })
  })

  function input(index: number, field: "name" | "category" | "detail") {
    // Workers' global Element conflicts with DOM select types in the app tsconfig.
    const control = container.querySelector(`[name="initial_reporters.${index.toString()}.${field}"]`) as unknown as HTMLInputElement | HTMLSelectElement | null
    if (!control) throw new Error(`Missing reporter ${index.toString()} ${field}`)
    return control
  }

  function removeButton(index: number) {
    const button = container.querySelector<HTMLButtonElement>(`[aria-label="Hapus pelapor ${index.toString()}"]`)
    if (!button) throw new Error("Missing remove button")
    return button
  }

  function addButton() {
    const button = Array.from(container.querySelectorAll("button")).find((button) => button.textContent.includes("Tambah Pelapor"))
    if (!button) throw new Error("Missing add button")
    return button
  }

  async function validate() {
    await interact(() => {
      form.clearErrors()
      const result = initialReportersSchema.safeParse(form.getValues("initial_reporters"))
      if (!result.success) {
        for (const issue of result.error.issues) {
          form.setError(`initial_reporters.${issue.path.join(".")}` as Path<IncidentFormData>, { type: "schema", message: issue.message })
        }
      }
    })
  }

  it("clicks add/remove beyond two rows, preserves current values, and reindexes errors", async () => {
    expect(initialReportersPayload(form.getValues("initial_reporters"))).not.toHaveProperty("initial_reporters")
    expect(input(0, "name").hasAttribute("aria-required")).toBe(false)
    expect(removeButton(1).disabled).toBe(true)

    await interact(() => { addButton().click() })
    expect(form.getValues("initial_reporters")).toHaveLength(2)
    expect(input(0, "name").getAttribute("aria-required")).toBe("true")
    await validate()
    for (const index of [0, 1]) expect(input(index, "name").getAttribute("aria-invalid")).toBe("true")
    expect(input(1, "category").getAttribute("aria-invalid")).toBe("true")
    expect(input(1, "name").getAttribute("aria-describedby")).toBe("initial_reporters.1.name-error")

    await interact(() => {
      form.setValue("initial_reporters.0.name", "Ana")
      form.setValue("initial_reporters.1.name", "Budi")
      form.setValue("initial_reporters.1.category", "Pengunjung")
      form.setValue("initial_reporters.1.detail", "Saksi")
    })
    await interact(() => { addButton().click() })
    await interact(() => { addButton().click() })
    expect(form.getValues("initial_reporters")).toHaveLength(4)
    expect(container.textContent).toContain("Pelapor 4")
    expect(input(1, "name").value).toBe("Budi")
    await validate()
    expect(input(3, "name").getAttribute("aria-invalid")).toBe("true")

    await interact(() => { removeButton(1).click() })
    expect(form.getValues("initial_reporters")).toHaveLength(3)
    expect(input(0, "name").value).toBe("Budi")
    expect(input(0, "category").value).toBe("Pengunjung")
    expect(input(0, "detail").value).toBe("Saksi")
    expect(input(2, "name").getAttribute("aria-describedby")).toBe("initial_reporters.2.name-error")
    expect(container.querySelector('[id="initial_reporters.3.name-error"]')).toBeNull()
    await interact(() => { removeButton(3).click() })
    await interact(() => { removeButton(2).click() })
    await validate()
    expect(form.getValues("initial_reporters")).toEqual([{ name: "Budi", category: "Pengunjung", detail: "Saksi" }])
    expect(input(0, "name").hasAttribute("aria-invalid")).toBe(false)
    expect(removeButton(1).disabled).toBe(true)
  })

  it("uses live categories after select changes and programmatic updates, not array snapshots", async () => {
    const select = input(0, "category")
    expect(select.value).toBe("PETUGAS")
    await interact(() => {
      select.value = "Pasien"
      select.dispatchEvent(new Event("change", { bubbles: true }))
    })
    expect(form.getValues("initial_reporters.0.category")).toBe("Pasien")
    expect(select.value).toBe("Pasien")
    expect(select.querySelector('option[value="PETUGAS"]')).toBeNull()
    await interact(() => { form.setValue("initial_reporters.0.category", "KATEGORI LAMA BARU") })
    expect(select.querySelector('option[value="KATEGORI LAMA BARU"]')).not.toBeNull()
    expect(select.value).toBe("KATEGORI LAMA BARU")
    await interact(() => { addButton().click() })
    expect(input(0, "category").value).toBe("KATEGORI LAMA BARU")
    await interact(() => { removeButton(2).click() })
    expect(initialReportersPayload(form.getValues("initial_reporters"))).toEqual({
      initial_reporter_category: "KATEGORI LAMA BARU", initial_reporter_detail: "Tim lama",
    })
  })

  it("reacts to typing a legacy identity and sends the named contract without provenance", async () => {
    const name = input(0, "name")
    await interact(() => {
      // Bypass React's value tracker to reproduce a browser input event.
      if (!Reflect.set(HTMLInputElement.prototype, "value", "Ana", name)) throw new Error("Cannot set native input value")
      name.dispatchEvent(new Event("input", { bubbles: true }))
    })
    expect(form.getValues("initial_reporters.0.name")).toBe("Ana")
    expect(name.getAttribute("aria-required")).toBe("true")
    expect(container.textContent).not.toContain("nama/identitas belum tercatat")
    expect(initialReportersPayload(form.getValues("initial_reporters")).initial_reporters).toEqual([
      { name: "Ana", category: "PETUGAS", detail: "Tim lama" },
    ])
    await validate()
    expect(name.hasAttribute("aria-invalid")).toBe(false)
  })

  it("blocks mutations while disabled, keeps values and errors, and resumes when enabled", async () => {
    await interact(() => { addButton().click() })
    await validate()
    const values = form.getValues("initial_reporters")
    await interact(() => { root.render(<InteractiveFixture disabled onReady={onReady} />) })
    expect(Array.from(container.querySelectorAll("input, select, button")).every((control) =>
      (control as unknown as HTMLInputElement | HTMLSelectElement | HTMLButtonElement).disabled,
    )).toBe(true)
    await interact(() => {
      addButton().click()
      removeButton(1).click()
    })
    expect(form.getValues("initial_reporters")).toEqual(values)
    expect(input(1, "name").getAttribute("aria-invalid")).toBe("true")
    await interact(() => { root.render(<InteractiveFixture onReady={onReady} />) })
    expect(addButton().disabled).toBe(false)
    await interact(() => { removeButton(2).click() })
    await validate()
    expect(initialReportersPayload(form.getValues("initial_reporters"))).not.toHaveProperty("initial_reporters")
    expect(input(0, "name").hasAttribute("aria-required")).toBe(false)
    expect(container.textContent).toContain("nama/identitas belum tercatat")
  })
})
