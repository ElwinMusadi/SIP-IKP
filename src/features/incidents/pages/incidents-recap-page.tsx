import { useEffect, useState, type SyntheticEvent } from "react"
import {
  IconAlertCircle,
  IconArrowLeft,
  IconFilter,
  IconFolder,
  IconPrinter,
  IconRefresh,
  IconShieldCheck,
} from "@tabler/icons-react"
import { useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import { fetchOperationalRecap } from "../api/incidents-api"
import { IncidentStatusBadge } from "../components/incident-status-badge"
import { RiskBadge } from "../components/risk-badge"
import type { OperationalRecapFilters, OperationalRecapPayload } from "../types/incident"

export function IncidentsRecapPage() {
  const navigate = useNavigate()

  const [filters, setFilters] = useState<OperationalRecapFilters>({
    startDate: "",
    endDate: "",
    incidentType: "",
    riskGrade: "",
    status: "",
    incidentTarget: "",
  })

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
    const emptyFilters: OperationalRecapFilters = {
      startDate: "",
      endDate: "",
      incidentType: "",
      riskGrade: "",
      status: "",
      incidentTarget: "",
    }
    setFilters(emptyFilters)
    void loadRecap(emptyFilters)
  }

  const summary = recapData?.summary
  const items = recapData?.items ?? []

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8 print:p-0">
      {/* 1. Header Bar */}
      <header className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between no-print">
        <div className="flex items-center gap-3">
          <Button
            className="size-8 text-muted-foreground"
            onClick={() => {
              void navigate("/laporan")
            }}
            size="icon"
            variant="ghost"
          >
            <IconArrowLeft className="size-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wider text-primary uppercase">
                Instalasi Bedah Sentral (IBS)
              </span>
              <span className="text-muted-foreground">&bull;</span>
              <span className="text-xs text-muted-foreground">RSUD Prof. Dr. W. Z. Johannes</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Rekapitulasi Pelaporan &amp; Indikator Keselamatan Pasien
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Pemantauan agregat insiden kamar operasi, distribusi pita risiko, dan kepatuhan batas
              waktu pelaporan 48 jam.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            className="gap-1.5 text-xs"
            onClick={() => {
              void loadRecap(filters)
            }}
            size="sm"
            variant="outline"
          >
            <IconRefresh className="size-3.5" />
            <span>Segarkan</span>
          </Button>
          <Button
            className="gap-1.5 text-xs font-semibold"
            onClick={() => {
              window.print()
            }}
            size="sm"
          >
            <IconPrinter className="size-4" />
            <span>Cetak Rekapitulasi</span>
          </Button>
        </div>
      </header>

      {/* Header specifically for print view */}
      <div className="hidden print:block border-b-2 border-black pb-3 text-center mb-4">
        <h2 className="text-sm font-bold uppercase">
          RSUD Prof. Dr. W. Z. Johannes Kupang &bull; Instalasi Bedah Sentral (IBS)
        </h2>
        <h1 className="text-base font-extrabold uppercase mt-1">
          Laporan Rekapitulasi Operasional Insiden Keselamatan Pasien
        </h1>
        <p className="text-[10px] text-slate-600 mt-1">
          Dicetak pada: {new Date().toLocaleString("id-ID")} WITA &bull; Kerahasiaan Terjaga (Zero
          PII Eksternal)
        </p>
      </div>

      {/* 2. Operational Filter Bar */}
      <form
        className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs no-print text-xs"
        onSubmit={handleFilterSubmit}
      >
        <div className="flex items-center gap-2 border-b pb-2 font-semibold text-foreground">
          <IconFilter className="size-4 text-primary" />
          <span>Filter Laporan Operasional</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-muted-foreground" htmlFor="f_start_date">
              Dari Tanggal
            </label>
            <input
              className="rounded-md border bg-background px-2.5 py-1.5 text-xs focus:border-primary focus:outline-none"
              id="f_start_date"
              onChange={(e) => {
                setFilters({ ...filters, startDate: e.target.value })
              }}
              type="date"
              value={filters.startDate ?? ""}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-muted-foreground" htmlFor="f_end_date">
              Sampai Tanggal
            </label>
            <input
              className="rounded-md border bg-background px-2.5 py-1.5 text-xs focus:border-primary focus:outline-none"
              id="f_end_date"
              onChange={(e) => {
                setFilters({ ...filters, endDate: e.target.value })
              }}
              type="date"
              value={filters.endDate ?? ""}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-muted-foreground" htmlFor="f_type">
              Jenis Insiden
            </label>
            <select
              className="rounded-md border bg-background px-2.5 py-1.5 text-xs focus:border-primary focus:outline-none"
              id="f_type"
              onChange={(e) => {
                setFilters({ ...filters, incidentType: e.target.value })
              }}
              value={filters.incidentType ?? ""}
            >
              <option value="">Semua Jenis</option>
              <option value="KNC">KNC (Near Miss)</option>
              <option value="KTC">KTC (No Harm)</option>
              <option value="KTD">KTD (Adverse Event)</option>
              <option value="SENTINEL">SENTINEL</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-muted-foreground" htmlFor="f_risk">
              Pita Risiko
            </label>
            <select
              className="rounded-md border bg-background px-2.5 py-1.5 text-xs focus:border-primary focus:outline-none"
              id="f_risk"
              onChange={(e) => {
                setFilters({ ...filters, riskGrade: e.target.value })
              }}
              value={filters.riskGrade ?? ""}
            >
              <option value="">Semua Pita</option>
              <option value="BIRU">BIRU (Rendah)</option>
              <option value="HIJAU">HIJAU (Sedang)</option>
              <option value="KUNING">KUNING (Tinggi)</option>
              <option value="MERAH">MERAH (Ekstrem)</option>
              <option value="UNASSIGNED">Belum Ditentukan</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-muted-foreground" htmlFor="f_status">
              Status Alur
            </label>
            <select
              className="rounded-md border bg-background px-2.5 py-1.5 text-xs focus:border-primary focus:outline-none"
              id="f_status"
              onChange={(e) => {
                setFilters({ ...filters, status: e.target.value })
              }}
              value={filters.status ?? ""}
            >
              <option value="">Semua Status</option>
              <option value="SUBMITTED">Terkirim</option>
              <option value="UNDER_REVIEW">Sedang Ditinjau</option>
              <option value="SIMPLE_INVESTIGATION">Investigasi Sederhana</option>
              <option value="PMKP_REVIEW">Tinjauan PMKP</option>
              <option value="COMPLETED_BY_UNIT">Selesai di Unit</option>
              <option value="COMPLETED">Kasus Selesai Ditutup</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-muted-foreground" htmlFor="f_target">
              Sasaran Insiden
            </label>
            <select
              className="rounded-md border bg-background px-2.5 py-1.5 text-xs focus:border-primary focus:outline-none"
              id="f_target"
              onChange={(e) => {
                setFilters({ ...filters, incidentTarget: e.target.value })
              }}
              value={filters.incidentTarget ?? ""}
            >
              <option value="">Semua Sasaran</option>
              <option value="PASIEN">Pasien</option>
              <option value="KARYAWAN_NAKES">Karyawan / Nakes</option>
              <option value="PENGUNJUNG">Pengunjung</option>
              <option value="PENDAMPING">Pendamping</option>
              <option value="KELUARGA_PASIEN">Keluarga Pasien</option>
              <option value="LAIN_LAIN">Lain-lain</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button
            className="text-xs"
            onClick={handleResetFilters}
            size="sm"
            type="button"
            variant="ghost"
          >
            Reset Filter
          </Button>
          <Button className="text-xs" size="sm" type="submit">
            Terapkan Filter
          </Button>
        </div>
      </form>

      {errorMessage && (
        <div
          aria-live="polite"
          className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-xs font-medium text-destructive no-print"
          role="alert"
        >
          <IconAlertCircle className="size-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 3. Summary Operational Cards */}
      {summary && (
        <section aria-labelledby="summary-metrics-title" className="flex flex-col gap-3">
          <h2 className="sr-only" id="summary-metrics-title">
            Ringkasan Metrik
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4 text-xs">
            {/* Total Reports */}
            <div className="flex flex-col justify-between rounded-xl border bg-card p-4 shadow-xs print:border-black print:p-2">
              <span className="font-semibold text-muted-foreground print:text-black">
                Total Laporan
              </span>
              <p className="mt-2 text-2xl font-bold text-foreground print:text-black">
                {summary.totalReports}{" "}
                <span className="text-xs font-normal text-muted-foreground">laporan</span>
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground print:text-black">
                Dalam rentang filter terpilih
              </p>
            </div>

            {/* Incident Type Breakdown */}
            <div className="flex flex-col justify-between rounded-xl border bg-card p-4 shadow-xs print:border-black print:p-2">
              <span className="font-semibold text-muted-foreground print:text-black">
                Tipe Insiden
              </span>
              <div className="mt-2 grid grid-cols-2 gap-1 text-[11px]">
                <span>
                  KNC: <strong>{summary.byIncidentType.KNC}</strong>
                </span>
                <span>
                  KTC: <strong>{summary.byIncidentType.KTC}</strong>
                </span>
                <span>
                  KTD: <strong>{summary.byIncidentType.KTD}</strong>
                </span>
                <span>
                  Sentinel:{" "}
                  <strong className="text-rose-600 print:text-black">
                    {summary.byIncidentType.SENTINEL}
                  </strong>
                </span>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground print:text-black">
                Klasifikasi standar KNKP
              </p>
            </div>

            {/* Risk Grade Breakdown */}
            <div className="flex flex-col justify-between rounded-xl border bg-card p-4 shadow-xs print:border-black print:p-2">
              <span className="font-semibold text-muted-foreground print:text-black">
                Pita Risiko
              </span>
              <div className="mt-2 grid grid-cols-2 gap-1 text-[11px]">
                <span className="text-sky-700 print:text-black">
                  Biru: <strong>{summary.byRiskGrade.BIRU}</strong>
                </span>
                <span className="text-emerald-700 print:text-black">
                  Hijau: <strong>{summary.byRiskGrade.HIJAU}</strong>
                </span>
                <span className="text-amber-700 print:text-black">
                  Kuning: <strong>{summary.byRiskGrade.KUNING}</strong>
                </span>
                <span className="text-rose-700 print:text-black">
                  Merah: <strong>{summary.byRiskGrade.MERAH}</strong>
                </span>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground print:text-black">
                Belum dinilai: {summary.byRiskGrade.UNASSIGNED}
              </p>
            </div>

              {/* SLA summary card removed — SLA disabled for MVP */}
          </div>
        </section>
      )}

      {/* 4. Filtered Reports Table */}
      {isLoading ? (
        <div className="flex min-h-48 items-center justify-center rounded-xl border bg-card p-8 no-print">
          <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
            <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>Memuat data rekapitulasi...</span>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/20 p-8 text-center text-xs text-muted-foreground">
          <IconFolder className="size-8 text-muted-foreground/40" />
          <p className="font-semibold text-foreground">Tidak Ada Laporan yang Cocok</p>
          <p>Ubah atau reset filter untuk menampilkan data insiden lainnya.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-xs print:border-black print:shadow-none">
          <table className="w-full text-left text-xs print:text-[10px]">
            <thead className="border-b bg-muted/40 font-semibold text-muted-foreground print:border-black print:bg-slate-100 print:text-black">
              <tr>
                <th className="px-3 py-2.5">No. Laporan</th>
                <th className="px-3 py-2.5">Waktu Insiden (WITA)</th>
                <th className="px-3 py-2.5">Judul Insiden</th>
                <th className="px-3 py-2.5">Jenis / Sasaran</th>
                <th className="px-3 py-2.5">Lokasi Kamar</th>
                <th className="px-3 py-2.5">Pita Risiko</th>
                <th className="px-3 py-2.5">Status Alur</th>
                <th className="px-3 py-2.5 text-right no-print">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y text-foreground print:divide-black">
              {items.map((item) => (
                <tr className="transition-colors hover:bg-muted/30" key={item.id}>
                  <td className="px-3 py-2.5 font-mono font-bold whitespace-nowrap">
                    {item.report_number ?? "DRAF"}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground print:text-black">
                    {new Date(item.incident_datetime).toLocaleDateString("id-ID")}{" "}
                    {new Date(item.incident_datetime).toLocaleTimeString("id-ID")}
                  </td>
                  <td className="max-w-xs px-3 py-2.5 font-medium text-foreground print:text-black">
                    <span className="line-clamp-2">
                      {item.incident_title || "(Draf Tanpa Judul)"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="font-semibold">{item.incident_type}</span> &bull;{" "}
                    <span className="text-muted-foreground print:text-black">
                      {item.incident_target}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground print:text-black">
                    {item.incident_location || "-"}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <RiskBadge grade={item.risk_grade} />
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <IncidentStatusBadge status={item.status} />
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap no-print">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        className="text-xs"
                        onClick={() => {
                          void navigate(`/laporan/${item.id}`)
                        }}
                        size="sm"
                        variant="ghost"
                      >
                        Detail
                      </Button>
                      <Button
                        className="text-xs"
                        onClick={() => {
                          void navigate(`/laporan/${item.id}/cetak`)
                        }}
                        size="sm"
                        variant="outline"
                      >
                        Cetak
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer Info */}
      <footer className="flex items-center justify-between border-t pt-4 text-xs text-muted-foreground no-print">
        <span className="flex items-center gap-1.5">
          <IconShieldCheck className="size-4 text-primary" />
          <span>
            Privasi Terjaga: Rekapitulasi agregat tidak menampilkan identitas nama atau rekam medis
            pasien.
          </span>
        </span>
        <span className="font-mono text-[11px]">Total: {items.length} Laporan Ditampilkan</span>
      </footer>
    </div>
  )
}
