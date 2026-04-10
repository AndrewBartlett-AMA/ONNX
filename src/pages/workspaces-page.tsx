import { PageShell } from '@/components/page-shell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function WorkspacesPage() {
  return (
    <PageShell
      title="Workspaces"
      description="Workspaces groups projects, tag templates, and future meeting intelligence artifacts without coupling them to a cloud account."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Workspace repository</CardTitle>
            <CardDescription>
              Backed by a dedicated IndexedDB object store for local-first organization.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Empty shell for workspace browsing and creation.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Project hierarchy</CardTitle>
            <CardDescription>
              Projects are scaffolded as a child layer so sessions can be grouped without changing
              the app shell.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Empty shell for project summaries and pinned session collections.
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}
