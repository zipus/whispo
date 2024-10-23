import { RouterProvider } from "react-router-dom"
import { router } from "./router"
import { lazy, Suspense } from "react"

const Updater = lazy(() => import("./components/updater"))

function App(): JSX.Element {
  return (
    <>
      <RouterProvider router={router}></RouterProvider>

      <Suspense>
        <Updater />
      </Suspense>
    </>
  )
}

export default App
