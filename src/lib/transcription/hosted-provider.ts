import type { ProviderProfile } from '@/types/settings'
import type { TranscriptionResult, TranscriptionResultSegment } from '@/types/transcription'

interface HostedSegment {
  text?: string
  start?: number
  end?: number
  avg_logprob?: number
}

interface HostedResponse {
  text?: string
  segments?: HostedSegment[]
}

export function maskApiKey(value: string) {
  if (!value) {
    return ''
  }

  const suffix = value.slice(-4)
  return `••••••${suffix}`
}

export function buildHostedHeaders(profile: ProviderProfile) {
  const headers = new Headers()
  headers.set('Authorization', `Bearer ${profile.apiKey}`)

  if (profile.organization) {
    headers.set('OpenAI-Organization', profile.organization)
  }

  Object.entries(profile.extraHeaders ?? {}).forEach(([key, value]) => {
    if (key.trim() && value.trim()) {
      headers.set(key, value)
    }
  })

  return headers
}

export function buildHostedTranscriptionRequest(
  profile: ProviderProfile,
  model: string,
  blob: Blob,
  fileName: string
) {
  const formData = new FormData()
  formData.set('file', blob, fileName)
  formData.set('model', model)

  return {
    url: `${profile.baseUrl.replace(/\/$/, '')}/audio/transcriptions`,
    init: {
      method: 'POST',
      headers: buildHostedHeaders(profile),
      body: formData
    } satisfies RequestInit
  }
}

export function parseHostedTranscriptionResponse(payload: HostedResponse): TranscriptionResult {
  const segments: TranscriptionResultSegment[] =
    payload.segments?.map((segment) => ({
      text: segment.text ?? '',
      startedAtMs: typeof segment.start === 'number' ? Math.round(segment.start * 1000) : undefined,
      endedAtMs: typeof segment.end === 'number' ? Math.round(segment.end * 1000) : undefined,
      confidence:
        typeof segment.avg_logprob === 'number'
          ? Math.max(0, Math.min(1, Math.exp(segment.avg_logprob)))
          : undefined
    })) ?? []

  return {
    text: payload.text ?? segments.map((segment) => segment.text).join(' ').trim(),
    segments
  }
}
