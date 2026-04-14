import { startTransition, useCallback, useEffect, useRef, useState } from 'react'
import type { SessionDetail } from '@/app/app-data-provider'
import { useAppData } from '@/hooks/use-app-data'
import { normalizeAudioBlob } from '@/lib/audio/normalize'
import { resolveLocalModelRuntime } from '@/lib/transcription/local-models'
import { getRuntimeSnapshot } from '@/lib/transcription/runtime-registry'
import type { Attachment } from '@/types/domain'
import type { AsrMode, LocalModelEntry } from '@/types/settings'
import type { RuntimeId, RuntimeState } from '@/types/transcription'
import type { TranscriptionWorkerEvent, TranscriptionWorkerMessage } from '@/workers/transcription.worker'

const AUDIO_LEVEL_HISTORY_SIZE = 28
const REALTIME_CHUNK_MS = 2000

interface SessionTranscriptionState {
  runtimeId: RuntimeId
  phase: RuntimeState
  detail: string
  downloadProgress?: number
  audioLevels: number[]
  segmentsProcessed: number
  isRunning: boolean
  start: () => Promise<void>
  stop: () => Promise<void>
}

interface ActiveAudioMeter {
  analyser: AnalyserNode
  context: AudioContext
  frameId: number
  source: MediaStreamAudioSourceNode
}

interface ActiveRealtimeTarget {
  model: LocalModelEntry
  runtime: RuntimeId
}

interface PendingRealtimeFinalize {
  blob: Blob
  fileName: string
}

interface PendingRealtimePrepare {
  reject: (error: Error) => void
  resolve: () => void
}

function createIdleAudioLevels() {
  return Array.from({ length: AUDIO_LEVEL_HISTORY_SIZE }, () => 0.04)
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

function getSessionPhase(detail: SessionDetail | undefined): RuntimeState {
  if (!detail) {
    return 'idle'
  }

  switch (detail.session.status) {
    case 'recording':
      return 'recording'
    case 'processing':
      return 'transcribing'
    case 'completed':
      return 'ready'
    case 'failed':
      return 'error'
    default:
      return 'idle'
  }
}

function getDefaultStatusDetail(detail: SessionDetail | undefined) {
  if (!detail) {
    return 'Runtime idle.'
  }

  switch (detail.session.status) {
    case 'recording':
      return detail.session.source === 'system-audio' ? 'Recording system audio…' : 'Recording…'
    case 'processing':
      return 'Transcription in progress…'
    case 'completed':
      return detail.transcriptItems.length > 0 ? 'Transcript ready.' : 'Transcription completed.'
    case 'failed':
      return 'Transcription failed.'
    default:
      return 'Runtime idle.'
  }
}

function getSessionAsrMode(detail: SessionDetail | undefined, fallbackMode: AsrMode) {
  return detail?.session.asrMode ?? fallbackMode
}

function isSkippableRealtimeChunkError(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }

  const message = error.message.toLowerCase()
  return message.includes('decode audio') || message.includes('unable to decode')
}

