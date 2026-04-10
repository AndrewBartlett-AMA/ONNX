import { Mic, Plus, Radio } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useRuntimeStatus } from '@/hooks/use-runtime-status'
import { runtimeLabels } from '@/lib/transcription/runtime-registry'
import { cn } from '@/lib/utils'

export function AppTopBar() {
  const navigate = useNavigate()
  const runtimeSnapshot = useRuntimeStatus()
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true)
  const [systemAudioEnabled, setSystemAudioEnabled] = useState(false)

  const preferredRuntime = runtimeSnapshot?.preferredRuntime
  const capability = preferredRuntime ? runtimeSnapshot.capabilities[preferredRuntime] : null
  const status = preferredRuntime ? runtimeSnapshot.statuses[preferredRuntime] : null
  const runtimeLabel = preferredRuntime ? runtimeLabels[preferredRuntime] : 'Detecting runtime'

  return (
    <header className="sticky top-0 z-10 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Production scaffold
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Quiet Scribe
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={capability?.supported ? 'secondary' : 'outline'}>
              {runtimeLabel}
              {status ? ` · ${status.state}` : ''}
            </Badge>

            <Button
              type="button"
              variant={microphoneEnabled ? 'secondary' : 'ghost'}
              onClick={() => setMicrophoneEnabled((current) => !current)}
            >
              <Mic data-icon="inline-start" />
              {microphoneEnabled ? 'Microphone on' : 'Microphone off'}
            </Button>

            <Button
              type="button"
              variant={systemAudioEnabled ? 'secondary' : 'ghost'}
              onClick={() => setSystemAudioEnabled((current) => !current)}
            >
              <Radio data-icon="inline-start" />
              {systemAudioEnabled ? 'System audio on' : 'System audio off'}
            </Button>

            <Button type="button" onClick={() => navigate('/session')}>
              <Plus data-icon="inline-start" />
              New Recording
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-3 py-1',
              capability?.supported
                ? 'bg-success/14 text-success'
                : 'bg-surface-subtle text-muted-foreground'
            )}
          >
            <span className="size-2 rounded-full bg-current" />
            {capability?.supported
              ? 'Runtime API available in this browser'
              : 'Waiting for runtime capability detection'}
          </span>
          <span>
            {capability?.notes[0] ??
              'Pluggable transcription adapters are scaffolded and ready for implementation.'}
          </span>
        </div>
      </div>
    </header>
  )
}
