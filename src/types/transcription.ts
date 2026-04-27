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
  id: string
  sessionId: string
  text: string
  startMs?: number
  endMs?: number
  speakerLabel?: string
  confidence?: number
  model?: string
  final: boolean
  createdAt: string
}

export interface TranscriptionResultSegment {
  text: string
  startedAtMs?: number
  endedAtMs?: number
  speakerLabel?: string
  confidence?: number
  model?: string
}

export interface TranscriptionResult {
  text: string
  segments: TranscriptionResultSegment[]
  warnings?: string[]
  durationMs?: number
}

export type AsrPartialMessage = {
  type: 'partial'
  sessionId: string
  segmentId: string
  text: string
  startMs?: number
  endMs?: number
}

export type AsrFinalMessage = {
  type: 'final'
  sessionId: string
  segmentId: string
  text: string
  startMs?: number
  endMs?: number
  confidence?: number
  model?: string
}

export type AsrMessage = AsrPartialMessage | AsrFinalMessage

export interface AsrProvider {
  start(sessionId: string): Promise<void>
  stop(): Promise<void>
  sendAudioFrame?(frame: Int16Array | ArrayBuffer | Blob): void
  onMessage(callback: (message: AsrMessage) => void): void
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
