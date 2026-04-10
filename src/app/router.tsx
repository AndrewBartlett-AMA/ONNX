import { createHashRouter } from 'react-router-dom'
import { AppShellLayout } from '@/app/app-shell-layout'
import { HomePage } from '@/pages/home-page'
import { SettingsPage } from '@/pages/settings-page'
import { SessionPage } from '@/pages/session-page'
import { TimelinePage } from '@/pages/timeline-page'
import { WorkspacesPage } from '@/pages/workspaces-page'

export const router = createHashRouter(
  [
    {
      path: '/',
      element: <AppShellLayout />,
      children: [
        { index: true, element: <HomePage /> },
        { path: 'timeline', element: <TimelinePage /> },
        { path: 'workspaces', element: <WorkspacesPage /> },
        { path: 'settings', element: <SettingsPage /> },
        { path: 'session', element: <SessionPage /> },
        { path: 'session/:sessionId', element: <SessionPage /> }
      ]
    }
  ],
  {
    basename: import.meta.env.BASE_URL
  }
)
