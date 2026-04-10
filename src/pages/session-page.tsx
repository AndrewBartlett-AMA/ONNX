import { PageShell } from '@/components/page-shell'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function SessionPage() {
  return (
    <PageShell
      title="Session"
      description="Session is the dedicated recording and transcript workspace. It stays isolated so capture, worker orchestration, and transcript editing can evolve without destabilizing the broader app shell."
    >
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <Badge>Capture shell</Badge>
            <CardTitle>Recording controls placeholder</CardTitle>
            <CardDescription>
              The top bar toggles are scaffolded, while the actual recording pipeline will land here
              in a future pass.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Empty shell for device selection, waveform feedback, and session lifecycle actions.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Badge variant="outline">Transcript shell</Badge>
            <CardTitle>Transcript workspace placeholder</CardTitle>
            <CardDescription>
              This panel will hydrate from `transcriptItems`, `notes`, and `outputs` once the
              transcription worker and persistence flow are connected.
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-72 text-sm text-muted-foreground">
            Empty shell for transcript editing, meeting intelligence notes, and export actions.
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}
