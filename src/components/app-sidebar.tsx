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
    <aside className="border-b border-border/60 bg-[#f7f8fa] px-4 py-5 lg:sticky lg:top-0 lg:h-dvh lg:w-72 lg:border-b-0 lg:px-6 lg:py-8">
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-[#4f8df7] text-white shadow-[0_12px_30px_rgba(37,99,235,0.18)]">
            <AudioLines className="size-5" />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight text-foreground">Quiet Scribe</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Local-first workspace
            </p>
          </div>
        </div>

        <nav className="mt-8 flex flex-wrap gap-2 lg:flex-col">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              end={'end' in item ? item.end : undefined}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-white text-accent shadow-[0_10px_30px_rgba(15,23,42,0.06)]'
                    : 'text-muted-foreground hover:bg-white/80 hover:text-foreground'
                )
              }
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-8 rounded-[1.75rem] bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <p className="text-sm font-semibold text-foreground">Quiet by default</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            All sessions, notes, and attachments stay on device. This shell is built around local
            persistence first.
          </p>
        </div>

        <div className="mt-auto hidden rounded-[1.75rem] bg-[#eef4ff] p-5 lg:block">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">
            Workspace health
          </p>
          <p className="mt-3 text-sm font-medium text-foreground">
            Session UX, tag editing, and attachments are all wired to IndexedDB now.
          </p>
        </div>
      </div>
    </aside>
  )
}
