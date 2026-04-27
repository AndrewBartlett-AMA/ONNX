import type { AsrMessage, AsrProvider } from '@/types/transcription'

export type AsrProviderId =
  | 'local-websocket'
  | 'sherpa-onnx'
  | 'whisper-wasm'
  | 'faster-whisper'
  | 'granite-local'
  | 'openai-realtime'

export interface AsrProviderConfig {
  provider: AsrProviderId
  model: string
  websocketUrl: string
  sampleRate: number
  enablePartials: boolean
}

type AsrCallback = (message: AsrMessage) => void

export const defaultAsrProviderConfig: AsrProviderConfig = {
  provider: 'local-websocket',
  model: 'granite-4.0-1b-speech',
  websocketUrl: 'ws://localhost:8765/asr',
  sampleRate: 16000,
  enablePartials: true
}

function readEnvString(key: string) {
  const value = import.meta.env[key]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function readEnvNumber(key: string, fallback: number) {
  const value = readEnvString(key)
  const parsed = value ? Number(value) : NaN
  return Number.isFinite(parsed) ? parsed : fallback
}

function readEnvBoolean(key: string, fallback: boolean) {
  const value = readEnvString(key)

  if (!value) {
    return fallback
  }

  return value === 'true' || value === '1'
}

export function readAsrProviderConfig(): AsrProviderConfig {
  return {
    provider: (readEnvString('VITE_ASR_PROVIDER') ?? defaultAsrProviderConfig.provider) as AsrProviderId,
    model: readEnvString('VITE_ASR_MODEL') ?? defaultAsrProviderConfig.model,
    websocketUrl: readEnvString('VITE_ASR_WEBSOCKET_URL') ?? defaultAsrProviderConfig.websocketUrl,
    sampleRate: readEnvNumber('VITE_ASR_SAMPLE_RATE', defaultAsrProviderConfig.sampleRate),
    enablePartials: readEnvBoolean('VITE_ASR_ENABLE_PARTIALS', defaultAsrProviderConfig.enablePartials)
  }
}

function normalizeAsrMessage(payload: unknown, fallbackSessionId: string): AsrMessage | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const record = payload as Record<string, unknown>
  const type = record.type
  const text = typeof record.text === 'string' ? record.text : ''
  const segmentId =
    typeof record.segmentId === 'string'
      ? record.segmentId
      : typeof record.segment_id === 'string'
        ? record.segment_id
        : crypto.randomUUID()

  if ((type !== 'partial' && type !== 'final') || !text.trim()) {
    return null
  }

  const base = {
    sessionId: typeof record.sessionId === 'string' ? record.sessionId : fallbackSessionId,
    segmentId,
    text,
    startMs: typeof record.startMs === 'number' ? record.startMs : undefined,
    endMs: typeof record.endMs === 'number' ? record.endMs : undefined
  }

  if (type === 'partial') {
    return {
      type,
      ...base
    }
  }

  return {
    type,
    ...base,
    confidence: typeof record.confidence === 'number' ? record.confidence : undefined,
    model: typeof record.model === 'string' ? record.model : undefined
  }
}

export class LocalWebSocketAsrProvider implements AsrProvider {
  private callback: AsrCallback = () => undefined
  private sessionId: string | null = null
  private socket: WebSocket | null = null

  constructor(private readonly config: AsrProviderConfig = readAsrProviderConfig()) {}

  async start(sessionId: string) {
    this.sessionId = sessionId

    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(this.config.websocketUrl)
      socket.binaryType = 'arraybuffer'
      this.socket = socket

      socket.onopen = () => {
        socket.send(
          JSON.stringify({
            type: 'start',
            sessionId,
            model: this.config.model,
            sampleRate: this.config.sampleRate,
            enablePartials: this.config.enablePartials
          })
        )
        resolve()
      }

      socket.onerror = () => reject(new Error('Local ASR WebSocket connection failed.'))
      socket.onmessage = (event) => {
        try {
          const message = normalizeAsrMessage(JSON.parse(String(event.data)), sessionId)

          if (message) {
            this.callback(message)
          }
        } catch {
          // Ignore malformed provider messages and keep the stream open.
        }
      }
    })
  }

  async stop() {
    const socket = this.socket
    this.socket = null

    if (!socket) {
      return
    }

    if (socket.readyState === WebSocket.OPEN && this.sessionId) {
      socket.send(JSON.stringify({ type: 'stop', sessionId: this.sessionId }))
    }

    socket.close()
    this.sessionId = null
  }

  sendAudioFrame(frame: Int16Array | ArrayBuffer | Blob) {
    const socket = this.socket

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return
    }

    socket.send(frame)
  }

  onMessage(callback: AsrCallback) {
    this.callback = callback
  }
}
