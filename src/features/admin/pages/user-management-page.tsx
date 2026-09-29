import { useEffect, useState } from "react"
import {
  IconCheck,
  IconChevronDown,
  IconCircleCheck,
  IconEdit,
  IconPlus,
  IconRefresh,
  IconKey,
  IconSearch,
  IconTrash,
  IconUserOff,
  IconUsers,
} from "@tabler/icons-react"

import { EmptyState } from "@/components/shared/empty-state"
import { ErrorState } from "@/components/shared/error-state"
import { TableSkeleton } from "@/components/shared/loading-states"
import { PageHeader } from "@/components/shared/page-header"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
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
import {
  createUser,
  changeUserPassword,
  deleteUser,
  listUsers,
  toggleUserActivation,
  updateUser,
  type AdminUser,
  type UserRole,
} from "../api/admin-api"

const ROLES: { value: UserRole; label: string }[] = [
  { value: "TENAGA_KESEHATAN", label: "Tenaga Kesehatan" },
  { value: "KEPALA_RUANGAN", label: "Kepala Ruangan" },
  { value: "KOMITE_PMKP", label: "Komite PMKP" },
  { value: "ADMINISTRATOR", label: "Administrator" },
]

const ROLE_BADGE_CLASS: Record<UserRole, string> = {
  TENAGA_KESEHATAN: "bg-status-info text-status-info-foreground",
  KEPALA_RUANGAN: "bg-primary/10 text-primary",
  KOMITE_PMKP: "bg-status-pending text-status-pending-foreground",
  ADMINISTRATOR: "bg-status-warning text-status-warning-foreground",
}

function roleLabel(role: UserRole): string {
  return ROLES.find((r) => r.value === role)?.label ?? role
}

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <Badge className={cn("border-transparent font-medium", ROLE_BADGE_CLASS[role])} variant="outline">
      {roleLabel(role)}
    </Badge>
  )
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge
      className={cn(
        "gap-1.5 border-transparent font-medium",
        isActive
          ? "bg-status-success text-status-success-foreground"
          : "bg-status-neutral text-status-neutral-foreground",
      )}
      variant="outline"
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 rounded-full",
          isActive ? "bg-status-success-foreground" : "bg-status-neutral-foreground/60",
        )}
      />
      {isActive ? "Aktif" : "Nonaktif"}
    </Badge>
  )
}

const selectClass =
  "h-10 w-full appearance-none rounded-lg border border-input bg-transparent px-2.5 pr-8 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:h-8 md:text-sm dark:bg-input/30"

// ─── Create / Edit dialog ─────────────────────────────────────────
interface UserFormProps {
  user?: AdminUser | null
  csrfToken: string | null
  onSuccess: (u: AdminUser) => void
  onClose: () => void
}

