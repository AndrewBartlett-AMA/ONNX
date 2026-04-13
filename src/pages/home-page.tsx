import { ChevronRight, FolderOpen, Mic, Upload, WandSparkles } from 'lucide-react'
import { useRef, useTransition } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageShell } from '@/components/page-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAppData } from '@/hooks/use-app-data'
import { usePwaInstall } from '@/hooks/use-pwa-install'
import { formatDuration, formatSessionDate } from '@/lib/format'

export function HomePage() {
  const navigate = useNavigate()
  const audioInputRef = useRef<HTMLInputElement | null>(null)
  const [isPending, startTransition] = useTransition()
  const {
    appSettings,
    createSession,
    createSessionFromUpload,
    localModelEntries,
    providerProfiles,
    sessions,
    setActiveTargetType,
    setSelectedHostedModel,
    setSelectedLocalModelId,
    setSelectedProviderProfileId,
    uiPreferences,
    workspaces
  } = useAppData()
  const { canInstall, promptToInstall } = usePwaInstall()

  const recentSessions = sessions.slice(0, 4)
  const selectedLocalModel = localModelEntries.find((model) => model.id === appSettings.selectedLocalModelId)
  const selectedProvider = providerProfiles.find(
    (profile) => profile.id === appSettings.selectedProviderProfileId
  )

  function handleNewRecording() {
    startTransition(() => {
      void createSession({
        title: 'New recording',
        source: uiPreferences.systemAudioEnabled ? 'system-audio' : 'microphone',
        audioSources: uiPreferences.systemAudioEnabled ? ['System audio'] : ['Microphone'],
        targetType: appSettings.activeTargetType,
        targetId:
          appSettings.activeTargetType === 'hosted'
            ? appSettings.selectedProviderProfileId
            : appSettings.selectedLocalModelId,
        providerProfileId: appSettings.selectedProviderProfileId,
        modelId:
          appSettings.activeTargetType === 'hosted'
            ? appSettings.selectedHostedModel || selectedProvider?.model || ''
            : selectedLocalModel?.repoId
      }).then((session) => navigate(`/session/${session.id}`))
    })
  }

  function handleAudioUpload(file: File | null) {
    if (!file) {
      return
    }

    startTransition(() => {
      void createSessionFromUpload(file).then((session) => navigate(`/session/${session.id}`))
    })
  }

  return (
    <PageShell
      eyebrow="Workspace"
      title="Home"
      description="Start a new local session, pick the transcription profile you want to scaffold against, and jump back into the latest conversations without leaving the browser."
    >
      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <section className="rounded-[2rem] bg-white px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:px-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#eef4ff] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">
              <WandSparkles className="size-3.5" />
              Private by default
            </div>
            <h3 className="mt-5 text-4xl font-bold tracking-tight text-foreground">
              Capture the meeting, shape the timeline, and keep every artifact local.
            </h3>
            <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
              Quiet Scribe runs as an installable PWA, stores session structure in IndexedDB, and
              keeps the transcription runtime abstracted behind browser-first adapters.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button type="button" size="lg" onClick={handleNewRecording} disabled={isPending}>
              <Mic data-icon="inline-start" />
              {isPending ? 'Preparing…' : 'Start recording'}
            </Button>
            <Button type="button" size="lg" variant="secondary" onClick={() => audioInputRef.current?.click()}>
              <Upload data-icon="inline-start" />
              Upload audio
            </Button>
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(event) => handleAudioUpload(event.target.files?.[0] ?? null)}
            />
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-[0.85fr_1.15fr]">
            <div className="rounded-[1.5rem] bg-surface-subtle p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Transcription target
              </p>
              <select
                value={appSettings.activeTargetType}
                onChange={(event) => setActiveTargetType(event.target.value as 'local' | 'hosted')}
                className="mt-3 h-11 w-full rounded-2xl border border-border/60 bg-white px-4 text-sm text-foreground outline-none"
              >
                <option value="local">Local browser model</option>
                <option value="hosted">Hosted provider</option>
              </select>

              {appSettings.activeTargetType === 'local' ? (
                <>
                  <select
                    value={appSettings.selectedLocalModelId}
                    onChange={(event) => setSelectedLocalModelId(event.target.value)}
                    className="mt-3 h-11 w-full rounded-2xl border border-border/60 bg-white px-4 text-sm text-foreground outline-none"
                  >
                    {localModelEntries.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {selectedLocalModel?.description ?? 'Select a browser-local Whisper model.'}
                  </p>
                </>
              ) : (
                <>
                  <select
                    value={appSettings.selectedProviderProfileId ?? ''}
                    onChange={(event) => setSelectedProviderProfileId(event.target.value || undefined)}
                    className="mt-3 h-11 w-full rounded-2xl border border-border/60 bg-white px-4 text-sm text-foreground outline-none"
                  >
                    <option value="">Choose a hosted provider</option>
                    {providerProfiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.label}
                      </option>
                    ))}
                  </select>
                  <input
                    value={appSettings.selectedHostedModel ?? selectedProvider?.model ?? ''}
                    onChange={(event) => setSelectedHostedModel(event.target.value)}
                    placeholder="Hosted model name"
                    className="mt-3 h-11 w-full rounded-2xl border border-border/60 bg-white px-4 text-sm text-foreground outline-none"
                  />
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {selectedProvider
                      ? `Requests will use ${selectedProvider.label} and the selected hosted model.`
                      : 'Add a hosted provider profile in Settings before using this mode.'}
                  </p>
                </>
              )}
            </div>

            <div className="rounded-[1.5rem] bg-surface-subtle p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                PWA install
              </p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Install Quiet Scribe for a native-feeling launcher, faster reopen, and an isolated
                workspace window.
              </p>
              <Button
                type="button"
                variant="secondary"
                className="mt-4"
                onClick={() => void promptToInstall()}
                disabled={!canInstall}
              >
                <FolderOpen data-icon="inline-start" />
                {canInstall ? 'Install Quiet Scribe' : 'Already installed or unavailable'}
              </Button>
            </div>
          </div>
        </section>

        <Card className="bg-[#f7f9fc]">
          <CardHeader>
            <CardTitle>Recent sessions</CardTitle>
            <CardDescription>
              Pulled from the local session store so Home stays useful even without any backend.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {recentSessions.map((session) => {
              const workspace = workspaces.find((item) => item.id === session.workspaceId)

              return (
                <button
                  key={session.id}
                  type="button"
                  className="rounded-[1.5rem] bg-white px-4 py-4 text-left transition-transform hover:-translate-y-0.5"
                  onClick={() => navigate(`/session/${session.id}`)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{session.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {workspace?.name ?? 'Workspace'} · {formatSessionDate(session.updatedAt)}
                      </p>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatDuration(session.durationMs)}</span>
                    <span>{session.participantNames.length} participants</span>
                    <span>{session.audioSources[0]}</span>
                  </div>
                </button>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}
