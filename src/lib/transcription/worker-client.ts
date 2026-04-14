import type { LocalModelEntry } from '@/types/settings'
import type { RuntimeId, TranscriptionResult } from '@/types/transcription'
import type {
  TranscriptionWorkerEvent,
  TranscriptionWorkerMessage,
  TranscriptionWorkerStatusEvent
} from '@/workers/transcription.worker'

interface LocalWorkerBaseInput {
  modelEntry: LocalModelEntry
  runtime: RuntimeId
  remoteHostOverride?: string
  onStatus?: (status: TranscriptionWorkerStatusEvent) => void
}

interface LocalWorkerTranscriptionInput extends LocalWorkerBaseInput {
  sessionId: string
  sampleRate: number
  audio: Float32Array
}

function createTranscriptionWorker() {
  return new Worker(new URL('../../workers/transcription.worker.ts', import.meta.url), {
    type: 'module'
  })
}

function attachWorkerLifecycle(
  worker: Worker,
  resolveOn: 'complete' | 'ready',
  onStatus?: (status: TranscriptionWorkerStatusEvent) => void
) {
  return new Promise<TranscriptionWorkerEvent>((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<TranscriptionWorkerEvent>) => {
      const message = event.data

      if (message.type === 'status') {
        onStatus?.(message)
        if (resolveOn === 'ready' && message.state === 'ready') {
          resolve(message)
        }
        return
      }

      if (message.type === 'complete') {
        if (resolveOn === 'complete') {
          resolve(message)
        }
        return
      }

      reject(new Error(message.message))
    }

    worker.onerror = (event) => {
      reject(new Error(event.message || 'Local transcription worker failed.'))
    }
  })
}

export async function prepareLocalModelWorker({
  modelEntry,
  runtime,
  remoteHostOverride,
  onStatus
}: LocalWorkerBaseInput) {
  const worker = createTranscriptionWorker()

  try {
    const completion = attachWorkerLifecycle(worker, 'ready', onStatus)

    worker.postMessage({
      type: 'prepare-local-model',
      modelEntry,
      runtime,
      remoteHostOverride
    } satisfies TranscriptionWorkerMessage)

    await completion
  } finally {
    worker.terminate()
  }
}

export async function transcribeLocalAudioWithWorker({
  sessionId,
  modelEntry,
  runtime,
  sampleRate,
  audio,
  remoteHostOverride,
  onStatus
}: LocalWorkerTranscriptionInput) {
  const worker = createTranscriptionWorker()

  try {
    const completion = attachWorkerLifecycle(worker, 'complete', onStatus)

    worker.postMessage(
      {
        type: 'transcribe-local',
        sessionId,
        modelEntry,
        runtime,
        sampleRate,
        audio,
        remoteHostOverride
      } satisfies TranscriptionWorkerMessage,
      [audio.buffer]
    )

    const message = await completion

    if (message.type !== 'complete') {
      throw new Error('Local transcription did not return a result.')
    }

    return message.result satisfies TranscriptionResult
  } finally {
    worker.terminate()
  }
}
