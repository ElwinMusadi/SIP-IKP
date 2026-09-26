import { createBrowserRouter, RouterProvider } from "react-router"

import { AppLayout } from "@/components/layout/app-layout"
import { FoundationPage } from "@/routes/foundation-page"
import { HomePage } from "@/routes/home-page"
import { NotFoundPage } from "@/routes/not-found-page"

const router = createBrowserRouter([
  {
    path: "/",
    Component: AppLayout,
    children: [
      { index: true, Component: HomePage },
      { path: "fondasi", Component: FoundationPage },
      { path: "*", Component: NotFoundPage },
    ],
  },
])

export function App() {
  return <RouterProvider router={router} />
}
