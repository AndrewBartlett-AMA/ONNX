import { AudioLines, Clock3, Home, Settings2, Shapes } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

const navigation = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/timeline', label: 'Timeline', icon: Clock3 },
  { to: '/workspaces', label: 'Workspaces', icon: Shapes },
  { to: '/settings', label: 'Settings', icon: Settings2 }
] as const satisfies ReadonlyArray<{
  to: string
  label: string
  icon: typeof Home
  end?: boolean
}>

export function AppSidebar() {
  return (
    <aside className="border-b border-border/60 bg-surface/80 px-4 py-5 backdrop-blur lg:sticky lg:top-0 lg:h-dvh lg:w-72 lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-accent/14 text-accent">
          <AudioLines className="size-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Quiet Scribe</p>
          <p className="text-sm font-medium text-foreground">Local-first transcription</p>
        </div>
      </div>

      <nav className="mt-6 flex flex-wrap gap-2 lg:flex-col">
        {navigation.map((item) => (
          <NavLink
            key={item.to}
            end={'end' in item ? item.end : undefined}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-surface-subtle/40 text-muted-foreground hover:bg-surface-subtle hover:text-foreground'
              )
            }
          >
            <item.icon className="size-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-6 rounded-3xl border border-border/50 bg-background/50 p-4">
        <p className="text-sm font-medium text-foreground">Scaffold focus</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Routing, local storage, and transcription adapters are wired first so the UI can scale
          without a backend dependency.
        </p>
      </div>
    </aside>
  )
}
