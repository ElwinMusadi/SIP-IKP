import { useEffect, useState, type SyntheticEvent } from "react"
import {
  IconChevronDown,
  IconChevronRight,
  IconFilter,
  IconPrinter,
  IconRefresh,
  IconShieldCheck,
} from "@tabler/icons-react"
import { useNavigate } from "react-router"

import { EmptyState } from "@/components/shared/empty-state"
import { ErrorState } from "@/components/shared/error-state"
import { TableSkeleton } from "@/components/shared/loading-states"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { fetchOperationalRecap } from "../api/incidents-api"
import { IncidentStatusBadge } from "../components/incident-status-badge"
import { RiskBadge } from "../components/risk-badge"
import { INCIDENT_TARGET_LABELS, INCIDENT_TYPE_SHORT_LABELS } from "../lib/labels"
import type { OperationalRecapFilters, OperationalRecapPayload } from "../types/incident"

const TYPE_OPTIONS = [
  { value: "KNC", label: "KNC (Near Miss)" },
  { value: "KTC", label: "KTC (No Harm)" },
  { value: "KTD", label: "KTD (Adverse Event)" },
  { value: "SENTINEL", label: "Sentinel" },
]

const RISK_OPTIONS = [
  { value: "BIRU", label: "Biru (Rendah)" },
  { value: "HIJAU", label: "Hijau (Sedang)" },
  { value: "KUNING", label: "Kuning (Tinggi)" },
  { value: "MERAH", label: "Merah (Ekstrem)" },
  { value: "UNASSIGNED", label: "Belum dinilai" },
]

const STATUS_OPTIONS = [
  { value: "SUBMITTED", label: "Terkirim" },
  { value: "UNDER_REVIEW", label: "Sedang Ditinjau" },
  { value: "SIMPLE_INVESTIGATION", label: "Investigasi Sederhana" },
  { value: "PMKP_REVIEW", label: "Tinjauan PMKP" },
  { value: "COMPLETED_BY_UNIT", label: "Selesai di Unit" },
  { value: "COMPLETED", label: "Kasus Ditutup" },
]

const TARGET_OPTIONS = [
  { value: "PASIEN", label: "Pasien" },
  { value: "KARYAWAN_NAKES", label: "Karyawan / Nakes" },
  { value: "PENGUNJUNG", label: "Pengunjung" },
  { value: "PENDAMPING", label: "Pendamping" },
  { value: "KELUARGA_PASIEN", label: "Keluarga Pasien" },
  { value: "LAIN_LAIN", label: "Lain-lain" },
]

const EMPTY_FILTERS: OperationalRecapFilters = {
  startDate: "",
  endDate: "",
  incidentType: "",
  riskGrade: "",
  status: "",
  incidentTarget: "",
}

const selectClass =
  "h-10 w-full appearance-none rounded-lg border border-input bg-transparent px-2.5 pr-8 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:h-8 md:text-sm dark:bg-input/30"

function FilterSelect({
  id,
  label,
  value,
  options,
  allLabel,
  onChange,
}: {
  id: string
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  allLabel: string
  onChange: (value: string) => void
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <select
          className={selectClass}
          id={id}
          onChange={(event) => {
            onChange(event.target.value)
          }}
          value={value}
        >
          <option value="">{allLabel}</option>
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
    </Field>
  )
}

function BreakdownBar({
  label,
  value,
  max,
  barClass,
}: {
  label: string
  value: number
  max: number
  barClass?: string
}) {
  const width = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <strong className="font-semibold text-foreground tabular-nums">{value}</strong>
      </div>
      <div
        aria-hidden="true"
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="presentation"
      >
        <div
          className={cn("h-full rounded-full bg-primary/60", barClass)}
          style={{ width: value > 0 ? `${String(width)}%` : "0%" }}
        />
      </div>
    </div>
  )
}

