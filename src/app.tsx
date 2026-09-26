import { createBrowserRouter, RouterProvider } from "react-router"

import { AppLayout } from "@/components/layout/app-layout"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { IncidentCreatePage } from "@/features/incidents/pages/incident-create-page"
import { IncidentDetailPage } from "@/features/incidents/pages/incident-detail-page"
import { IncidentsListPage } from "@/features/incidents/pages/incidents-list-page"
import { AuthProvider } from "@/lib/auth-context"
import { FoundationPage } from "@/routes/foundation-page"
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
      { path: "fondasi", Component: FoundationPage },
      {
        element: <ProtectedRoute />,
        children: [
          { path: "laporan", Component: IncidentsListPage },
          { path: "laporan/baru", Component: IncidentCreatePage },
          { path: "laporan/:id", Component: IncidentDetailPage },
        ],
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