function isRealtimePrepareCancellation(error: unknown) {
  return error instanceof Error && error.message.startsWith('Live ASR preparation was ')
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
  const audioMeterRef = useRef<ActiveAudioMeter | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const captureStreamRef = useRef<MediaStream | null>(null)
  const detailRef = useRef<SessionDetail | undefined>(detail)
  const realtimeTargetRef = useRef<ActiveRealtimeTarget | null>(null)
  const realtimeFinalizeRef = useRef<PendingRealtimeFinalize | null>(null)
  const realtimeChunkQueueRef = useRef<Blob[]>([])
  const realtimeIsProcessingRef = useRef(false)
  const realtimeChunkIndexRef = useRef(0)
  const realtimeSegmentsCountRef = useRef(detail?.transcriptItems.length ?? 0)
  const realtimePrepareRef = useRef<PendingRealtimePrepare | null>(null)
  const [audioLevels, setAudioLevels] = useState(createIdleAudioLevels)
  const [downloadProgress, setDownloadProgress] = useState<number | undefined>(undefined)
  const [runtimeId, setRuntimeId] = useState<RuntimeId>(detail?.session.runtime ?? 'wasm')
  const [phase, setPhase] = useState<RuntimeState>(getSessionPhase(detail))
  const [statusDetail, setStatusDetail] = useState(getDefaultStatusDetail(detail))
  const [segmentsProcessed, setSegmentsProcessed] = useState(detail?.transcriptItems.length ?? 0)

  const resetRealtimeState = useCallback(() => {
    realtimeTargetRef.current = null
    realtimeFinalizeRef.current = null
    realtimeChunkQueueRef.current = []
    realtimeIsProcessingRef.current = false
    realtimeChunkIndexRef.current = 0
    realtimePrepareRef.current = null
    realtimeSegmentsCountRef.current = detailRef.current?.transcriptItems.length ?? 0
    setSegmentsProcessed(realtimeSegmentsCountRef.current)
  }, [])

  const rejectRealtimePrepare = useCallback((error: Error) => {
    const pendingPrepare = realtimePrepareRef.current

    if (!pendingPrepare) {
      return
    }

    realtimePrepareRef.current = null
    pendingPrepare.reject(error)
  }, [])

  const stopAudioMeter = useCallback(() => {
    const activeMeter = audioMeterRef.current
    audioMeterRef.current = null

    if (!activeMeter) {
      setAudioLevels(createIdleAudioLevels())
      return
    }

    window.cancelAnimationFrame(activeMeter.frameId)
    activeMeter.source.disconnect()
    activeMeter.analyser.disconnect()
    void activeMeter.context.close()
    setAudioLevels(createIdleAudioLevels())
  }, [])

  useEffect(() => {
    detailRef.current = detail
  }, [detail])

  useEffect(() => {
    realtimeSegmentsCountRef.current = detail?.transcriptItems.length ?? 0
    setRuntimeId(detail?.session.runtime ?? 'wasm')
    setPhase(getSessionPhase(detail))
    setStatusDetail(getDefaultStatusDetail(detail))
    setSegmentsProcessed(detail?.transcriptItems.length ?? 0)
    setDownloadProgress(undefined)
    setAudioLevels(createIdleAudioLevels())
    resetRealtimeState()
  }, [detail?.session.id, resetRealtimeState])

  useEffect(() => {
    const count = detail?.transcriptItems.length ?? 0
    realtimeSegmentsCountRef.current = count
    setSegmentsProcessed(count)
  }, [detail?.transcriptItems.length])

  const startAudioMeter = useCallback(
    async (stream: MediaStream) => {
      stopAudioMeter()

      const context = new AudioContext()

      try {
        await context.resume()
      } catch {
        // Ignore resume failures and keep recording active.
      }

      const source = context.createMediaStreamSource(stream)
      const analyser = context.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.82
      source.connect(analyser)

      const buffer = new Uint8Array(analyser.fftSize)
      let lastCommit = 0

      const meter: ActiveAudioMeter = {
        analyser,
        context,
        frameId: 0,
        source
      }

      const tick = (time: number) => {
        analyser.getByteTimeDomainData(buffer)

        let squaredSum = 0

        for (const sample of buffer) {
          const centered = (sample - 128) / 128
          squaredSum += centered * centered
        }

        const rms = Math.sqrt(squaredSum / buffer.length)
        const normalizedLevel = Math.min(1, Math.max(0.04, rms * 5.4))

        if (time - lastCommit >= 60) {
          lastCommit = time
          setAudioLevels((current) => [...current.slice(1), normalizedLevel])
        }

        meter.frameId = window.requestAnimationFrame(tick)
      }

      meter.frameId = window.requestAnimationFrame(tick)
      audioMeterRef.current = meter
    },
    [stopAudioMeter]
  )

  useEffect(() => {
    workerRef.current?.postMessage({ type: 'dispose' } satisfies TranscriptionWorkerMessage)
    workerRef.current?.terminate()
    workerRef.current = null
    rejectRealtimePrepare(new Error('Live ASR preparation was interrupted.'))
    stopAudioMeter()
    resetRealtimeState()
  }, [detail?.session.id, rejectRealtimePrepare, resetRealtimeState, stopAudioMeter])

  useEffect(() => {
    return () => {
      workerRef.current?.postMessage({ type: 'dispose' } satisfies TranscriptionWorkerMessage)
      workerRef.current?.terminate()
      workerRef.current = null
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop())
      captureStreamRef.current?.getTracks().forEach((track) => track.stop())
      rejectRealtimePrepare(new Error('Live ASR preparation was interrupted.'))
      stopAudioMeter()
      resetRealtimeState()
    }
  }, [rejectRealtimePrepare, resetRealtimeState, stopAudioMeter])

  const stopCaptureTracks = useCallback(() => {
    recorderRef.current = null
    captureStreamRef.current?.getTracks().forEach((track) => track.stop())
    captureStreamRef.current = null
    stopAudioMeter()
  }, [stopAudioMeter])

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

  const ensureWorker = useCallback(() => {
    if (workerRef.current) {
      return workerRef.current
    }

    const worker = new Worker(new URL('../workers/transcription.worker.ts', import.meta.url), {
      type: 'module'
    })

    workerRef.current = worker
    return worker
  }, [])

  const prepareRealtimeModel = useCallback(
    async (target: ActiveRealtimeTarget) => {
      const worker = ensureWorker()

      setRuntimeId(target.runtime)
      setPhase('transcribing')
      setStatusDetail(`Preloading ${target.model.label} for live ASR…`)
      setDownloadProgress(undefined)

      await new Promise<void>((resolve, reject) => {
        realtimePrepareRef.current = { resolve, reject }
        worker.postMessage({
          type: 'prepare-local-model',
          modelEntry: target.model,
          runtime: target.runtime,
          remoteHostOverride: appSettings.remoteModelHostOverride
        } satisfies TranscriptionWorkerMessage)
      })
    },
    [appSettings.remoteModelHostOverride, ensureWorker]
  )

  const finalizeRealtimeRecording = useCallback(async () => {
    const currentDetail = detailRef.current
    const pendingFinalize = realtimeFinalizeRef.current

    if (!currentDetail || !pendingFinalize) {
      return
    }

    if (realtimeIsProcessingRef.current || realtimeChunkQueueRef.current.length > 0) {
      return
    }

    realtimeFinalizeRef.current = null

    const file = new File([pendingFinalize.blob], pendingFinalize.fileName, {
      type: pendingFinalize.blob.type || 'audio/webm'
    })
    await addAttachmentFiles(currentDetail.session.id, [file])

    setDownloadProgress(undefined)
    setPhase('ready')
    setStatusDetail(
      realtimeSegmentsCountRef.current > 0
        ? 'Live ASR finished and was saved locally.'
        : 'Recording finished, but no speech was detected.'
    )

    await updateSession(currentDetail.session.id, {
      status: 'completed',
      endedAt: new Date().toISOString()
    })

    resetRealtimeState()
  }, [addAttachmentFiles, resetRealtimeState, updateSession])

  const processRealtimeQueue = useCallback(async () => {
    const currentDetail = detailRef.current
    const realtimeTarget = realtimeTargetRef.current

    if (!currentDetail || !realtimeTarget || realtimeIsProcessingRef.current) {
      return
    }

    const nextChunk = realtimeChunkQueueRef.current.shift()

    if (!nextChunk) {
      await finalizeRealtimeRecording()
      return
    }

    realtimeIsProcessingRef.current = true
    const chunkIndex = realtimeChunkIndexRef.current + 1
    realtimeChunkIndexRef.current = chunkIndex

    setRuntimeId(realtimeTarget.runtime)
    setStatusDetail(`Transcribing live chunk ${chunkIndex} with ${realtimeTarget.model.label}…`)

    try {
      const normalized = await normalizeAudioBlob(nextChunk)
      const worker = ensureWorker()

      worker.postMessage(
        {
          type: 'transcribe-local',
          sessionId: currentDetail.session.id,
          runtime: realtimeTarget.runtime,
          modelEntry: realtimeTarget.model,
          sampleRate: normalized.sampleRate,
          audio: normalized.channelData,
          requestKind: 'realtime-chunk',
          remoteHostOverride: appSettings.remoteModelHostOverride
        } satisfies TranscriptionWorkerMessage,
        [normalized.channelData.buffer]
      )
    } catch (error) {
      realtimeIsProcessingRef.current = false

      if (isSkippableRealtimeChunkError(error)) {
        setDownloadProgress(undefined)
        setPhase(recorderRef.current?.state === 'recording' ? 'recording' : 'transcribing')
        setStatusDetail('Skipped one live chunk because the browser could not decode it cleanly.')

        if (realtimeChunkQueueRef.current.length > 0) {
          void processRealtimeQueue()
          return
        }

        await finalizeRealtimeRecording()
        return
      }

      setDownloadProgress(undefined)
      setPhase('error')
      setStatusDetail(error instanceof Error ? error.message : 'Unable to transcribe live audio chunk.')
      startTransition(() => {
        void updateSession(currentDetail.session.id, {
          status: 'failed',
          endedAt: new Date().toISOString()
        })
      })
    }
  }, [appSettings.remoteModelHostOverride, ensureWorker, finalizeRealtimeRecording, updateSession])

  const handleRealtimeChunkComplete = useCallback(
    async (message: Extract<TranscriptionWorkerEvent, { type: 'complete' }>) => {
      const currentDetail = detailRef.current

      if (!currentDetail) {
        return
      }

      const transcriptItems =
        message.result.segments.length > 0
          ? message.result.segments
          : [{ text: message.result.text, confidence: undefined }]
      const persistedSegments = transcriptItems.filter((segment) => segment.text?.trim())

      for (const segment of persistedSegments) {
        await addTranscriptItem(currentDetail.session.id, {
          text: segment.text.trim(),
          occurredAt: new Date().toISOString(),
          startedAtMs: segment.startedAtMs,
          endedAtMs: segment.endedAtMs,
          confidence: segment.confidence
        })
      }

      realtimeSegmentsCountRef.current += persistedSegments.length
      setSegmentsProcessed(realtimeSegmentsCountRef.current)
      setDownloadProgress(undefined)
      realtimeIsProcessingRef.current = false

      if (recorderRef.current?.state === 'recording') {
        setPhase('recording')
        setStatusDetail(
          persistedSegments.length > 0
            ? `Live transcript updated with ${persistedSegments.length} new segment${persistedSegments.length === 1 ? '' : 's'}.`
            : 'Listening for speech…'
        )
      } else {
        setPhase('transcribing')
        setStatusDetail('Finishing live ASR and saving the recording…')
      }

      if (realtimeChunkQueueRef.current.length > 0) {
        void processRealtimeQueue()
        return
      }

      await finalizeRealtimeRecording()
    },
    [addTranscriptItem, finalizeRealtimeRecording, processRealtimeQueue]
  )

  useEffect(() => {
    const worker = ensureWorker()

    worker.onmessage = (event: MessageEvent<TranscriptionWorkerEvent>) => {
      const currentDetail = detailRef.current
      const message = event.data

      if (!currentDetail) {
        return
      }

      if (message.type === 'status') {
        setStatusDetail(message.detail)
        setDownloadProgress(message.state === 'downloading' ? message.progress : undefined)

        if (message.state === 'ready' && realtimePrepareRef.current) {
          const pendingPrepare = realtimePrepareRef.current
          realtimePrepareRef.current = null
          pendingPrepare.resolve()
        }

        if (realtimeTargetRef.current) {
          setPhase(recorderRef.current?.state === 'recording' ? 'recording' : 'transcribing')
          return
        }

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
        if (message.requestKind === 'realtime-chunk') {
          void handleRealtimeChunkComplete(message)
          return
        }

        setDownloadProgress(undefined)

        void (async () => {
          await clearTranscriptItems(currentDetail.session.id)

          const transcriptItems =
            message.result.segments.length > 0
              ? message.result.segments
              : [{ text: message.result.text, confidence: undefined }]
          const persistedSegments = transcriptItems.filter((segment) => segment.text?.trim())

          for (const [index, segment] of persistedSegments.entries()) {
            await addTranscriptItem(currentDetail.session.id, {
              text: segment.text.trim(),
              occurredAt: new Date(Date.now() + index).toISOString(),
              startedAtMs: segment.startedAtMs,
              endedAtMs: segment.endedAtMs,
              confidence: segment.confidence
            })
          }

          realtimeSegmentsCountRef.current = persistedSegments.length
          setSegmentsProcessed(persistedSegments.length)
          setPhase('ready')
          setStatusDetail(
            persistedSegments.length > 0
              ? message.detail
              : 'Transcription completed, but no speech was detected in the captured audio.'
          )

          await updateSession(currentDetail.session.id, {
            status: 'completed',
            endedAt: new Date().toISOString()
          })
        })()
        return
      }

      if (message.type === 'error') {
        rejectRealtimePrepare(new Error(message.message))
        setDownloadProgress(undefined)
        realtimeIsProcessingRef.current = false
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

    return () => {
      worker.onmessage = null
    }
  }, [addTranscriptItem, clearTranscriptItems, ensureWorker, handleRealtimeChunkComplete, rejectRealtimePrepare, updateSession])

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
        setDownloadProgress(undefined)

        await updateSession(currentDetail.session.id, {
          runtime: currentDetail.session.runtime,
          status: 'processing',
          targetType: 'hosted',
          providerProfileId: resolvedTarget.provider.id,
          targetId: resolvedTarget.provider.id,
          modelId: currentDetail.session.modelId || appSettings.selectedHostedModel || resolvedTarget.provider.model,
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
            'WebNN is unavailable in this browser. Switch to one of the browser-local Whisper models for WebGPU/WASM.'
          )
        }

        throw new Error('No compatible local runtime is available in this browser.')
      }

      setRuntimeId(nextRuntime)
      setPhase('transcribing')
      setStatusDetail(`Preparing ${resolvedTarget.model.label}…`)
      setDownloadProgress(undefined)

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
          requestKind: 'full',
          remoteHostOverride: appSettings.remoteModelHostOverride
        } satisfies TranscriptionWorkerMessage,
        [normalized.channelData.buffer]
      )
    },
    [appSettings.remoteModelHostOverride, appSettings.selectedHostedModel, ensureWorker, resolveTargets, updateSession]
  )

  const startRecording = useCallback(async () => {
    const currentDetail = detailRef.current

    if (!currentDetail) {
      return
    }

    const resolvedTarget = resolveTargets(currentDetail)
    const requestedMode = getSessionAsrMode(currentDetail, appSettings.asrMode)

    let realtimeTarget: ActiveRealtimeTarget | null = null

    if (
      requestedMode === 'realtime' &&
      resolvedTarget.targetType === 'local' &&
      resolvedTarget.model.supportsRealtime
    ) {
      const snapshot = await getRuntimeSnapshot()
      const nextRuntime = resolveLocalModelRuntime(resolvedTarget.model, snapshot.availableRuntimeIds)

      if (!nextRuntime) {
        throw new Error(`No compatible runtime is available for live ASR with ${resolvedTarget.model.label}.`)
      }

      realtimeTarget = {
        model: resolvedTarget.model,
        runtime: nextRuntime
      }
    }

    if (realtimeTarget) {
      await prepareRealtimeModel(realtimeTarget)
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
    resetRealtimeState()
    realtimeTargetRef.current = realtimeTarget

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm'
    const recorder = new MediaRecorder(recordingStream, { mimeType })
    recorderRef.current = recorder

    recorder.ondataavailable = (event) => {
      if (event.data.size === 0) {
        return
      }

      recordedChunksRef.current.push(event.data)

      if (realtimeTargetRef.current) {
        realtimeChunkQueueRef.current.push(event.data)
        void processRealtimeQueue()
      }
    }

    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, {
        type: recorder.mimeType || 'audio/webm'
      })
      stopCaptureTracks()

      if (realtimeTargetRef.current) {
        realtimeFinalizeRef.current = {
          blob,
          fileName: createRecordingFileName(currentDetail.session.title)
        }
        setPhase('transcribing')
        setStatusDetail('Finishing live ASR and saving the recording…')
        void finalizeRealtimeRecording()
        return
      }

      void (async () => {
        const file = new File([blob], createRecordingFileName(currentDetail.session.title), {
          type: blob.type || 'audio/webm'
        })
        await addAttachmentFiles(currentDetail.session.id, [file])
        await transcribeBlob(blob, file.name)
      })()
    }

    try {
      await startAudioMeter(recordingStream)
    } catch {
      setAudioLevels(createIdleAudioLevels())
    }

    if (realtimeTarget) {
      recorder.start(REALTIME_CHUNK_MS)
      setRuntimeId(realtimeTarget.runtime)
      setStatusDetail(`Recording with live ASR using ${realtimeTarget.model.label}…`)
    } else {
      recorder.start()
      setStatusDetail(
        requestedMode === 'realtime' && resolvedTarget.targetType === 'hosted'
          ? 'Recording… Hosted transcription will start after capture finishes.'
          : currentDetail.session.source === 'system-audio'
            ? 'Recording system audio…'
            : 'Recording…'
      )
    }

    setPhase('recording')
    setDownloadProgress(undefined)

    await updateSession(currentDetail.session.id, {
      status: 'recording',
      runtime: realtimeTarget?.runtime ?? currentDetail.session.runtime,
      asrMode: requestedMode,
      startedAt: currentDetail.session.startedAt ?? new Date().toISOString(),
      endedAt: undefined
    })
  }, [
    addAttachmentFiles,
    appSettings.asrMode,
    finalizeRealtimeRecording,
    prepareRealtimeModel,
    processRealtimeQueue,
    resetRealtimeState,
    resolveTargets,
    startAudioMeter,
    stopCaptureTracks,
    transcribeBlob,
    updateSession
  ])

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
      if (isRealtimePrepareCancellation(error)) {
        return
      }

      setDownloadProgress(undefined)
      setPhase('error')
      setStatusDetail(error instanceof Error ? error.message : 'Unable to start transcription.')
      stopAudioMeter()
      resetRealtimeState()
    }
  }, [resetRealtimeState, startRecording, stopAudioMeter, transcribeBlob])

  const stop = useCallback(async () => {
    const currentDetail = detailRef.current

    if (!currentDetail) {
      return
    }

    if (phase === 'recording' && recorderRef.current) {
      setPhase(realtimeTargetRef.current ? 'transcribing' : 'transcribing')
      setStatusDetail(
        realtimeTargetRef.current
          ? 'Stopping recording and finishing live ASR…'
          : 'Finishing recording and preparing transcription…'
      )
      recorderRef.current.stop()
      return
    }

    if (phase === 'transcribing') {
      workerRef.current?.postMessage({ type: 'dispose' } satisfies TranscriptionWorkerMessage)
      workerRef.current?.terminate()
      workerRef.current = null
      rejectRealtimePrepare(new Error('Live ASR preparation was stopped.'))
      setDownloadProgress(undefined)
      setPhase('stopped')
      setStatusDetail('Transcription stopped.')
      stopCaptureTracks()
      resetRealtimeState()
      await updateSession(currentDetail.session.id, {
        status: 'draft',
        endedAt: new Date().toISOString()
      })
      return
    }

    setDownloadProgress(undefined)
    setPhase('stopped')
    setStatusDetail('Recording stopped.')
    stopCaptureTracks()
    rejectRealtimePrepare(new Error('Live ASR preparation was stopped.'))
    resetRealtimeState()
  }, [phase, rejectRealtimePrepare, resetRealtimeState, stopCaptureTracks, updateSession])

  return {
    runtimeId,
    phase,
    detail: statusDetail,
    downloadProgress,
    audioLevels,
    segmentsProcessed,
    isRunning: phase === 'recording' || phase === 'transcribing',
    start,
    stop
  }
}
