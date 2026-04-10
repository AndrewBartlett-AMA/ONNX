import { PageShell } from '@/components/page-shell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function TimelinePage() {
  return (
    <PageShell
      title="Timeline"
      description="Timeline is reserved for session history, search, and reopen/export flows backed entirely by local IndexedDB records."
    >
      <Card>
        <CardHeader>
          <CardTitle>History shell</CardTitle>
          <CardDescription>
            This page will hydrate from `sessions`, `outputs`, and `transcriptItems` once session
            creation and export flows are implemented.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Empty shell for local session history and review workflows.
        </CardContent>
      </Card>
    </PageShell>
  )
}
