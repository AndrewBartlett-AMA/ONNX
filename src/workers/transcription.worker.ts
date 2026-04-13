import { env, pipeline, type ProgressInfo } from '@huggingface/transformers'
import type { LocalModelEntry, ProviderProfile } from '@/types/settings'
import type { RuntimeId, TranscriptionResult } from '@/types/transcription'
import {
  buildHostedTranscriptionRequest,
  parseHostedTranscriptionResponse
} from '@/lib/transcription/hosted-provider'

export type TranscriptionWorkerMessage =
  | {
      type: 'prepare-local-model'
      runtime: RuntimeId
      modelEntry: LocalModelEntry
      remoteHostOverride?: string
    }
  | {
      type: 'transcribe-local'
      runtime: RuntimeId
      sessionId: string
      modelEntry: LocalModelEntry
      sampleRate: number
      audio: Float32Array
      remoteHostOverride?: string
    }
  | {
      type: 'transcribe-hosted'
      sessionId: string
      profile: ProviderProfile
      model: string
      fileName: string
      blob: Blob
    }
  | {
      type: 'dispose'
    }

export type TranscriptionWorkerEvent =
  | {
      type: 'status'
      state: 'downloading' | 'warming' | 'ready' | 'recording' | 'transcribing' | 'stopped'
      detail: string
    }
  | {
      type: 'complete'
      sessionId: string
      result: TranscriptionResult
      detail: string
    }
  | {
      type: 'error'
      message: string
    }

type AsrPipeline = Awaited<ReturnType<typeof pipeline>>
type WorkerStatusState = 'downloading' | 'warming' | 'ready' | 'recording' | 'transcribing' | 'stopped'

const workerContext: DedicatedWorkerGlobalScope = self as DedicatedWorkerGlobalScope

let activePipeline:
  | {
      repoId: string
      runtime: RuntimeId
      instance: AsrPipeline
    }
  | undefined

function postStatus(state: WorkerStatusState, detail: string) {
  workerContext.postMessage({
    type: 'status',
    state,
    detail
  } satisfies TranscriptionWorkerEvent)
}

function configureTransformers(remoteHostOverride?: string) {
  env.allowRemoteModels = true
  env.allowLocalModels = false
  env.useBrowserCache = true
  env.useWasmCache = true

  if (remoteHostOverride?.trim()) {
    env.remoteHost = remoteHostOverride.trim().replace(/\/$/, '')
  }
}

function toProgressDetail(info: ProgressInfo) {
  const fileName = 'file' in info ? info.file : 'model asset'

  if (info.status === 'progress' && typeof info.progress === 'number') {
    return `Downloading ${fileName} (${info.progress.toFixed(0)}%)`
  }

  if (info.status === 'done') {
    return `Downloaded ${fileName}`
  }

  if (info.status === 'ready') {
    return 'Model ready.'
  }

  return `${info.status} ${fileName}`.trim()
}

async function disposePipeline() {
  if (!activePipeline) {
    return
  }

  await activePipeline.instance.dispose()
  activePipeline = undefined
}

async function getTransformersPipeline(
  modelEntry: LocalModelEntry,
  runtime: RuntimeId,
  remoteHostOverride?: string
) {
  if (modelEntry.engine !== 'hf-transformers') {
    throw new Error('Selected local model is not compatible with the Transformers.js engine.')
  }

  if (runtime === 'webnn') {
    throw new Error(
      'WebNN local transcription is not yet available in this build. Switch to Whisper Tiny English or Whisper Base.'
    )
  }

  if (
    activePipeline &&
    activePipeline.repoId === modelEntry.repoId &&
    activePipeline.runtime === runtime
  ) {
    return activePipeline.instance
  }

  await disposePipeline()
  configureTransformers(remoteHostOverride)

  postStatus('warming', `Preparing ${modelEntry.label}…`)

  const instance = await pipeline('automatic-speech-recognition', modelEntry.repoId, {
    device: runtime === 'webgpu' ? 'webgpu' : undefined,
    dtype: runtime === 'webgpu' ? 'fp32' : 'q8',
    progress_callback: (info: ProgressInfo) => {
      if (info.status === 'download' || info.status === 'progress' || info.status === 'done') {
        postStatus('downloading', toProgressDetail(info))
        return
      }

      if (info.status === 'ready') {
        postStatus('ready', `${modelEntry.label} is ready.`)
      }
    }
  })

  activePipeline = {
    repoId: modelEntry.repoId,
    runtime,
    instance
  }

  return instance
}

async function transcribeLocalAudio(
  sessionId: string,
  modelEntry: LocalModelEntry,
  runtime: RuntimeId,
  audio: Float32Array,
  remoteHostOverride?: string
) {
  const transcriber = (await getTransformersPipeline(modelEntry, runtime, remoteHostOverride)) as any
  postStatus('transcribing', `Transcribing with ${modelEntry.label}…`)

  const output = await transcriber(audio, {
    chunk_length_s: 30,
    stride_length_s: 5,
    return_timestamps: false
  })

  const result: TranscriptionResult = {
    text: typeof output.text === 'string' ? output.text.trim() : '',
    segments: []
  }

  workerContext.postMessage({
    type: 'complete',
    sessionId,
    result,
    detail: 'Saved locally.'
  } satisfies TranscriptionWorkerEvent)
}

async function transcribeHostedAudio(
  sessionId: string,
  profile: ProviderProfile,
  model: string,
  blob: Blob,
  fileName: string
) {
  postStatus('transcribing', `Transcribing with ${profile.label}…`)
  const request = buildHostedTranscriptionRequest(profile, model, blob, fileName)
  const response = await fetch(request.url, request.init)

  if (!response.ok) {
    const message = response.status === 401 || response.status === 403
      ? 'Provider auth failed. Check the saved API key and organization settings.'
      : `Hosted transcription failed with ${response.status}.`
    throw new Error(message)
  }

  const payload = (await response.json()) as { text?: string; segments?: Array<Record<string, unknown>> }
  const result = parseHostedTranscriptionResponse(payload)

  workerContext.postMessage({
    type: 'complete',
    sessionId,
    result,
    detail: 'Saved locally.'
  } satisfies TranscriptionWorkerEvent)
}

workerContext.onmessage = async (event: MessageEvent<TranscriptionWorkerMessage>) => {
  const message = event.data

  try {
    if (message.type === 'dispose') {
      await disposePipeline()
      postStatus('stopped', 'Worker disposed.')
      return
    }

    if (message.type === 'prepare-local-model') {
      await getTransformersPipeline(message.modelEntry, message.runtime, message.remoteHostOverride)
      postStatus('ready', `${message.modelEntry.label} is ready.`)
      return
    }

    if (message.type === 'transcribe-local') {
      await transcribeLocalAudio(
        message.sessionId,
        message.modelEntry,
        message.runtime,
        message.audio,
        message.remoteHostOverride
      )
      return
    }

    if (message.type === 'transcribe-hosted') {
      await transcribeHostedAudio(
        message.sessionId,
        message.profile,
        message.model,
        message.blob,
        message.fileName
      )
    }
  } catch (error) {
    workerContext.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown transcription error.'
    } satisfies TranscriptionWorkerEvent)
  }
}
