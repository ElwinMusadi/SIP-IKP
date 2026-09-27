import { useEffect, useMemo, useState } from "react"
import {
  IconChevronLeft,
  IconChevronRight,
  IconFilePlus,
  IconRefresh,
  IconSearch,
} from "@tabler/icons-react"
import { Link, useNavigate, useSearchParams } from "react-router"

import { EmptyState } from "@/components/shared/empty-state"
import { ErrorState } from "@/components/shared/error-state"
import { PageHeader } from "@/components/shared/page-header"
import { TableSkeleton } from "@/components/shared/loading-states"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuth } from "@/lib/use-auth"
import { cn } from "@/lib/utils"

import { fetchIncidents } from "../api/incidents-api"
import { IncidentStatusBadge } from "../components/incident-status-badge"
import { RiskBadge } from "../components/risk-badge"
import { INCIDENT_TARGET_LABELS, INCIDENT_TYPE_SHORT_LABELS } from "../lib/labels"
import type { IncidentReport, IncidentStatus } from "../types/incident"

const VALID_STATUSES: IncidentStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "REVISION_REQUIRED",
  "UNDER_REVIEW",
  "SIMPLE_INVESTIGATION",
  "PMKP_REVIEW",
  "COMPLETED_BY_UNIT",
  "COMPLETED",
]

const FILTER_TABS: Array<{ label: string; value: string }> = [
  { label: "Semua", value: "ALL" },
  { label: "Draf", value: "DRAFT" },
  { label: "Terkirim", value: "SUBMITTED" },
  { label: "Perlu Revisi", value: "REVISION_REQUIRED" },
  { label: "Sedang Ditinjau", value: "UNDER_REVIEW" },
  { label: "Investigasi", value: "SIMPLE_INVESTIGATION" },
  { label: "PMKP", value: "PMKP_REVIEW" },
  { label: "Selesai (Unit)", value: "COMPLETED_BY_UNIT" },
  { label: "Selesai", value: "COMPLETED" },
]

const PAGE_SIZE = 10

