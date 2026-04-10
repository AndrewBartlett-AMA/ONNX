import { Filter, Search } from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageShell } from '@/components/page-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAppData } from '@/hooks/use-app-data'
import { formatDuration, formatSessionDate } from '@/lib/format'

export function TimelinePage() {
  const navigate = useNavigate()
  const { sessions, workspaces } = useAppData()
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)

  const filteredSessions = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase()

    if (!normalized) {
      return sessions
    }

    return sessions.filter((session) =>
      [session.title, session.summary, ...session.participantNames].join(' ').toLowerCase().includes(normalized)
    )
  }, [deferredQuery, sessions])

  return (
    <PageShell
      eyebrow="Archive"
      title="Timeline"
      description="Browse sessions as a local timeline. Search already works; richer filtering and bulk actions can layer on later without changing the data model."
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full max-w-xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search sessions, summaries, or participants"
            className="pl-11"
          />
        </div>
        <Button type="button" variant="secondary">
          <Filter data-icon="inline-start" />
          Filter placeholder
        </Button>
      </div>

      <div className="grid gap-4">
        {filteredSessions.map((session) => {
          const workspace = workspaces.find((item) => item.id === session.workspaceId)

          return (
            <Card
              key={session.id}
              className="cursor-pointer transition-transform hover:-translate-y-0.5"
              onClick={() => navigate(`/session/${session.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>{session.title}</CardTitle>
                    <CardDescription>{session.summary || 'No summary captured yet.'}</CardDescription>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {formatSessionDate(session.updatedAt)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span>{workspace?.name ?? 'Workspace'}</span>
                <span>{formatDuration(session.durationMs)}</span>
                <span>{session.participantNames.length} participants</span>
                <span>{session.audioSources.join(', ')}</span>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </PageShell>
  )
}
