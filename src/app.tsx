import { createBrowserRouter, RouterProvider } from "react-router"

import { AppLayout } from "@/components/layout/app-layout"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { UserManagementPage } from "@/features/admin/pages/user-management-page"
import { IncidentCreatePage } from "@/features/incidents/pages/incident-create-page"
import { IncidentDetailPage } from "@/features/incidents/pages/incident-detail-page"
import { IncidentPrintPage } from "@/features/incidents/pages/incident-print-page"
import { IncidentsListPage } from "@/features/incidents/pages/incidents-list-page"
import { IncidentsRecapPage } from "@/features/incidents/pages/incidents-recap-page"
import { AuthProvider } from "@/lib/auth-context"
import { HomePage } from "@/routes/home-page"
import { LoginPage } from "@/routes/login-page"
import { NotFoundPage } from "@/routes/not-found-page"

const router = createBrowserRouter([
  {
    path: "/",
    Component: AppLayout,
    children: [
      { index: true, Component: HomePage },
      { path: "login", Component: LoginPage },
      {
        element: <ProtectedRoute />,
        children: [
          { path: "laporan", Component: IncidentsListPage },
          { path: "laporan/baru", Component: IncidentCreatePage },
          { path: "laporan/rekap", Component: IncidentsRecapPage },
          { path: "laporan/:id/edit", Component: IncidentCreatePage },
          { path: "laporan/:id", Component: IncidentDetailPage },
          { path: "laporan/:id/cetak", Component: IncidentPrintPage },
          { path: "insiden/:id/cetak", Component: IncidentPrintPage },
        ],
      },
      {
        element: <ProtectedRoute allowedRoles={["ADMINISTRATOR"]} />,
        children: [{ path: "admin/users", Component: UserManagementPage }],
      },
      { path: "*", Component: NotFoundPage },
    ],
  },
])

export function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