export function IncidentsRecapPage() {
  const navigate = useNavigate()

  const [filters, setFilters] = useState<OperationalRecapFilters>(EMPTY_FILTERS)
  const [showFilters, setShowFilters] = useState(false)

  const [recapData, setRecapData] = useState<OperationalRecapPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loadRecap = async (activeFilters = filters) => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const data = await fetchOperationalRecap(activeFilters)
      setRecapData(data)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Gagal memuat rekapitulasi operasional.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    async function init() {
      try {
        const data = await fetchOperationalRecap(filters)
        if (!isMounted) return
        setRecapData(data)
      } catch (err) {
        if (!isMounted) return
        setErrorMessage(err instanceof Error ? err.message : "Gagal memuat rekapitulasi.")
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void init()

    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFilterSubmit = (e: SyntheticEvent) => {
    e.preventDefault()
    void loadRecap(filters)
  }

  const handleResetFilters = () => {
    setFilters(EMPTY_FILTERS)
    void loadRecap(EMPTY_FILTERS)
  }

  const activeFilterCount = Object.values(filters).filter(
    (value) => value !== "" && value !== null,
  ).length

  const summary = recapData?.summary
  const items = recapData?.items ?? []
  const maxRisk = summary
    ? Math.max(
        summary.byRiskGrade.BIRU,
        summary.byRiskGrade.HIJAU,
        summary.byRiskGrade.KUNING,
        summary.byRiskGrade.MERAH,
        1,
      )
    : 1
  const maxType = summary
    ? Math.max(
        summary.byIncidentType.KNC,
        summary.byIncidentType.KTC,
        summary.byIncidentType.KTD,
        summary.byIncidentType.SENTINEL,
        1,
      )
    : 1

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 print:max-w-none print:p-0">
      {/* 1. Header Bar */}
      <PageHeader
        className="no-print"
        actions={
          <>
            <Button
              className="no-print"
              disabled={isLoading}
              onClick={() => {
                void loadRecap(filters)
              }}
              size="sm"
              variant="outline"
            >
              <IconRefresh data-icon="inline-start" />
              <span className="hidden sm:inline">Segarkan</span>
            </Button>
            <Button
              className="no-print"
              onClick={() => {
                window.print()
              }}
              size="sm"
            >
              <IconPrinter data-icon="inline-start" />
              Cetak
            </Button>
          </>
        }
        breadcrumbs={[{ label: "Beranda", to: "/" }, { label: "Rekapitulasi" }]}
        description="Rekap agregat insiden IBS: distribusi jenis, pita risiko, dan status alur pelaporan."
        title="Rekapitulasi & Indikator Keselamatan Pasien"
      />

      {/* Header specifically for print view */}
      <div className="mb-4 hidden border-b-2 border-black pb-3 text-center print:block">
        <h2 className="text-sm font-bold uppercase">
          RSUD Prof. Dr. W. Z. Johannes Kupang &bull; Instalasi Bedah Sentral (IBS)
        </h2>
        <h1 className="mt-1 text-base font-extrabold uppercase">
          Laporan Rekapitulasi Operasional Insiden Keselamatan Pasien
        </h1>
        <p className="mt-1 text-[10px] text-slate-600">
          Dicetak pada: {new Date().toLocaleString("id-ID")} WITA &bull; Dokumen rahasia —
          rekapitulasi agregat tanpa identitas pasien
        </p>
      </div>

      {/* 2. Operational Filter Bar */}
      <form
        className="flex flex-col rounded-xl border bg-card no-print"
        onSubmit={handleFilterSubmit}
      >
        <button
          aria-controls="recap-filters"
          aria-expanded={showFilters}
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/40"
          onClick={() => {
            setShowFilters((open) => !open)
          }}
          type="button"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            <IconFilter aria-hidden="true" className="size-4 text-primary" />
            Filter Laporan
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary tabular-nums">
                {activeFilterCount} aktif
              </span>
            )}
          </span>
          <IconChevronDown
            aria-hidden="true"
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              showFilters && "rotate-180",
            )}
          />
        </button>

        {showFilters && (
          <div className="flex flex-col gap-4 border-t px-4 py-4" id="recap-filters">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="f_start_date">Dari Tanggal</FieldLabel>
                <Input
                  className="h-10"
                  id="f_start_date"
                  onChange={(e) => {
                    setFilters({ ...filters, startDate: e.target.value })
                  }}
                  type="date"
                  value={filters.startDate ?? ""}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="f_end_date">Sampai Tanggal</FieldLabel>
                <Input
                  className="h-10"
                  id="f_end_date"
                  onChange={(e) => {
                    setFilters({ ...filters, endDate: e.target.value })
                  }}
                  type="date"
                  value={filters.endDate ?? ""}
                />
              </Field>
              <FilterSelect
                allLabel="Semua Jenis"
                id="f_type"
                label="Jenis Insiden"
                onChange={(value) => {
                  setFilters({ ...filters, incidentType: value })
                }}
                options={TYPE_OPTIONS}
                value={filters.incidentType ?? ""}
              />
              <FilterSelect
                allLabel="Semua Pita"
                id="f_risk"
                label="Pita Risiko"
                onChange={(value) => {
                  setFilters({ ...filters, riskGrade: value })
                }}
                options={RISK_OPTIONS}
                value={filters.riskGrade ?? ""}
              />
              <FilterSelect
                allLabel="Semua Status"
                id="f_status"
                label="Status Alur"
                onChange={(value) => {
                  setFilters({ ...filters, status: value })
                }}
                options={STATUS_OPTIONS}
                value={filters.status ?? ""}
              />
              <FilterSelect
                allLabel="Semua Sasaran"
                id="f_target"
                label="Sasaran Insiden"
                onChange={(value) => {
                  setFilters({ ...filters, incidentTarget: value })
                }}
                options={TARGET_OPTIONS}
                value={filters.incidentTarget ?? ""}
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t pt-3">
              <Button onClick={handleResetFilters} size="sm" type="button" variant="ghost">
                Reset Filter
              </Button>
              <Button size="sm" type="submit">
                Terapkan Filter
              </Button>
            </div>
          </div>
        )}
      </form>

      {errorMessage && (
        <ErrorState
          className="no-print"
          message={errorMessage}
          onRetry={() => {
            void loadRecap(filters)
          }}
        />
      )}

      {/* 3. Summary Operational Cards */}
      {summary && !isLoading && (
        <section aria-labelledby="summary-metrics-title" className="grid gap-3 lg:grid-cols-3">
          <h2 className="sr-only" id="summary-metrics-title">
            Ringkasan Metrik
          </h2>

          {/* Total */}
          <Card className="print:rounded-none print:border-black print:shadow-none">
            <CardContent className="flex h-full flex-col justify-center gap-1 py-5">
              <p className="text-xs font-medium text-muted-foreground">Total Laporan</p>
              <p className="font-heading text-4xl font-semibold text-foreground tabular-nums">
                {summary.totalReports}
              </p>
              <p className="text-xs text-muted-foreground">Sesuai rentang filter yang diterapkan</p>
            </CardContent>
          </Card>

          {/* Risk breakdown */}
          <Card className="print:rounded-none print:border-black print:shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold">Distribusi Pita Risiko</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2.5">
              <BreakdownBar
                barClass="bg-risk-blue-foreground/70"
                label="Biru (Rendah)"
                max={maxRisk}
                value={summary.byRiskGrade.BIRU}
              />
              <BreakdownBar
                barClass="bg-risk-green-foreground/70"
                label="Hijau (Sedang)"
                max={maxRisk}
                value={summary.byRiskGrade.HIJAU}
              />
              <BreakdownBar
                barClass="bg-risk-yellow-foreground/70"
                label="Kuning (Tinggi)"
                max={maxRisk}
                value={summary.byRiskGrade.KUNING}
              />
              <BreakdownBar
                barClass="bg-risk-red-foreground/70"
                label="Merah (Ekstrem)"
                max={maxRisk}
                value={summary.byRiskGrade.MERAH}
              />
              <p className="text-[11px] text-muted-foreground">
                Belum dinilai: {summary.byRiskGrade.UNASSIGNED} laporan
              </p>
            </CardContent>
          </Card>

          {/* Type breakdown */}
          <Card className="print:rounded-none print:border-black print:shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold">Distribusi Jenis Insiden</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2.5">
              <BreakdownBar
                label="KNC — Nyaris Cedera"
                max={maxType}
                value={summary.byIncidentType.KNC}
              />
              <BreakdownBar
                label="KTC — Tidak Cedera"
                max={maxType}
                value={summary.byIncidentType.KTC}
              />
              <BreakdownBar
                barClass="bg-status-warning-foreground/70"
                label="KTD — Tidak Diharapkan"
                max={maxType}
                value={summary.byIncidentType.KTD}
              />
              <BreakdownBar
                barClass="bg-risk-red-foreground/80"
                label="Sentinel"
                max={maxType}
                value={summary.byIncidentType.SENTINEL}
              />
            </CardContent>
          </Card>
        </section>
      )}

      {/* 4. Filtered Reports Table */}
      {isLoading ? (
        <TableSkeleton className="no-print" rows={6} />
      ) : items.length === 0 ? (
        <EmptyState
          action={
            activeFilterCount > 0 ? (
              <Button onClick={handleResetFilters} size="sm" variant="outline">
                Reset Filter
              </Button>
            ) : undefined
          }
          className="no-print py-14"
          description="Tidak ada laporan yang cocok dengan filter terpilih pada periode ini."
          title="Tidak ada laporan"
        />
      ) : (
        <Card className="overflow-hidden py-0 print:rounded-none print:border-black print:shadow-none print:ring-0">
          <CardContent className="p-0">
            {/* Mobile cards (screen only) */}
            <ul className="flex flex-col md:hidden print:hidden">
              {items.map((item, index) => (
                <li key={item.id}>
                  <div className={cn("px-4 py-3.5", index > 0 && "border-t")}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="line-clamp-2 text-sm font-medium text-foreground">
                        {item.incident_title || "(Tanpa judul)"}
                      </span>
                      <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                        {item.report_number ?? "DRAF"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {INCIDENT_TYPE_SHORT_LABELS[item.incident_type]} ·{" "}
                      {INCIDENT_TARGET_LABELS[item.incident_target]} ·{" "}
                      {new Date(item.incident_datetime).toLocaleDateString("id-ID")}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <IncidentStatusBadge status={item.status} />
                      <RiskBadge grade={item.risk_grade} />
                    </div>
                    <div className="mt-2 flex items-center gap-2 no-print">
                      <Button
                        onClick={() => {
                          void navigate(`/laporan/${item.id}`)
                        }}
                        size="xs"
                        variant="outline"
                      >
                        Detail
                        <IconChevronRight data-icon="inline-end" />
                      </Button>
                      <Button
                        onClick={() => {
                          void navigate(`/laporan/${item.id}/cetak`)
                        }}
                        size="xs"
                        variant="ghost"
                      >
                        <IconPrinter data-icon="inline-start" />
                        Cetak
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Desktop table (also used for print) */}
            <div className="hidden overflow-x-auto md:block print:block">
              <Table className="min-w-312 table-fixed print:min-w-0 print:text-[10px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent print:border-black">
                    <TableHead className="w-38 print:w-[11%] print:text-black">
                      No. Laporan
                    </TableHead>
                    <TableHead className="w-40 print:w-[15%] print:text-black">
                      Waktu Insiden
                    </TableHead>
                    <TableHead className="w-76 print:w-[25%] print:text-black">
                      Judul Insiden
                    </TableHead>
                    <TableHead className="w-32 print:w-[16%] print:text-black">
                      Jenis / Sasaran
                    </TableHead>
                    <TableHead className="w-50 print:w-[13%] print:text-black">Lokasi</TableHead>
                    <TableHead className="w-34 print:w-[10%] print:text-black">
                      Pita Risiko
                    </TableHead>
                    <TableHead className="w-32 print:w-[10%] print:text-black">Status</TableHead>
                    <TableHead className="w-28 text-right no-print">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id} className="print:border-black">
                      <TableCell className="font-mono text-xs font-medium whitespace-nowrap print:text-black">
                        {item.report_number ?? "DRAF"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap print:text-black">
                        {new Date(item.incident_datetime).toLocaleDateString("id-ID")}{" "}
                        {new Date(item.incident_datetime).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        {item.incident_timezone === "Asia/Makassar" ? "WITA" : ""}
                      </TableCell>
                      <TableCell className="overflow-hidden font-medium whitespace-normal print:text-black">
                        <button
                          className="block w-full min-w-0 overflow-hidden text-left text-ellipsis whitespace-nowrap hover:text-primary hover:underline hover:underline-offset-2 no-print"
                          onClick={() => {
                            void navigate(`/laporan/${item.id}`)
                          }}
                          type="button"
                        >
                          {item.incident_title || "(Tanpa judul)"}
                        </button>
                        <span className="hidden wrap-break-word whitespace-normal print:block">
                          {item.incident_title || "(Tanpa judul)"}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap print:text-black">
                        <span className="font-semibold">
                          {INCIDENT_TYPE_SHORT_LABELS[item.incident_type]}
                        </span>{" "}
                        <span className="text-muted-foreground">
                          · {INCIDENT_TARGET_LABELS[item.incident_target]}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground print:text-black">
                        {item.incident_location || "-"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <RiskBadge grade={item.risk_grade} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <IncidentStatusBadge status={item.status} />
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap no-print">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            onClick={() => {
                              void navigate(`/laporan/${item.id}`)
                            }}
                            size="xs"
                            variant="ghost"
                          >
                            Detail
                          </Button>
                          <Button
                            aria-label={`Cetak laporan ${item.report_number ?? item.id}`}
                            onClick={() => {
                              void navigate(`/laporan/${item.id}/cetak`)
                            }}
                            size="icon-xs"
                            variant="outline"
                          >
                            <IconPrinter className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer Info */}
      <footer className="flex flex-col gap-1.5 border-t pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between no-print">
        <span className="flex items-start gap-1.5">
          <IconShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            Privasi terjaga — rekapitulasi agregat tidak menampilkan nama atau nomor rekam medis
            pasien.
          </span>
        </span>
        <span className="font-mono text-[11px] tabular-nums">
          {items.length} laporan ditampilkan
        </span>
      </footer>
    </div>
  )
}
