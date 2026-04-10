import { startTransition, useCallback, useEffect, useRef, useState } from 'react'
import type { SessionDetail } from '@/app/app-data-provider'
import { useAppData } from '@/hooks/use-app-data'
import { getRuntimeById, getRuntimeSnapshot, runtimeLabels } from '@/lib/transcription/runtime-registry'
import type { RuntimeId, RuntimeState } from '@/types/transcription'
import type { TranscriptionWorkerEvent, TranscriptionWorkerMessage } from '@/workers/transcription.worker'

interface SessionTranscriptionState {
  runtimeId: RuntimeId
  phase: RuntimeState
  detail: string
  segmentsProcessed: number
  isRunning: boolean
  start: () => Promise<void>
  stop: () => Promise<void>
}

export function useSessionTranscription(detail: SessionDetail | undefined): SessionTranscriptionState {
  const { addTranscriptItem, updateSession } = useAppData()
  const workerRef = useRef<Worker | null>(null)
  const runtimeRef = useRef<ReturnType<typeof getRuntimeById> | null>(null)
  const [runtimeId, setRuntimeId] = useState<RuntimeId>(detail?.session.runtime ?? 'wasm')
  const [phase, setPhase] = useState<RuntimeState>('idle')
  const [statusDetail, setStatusDetail] = useState('Runtime idle.')
  const [segmentsProcessed, setSegmentsProcessed] = useState(detail?.transcriptItems.length ?? 0)

  useEffect(() => {
    setSegmentsProcessed(detail?.transcriptItems.length ?? 0)
    setRuntimeId(detail?.session.runtime ?? 'wasm')
    setPhase(
      detail?.session.status === 'recording'
        ? 'recording'
        : detail?.session.status === 'processing'
          ? 'transcribing'
          : 'idle'
    )
    setStatusDetail('Runtime idle.')
  }, [detail?.session.id, detail?.session.runtime, detail?.session.status, detail?.transcriptItems.length])

  useEffect(() => {
    workerRef.current?.postMessage({ type: 'dispose' } satisfies TranscriptionWorkerMessage)
    workerRef.current?.terminate()
    workerRef.current = null
  }, [detail?.session.id])

  useEffect(() => {
    return () => {
      workerRef.current?.postMessage({ type: 'dispose' } satisfies TranscriptionWorkerMessage)
      workerRef.current?.terminate()
      workerRef.current = null
    }
  }, [])

  const ensureWorker = useCallback(() => {
    if (workerRef.current) {
      return workerRef.current
    }

    const worker = new Worker(new URL('../workers/transcription.worker.ts', import.meta.url), {
      type: 'module'
    })

    worker.onmessage = (event: MessageEvent<TranscriptionWorkerEvent>) => {
      const message = event.data

      if (!detail) {
        return
      }

      if (message.type === 'status') {
        setStatusDetail(message.detail)
        setPhase(
          message.state === 'warming'
            ? 'transcribing'
            : message.state === 'ready'
              ? 'ready'
              : message.state === 'recording'
                ? 'recording'
                : message.state === 'transcribing'
                  ? 'transcribing'
                  : 'stopped'
        )
        return
      }

      if (message.type === 'segment') {
        setSegmentsProcessed((current) => current + 1)
        setPhase('recording')
        setStatusDetail(`Streaming through ${runtimeLabels[runtimeId]}…`)

        startTransition(() => {
          void addTranscriptItem(detail.session.id, {
            text: message.text,
            speakerLabel: message.speakerLabel,
            occurredAt: message.occurredAt,
            startedAtMs: message.startedAtMs,
            endedAtMs: message.endedAtMs,
            confidence: message.confidence
          })
        })
        return
      }

      if (message.type === 'complete') {
        setPhase('stopped')
        setStatusDetail(message.detail)
        startTransition(() => {
          void updateSession(detail.session.id, {
            status: 'completed',
            endedAt: new Date().toISOString()
          })
        })
        void runtimeRef.current?.stopSession(detail.session.id)
        return
      }

      if (message.type === 'error') {
        setPhase('error')
        setStatusDetail(message.message)
      }
    }

    workerRef.current = worker
    return worker
  }, [addTranscriptItem, detail, runtimeId, updateSession])

  const start = useCallback(async () => {
    if (!detail) {
      return
    }

    const snapshot = await getRuntimeSnapshot()
    const nextRuntimeId = snapshot.capabilities[detail.session.runtime]?.supported
      ? detail.session.runtime
      : snapshot.preferredRuntime
    const runtime = getRuntimeById(nextRuntimeId)

    runtimeRef.current = runtime
    setRuntimeId(nextRuntimeId)
    setPhase('transcribing')
    setStatusDetail(`Preparing ${runtimeLabels[nextRuntimeId]} runtime…`)

    await runtime.startSession({
      sessionId: detail.session.id,
      modelId: detail.session.modelId,
      prefersSystemAudio: detail.session.source === 'system-audio'
    })

    await updateSession(detail.session.id, {
      runtime: nextRuntimeId,
      status: detail.session.source === 'upload' ? 'processing' : 'recording',
      startedAt: detail.session.startedAt ?? new Date().toISOString(),
      endedAt: undefined
    })

    const worker = ensureWorker()
    worker.postMessage({
      type: 'warmup',
      runtime: nextRuntimeId,
      modelId: detail.session.modelId
    } satisfies TranscriptionWorkerMessage)
    worker.postMessage({
      type: 'start-stream',
      runtime: nextRuntimeId,
      sessionId: detail.session.id,
      title: detail.session.title,
      participantNames: detail.session.participantNames,
      source: detail.session.source,
      emittedCount: detail.transcriptItems.length
    } satisfies TranscriptionWorkerMessage)
  }, [detail, ensureWorker, updateSession])

  const stop = useCallback(async () => {
    if (!detail) {
      return
    }

    workerRef.current?.postMessage({
      type: 'stop-stream',
      sessionId: detail.session.id
    } satisfies TranscriptionWorkerMessage)
    await runtimeRef.current?.stopSession(detail.session.id)
    await updateSession(detail.session.id, {
      status: 'completed',
      endedAt: new Date().toISOString()
    })
    setPhase('stopped')
    setStatusDetail('Recording stopped.')
  }, [detail, updateSession])

  return {
    runtimeId,
    phase,
    detail: statusDetail,
    segmentsProcessed,
    isRunning: phase === 'recording' || phase === 'transcribing',
    start,
    stop
  }
}
