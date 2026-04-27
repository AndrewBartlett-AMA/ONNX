import type {
  AsrFinalMessage,
  AsrMessage,
  AsrPartialMessage,
  TranscriptSegment
} from '../../types/transcription'

export interface TranscriptState {
  segments: TranscriptSegment[]
  draftSegment: TranscriptSegment | null
}

export type TranscriptAction =
  | { type: 'ASR_PARTIAL'; message: AsrPartialMessage }
  | { type: 'ASR_FINAL'; message: AsrFinalMessage }
  | { type: 'LOAD_SEGMENTS'; segments: TranscriptSegment[] }
  | { type: 'DELETE_SEGMENT'; segmentId: string }
  | { type: 'CLEAR_DRAFT' }

export function createEmptyTranscriptState(): TranscriptState {
  return {
    segments: [],
    draftSegment: null
  }
}

export function upsertSegment(
  segments: TranscriptSegment[],
  next: TranscriptSegment
): TranscriptSegment[] {
  const exists = segments.some((segment) => segment.id === next.id)

  if (!exists) {
    return [...segments, next]
  }

  return segments.map((segment) => (segment.id === next.id ? next : segment))
}

export function asrMessageToSegment(message: AsrMessage, createdAt = new Date().toISOString()): TranscriptSegment {
  return {
    id: message.segmentId,
    sessionId: message.sessionId,
    text: message.text,
    startMs: message.startMs,
    endMs: message.endMs,
    confidence: message.type === 'final' ? message.confidence : undefined,
    model: message.type === 'final' ? message.model : undefined,
    final: message.type === 'final',
    createdAt
  }
}

export function transcriptReducer(state: TranscriptState, action: TranscriptAction): TranscriptState {
  switch (action.type) {
    case 'ASR_PARTIAL':
      return {
        ...state,
        draftSegment: asrMessageToSegment(action.message)
      }
    case 'ASR_FINAL': {
      const finalSegment = asrMessageToSegment(action.message)
      const nextDraft =
        state.draftSegment?.id === action.message.segmentId ? null : state.draftSegment

      return {
        segments: upsertSegment(state.segments, finalSegment),
        draftSegment: nextDraft
      }
    }
    case 'LOAD_SEGMENTS':
      return {
        segments: action.segments,
        draftSegment: state.draftSegment
      }
    case 'DELETE_SEGMENT':
      return {
        segments: state.segments.filter((segment) => segment.id !== action.segmentId),
        draftSegment:
          state.draftSegment?.id === action.segmentId ? null : state.draftSegment
      }
    case 'CLEAR_DRAFT':
      return {
        ...state,
        draftSegment: null
      }
    default:
      return state
  }
}
