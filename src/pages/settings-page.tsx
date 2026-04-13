import { Database, Mic, Radio, Server, WandSparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PageShell } from '@/components/page-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAppData } from '@/hooks/use-app-data'
import { useRuntimeStatus } from '@/hooks/use-runtime-status'
import {
  clearTransformersJsCache,
  inspectTransformersJsCache,
  resolveLocalModelRuntime,
  validateCustomLocalModelRepoId
} from '@/lib/transcription/local-models'
import { maskApiKey } from '@/lib/transcription/hosted-provider'
import type { LocalModelEntry } from '@/types/settings'
import type { RuntimeId } from '@/types/transcription'

async function prepareLocalModel(
  model: LocalModelEntry,
  runtime: RuntimeId,
  remoteHostOverride?: string
) {
  const worker = new Worker(new URL('../workers/transcription.worker.ts', import.meta.url), {
    type: 'module'
  })

  return new Promise<void>((resolve, reject) => {
    worker.onmessage = (event) => {
      const message = event.data as { type: string; message?: string; state?: string }

      if (message.type === 'status' && message.state === 'ready') {
        worker.terminate()
        resolve()
      }

      if (message.type === 'error') {
        worker.terminate()
        reject(new Error(message.message ?? 'Unable to prepare local model.'))
      }
    }

    worker.postMessage({
      type: 'prepare-local-model',
      modelEntry: model,
      runtime,
      remoteHostOverride
    })
  })
}

