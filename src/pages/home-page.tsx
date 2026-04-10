import { PageShell } from '@/components/page-shell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function HomePage() {
  return (
    <PageShell
      title="Home"
      description="The home shell anchors the product around local-first capture, runtime visibility, and quick access to saved work without introducing backend assumptions."
    >
      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader>
            <CardTitle>Scaffolded architecture</CardTitle>
            <CardDescription>
              Routing, storage, and runtime boundaries are in place so the first real feature work
              can focus on capture and transcript flows.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-muted-foreground">
            <p>App shell and page routing are isolated from transcription implementation details.</p>
            <p>
              IndexedDB repositories are typed around workspaces, projects, sessions, notes, and
              outputs.
            </p>
            <p>Runtime adapters follow the documented WebNN → WebGPU → WASM preference order.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next product slice</CardTitle>
            <CardDescription>
              The next implementation pass can focus on recording UX, worker orchestration, and
              transcript persistence.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-muted-foreground">
            <p>Session page becomes the recording and transcript workspace.</p>
            <p>Timeline becomes the local session history surface.</p>
            <p>Settings becomes runtime and cache diagnostics.</p>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}
