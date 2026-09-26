import { createBrowserRouter, RouterProvider } from "react-router"

import { AppLayout } from "@/components/layout/app-layout"
import { ProtectedRoute } from "@/components/layout/protected-route"
import { AuthProvider } from "@/lib/auth-context"
import { FoundationPage } from "@/routes/foundation-page"
import { HomePage } from "@/routes/home-page"
import { IncidentsPage } from "@/routes/incidents-page"
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
        children: [{ path: "laporan", Component: IncidentsPage }],
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
