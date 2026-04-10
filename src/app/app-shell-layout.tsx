import { Outlet } from 'react-router-dom'
import { AppSidebar } from '@/components/app-sidebar'
import { AppTopBar } from '@/components/app-topbar'

export function AppShellLayout() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1680px] flex-col lg:flex-row">
        <AppSidebar />
        <div className="flex min-h-dvh flex-1 flex-col">
          <AppTopBar />
          <main className="flex-1 px-4 pb-10 pt-6 sm:px-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