export function SettingsPage() {
  const runtimeSnapshot = useRuntimeStatus()
  const {
    appSettings,
    localModelEntries,
    modelCacheMeta,
    providerProfiles,
    replaceModelCacheMeta,
    removeLocalModelEntry,
    removeProviderProfile,
    saveLocalModelEntry,
    saveProviderProfile,
    sessions,
    setActiveTargetType,
    setMicrophoneEnabled,
    setRemoteModelHostOverride,
    setSelectedHostedModel,
    setSelectedLocalModelId,
    setSelectedProviderProfileId,
    setSystemAudioEnabled,
    workspaces
  } = useAppData()

  const [feedback, setFeedback] = useState<string | null>(null)
  const [customModelRepoId, setCustomModelRepoId] = useState('')
  const [customModelLabel, setCustomModelLabel] = useState('')
  const [customModelDescription, setCustomModelDescription] = useState('')
  const [customModelLanguage, setCustomModelLanguage] = useState('English')
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null)
  const [providerLabel, setProviderLabel] = useState('')
  const [providerBaseUrl, setProviderBaseUrl] = useState('')
  const [providerModel, setProviderModel] = useState('')
  const [providerApiKey, setProviderApiKey] = useState('')
  const [providerOrganization, setProviderOrganization] = useState('')
  const [providerHeaders, setProviderHeaders] = useState('')

  const runtimeIds = runtimeSnapshot?.availableRuntimeIds ?? []

  const cacheMetaByModelId = useMemo(
    () => Object.fromEntries(modelCacheMeta.map((entry) => [entry.modelEntryId, entry])),
    [modelCacheMeta]
  )

  function resetProviderForm() {
    setEditingProviderId(null)
    setProviderLabel('')
    setProviderBaseUrl('')
    setProviderModel('')
    setProviderApiKey('')
    setProviderOrganization('')
    setProviderHeaders('')
  }

  async function handleSaveProvider() {
    const extraHeaders = Object.fromEntries(
      providerHeaders
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [key, ...value] = line.split(':')
          return [key.trim(), value.join(':').trim()]
        })
        .filter(([key, value]) => key && value)
    )

    const profile = await saveProviderProfile({
      id: editingProviderId ?? undefined,
      label: providerLabel,
      baseUrl: providerBaseUrl,
      model: providerModel,
      apiKey: providerApiKey,
      organization: providerOrganization || undefined,
      extraHeaders,
      enabled: true
    })

    setSelectedProviderProfileId(profile.id)
    setSelectedHostedModel(profile.model)
    setFeedback(`Saved provider profile ${profile.label}.`)
    resetProviderForm()
  }

  async function handleSaveCustomModel() {
    const repoId = validateCustomLocalModelRepoId(customModelRepoId)
    const entry = await saveLocalModelEntry({
      repoId,
      label: customModelLabel || repoId,
      description: customModelDescription || 'Custom browser-local Hugging Face ASR model.',
      languageLabel: customModelLanguage || 'English'
    })
    setSelectedLocalModelId(entry.id)
    setFeedback(`Saved local model ${entry.label}.`)
    setCustomModelRepoId('')
    setCustomModelLabel('')
    setCustomModelDescription('')
  }

  async function refreshCache(model: LocalModelEntry) {
    if (model.engine !== 'hf-transformers') {
      await replaceModelCacheMeta({
        id: `cache-${model.id}`,
        modelEntryId: model.id,
        repoId: model.repoId,
        runtime: 'webnn',
        filesCached: 0,
        totalFiles: 0,
        allCached: false,
        cacheKey: model.repoId,
        detail: 'WebNN cache inspection is not exposed in this build.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      setFeedback('WebNN cache inspection is not available yet.')
      return
    }

    const runtime = resolveLocalModelRuntime(model, runtimeIds)

    if (!runtime) {
      setFeedback(`No compatible runtime is available for ${model.label}.`)
      return
    }

    const status = await inspectTransformersJsCache(model, runtime, appSettings.remoteModelHostOverride)
    const existing = cacheMetaByModelId[model.id]

    await replaceModelCacheMeta({
      id: existing?.id ?? `cache-${model.id}`,
      modelEntryId: model.id,
      repoId: model.repoId,
      runtime,
      filesCached: status.filesCached,
      totalFiles: status.totalFiles,
      allCached: status.allCached,
      cacheKey: model.repoId,
      detail: status.detail,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  }

  async function handlePrepareModel(model: LocalModelEntry) {
    const runtime = resolveLocalModelRuntime(model, runtimeIds)

    if (!runtime) {
      setFeedback(`No compatible runtime is available for ${model.label}.`)
      return
    }

    await prepareLocalModel(model, runtime, appSettings.remoteModelHostOverride)
    await refreshCache(model)
    setFeedback(`${model.label} is prepared for ${runtime.toUpperCase()}.`)
  }

  async function handleClearCache(model: LocalModelEntry) {
    const runtime = resolveLocalModelRuntime(model, runtimeIds)

    if (!runtime || model.engine !== 'hf-transformers') {
      setFeedback('Cache clearing is only available for Transformers.js local models.')
      return
    }

    await clearTransformersJsCache(model, runtime, appSettings.remoteModelHostOverride)
    await refreshCache(model)
    setFeedback(`Cleared cached files for ${model.label}.`)
  }

  return (
    <PageShell
      eyebrow="Diagnostics"
      title="Settings"
      description="Manage local models, hosted providers, and runtime storage without leaving the local-first workflow."
    >
      <div className="grid gap-5">
        {feedback ? (
          <div className="rounded-[1.3rem] bg-[#eef4ff] px-4 py-3 text-sm text-accent">
            {feedback}
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Local Models</CardTitle>
            <CardDescription>
              Curated Whisper profiles plus custom Hugging Face browser-local ASR repos.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {localModelEntries.map((model) => {
              const cacheMeta = cacheMetaByModelId[model.id]

              return (
                <div key={model.id} className="rounded-[1.5rem] bg-surface-subtle p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{model.label}</p>
                        <Badge variant="secondary">{model.engine}</Badge>
                        <Badge variant="outline">{model.languageLabel}</Badge>
                        <Badge variant="outline">
                          {model.supportedRuntimeIds.map((runtime) => runtime.toUpperCase()).join(' / ')}
                        </Badge>
                      </div>
                      <p className="text-sm leading-6 text-muted-foreground">{model.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {cacheMeta
                          ? `${cacheMeta.filesCached}/${cacheMeta.totalFiles} files cached`
                          : 'Cache status has not been inspected yet.'}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="secondary" onClick={() => setSelectedLocalModelId(model.id)}>
                        Use
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => void handlePrepareModel(model)}>
                        Prepare
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => void refreshCache(model)}>
                        Refresh cache
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => void handleClearCache(model)}>
                        Remove cache
                      </Button>
                      {!model.isCurated ? (
                        <Button type="button" variant="ghost" onClick={() => void removeLocalModelEntry(model.id)}>
                          Forget
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            })}

            <div className="grid gap-3 rounded-[1.5rem] bg-[#f7f9fc] p-4">
              <p className="text-sm font-semibold text-foreground">Add custom local model</p>
              <Input
                value={customModelRepoId}
                onChange={(event) => setCustomModelRepoId(event.target.value)}
                placeholder="author/name"
              />
              <Input
                value={customModelLabel}
                onChange={(event) => setCustomModelLabel(event.target.value)}
                placeholder="Friendly label"
              />
              <Input
                value={customModelLanguage}
                onChange={(event) => setCustomModelLanguage(event.target.value)}
                placeholder="Language label"
              />
              <Textarea
                value={customModelDescription}
                onChange={(event) => setCustomModelDescription(event.target.value)}
                placeholder="Short description"
                className="min-h-24"
              />
              <Button type="button" onClick={() => void handleSaveCustomModel()}>
                Save custom local model
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hosted Providers</CardTitle>
            <CardDescription>
              Save multiple OpenAI-compatible STT endpoints and reuse their API keys locally on this device.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {providerProfiles.map((profile) => (
              <div key={profile.id} className="rounded-[1.5rem] bg-surface-subtle p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{profile.label}</p>
                      <Badge variant="secondary">{profile.lastTestStatus}</Badge>
                      <Badge variant="outline">{profile.model}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{profile.baseUrl}</p>
                    <p className="text-xs text-muted-foreground">{maskApiKey(profile.apiKey)}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setSelectedProviderProfileId(profile.id)
                        setSelectedHostedModel(profile.model)
                        setActiveTargetType('hosted')
                      }}
                    >
                      Use
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setEditingProviderId(profile.id)
                        setProviderLabel(profile.label)
                        setProviderBaseUrl(profile.baseUrl)
                        setProviderModel(profile.model)
                        setProviderApiKey(profile.apiKey)
                        setProviderOrganization(profile.organization ?? '')
                        setProviderHeaders(
                          Object.entries(profile.extraHeaders ?? {})
                            .map(([key, value]) => `${key}: ${value}`)
                            .join('\n')
                        )
                      }}
                    >
                      Edit
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => void removeProviderProfile(profile.id)}>
                      Forget
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            <div className="grid gap-3 rounded-[1.5rem] bg-[#f7f9fc] p-4">
              <p className="text-sm font-semibold text-foreground">
                {editingProviderId ? 'Edit provider profile' : 'Add provider profile'}
              </p>
              <Input
                value={providerLabel}
                onChange={(event) => setProviderLabel(event.target.value)}
                placeholder="Provider label"
              />
              <Input
                value={providerBaseUrl}
                onChange={(event) => setProviderBaseUrl(event.target.value)}
                placeholder="https://api.example.com/v1"
              />
              <Input
                value={providerModel}
                onChange={(event) => setProviderModel(event.target.value)}
                placeholder="whisper-1"
              />
              <Input
                value={providerApiKey}
                onChange={(event) => setProviderApiKey(event.target.value)}
                placeholder="API key"
              />
              <Input
                value={providerOrganization}
                onChange={(event) => setProviderOrganization(event.target.value)}
                placeholder="Optional organization header"
              />
              <Textarea
                value={providerHeaders}
                onChange={(event) => setProviderHeaders(event.target.value)}
                placeholder="Optional extra headers, one per line: Header-Name: value"
                className="min-h-24"
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => void handleSaveProvider()}>
                  Save provider
                </Button>
                {editingProviderId ? (
                  <Button type="button" variant="secondary" onClick={resetProviderForm}>
                    Cancel edit
                  </Button>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#f7f9fc]">
          <CardHeader>
            <CardTitle>Runtime &amp; Storage</CardTitle>
            <CardDescription>
              Browser capability checks, active target defaults, and model cache behavior.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-3 rounded-[1.5rem] bg-white p-4 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Preferred runtime</span>
                <span className="font-semibold text-foreground">
                  {runtimeSnapshot?.preferredRuntime?.toUpperCase() ?? 'Detecting'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Active target</span>
                <span className="font-semibold text-foreground">
                  {appSettings.activeTargetType === 'hosted' ? 'Hosted provider' : 'Local model'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Microphone capture</span>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setMicrophoneEnabled(!appSettings.microphoneEnabled)}
                >
                  <Mic data-icon="inline-start" />
                  {appSettings.microphoneEnabled ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <span>System audio capture</span>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setSystemAudioEnabled(!appSettings.systemAudioEnabled)}
                >
                  <Radio data-icon="inline-start" />
                  {appSettings.systemAudioEnabled ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
            </div>

            <div className="grid gap-3 rounded-[1.5rem] bg-white p-4">
              <p className="text-sm font-semibold text-foreground">Remote model host override</p>
              <Input
                value={appSettings.remoteModelHostOverride ?? ''}
                onChange={(event) => setRemoteModelHostOverride(event.target.value)}
                placeholder="https://huggingface.co"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to use Hugging Face Hub directly. Override this if you need a mirror or static CDN.
              </p>
            </div>

            <div className="grid gap-3 text-sm text-muted-foreground">
              <div className="flex items-center justify-between rounded-[1.25rem] bg-white px-4 py-3">
                <span className="flex items-center gap-2"><Database className="size-4" /> Workspaces</span>
                <span className="font-semibold text-foreground">{workspaces.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-[1.25rem] bg-white px-4 py-3">
                <span className="flex items-center gap-2"><WandSparkles className="size-4" /> Sessions</span>
                <span className="font-semibold text-foreground">{sessions.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-[1.25rem] bg-white px-4 py-3">
                <span className="flex items-center gap-2"><Server className="size-4" /> Saved providers</span>
                <span className="font-semibold text-foreground">{providerProfiles.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}
