export type RuntimeId = 'webnn' | 'webgpu' | 'wasm'
export type RuntimeState =
  | 'idle'
  | 'ready'
  | 'recording'
  | 'transcribing'
  | 'stopped'
  | 'unavailable'
  | 'error'

export interface StartSessionOptions {
  sessionId?: string
  modelId?: string
  prefersSystemAudio?: boolean
  sampleRate?: number
  channelCount?: number
}

export interface RuntimeSessionHandle {
  sessionId: string
  runtime: RuntimeId
  startedAt: string
}

export interface TranscriptSegment {
  text: string
  startedAtMs?: number
  endedAtMs?: number
  speakerLabel?: string
  confidence?: number
}

export interface TranscriptionResult {
  text: string
  segments: TranscriptSegment[]
  warnings?: string[]
  durationMs?: number
}

export interface TranscribeChunkRequest {
  sessionId: string
  sequence: number
  chunk: Blob
}

export interface TranscribeFileRequest {
  file: Blob
  fileName?: string
  language?: string
}

export interface RuntimeCapabilities {
  runtime: RuntimeId
  supported: boolean
  fileTranscription: boolean
  streamingTranscription: boolean
  notes: string[]
}

export interface RuntimeStatus {
  runtime: RuntimeId
  state: RuntimeState
  activeSessionId?: string
  modelLabel?: string
  detail?: string
}

export interface RuntimeSnapshot {
  preferredRuntime: RuntimeId
  availableRuntimeIds: RuntimeId[]
  capabilities: Record<RuntimeId, RuntimeCapabilities>
  statuses: Record<RuntimeId, RuntimeStatus>
}

export interface TranscriptionRuntime {
  id: RuntimeId
  label: string
  startSession(options?: StartSessionOptions): Promise<RuntimeSessionHandle>
  stopSession(sessionId: string): Promise<void>
  transcribeChunk(request: TranscribeChunkRequest): Promise<TranscriptionResult>
  transcribeFile(request: TranscribeFileRequest): Promise<TranscriptionResult>
  getCapabilities(): Promise<RuntimeCapabilities>
  getStatus(): Promise<RuntimeStatus>
}
