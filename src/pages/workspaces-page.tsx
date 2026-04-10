import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageShell } from '@/components/page-shell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAppData } from '@/hooks/use-app-data'

export function WorkspacesPage() {
  const navigate = useNavigate()
  const { getProjectsForWorkspace, getSessionsForProject, workspaces } = useAppData()
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(workspaces[0]?.id ?? '')

  const projects = useMemo(
    () => getProjectsForWorkspace(selectedWorkspaceId),
    [getProjectsForWorkspace, selectedWorkspaceId]
  )
  const selectedProject = projects[0]
  const sessions = selectedProject ? getSessionsForProject(selectedProject.id) : []

  return (
    <PageShell
      eyebrow="Organization"
      title="Workspaces"
      description="Sessions are grouped under workspaces and projects so the product can support richer meeting intelligence later without changing the shell."
    >
      <div className="grid gap-5 xl:grid-cols-[0.8fr_1fr_1.2fr]">
        <Card className="bg-[#f7f9fc]">
          <CardHeader>
            <CardTitle>Workspaces</CardTitle>
            <CardDescription>Top-level containers for teams or areas of work.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                type="button"
                onClick={() => setSelectedWorkspaceId(workspace.id)}
                className={`rounded-[1.5rem] px-4 py-4 text-left transition-colors ${
                  selectedWorkspaceId === workspace.id ? 'bg-white text-foreground' : 'bg-transparent text-muted-foreground hover:bg-white/70'
                }`}
              >
                <p className="text-sm font-semibold">{workspace.name}</p>
                <p className="mt-2 text-sm leading-6">{workspace.description}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
            <CardDescription>Project collections nested inside the selected workspace.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {projects.map((project) => (
              <div key={project.id} className="rounded-[1.5rem] bg-surface-subtle px-4 py-4">
                <p className="text-sm font-semibold text-foreground">{project.name}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{project.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sessions</CardTitle>
            <CardDescription>Recent sessions under the first project in the selected workspace.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {sessions.map((session) => (
              <button
                key={session.id}
                type="button"
                className="rounded-[1.5rem] bg-surface-subtle px-4 py-4 text-left transition-colors hover:bg-[#eef4ff]"
                onClick={() => navigate(`/session/${session.id}`)}
              >
                <p className="text-sm font-semibold text-foreground">{session.title}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{session.summary}</p>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}
