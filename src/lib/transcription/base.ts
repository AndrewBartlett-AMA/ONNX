import type {
  RuntimeCapabilities,
  RuntimeId,
  RuntimeSessionHandle,
  RuntimeState,
  RuntimeStatus,
  StartSessionOptions,
  TranscribeChunkRequest,
  TranscribeFileRequest,
  TranscriptionResult,
  TranscriptionRuntime
} from '@/types/transcription'

interface RuntimeAdapterOptions {
  id: RuntimeId
  label: string
  detectSupport: () => boolean
}

function getRuntimeState(supported: boolean, activeSessionId?: string): RuntimeState {
  if (!supported) {
    return 'unavailable'
  }

  if (activeSessionId) {
    return 'recording'
  }

  return 'idle'
}

function buildNotImplementedError(label: string, mode: 'chunk' | 'file') {
  return new Error(`${label} ${mode} transcription is scaffolded but not implemented yet.`)
}

export function createRuntimeAdapter({
  id,
  label,
  detectSupport
}: RuntimeAdapterOptions): TranscriptionRuntime {
  let activeSessionId: string | undefined

  async function getCapabilities(): Promise<RuntimeCapabilities> {
    const supported = detectSupport()

    return {
      runtime: id,
      supported,
      fileTranscription: supported,
      streamingTranscription: supported,
      notes: supported
        ? [`${label} is detectable in this browser. The adapter is ready for real model wiring.`]
        : [`${label} is not available in this browser. Quiet Scribe will fall back to the next runtime.`]
    }
  }

  async function getStatus(): Promise<RuntimeStatus> {
    const supported = detectSupport()

    return {
      runtime: id,
      state: getRuntimeState(supported, activeSessionId),
      activeSessionId,
      modelLabel: 'No model configured',
      detail: supported ? `${label} adapter scaffolded` : `${label} browser API unavailable`
    }
  }

  return {
    id,
    label,
    async startSession(options?: StartSessionOptions): Promise<RuntimeSessionHandle> {
      if (!detectSupport()) {
        throw new Error(`${label} is unavailable in this browser.`)
      }

      activeSessionId = options?.sessionId ?? crypto.randomUUID()

      return {
        sessionId: activeSessionId,
        runtime: id,
        startedAt: new Date().toISOString()
      }
    },
    async stopSession(sessionId: string) {
      if (activeSessionId === sessionId) {
        activeSessionId = undefined
      }
    },
    async transcribeChunk(_request: TranscribeChunkRequest): Promise<TranscriptionResult> {
      throw buildNotImplementedError(label, 'chunk')
    },
    async transcribeFile(_request: TranscribeFileRequest): Promise<TranscriptionResult> {
      throw buildNotImplementedError(label, 'file')
    },
    getCapabilities,
    getStatus
  }
}
