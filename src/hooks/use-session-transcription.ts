import { startTransition, useCallback, useEffect, useRef, useState } from 'react'
import type { SessionDetail } from '@/app/app-data-provider'
import { useAppData } from '@/hooks/use-app-data'
import { normalizeAudioBlob } from '@/lib/audio/normalize'
import { resolveLocalModelRuntime } from '@/lib/transcription/local-models'
import { getRuntimeSnapshot } from '@/lib/transcription/runtime-registry'
import type { Attachment } from '@/types/domain'
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

function pickAudioAttachment(attachments: Attachment[]) {
  return [...attachments]
    .filter((attachment) => attachment.kind === 'audio' && attachment.blob)
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))[0]
}

function createRecordingFileName(title: string) {
  const safeTitle = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  return `${safeTitle || 'quiet-scribe-recording'}.webm`
}

export function useSessionTranscription(detail: SessionDetail | undefined): SessionTranscriptionState {
  const {
    addAttachmentFiles,
    addTranscriptItem,
    clearTranscriptItems,
    localModelEntries,
    providerProfiles,
    updateSession,
    appSettings
  } = useAppData()
  const workerRef = useRef<Worker | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const captureStreamRef = useRef<MediaStream | null>(null)
  const detailRef = useRef<SessionDetail | undefined>(detail)
  const [runtimeId, setRuntimeId] = useState<RuntimeId>(detail?.session.runtime ?? 'wasm')
  const [phase, setPhase] = useState<RuntimeState>('idle')
  const [statusDetail, setStatusDetail] = useState('Runtime idle.')
  const [segmentsProcessed, setSegmentsProcessed] = useState(detail?.transcriptItems.length ?? 0)

  useEffect(() => {
    detailRef.current = detail
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
  }, [detail])

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
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop())
      captureStreamRef.current?.getTracks().forEach((track) => track.stop())
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
      const currentDetail = detailRef.current
      const message = event.data

      if (!currentDetail) {
        return
      }

      if (message.type === 'status') {
        setStatusDetail(message.detail)
        setPhase(
          message.state === 'ready'
            ? 'ready'
            : message.state === 'recording'
              ? 'recording'
              : message.state === 'stopped'
                ? 'stopped'
                : 'transcribing'
        )
        return
      }

      if (message.type === 'complete') {
        setStatusDetail(message.detail)
        setPhase('stopped')

        void (async () => {
          await clearTranscriptItems(currentDetail.session.id)

          const transcriptItems =
            message.result.segments.length > 0
              ? message.result.segments
              : [{ text: message.result.text, confidence: undefined }]

          for (const [index, segment] of transcriptItems.entries()) {
            if (!segment.text?.trim()) {
              continue
            }

            await addTranscriptItem(currentDetail.session.id, {
              text: segment.text.trim(),
              occurredAt: new Date(Date.now() + index).toISOString(),
              startedAtMs: segment.startedAtMs,
              endedAtMs: segment.endedAtMs,
              confidence: segment.confidence
            })
          }

          setSegmentsProcessed(transcriptItems.filter((segment) => segment.text?.trim()).length)
          await updateSession(currentDetail.session.id, {
            status: 'completed',
            endedAt: new Date().toISOString()
          })
        })()
        return
      }

      if (message.type === 'error') {
        setPhase('error')
        setStatusDetail(message.message)
        startTransition(() => {
          void updateSession(currentDetail.session.id, {
            status: 'failed',
            endedAt: new Date().toISOString()
          })
        })
      }
    }

    workerRef.current = worker
    return worker
  }, [addTranscriptItem, clearTranscriptItems, updateSession])

  const stopCaptureTracks = useCallback(() => {
    recorderRef.current = null
    captureStreamRef.current?.getTracks().forEach((track) => track.stop())
    captureStreamRef.current = null
  }, [])

  const resolveTargets = useCallback(
    (currentDetail: SessionDetail) => {
      if (currentDetail.session.targetType === 'hosted') {
        const profile =
          providerProfiles.find((entry) => entry.id === currentDetail.session.providerProfileId) ??
          providerProfiles.find((entry) => entry.id === appSettings.selectedProviderProfileId)

        if (!profile) {
          throw new Error('No hosted provider is selected. Add a provider profile in Settings.')
        }

        return {
          targetType: 'hosted' as const,
          provider: profile
        }
      }

      const model =
        localModelEntries.find((entry) => entry.id === currentDetail.session.targetId) ??
        localModelEntries.find((entry) => entry.id === appSettings.selectedLocalModelId)

      if (!model) {
        throw new Error('No local model is selected. Choose a local model in Settings.')
      }

      return {
        targetType: 'local' as const,
        model
      }
    },
    [appSettings.selectedLocalModelId, appSettings.selectedProviderProfileId, localModelEntries, providerProfiles]
  )

  const transcribeBlob = useCallback(
    async (blob: Blob, fileName: string) => {
      const currentDetail = detailRef.current

      if (!currentDetail) {
        return
      }

      const resolvedTarget = resolveTargets(currentDetail)
      const worker = ensureWorker()

      if (resolvedTarget.targetType === 'hosted') {
        setRuntimeId(currentDetail.session.runtime)
        setPhase('transcribing')
        setStatusDetail(`Transcribing with ${resolvedTarget.provider.label}…`)

        await updateSession(currentDetail.session.id, {
          runtime: currentDetail.session.runtime,
          status: 'processing',
          targetType: 'hosted',
          providerProfileId: resolvedTarget.provider.id,
          targetId: resolvedTarget.provider.id,
          modelId: resolvedTarget.provider.model,
          endedAt: undefined
        })

        worker.postMessage({
          type: 'transcribe-hosted',
          sessionId: currentDetail.session.id,
          profile: resolvedTarget.provider,
          model: currentDetail.session.modelId || appSettings.selectedHostedModel || resolvedTarget.provider.model,
          fileName,
          blob
        } satisfies TranscriptionWorkerMessage)
        return
      }

      const snapshot = await getRuntimeSnapshot()
      const nextRuntime = resolveLocalModelRuntime(resolvedTarget.model, snapshot.availableRuntimeIds)

      if (!nextRuntime) {
        if (resolvedTarget.model.engine === 'webnn-ort') {
          throw new Error(
            'WebNN is unavailable in this browser. Switch to Whisper Tiny English for WebGPU/WASM.'
          )
        }

        throw new Error('No compatible local runtime is available in this browser.')
      }

      setRuntimeId(nextRuntime)
      setPhase('transcribing')
      setStatusDetail(`Preparing ${resolvedTarget.model.label}…`)

      await updateSession(currentDetail.session.id, {
        runtime: nextRuntime,
        status: 'processing',
        targetType: 'local',
        targetId: resolvedTarget.model.id,
        providerProfileId: undefined,
        modelId: resolvedTarget.model.repoId,
        endedAt: undefined
      })

      const normalized = await normalizeAudioBlob(blob)

      worker.postMessage(
        {
          type: 'transcribe-local',
          sessionId: currentDetail.session.id,
          runtime: nextRuntime,
          modelEntry: resolvedTarget.model,
          sampleRate: normalized.sampleRate,
          audio: normalized.channelData,
          remoteHostOverride: appSettings.remoteModelHostOverride
        } satisfies TranscriptionWorkerMessage,
        [normalized.channelData.buffer]
      )
    },
    [appSettings.remoteModelHostOverride, ensureWorker, resolveTargets, updateSession]
  )

  const startRecording = useCallback(async () => {
    const currentDetail = detailRef.current

    if (!currentDetail) {
      return
    }

    const mediaStream =
      currentDetail.session.source === 'system-audio'
        ? await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
          })
        : await navigator.mediaDevices.getUserMedia({
            audio: {
              channelCount: 1,
              echoCancellation: true,
              noiseSuppression: true
            }
          })

    const audioTracks = mediaStream.getAudioTracks()

    if (audioTracks.length === 0) {
      mediaStream.getTracks().forEach((track) => track.stop())
      throw new Error('No audio track was available from the selected source.')
    }

    const recordingStream = new MediaStream(audioTracks)
    captureStreamRef.current = mediaStream
    recordedChunksRef.current = []

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm'
    const recorder = new MediaRecorder(recordingStream, { mimeType })
    recorderRef.current = recorder

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data)
      }
    }

    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, {
        type: recorder.mimeType || 'audio/webm'
      })
      stopCaptureTracks()

      void (async () => {
        const file = new File([blob], createRecordingFileName(currentDetail.session.title), {
          type: blob.type || 'audio/webm'
        })
        await addAttachmentFiles(currentDetail.session.id, [file])
        await transcribeBlob(blob, file.name)
      })()
    }

    recorder.start()
    setPhase('recording')
    setStatusDetail(
      currentDetail.session.source === 'system-audio' ? 'Recording system audio…' : 'Recording…'
    )

    await updateSession(currentDetail.session.id, {
      status: 'recording',
      startedAt: currentDetail.session.startedAt ?? new Date().toISOString(),
      endedAt: undefined
    })
  }, [addAttachmentFiles, stopCaptureTracks, transcribeBlob, updateSession])

  const start = useCallback(async () => {
    const currentDetail = detailRef.current

    if (!currentDetail) {
      return
    }

    try {
      if (currentDetail.session.source === 'upload') {
        const attachment = pickAudioAttachment(currentDetail.attachments)

        if (!attachment?.blob) {
          throw new Error('No uploaded audio file is attached to this session.')
        }

        await transcribeBlob(attachment.blob, attachment.name)
        return
      }

      await startRecording()
    } catch (error) {
      setPhase('error')
      setStatusDetail(error instanceof Error ? error.message : 'Unable to start transcription.')
    }
  }, [startRecording, transcribeBlob])

  const stop = useCallback(async () => {
    const currentDetail = detailRef.current

    if (!currentDetail) {
      return
    }

    if (phase === 'recording' && recorderRef.current) {
      setPhase('transcribing')
      setStatusDetail('Finishing recording and preparing transcription…')
      recorderRef.current.stop()
      return
    }

    if (phase === 'transcribing') {
      workerRef.current?.postMessage({ type: 'dispose' } satisfies TranscriptionWorkerMessage)
      workerRef.current?.terminate()
      workerRef.current = null
      setPhase('stopped')
      setStatusDetail('Transcription stopped.')
      await updateSession(currentDetail.session.id, {
        status: 'draft',
        endedAt: new Date().toISOString()
      })
      return
    }

    setPhase('stopped')
    setStatusDetail('Recording stopped.')
  }, [phase, updateSession])

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
