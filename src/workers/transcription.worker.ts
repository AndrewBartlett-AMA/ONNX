export type TranscriptionWorkerMessage =
  | {
      type: 'warmup'
      runtime: 'webnn' | 'webgpu' | 'wasm'
      modelId?: string
    }
  | {
      type: 'start-stream'
      runtime: 'webnn' | 'webgpu' | 'wasm'
      sessionId: string
      title: string
      participantNames: string[]
      source: 'microphone' | 'system-audio' | 'upload'
      emittedCount: number
    }
  | {
      type: 'stop-stream'
      sessionId: string
    }
  | {
      type: 'dispose'
    }

export type TranscriptionWorkerEvent =
  | {
      type: 'status'
      state: 'warming' | 'ready' | 'recording' | 'transcribing' | 'stopped'
      detail: string
    }
  | {
      type: 'segment'
      sessionId: string
      text: string
      speakerLabel: string
      occurredAt: string
      startedAtMs: number
      endedAtMs: number
      confidence: number
    }
  | {
      type: 'complete'
      sessionId: string
      detail: string
    }
  | {
      type: 'error'
      message: string
    }

const workerContext: DedicatedWorkerGlobalScope = self as DedicatedWorkerGlobalScope

let warmupTimeout: number | undefined
let streamInterval: number | undefined

function buildScript(title: string, source: 'microphone' | 'system-audio' | 'upload') {
  const normalizedTitle = title.toLowerCase()

  if (normalizedTitle.includes('phoenix')) {
    return [
      'We should treat the staging latency as the gating issue before the rollout window opens.',
      'The dashboard points to query amplification and a sharp drop in cache hit rate.',
      'Let’s capture the mitigation plan directly in the rollout brief so leadership can review it quickly.',
      'I will move ticket four zero two into the active sprint and link the evidence bundle.'
    ]
  }

  if (source === 'upload') {
    return [
      'Processing the uploaded recording and rebuilding the transcript in the session timeline.',
      'Speaker turns are being simulated through the runtime abstraction for this scaffold.',
      'The architecture is ready to swap this mock flow for real browser inference later.'
    ]
  }

  return [
    'Quiet Scribe is simulating local capture and transcript streaming through a worker.',
    'Each segment is written into IndexedDB-backed session state as it arrives.',
    'The runtime abstraction remains aligned to WebNN, WebGPU, and WASM without binding the UI to one backend.',
    'Exports, notes, attachments, and tag prompts can now operate against the live session data.'
  ]
}

function clearTimers() {
  if (warmupTimeout) {
    clearTimeout(warmupTimeout)
    warmupTimeout = undefined
  }

  if (streamInterval) {
    clearInterval(streamInterval)
    streamInterval = undefined
  }
}

workerContext.onmessage = (event: MessageEvent<TranscriptionWorkerMessage>) => {
  const message = event.data

  if (message.type === 'dispose') {
    clearTimers()
    workerContext.postMessage({
      type: 'status',
      state: 'stopped',
      detail: 'Worker disposed.'
    } satisfies TranscriptionWorkerEvent)
    return
  }

  if (message.type === 'stop-stream') {
    clearTimers()
    workerContext.postMessage({
      type: 'complete',
      sessionId: message.sessionId,
      detail: 'Streaming stopped.'
    } satisfies TranscriptionWorkerEvent)
    return
  }

  if (message.type === 'warmup') {
    clearTimers()
    workerContext.postMessage({
      type: 'status',
      state: 'warming',
      detail: `Preparing ${message.runtime.toUpperCase()} runtime…`
    } satisfies TranscriptionWorkerEvent)

    warmupTimeout = workerContext.setTimeout(() => {
      workerContext.postMessage({
        type: 'status',
        state: 'ready',
        detail: `${message.runtime.toUpperCase()} model warm and ready.`
      } satisfies TranscriptionWorkerEvent)
    }, 500)
    return
  }

  if (message.type === 'start-stream') {
    clearTimers()
    const script = buildScript(message.title, message.source)
    const speakers = message.participantNames.length > 0 ? message.participantNames : ['Quiet Scribe']
    const streamStartedAt = Date.now()
    let index = 0

    workerContext.postMessage({
      type: 'status',
      state: message.source === 'upload' ? 'transcribing' : 'recording',
      detail: message.source === 'upload' ? 'Simulating file transcription…' : 'Simulating live capture…'
    } satisfies TranscriptionWorkerEvent)

    streamInterval = workerContext.setInterval(() => {
      if (index >= script.length) {
        clearTimers()
        workerContext.postMessage({
          type: 'complete',
          sessionId: message.sessionId,
          detail: 'Simulated transcription complete.'
        } satisfies TranscriptionWorkerEvent)
        return
      }

      const startedAtMs = (message.emittedCount + index) * 1400
      const endedAtMs = startedAtMs + 1200
      const occurredAt = new Date(streamStartedAt + endedAtMs).toISOString()

      workerContext.postMessage({
        type: 'segment',
        sessionId: message.sessionId,
        text: script[index],
        speakerLabel: speakers[index % speakers.length],
        occurredAt,
        startedAtMs,
        endedAtMs,
        confidence: 0.9
      } satisfies TranscriptionWorkerEvent)

      index += 1
    }, 950)
  }
}
