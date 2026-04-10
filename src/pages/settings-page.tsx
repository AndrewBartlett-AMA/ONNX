import { PageShell } from '@/components/page-shell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function SettingsPage() {
  return (
    <PageShell
      title="Settings"
      description="Settings will own runtime preferences, model selection, storage controls, and diagnostics while staying separate from the primary transcription flow."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Runtime diagnostics</CardTitle>
            <CardDescription>
              WebNN, WebGPU, and WASM capability detection is already scaffolded behind adapter
              status calls.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Empty shell for runtime preference and model management.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Storage controls</CardTitle>
            <CardDescription>
              Local data will remain browser-resident, with IndexedDB and Cache Storage surfaced as
              user-controlled resources.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Empty shell for usage estimates, cache reset, and export defaults.
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}