function UserFormDialog({ user, csrfToken, onSuccess, onClose }: UserFormProps) {
  const isEdit = Boolean(user)
  const [fullName, setFullName] = useState(user?.fullName ?? "")
  const [username, setUsername] = useState(user?.username ?? "")
  const [role, setRole] = useState<UserRole>(user?.role ?? "TENAGA_KESEHATAN")
  const [profession, setProfession] = useState(user?.profession ?? "")
  const [unitId, setUnitId] = useState(user?.unitId ?? "IBS")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)
    try {
      let result: AdminUser
      if (isEdit && user) {
        result = await updateUser(
          user.id,
          { full_name: fullName, role, profession, unit_id: unitId },
          csrfToken ?? undefined,
        )
      } else {
        result = await createUser(
          { username, full_name: fullName, role, profession, unit_id: unitId, password },
          csrfToken ?? undefined,
        )
      }
      onSuccess(result)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Terjadi kesalahan.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onClose()
      }}
      open
    >
      <DialogContent className="gap-0 p-0 sm:max-w-md">
        <DialogHeader className="border-b px-4 py-3.5 pr-14 sm:px-5 sm:pr-14">
          <DialogTitle className="text-sm sm:text-base">
            {isEdit ? "Edit Pengguna" : "Tambah Pengguna Baru"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isEdit
              ? "Perbarui data akun staf. Nama pengguna tidak dapat diubah."
              : "Buat akun staf baru untuk mengakses SIP-IKP sesuai perannya."}
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex max-h-[70dvh] flex-col gap-4 overflow-y-auto px-4 py-4 sm:px-5"
          onSubmit={(e) => {
            void handleSubmit(e)
          }}
        >
          {errorMessage && (
            <p
              className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive"
              role="alert"
            >
              {errorMessage}
            </p>
          )}

          {!isEdit && (
            <Field>
              <FieldLabel htmlFor="uf-username">
                Nama Pengguna <span aria-hidden="true" className="text-destructive">*</span>
              </FieldLabel>
              <Input
                autoComplete="off"
                className="h-10"
                id="uf-username"
                onChange={(e) => {
                  setUsername(e.target.value)
                }}
                placeholder="Contoh: nakes_ibs"
                required
                type="text"
                value={username}
              />
              <FieldDescription>
                Huruf kecil, angka, underscore. Tidak dapat diubah setelah dibuat.
              </FieldDescription>
            </Field>
          )}

          <Field>
            <FieldLabel htmlFor="uf-fullname">
              Nama Lengkap <span aria-hidden="true" className="text-destructive">*</span>
            </FieldLabel>
            <Input
              className="h-10"
              id="uf-fullname"
              onChange={(e) => {
                setFullName(e.target.value)
              }}
              placeholder="Ns. Nama Lengkap, S.Kep"
              required
              type="text"
              value={fullName}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="uf-role">
              Peran <span aria-hidden="true" className="text-destructive">*</span>
            </FieldLabel>
            <div className="relative">
              <select
                className={selectClass}
                id="uf-role"
                onChange={(e) => {
                  setRole(e.target.value as UserRole)
                }}
                required
                value={role}
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <IconChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              />
            </div>
          </Field>

          <Field>
            <FieldLabel htmlFor="uf-profession">
              Profesi / Jabatan <span aria-hidden="true" className="text-destructive">*</span>
            </FieldLabel>
            <Input
              className="h-10"
              id="uf-profession"
              onChange={(e) => {
                setProfession(e.target.value)
              }}
              placeholder="Contoh: Perawat Bedah"
              required
              type="text"
              value={profession}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="uf-unit">Unit / Instalasi</FieldLabel>
            <Input
              className="h-10"
              id="uf-unit"
              onChange={(e) => {
                setUnitId(e.target.value)
              }}
              placeholder="IBS"
              type="text"
              value={unitId}
            />
          </Field>

          {!isEdit && (
            <Field>
              <FieldLabel htmlFor="uf-password">
                Kata Sandi Awal <span aria-hidden="true" className="text-destructive">*</span>
              </FieldLabel>
              <Input
                autoComplete="new-password"
                className="h-10"
                id="uf-password"
                minLength={8}
                onChange={(e) => {
                  setPassword(e.target.value)
                }}
                placeholder="Minimal 8 karakter"
                required
                type="password"
                value={password}
              />
              <FieldDescription>
                Sampaikan kata sandi secara langsung kepada pengguna. Sandi tidak dapat dilihat
                kembali setelah disimpan.
              </FieldDescription>
            </Field>
          )}

          <DialogFooter className="-mx-4 -mb-4 mt-auto border-t bg-muted/40 px-4 sm:px-5">
            <Button disabled={isSubmitting} onClick={onClose} type="button" variant="ghost">
              Batal
            </Button>
            <Button className="font-medium" disabled={isSubmitting} type="submit">
              {isSubmitting && <Spinner data-icon="inline-start" />}
              {isSubmitting ? "Menyimpan…" : isEdit ? "Simpan Perubahan" : "Buat Pengguna"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main page ────────────────────────────────────────────────────
export function UserManagementPage() {
  const { user: currentUser, csrfToken } = useAuth()

  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isToggling, setIsToggling] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)
  const [passwordTarget, setPasswordTarget] = useState<AdminUser | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [isAccountActionLoading, setIsAccountActionLoading] = useState(false)
  const [accountActionError, setAccountActionError] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [activeFilter, setActiveFilter] = useState<"" | "true" | "false">("")

  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editUser, setEditUser] = useState<AdminUser | null>(null)
  const [confirmAction, setConfirmAction] = useState<{
    user: AdminUser
    action: "activate" | "deactivate"
  } | null>(null)

  const loadUsers = async () => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const data = await listUsers({ search, role: roleFilter, active: activeFilter || undefined })
      setUsers(data)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Gagal memuat daftar pengguna.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    async function init() {
      try {
        const data = await listUsers({ search, role: roleFilter, active: activeFilter || undefined })
        if (!isMounted) return
        setUsers(data)
      } catch (err) {
        if (!isMounted) return
        setErrorMessage(err instanceof Error ? err.message : "Gagal memuat daftar pengguna.")
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    void init()
    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleUserSaved = (user: AdminUser) => {
    setUsers((prev) => {
      const existing = prev.findIndex((u) => u.id === user.id)
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = user
        return updated
      }
      return [user, ...prev]
    })
    setShowCreateDialog(false)
    setEditUser(null)
    setFeedback(`Pengguna "${user.fullName}" berhasil disimpan.`)
    setTimeout(() => {
      setFeedback(null)
    }, 4000)
  }

  const handleToggleActivation = async () => {
    if (!confirmAction) return
    const { user, action } = confirmAction
    setIsToggling(true)
    try {
      const updated = await toggleUserActivation(user.id, action, csrfToken ?? undefined)
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
      const label = action === "deactivate" ? "dinonaktifkan" : "diaktifkan"
      setFeedback(`Pengguna "${updated.fullName}" berhasil ${label}.`)
      setConfirmAction(null)
      setTimeout(() => {
        setFeedback(null)
      }, 4000)
    } catch (err) {
      setConfirmAction(null)
      setErrorMessage(err instanceof Error ? err.message : "Gagal mengubah status pengguna.")
    } finally {
      setIsToggling(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!deleteTarget) return
    setIsAccountActionLoading(true)
    setAccountActionError(null)
    try {
      await deleteUser(deleteTarget.id, csrfToken ?? undefined)
      setUsers((previous) => previous.filter((candidate) => candidate.id !== deleteTarget.id))
      setFeedback(`Pengguna "${deleteTarget.fullName}" berhasil dihapus.`)
      setDeleteTarget(null)
    } catch (error) {
      setDeleteTarget(null)
      setErrorMessage(error instanceof Error ? error.message : "Gagal menghapus pengguna.")
    } finally {
      setIsAccountActionLoading(false)
    }
  }

  const handlePasswordChange = async (event: React.SyntheticEvent) => {
    event.preventDefault()
    if (!passwordTarget) return
    setIsAccountActionLoading(true)
    setAccountActionError(null)
    try {
      await changeUserPassword(passwordTarget.id, newPassword, csrfToken ?? undefined)
      setFeedback(`Kata sandi "${passwordTarget.fullName}" berhasil diubah.`)
      setPasswordTarget(null)
      setNewPassword("")
    } catch (error) {
      setAccountActionError(error instanceof Error ? error.message : "Gagal mengubah kata sandi.")
    } finally {
      setIsAccountActionLoading(false)
    }
  }

  const confirmUser = confirmAction?.user
  const isDeactivate = confirmAction?.action === "deactivate"
  const confirmUserName = confirmUser?.fullName ?? ""
  const confirmUserHandle = confirmUser ? ` (@${confirmUser.username})` : ""

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader
        actions={
          <Button
            className="font-medium"
            onClick={() => {
              setShowCreateDialog(true)
            }}
            size="sm"
          >
            <IconPlus data-icon="inline-start" />
            Tambah Pengguna
          </Button>
        }
        breadcrumbs={[{ label: "Beranda", to: "/" }, { label: "Manajemen Pengguna" }]}
        description="Kelola akun staf IBS — tambah, ubah, aktifkan, atau nonaktifkan pengguna sistem."
        title="Manajemen Pengguna"
      />

      {/* Feedback */}
      {feedback && (
        <p
          aria-live="polite"
          className="flex items-center gap-2 rounded-lg bg-status-success px-4 py-3 text-xs font-medium text-status-success-foreground"
        >
          <IconCircleCheck aria-hidden="true" className="size-4 shrink-0" />
          {feedback}
        </p>
      )}

      {/* Error */}
      {errorMessage && (
        <ErrorState
          message={errorMessage}
          onRetry={() => {
            void loadUsers()
          }}
        />
      )}

      {/* Filters */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <InputGroup className="h-10 lg:max-w-xs md:h-8">
          <InputGroupAddon align="inline-start">
            <IconSearch />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Cari pengguna"
            onChange={(e) => {
              setSearch(e.target.value)
            }}
            placeholder="Cari nama atau nama pengguna…"
            type="search"
            value={search}
          />
        </InputGroup>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative sm:w-48">
            <select
              aria-label="Filter peran"
              className={selectClass}
              onChange={(e) => {
                setRoleFilter(e.target.value)
              }}
              value={roleFilter}
            >
              <option value="">Semua Peran</option>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <IconChevronDown
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
          </div>
          <div className="relative sm:w-40">
            <select
              aria-label="Filter status"
              className={selectClass}
              onChange={(e) => {
                setActiveFilter(e.target.value as "" | "true" | "false")
              }}
              value={activeFilter}
            >
              <option value="">Semua Status</option>
              <option value="true">Aktif</option>
              <option value="false">Nonaktif</option>
            </select>
            <IconChevronDown
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
          </div>
          <Button
            className="shrink-0"
            disabled={isLoading}
            onClick={() => {
              void loadUsers()
            }}
            size="sm"
            variant="outline"
          >
            <IconRefresh data-icon="inline-start" />
            Terapkan
          </Button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : users.length === 0 ? (
        <EmptyState
          action={
            <Button
              onClick={() => {
                setShowCreateDialog(true)
              }}
              size="sm"
            >
              <IconPlus data-icon="inline-start" />
              Tambah Pengguna
            </Button>
          }
          className="py-14"
          description="Ubah filter pencarian atau tambahkan pengguna baru."
          icon={IconUsers}
          title="Tidak ada pengguna ditemukan"
        />
      ) : (
        <Card className="py-0">
          <CardContent className="p-0">
            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Pengguna</TableHead>
                    <TableHead className="w-40">Peran</TableHead>
                    <TableHead className="w-44">Profesi</TableHead>
                    <TableHead className="w-20">Unit</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    <TableHead className="w-28">Terdaftar</TableHead>
                    <TableHead className="w-52 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <span className="block font-medium text-foreground">{u.fullName}</span>
                        <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">
                          @{u.username}
                        </span>
                      </TableCell>
                      <TableCell>
                        <RoleBadge role={u.role} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{u.profession}</TableCell>
                      <TableCell className="text-muted-foreground">{u.unitId}</TableCell>
                      <TableCell>
                        <StatusBadge isActive={u.isActive} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                        {new Date(u.createdAt).toLocaleDateString("id-ID")}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            onClick={() => {
                              setEditUser(u)
                            }}
                            size="xs"
                            variant="outline"
                          >
                            <IconEdit data-icon="inline-start" />
                            Edit
                          </Button>
                          <Button
                            disabled={u.id === currentUser?.id}
                            onClick={() => { setAccountActionError(null); setPasswordTarget(u) }}
                            size="xs"
                            title={u.id === currentUser?.id ? "Tidak dapat mengubah kata sandi akun sendiri" : undefined}
                            variant="outline"
                          >
                            <IconKey data-icon="inline-start" />
                            Sandi
                          </Button>
                          {u.isActive ? (
                            <Button
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => {
                                setConfirmAction({ user: u, action: "deactivate" })
                              }}
                              size="xs"
                              variant="outline"
                            >
                              <IconUserOff data-icon="inline-start" />
                              Nonaktifkan
                            </Button>
                          ) : (
                            <Button
                              onClick={() => {
                                setConfirmAction({ user: u, action: "activate" })
                              }}
                              size="xs"
                              variant="outline"
                            >
                              <IconCheck data-icon="inline-start" />
                              Aktifkan
                            </Button>
                          )}
                          <Button
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            disabled={u.id === currentUser?.id}
                            onClick={() => { setAccountActionError(null); setDeleteTarget(u) }}
                            size="xs"
                            title={u.id === currentUser?.id ? "Tidak dapat menghapus akun sendiri" : undefined}
                            variant="outline"
                          >
                            <IconTrash aria-hidden="true" />
                            <span className="sr-only">Hapus {u.fullName}</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile card list */}
            <ul className="flex flex-col md:hidden">
              {users.map((u, index) => (
                <li className={cn("px-4 py-3.5", index > 0 && "border-t")} key={u.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{u.fullName}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">@{u.username}</p>
                    </div>
                    <StatusBadge isActive={u.isActive} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <RoleBadge role={u.role} />
                    <span className="text-[11px] text-muted-foreground">
                      {u.profession} · {u.unitId}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => {
                        setEditUser(u)
                      }}
                      size="sm"
                      variant="outline"
                    >
                      <IconEdit data-icon="inline-start" />
                      Edit
                    </Button>
                    {u.isActive ? (
                      <Button
                        className="flex-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => {
                          setConfirmAction({ user: u, action: "deactivate" })
                        }}
                        size="sm"
                        variant="outline"
                      >
                        <IconUserOff data-icon="inline-start" />
                        Nonaktifkan
                      </Button>
                    ) : (
                      <Button
                        className="flex-1"
                        onClick={() => {
                          setConfirmAction({ user: u, action: "activate" })
                        }}
                        size="sm"
                        variant="outline"
                      >
                        <IconCheck data-icon="inline-start" />
                        Aktifkan
                      </Button>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Button disabled={u.id === currentUser?.id} onClick={() => { setAccountActionError(null); setPasswordTarget(u) }} size="sm" variant="outline">
                      <IconKey data-icon="inline-start" /> Ubah Sandi
                    </Button>
                    <Button className="text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={u.id === currentUser?.id} onClick={() => { setAccountActionError(null); setDeleteTarget(u) }} size="sm" variant="outline">
                      <IconTrash data-icon="inline-start" /> Hapus
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Total count */}
      {!isLoading && users.length > 0 && (
        <p className="text-right text-[11px] text-muted-foreground tabular-nums">
          Menampilkan {users.length} pengguna
        </p>
      )}

      {/* Dialogs */}
      {showCreateDialog && (
        <UserFormDialog
          csrfToken={csrfToken}
          onClose={() => {
            setShowCreateDialog(false)
          }}
          onSuccess={handleUserSaved}
        />
      )}

      {editUser && (
        <UserFormDialog
          csrfToken={csrfToken}
          onClose={() => {
            setEditUser(null)
          }}
          onSuccess={handleUserSaved}
          user={editUser}
        />
      )}

      <ConfirmDialog
        busy={isToggling}
        cancelLabel="Batal"
        confirmLabel={isDeactivate ? "Nonaktifkan" : "Aktifkan"}
        description={
          isDeactivate
            ? `Pengguna "${confirmUserName}"${confirmUserHandle} akan dinonaktifkan. Seluruh sesi aktifnya akan dicabut otomatis.`
            : `Pengguna "${confirmUserName}"${confirmUserHandle} akan diaktifkan kembali dan dapat masuk ke sistem.`
        }
        onConfirm={() => {
          void handleToggleActivation()
        }}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null)
        }}
        open={Boolean(confirmAction)}
        title={
          isDeactivate ? `Nonaktifkan ${confirmUserName}?` : `Aktifkan ${confirmUserName}?`
        }
        tone={isDeactivate ? "destructive" : "default"}
      />
      <ConfirmDialog
        busy={isAccountActionLoading}
        cancelLabel="Batal"
        confirmLabel="Hapus Pengguna"
        description={`Akun "${deleteTarget?.fullName ?? ""}" akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={() => { void handleDeleteUser() }}
        onOpenChange={(open) => { if (!open && !isAccountActionLoading) setDeleteTarget(null) }}
        open={Boolean(deleteTarget)}
        title="Hapus pengguna?"
        tone="destructive"
      />
      <Dialog onOpenChange={(open) => { if (!open && !isAccountActionLoading) { setPasswordTarget(null); setNewPassword("") } }} open={Boolean(passwordTarget)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah Kata Sandi</DialogTitle>
            <DialogDescription>Tetapkan kata sandi baru untuk {passwordTarget?.fullName}.</DialogDescription>
          </DialogHeader>
          <form className="flex flex-col gap-4" onSubmit={(event) => { void handlePasswordChange(event) }}>
            {accountActionError && <p className="text-xs font-medium text-destructive" role="alert">{accountActionError}</p>}
            <Field>
              <FieldLabel htmlFor="reset-password">Kata Sandi Baru</FieldLabel>
              <Input autoComplete="new-password" id="reset-password" minLength={8} onChange={(event) => { setNewPassword(event.target.value) }} required type="password" value={newPassword} />
              <FieldDescription>Minimal 8 karakter.</FieldDescription>
            </Field>
            <DialogFooter>
              <Button disabled={isAccountActionLoading} onClick={() => { setPasswordTarget(null); setNewPassword("") }} type="button" variant="ghost">Batal</Button>
              <Button disabled={isAccountActionLoading || newPassword.length < 8} type="submit">
                {isAccountActionLoading && <Spinner data-icon="inline-start" />} Simpan Kata Sandi
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
