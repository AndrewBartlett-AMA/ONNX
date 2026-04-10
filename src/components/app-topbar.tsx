import { Cpu, Mic, Plus, Radio } from 'lucide-react'
import { useTransition } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAppData } from '@/hooks/use-app-data'
import { useRuntimeStatus } from '@/hooks/use-runtime-status'
import { modelOptions } from '@/lib/transcription/model-options'

export function AppTopBar() {
  const navigate = useNavigate()
  const runtimeSnapshot = useRuntimeStatus()
  const { createSession, uiPreferences, setMicrophoneEnabled, setSystemAudioEnabled } = useAppData()
  const [isPending, startTransition] = useTransition()

  const selectedModel = modelOptions.find((model) => model.id === uiPreferences.selectedModelId)
  const preferredRuntime = runtimeSnapshot?.preferredRuntime
  const capability = preferredRuntime ? runtimeSnapshot.capabilities[preferredRuntime] : null

  function handleCreateSession() {
    startTransition(() => {
      void createSession({
        title: 'New recording',
        source: uiPreferences.systemAudioEnabled ? 'system-audio' : 'microphone',
        audioSources: uiPreferences.systemAudioEnabled
          ? ['System audio']
          : ['Microphone'],
        modelId: uiPreferences.selectedModelId
      }).then((session) => {
        navigate(`/session/${session.id}`)
      })
    })
  }

  return (
    <header className="sticky top-0 z-10 border-b border-border/60 bg-background/88 backdrop-blur-xl">
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Quiet Scribe
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
              Local meeting intelligence
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={capability?.supported ? 'secondary' : 'outline'}>
              <Cpu className="size-3.5" />
              {selectedModel?.label ?? 'No model selected'}
            </Badge>
            <Badge variant={capability?.supported ? 'secondary' : 'outline'}>
              {capability?.supported ? 'Model ready' : 'Runtime fallback'}
            </Badge>

            <Button
              type="button"
              variant={uiPreferences.microphoneEnabled ? 'secondary' : 'ghost'}
              onClick={() => setMicrophoneEnabled(!uiPreferences.microphoneEnabled)}
            >
              <Mic data-icon="inline-start" />
              {uiPreferences.microphoneEnabled ? 'Mic on' : 'Mic off'}
            </Button>

            <Button
              type="button"
              variant={uiPreferences.systemAudioEnabled ? 'secondary' : 'ghost'}
              onClick={() => setSystemAudioEnabled(!uiPreferences.systemAudioEnabled)}
            >
              <Radio data-icon="inline-start" />
              {uiPreferences.systemAudioEnabled ? 'System audio on' : 'System audio off'}
            </Button>

            <Button type="button" onClick={handleCreateSession} disabled={isPending}>
              <Plus data-icon="inline-start" />
              {isPending ? 'Creating…' : 'New Recording'}
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
