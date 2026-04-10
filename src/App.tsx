import { AppDataProvider } from '@/app/app-data-provider'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/app/router'

export default function App() {
  return (
    <AppDataProvider>
      <RouterProvider router={router} />
    </AppDataProvider>
  )
}
