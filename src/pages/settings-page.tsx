import { Database, Mic, Radio, WandSparkles } from 'lucide-react'
import { PageShell } from '@/components/page-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAppData } from '@/hooks/use-app-data'
import { useRuntimeStatus } from '@/hooks/use-runtime-status'

export function SettingsPage() {
  const runtimeSnapshot = useRuntimeStatus()
  const {
    sessions,
    setMicrophoneEnabled,
    setSelectedModelId,
    setSystemAudioEnabled,
    uiPreferences,
    workspaces,
    modelOptions
  } = useAppData()

  return (
    <PageShell
      eyebrow="Diagnostics"
      title="Settings"
      description="This page keeps runtime and local storage controls separate from the active session so the main workspace stays focused."
    >
      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Runtime profile</CardTitle>
            <CardDescription>
              UI-only model selection plus browser capability status from the runtime scaffold.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <select
              value={uiPreferences.selectedModelId}
              onChange={(event) => setSelectedModelId(event.target.value)}
              className="h-11 rounded-2xl border border-border/70 bg-white px-4 text-sm outline-none"
            >
              {modelOptions.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label}
                </option>
              ))}
            </select>

            <div className="grid gap-3 rounded-[1.5rem] bg-surface-subtle p-4 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Preferred runtime</span>
                <span className="font-semibold text-foreground">
                  {runtimeSnapshot?.preferredRuntime?.toUpperCase() ?? 'Detecting'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Microphone capture</span>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setMicrophoneEnabled(!uiPreferences.microphoneEnabled)}
                >
                  <Mic data-icon="inline-start" />
                  {uiPreferences.microphoneEnabled ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <span>System audio capture</span>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setSystemAudioEnabled(!uiPreferences.systemAudioEnabled)}
                >
                  <Radio data-icon="inline-start" />
                  {uiPreferences.systemAudioEnabled ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#f7f9fc]">
          <CardHeader>
            <CardTitle>Local data footprint</CardTitle>
            <CardDescription>Session content is kept locally in IndexedDB and can be inspected here.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between rounded-[1.25rem] bg-white px-4 py-3">
              <span className="flex items-center gap-2"><Database className="size-4" /> Workspaces</span>
              <span className="font-semibold text-foreground">{workspaces.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-[1.25rem] bg-white px-4 py-3">
              <span className="flex items-center gap-2"><WandSparkles className="size-4" /> Sessions</span>
              <span className="font-semibold text-foreground">{sessions.length}</span>
            </div>
            <p>
              Local storage metrics are intentionally simple for now; deeper cache management can sit
              on top of the same persistence layer later.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}