function formatTanggal(value: string): string {
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatWaktu(value: string): string {
  return new Date(value).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
}

export function IncidentsListPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const initialStatus = searchParams.get("status")
  const [selectedStatus, setSelectedStatus] = useState<string>(
    initialStatus && VALID_STATUSES.includes(initialStatus as IncidentStatus) ? initialStatus : "ALL",
  )
  const [searchQuery, setSearchQuery] = useState("")
  const [page, setPage] = useState(1)
  const [incidents, setIncidents] = useState<IncidentReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let isMounted = true

    async function init() {
      setIsLoading(true)
      setErrorMessage(null)
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
  }, [selectedStatus, reloadKey])

  const filteredIncidents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return incidents
    return incidents.filter((inc) =>
      [inc.incident_title, inc.report_number, inc.reporter_name, inc.incident_location]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(query)),
    )
  }, [incidents, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredIncidents.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedIncidents = filteredIncidents.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const canCreate = user && user.role !== "ADMINISTRATOR"

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value)
    setPage(1)
    setSearchParams(value === "ALL" ? {} : { status: value }, { replace: true })
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader
        actions={
          <>
            <Button
              disabled={isLoading}
              onClick={() => { setReloadKey((key) => key + 1); }}
              size="sm"
              variant="outline"
            >
              <IconRefresh data-icon="inline-start" />
              Segarkan
            </Button>
            {canCreate && (
              <Button onClick={() => void navigate("/laporan/baru")} size="sm">
                <IconFilePlus data-icon="inline-start" />
                Buat Laporan
              </Button>
            )}
          </>
        }
        breadcrumbs={[{ label: "Beranda", to: "/" }, { label: "Laporan Insiden" }]}
        description="Kelola seluruh laporan insiden IBS: pantau status, verifikasi, dan tindak lanjut tiap kasus."
        title="Laporan Insiden Keselamatan Pasien"
      >
        {/* Filter status */}
        <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
          <Tabs onValueChange={(value) => { handleStatusChange(String(value)); }} value={selectedStatus}>
            <TabsList className="h-auto w-max gap-1 bg-transparent p-0">
              {FILTER_TABS.map((tab) => (
                <TabsTrigger
                  className="min-h-10 rounded-lg border border-transparent bg-muted/50 px-3 py-1.5 text-xs font-medium whitespace-nowrap text-muted-foreground data-active:border-primary/20 data-active:bg-primary data-active:font-semibold data-active:text-primary-foreground"
                  key={tab.value}
                  value={tab.value}
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </PageHeader>

      {/* Search + count */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <InputGroup className="h-10 max-w-sm md:h-8">
          <InputGroupAddon align="inline-start">
            <IconSearch />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Cari laporan"
            onChange={(event) => {
              setSearchQuery(event.target.value)
              setPage(1)
            }}
            placeholder="Cari judul, nomor laporan, pelapor…"
            type="search"
            value={searchQuery}
          />
        </InputGroup>
        {!isLoading && !errorMessage && (
          <p aria-live="polite" className="text-xs text-muted-foreground">
            Menampilkan <strong className="font-semibold text-foreground tabular-nums">{pagedIncidents.length}</strong>{" "}
            dari <strong className="font-semibold text-foreground tabular-nums">{filteredIncidents.length}</strong> laporan
          </p>
        )}
      </div>

      {errorMessage ? (
        <ErrorState message={errorMessage} onRetry={() => { setReloadKey((key) => key + 1); }} />
      ) : isLoading ? (
        <TableSkeleton rows={6} />
      ) : filteredIncidents.length === 0 ? (
        <EmptyState
          action={
            canCreate && searchQuery === "" && selectedStatus === "ALL" ? (
              <Button onClick={() => void navigate("/laporan/baru")} size="sm">
                <IconFilePlus data-icon="inline-start" />
                Buat Laporan
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setSearchQuery("")
                  handleStatusChange("ALL")
                }}
                size="sm"
                variant="outline"
              >
                Bersihkan Filter
              </Button>
            )
          }
          className="py-14"
          description={
            searchQuery || selectedStatus !== "ALL"
              ? "Tidak ada laporan yang cocok dengan kata kunci atau filter status ini."
              : "Belum ada laporan insiden di Instalasi Bedah Sentral."
          }
          title={searchQuery || selectedStatus !== "ALL" ? "Laporan tidak ditemukan" : "Belum ada laporan"}
        />
      ) : (
        <Card className="py-0">
          <CardContent className="p-0">
            {/* Desktop / tablet */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-40">No. Laporan</TableHead>
                    <TableHead>Insiden</TableHead>
                    <TableHead className="w-32">Waktu Kejadian</TableHead>
                    <TableHead className="w-40">Pelapor</TableHead>
                    <TableHead className="w-40">Status</TableHead>
                    <TableHead className="w-36">Risiko</TableHead>
                    <TableHead className="w-10">
                      <span className="sr-only">Aksi</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedIncidents.map((inc) => (
                    <TableRow
                      className="cursor-pointer"
                      key={inc.id}
                      onClick={() => void navigate(`/laporan/${inc.id}`)}
                    >
                      <TableCell>
                        <span className="font-mono text-xs font-medium">
                          {inc.report_number ?? "DRAF"}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-72">
                        <span className="line-clamp-1 font-medium text-foreground">
                          {inc.incident_title || "(Tanpa judul)"}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {INCIDENT_TYPE_SHORT_LABELS[inc.incident_type]} ·{" "}
                          {INCIDENT_TARGET_LABELS[inc.incident_target]}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        <span className="block tabular-nums">{formatTanggal(inc.incident_datetime)}</span>
                        <span className="block tabular-nums">
                          {formatWaktu(inc.incident_datetime)} {inc.incident_timezone || "WITA"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="line-clamp-1 text-sm font-medium">{inc.reporter_name}</span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {inc.incident_location ?? "IBS"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <IncidentStatusBadge status={inc.status} />
                      </TableCell>
                      <TableCell>
                        <RiskBadge grade={inc.risk_grade} />
                      </TableCell>
                      <TableCell>
                        <Button
                          aria-label={`Buka laporan ${inc.report_number ?? inc.id}`}
                          onClick={(event) => {
                            event.stopPropagation()
                            void navigate(`/laporan/${inc.id}`)
                          }}
                          size="icon-sm"
                          variant="ghost"
                        >
                          <IconChevronRight className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile */}
            <ul className="flex flex-col md:hidden">
              {pagedIncidents.map((inc, index) => (
                <li key={inc.id}>
                  <Link
                    className={cn("block px-4 py-3.5 transition-colors hover:bg-muted/40", index > 0 && "border-t")}
                    to={`/laporan/${inc.id}`}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="line-clamp-2 text-sm font-medium text-foreground">
                        {inc.incident_title || "(Tanpa judul)"}
                      </span>
                      <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                        {inc.report_number ?? "DRAF"}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {INCIDENT_TYPE_SHORT_LABELS[inc.incident_type]} · {inc.reporter_name} ·{" "}
                      {formatTanggal(inc.incident_datetime)}
                    </span>
                    <span className="mt-2 flex flex-wrap items-center gap-1.5">
                      <IncidentStatusBadge status={inc.status} />
                      <RiskBadge grade={inc.risk_grade} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {!isLoading && !errorMessage && totalPages > 1 && (
        <nav aria-label="Navigasi halaman" className="flex items-center justify-between">
          <Button
            disabled={currentPage <= 1}
            onClick={() => { setPage(currentPage - 1); }}
            size="sm"
            variant="outline"
          >
            <IconChevronLeft data-icon="inline-start" />
            Sebelumnya
          </Button>
          <p className="text-xs text-muted-foreground tabular-nums">
            Halaman {currentPage} dari {totalPages}
          </p>
          <Button
            disabled={currentPage >= totalPages}
            onClick={() => { setPage(currentPage + 1); }}
            size="sm"
            variant="outline"
          >
            Berikutnya
            <IconChevronRight data-icon="inline-end" />
          </Button>
        </nav>
      )}
    </div>
  )
}
