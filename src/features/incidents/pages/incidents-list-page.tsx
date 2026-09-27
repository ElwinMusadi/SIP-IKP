import { useEffect, useState } from "react"
import { IconAlertCircle, IconFilePlus, IconFolder, IconRefresh } from "@tabler/icons-react"
import { Link, useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/use-auth"
import { fetchIncidents } from "../api/incidents-api"
import { IncidentStatusBadge } from "../components/incident-status-badge"
import { RiskBadge } from "../components/risk-badge"
import type { IncidentReport } from "../types/incident"

export function IncidentsListPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [incidents, setIncidents] = useState<IncidentReport[]>([])
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL")
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loadData = async (statusFilter?: string) => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const data = await fetchIncidents(
        statusFilter && statusFilter !== "ALL" ? statusFilter : undefined,
      )
      setIncidents(data)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Gagal memuat daftar laporan.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    async function init() {
      try {
        const data = await fetchIncidents(selectedStatus !== "ALL" ? selectedStatus : undefined)
        if (!isMounted) return
        setIncidents(data)
      } catch (err) {
        if (!isMounted) return
        setErrorMessage(err instanceof Error ? err.message : "Gagal memuat daftar laporan.")
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
  }, [selectedStatus])

  const canCreate = user && user.role !== "ADMINISTRATOR"

  const filterTabs: Array<{ label: string; value: string }> = [
    { label: "Semua Laporan", value: "ALL" },
    { label: "Draf Saya", value: "DRAFT" },
    { label: "Menunggu Verifikasi", value: "SUBMITTED" },
    { label: "Perlu Revisi", value: "REVISION_REQUIRED" },
    { label: "Sedang Ditinjau", value: "UNDER_REVIEW" },
    { label: "Investigasi Sederhana", value: "SIMPLE_INVESTIGATION" },
    { label: "Tinjauan PMKP", value: "PMKP_REVIEW" },
    { label: "Selesai di Unit", value: "COMPLETED_BY_UNIT" },
    { label: "Selesai (Kasus Ditutup)", value: "COMPLETED" },
  ]

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-wider text-primary uppercase">
              Instalasi Bedah Sentral (IBS)
            </span>
            <span className="text-muted-foreground">&bull;</span>
            <span className="text-xs text-muted-foreground">RSUD Prof. Dr. W. Z. Johannes</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Laporan Insiden Keselamatan Pasien
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Daftar pelaporan insiden operasional IBS, alur investigasi sederhana, dan koordinasi
            mutu PMKP.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            className="gap-1.5"
            onClick={() => {
              void loadData(selectedStatus)
            }}
            size="sm"
            variant="outline"
          >
            <IconRefresh className="size-3.5" />
            <span>Segarkan</span>
          </Button>

          {canCreate && (
            <Button
              className="gap-1.5 font-medium"
              onClick={() => {
                void navigate("/laporan/baru")
              }}
              size="sm"
            >
              <IconFilePlus className="size-4" />
              <span>Buat Laporan Baru</span>
            </Button>
          )}
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="flex overflow-x-auto border-b pb-2 text-xs">
        <div className="flex items-center gap-1.5">
          {filterTabs.map((tab) => (
            <button
              className={`rounded-lg px-3 py-1.5 font-medium whitespace-nowrap transition-colors ${
                selectedStatus === tab.value
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              key={tab.value}
              onClick={() => {
                setSelectedStatus(tab.value)
              }}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {errorMessage && (
        <div
          aria-live="polite"
          className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-xs font-medium text-destructive"
          role="alert"
        >
          <IconAlertCircle className="size-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Incidents Table / List */}
      {isLoading ? (
        <div className="flex min-h-60 items-center justify-center rounded-xl border bg-card p-8">
          <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
            <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>Memuat daftar insiden...</span>
          </div>
        </div>
      ) : incidents.length === 0 ? (
        <div className="flex min-h-60 flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 p-8 text-center text-xs text-muted-foreground">
          <IconFolder className="size-10 text-muted-foreground/40" />
          <p className="font-semibold text-foreground">Tidak Ada Laporan yang Ditemukan</p>
          <p className="max-w-md">
            Belum ada laporan insiden dengan kriteria filter ini di Instalasi Bedah Sentral.
          </p>
          {canCreate && (
            <Button
              className="mt-2 gap-1.5"
              onClick={() => {
                void navigate("/laporan/baru")
              }}
              size="sm"
            >
              <IconFilePlus className="size-4" />
              <span>Mulai Buat Laporan</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b bg-muted/40 font-semibold text-muted-foreground">
              <tr>
                <th className="px-4 py-3">No. Laporan / Status</th>
                <th className="px-4 py-3">Judul &amp; Jenis Insiden</th>
                <th className="px-4 py-3">Waktu Kejadian</th>
                <th className="px-4 py-3">Pelapor / Ruangan</th>
                <th className="px-4 py-3">Pita Risiko</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y text-foreground">
              {incidents.map((inc) => (
                <tr className="transition-colors hover:bg-muted/30" key={inc.id}>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col gap-1">
                      <span className="font-mono font-semibold text-[11px] text-foreground">
                        {inc.report_number ?? "DRAF-IKP"}
                      </span>
                      <div>
                        <IncidentStatusBadge status={inc.status} />
                      </div>
                    </div>
                  </td>
                  <td className="max-w-xs px-4 py-3.5">
                    <div className="flex flex-col gap-0.5">
                      <Link
                        className="font-semibold text-foreground hover:text-primary line-clamp-2"
                        to={`/laporan/${inc.id}`}
                      >
                        {inc.incident_title || "(Draf Tanpa Judul)"}
                      </Link>
                      <span className="text-[11px] text-muted-foreground">
                        Tipe: <strong>{inc.incident_type}</strong> &bull; Subjek:{" "}
                        {inc.incident_target}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-muted-foreground">
                    <div className="flex flex-col gap-0.5">
                      <span>{new Date(inc.incident_datetime).toLocaleDateString("id-ID")}</span>
                      <span className="text-[11px]">
                        {new Date(inc.incident_datetime).toLocaleTimeString("id-ID")} WITA
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-foreground">{inc.reporter_name}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {inc.incident_location ?? "IBS"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <RiskBadge grade={inc.risk_grade} />
                  </td>
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <Button
                      className="text-xs"
                      onClick={() => {
                        void navigate(`/laporan/${inc.id}`)
                      }}
                      size="sm"
                      variant="outline"
                    >
                      Buka Laporan
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
