import {
  Download,
  FileImage,
  FilePlus2,
  FileText,
  LoaderCircle,
  Mic,
  NotebookPen,
  Paperclip,
  Plus,
  Radio,
  Sparkles,
  Square,
  Trash2
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Attachment, Note, SessionTask, TranscriptItem } from '@/types/domain'
import { AudioLevelMeter } from '@/components/session/audio-level-meter'
import { SessionTimelineItem } from '@/components/session/session-timeline-item'
import { TranscriptionProgress } from '@/components/transcription/transcription-progress'
import { ExportModal } from '@/components/session/export-modal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useAppData } from '@/hooks/use-app-data'
import { useSessionTranscription } from '@/hooks/use-session-transcription'
import {
  buildSessionExport,
  defaultExportOptions,
  downloadExportFile,
  type SessionExportFormat,
  type SessionExportOptions,
  toOutputFormat
} from '@/lib/export'
import { formatSessionDate, formatTime } from '@/lib/format'
import { buildTagPrompt } from '@/lib/tags/prompt-generator'
import { runtimeLabels } from '@/lib/transcription/runtime-registry'

type TimelineEntry =
  | {
      id: string
      occurredAt: string
      type: 'transcript'
      itemId: string
    }
  | {
      id: string
      occurredAt: string
      type: 'note'
      itemId: string
    }
  | {
      id: string
      occurredAt: string
      type: 'attachment'
      itemId: string
    }

function updateTaskList(tasks: SessionTask[], taskId: string, patch: Partial<SessionTask>) {
  return tasks.map((task) => (task.id === taskId ? { ...task, ...patch } : task))
}

async function openAttachment(attachment: Attachment) {
  if (attachment.previewUrl) {
    window.open(attachment.previewUrl, '_blank', 'noopener,noreferrer')
    return
  }

  if (attachment.blob) {
    const url = URL.createObjectURL(attachment.blob)
    window.open(url, '_blank', 'noopener,noreferrer')
    window.setTimeout(() => URL.revokeObjectURL(url), 30000)
  }
}

function TranscriptBubble({
  label,
  onDelete,
  text,
  timestamp,
  variant
}: {
  label: string
  onDelete?: () => void
  text: string
  timestamp?: string
  variant: 'final' | 'live'
}) {
  const isLive = variant === 'live'

  return (
    <article
      className={`rounded-[1.25rem] rounded-tl-sm px-4 py-3 ${
        isLive ? 'bg-[#ecfeff] text-[var(--asr-live-colour)]' : 'bg-white text-foreground'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold">{label}</p>
          {timestamp ? <p className="mt-1 text-[11px] text-muted-foreground">{timestamp}</p> : null}
        </div>
        {onDelete ? (
          <button
            type="button"
            aria-label="Delete transcript segment"
            title="Delete transcript segment"
            onClick={onDelete}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[#fee2e2] hover:text-[#b91c1c]"
          >
            <Trash2 className="size-4" />
          </button>
        ) : null}
      </div>
      <p className={`mt-3 whitespace-pre-wrap text-sm leading-6 ${isLive ? 'opacity-85' : ''}`}>{text}</p>
    </article>
  )
}

export function SessionPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const attachmentInputRef = useRef<HTMLInputElement | null>(null)
  const transcriptListRef = useRef<HTMLDivElement | null>(null)
  const {
    addAttachmentFiles,
    addManualNote,
    addNote,
    addOutput,
    appSettings,
    createSession,
    deleteTranscriptItem,
    getProjectsForWorkspace,
    getSessionDetail,
    localModelEntries,
    modelCacheMeta,
    providerProfiles,
    sessions,
    updateNote,
    updateSession,
    updateTranscriptItem,
    toggleTagOnItem,
    workspaces
  } = useAppData()
  const [activeTab, setActiveTab] = useState('transcript')
  const [draggedEntryId, setDraggedEntryId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<SessionExportFormat>('md')
  const [exportOptions, setExportOptions] = useState<SessionExportOptions>(defaultExportOptions)

  useEffect(() => {
    if (!feedback) {
      return
    }

    const timeout = window.setTimeout(() => setFeedback(null), 4000)
    return () => window.clearTimeout(timeout)
  }, [feedback])

  useEffect(() => {
    if (sessionId || sessions.length === 0) {
      return
    }

    navigate(`/session/${sessions[0].id}`, { replace: true })
  }, [navigate, sessionId, sessions])

  useEffect(() => {
    if (sessionId || sessions.length > 0) {
      return
    }

    void createSession().then((session) => {
      navigate(`/session/${session.id}`, { replace: true })
    })
  }, [createSession, navigate, sessionId, sessions.length])

  const detail = sessionId ? getSessionDetail(sessionId) : undefined
  const transcription = useSessionTranscription(detail)

  useEffect(() => {
    const transcriptList = transcriptListRef.current

    if (!transcriptList) {
      return
    }

    const distanceFromBottom =
      transcriptList.scrollHeight - transcriptList.scrollTop - transcriptList.clientHeight

    if (distanceFromBottom < 120) {
      transcriptList.scrollTop = transcriptList.scrollHeight
    }
  }, [detail?.transcriptItems.length, transcription.draftSegment?.text])

  const timelineEntries = useMemo<TimelineEntry[]>(() => {
    if (!detail) {
      return []
    }

    return [
      ...detail.transcriptItems.map((item) => ({
        id: `transcript-${item.id}`,
        occurredAt: item.occurredAt,
        type: 'transcript' as const,
        itemId: item.id
      })),
      ...detail.notes.map((item) => ({
        id: `note-${item.id}`,
        occurredAt: item.occurredAt,
        type: 'note' as const,
        itemId: item.id
      })),
      ...detail.attachments.map((item) => ({
        id: `attachment-${item.id}`,
        occurredAt: item.occurredAt,
        type: 'attachment' as const,
        itemId: item.id
      }))
    ].sort((left, right) => left.occurredAt.localeCompare(right.occurredAt))
  }, [detail])

  if (!detail) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading session</CardTitle>
          <CardDescription>Preparing the local workspace from IndexedDB.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const sessionDetail = detail
  const { session, attachments, notes, outputs, project, tags, transcriptItems, workspace } = sessionDetail
  const projects = getProjectsForWorkspace(session.workspaceId)
  const selectedLocalModel = localModelEntries.find((entry) => entry.id === session.targetId)
  const selectedProvider = providerProfiles.find((entry) => entry.id === session.providerProfileId)
  const selectedLocalCacheMeta = modelCacheMeta.find((entry) => entry.modelEntryId === selectedLocalModel?.id)
  const sessionAsrMode = session.asrMode ?? appSettings.asrMode

  const runtimeActionLabel =
    session.source === 'upload'
      ? transcription.isRunning
        ? 'Stop transcription'
        : 'Transcribe upload'
      : transcription.isRunning
        ? 'Stop recording'
        : session.source === 'system-audio'
          ? 'Capture system audio'
          : 'Start recording'

  async function handleAddManualNote() {
    await addManualNote(session.id)
    setFeedback('Manual note added to the timeline.')
  }

  async function handleAttachmentSelection(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) {
      return
    }

    await addAttachmentFiles(session.id, Array.from(fileList))
    setFeedback('Attachments stored locally and linked to the session.')
  }

  async function handleSessionFieldChange<K extends keyof typeof session>(
    field: K,
    value: (typeof session)[K]
  ) {
    await updateSession(session.id, { [field]: value } as Partial<typeof session>)
  }

  async function handleExport() {
    setIsExporting(true)

    try {
      const payload = await buildSessionExport(sessionDetail, exportFormat, exportOptions)
      downloadExportFile(payload)
      await addOutput(session.id, {
        format: toOutputFormat(exportFormat),
        name: payload.filename,
        content: payload.content,
        contentPreview: payload.preview,
        size: payload.content.length
      })
      setIsExportModalOpen(false)
      setFeedback(`${exportFormat.toUpperCase()} export downloaded and recorded in Outputs.`)
    } finally {
      setIsExporting(false)
    }
  }

  async function handlePromptTag(itemType: 'transcript' | 'note', itemId: string, tagId: string) {
    const tag = tags.find((entry) => entry.id === tagId)
    const item =
      itemType === 'transcript'
        ? transcriptItems.find((entry) => entry.id === itemId)
        : notes.find((entry) => entry.id === itemId)

    if (!tag || !item) {
      return
    }

    const prompt = buildTagPrompt({
      sessionDetail,
      tag,
      item: item as TranscriptItem | Note,
      itemType
    })

    try {
      await navigator.clipboard.writeText(prompt)
    } catch {
      setFeedback('Clipboard access failed, but the prompt was still saved into Notes.')
    }

    await addNote(session.id, {
      title: `Prompt · ${tag.emoji} ${tag.name}`,
      content: prompt,
      kind: 'highlight',
      tagIds: [tag.id],
      transcriptItemIds: itemType === 'transcript' ? [itemId] : []
    })

    setActiveTab('notes')
    setFeedback(`Prompt for ${tag.name} copied to clipboard and saved into Notes.`)
  }

  async function handleDeleteTranscriptItem(itemId: string) {
    await deleteTranscriptItem(itemId)
    setFeedback('Transcript segment deleted.')
  }

  return (
    <>
      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="rounded-[2rem] bg-[#f7f8fa] p-4 sm:p-5">
          <div className="flex flex-col gap-4 rounded-[1.6rem] bg-white px-5 py-5 shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Session timeline
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                  {session.title}
                </h2>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>{workspace?.name}</span>
                  <span>{project?.name ?? 'Unassigned project'}</span>
                  <span>{formatSessionDate(session.updatedAt)}</span>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{runtimeLabels[transcription.runtimeId]}</Badge>
                  <Badge variant="outline">{sessionAsrMode === 'realtime' ? 'Live ASR' : 'Batch ASR'}</Badge>
                  <Badge variant="outline">
                    {session.targetType === 'hosted'
                      ? selectedProvider?.label ?? 'Hosted provider'
                      : selectedLocalModel?.label ?? 'Local model'}
                  </Badge>
                  <Badge variant={transcription.phase === 'error' ? 'outline' : 'secondary'}>
                    {transcription.phase.toUpperCase()}
                  </Badge>
                  <Badge variant="outline">{transcription.segmentsProcessed} segments</Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{transcription.detail}</p>
                {sessionAsrMode === 'realtime' &&
                session.targetType === 'local' &&
                selectedLocalModel &&
                !selectedLocalCacheMeta?.allCached ? (
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {selectedLocalModel.label} is not preloaded yet. Use Settings to preload it and reduce the first live chunk delay.
                  </p>
                ) : null}

                {transcription.phase === 'transcribing' ||
                transcription.downloadProgress !== undefined ||
                session.source !== 'upload' ? (
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    {transcription.phase === 'transcribing' || transcription.downloadProgress !== undefined ? (
                      <TranscriptionProgress
                        label={
                          transcription.downloadProgress !== undefined
                            ? 'Downloading model'
                            : sessionAsrMode === 'realtime'
                              ? 'Running live ASR'
                              : 'Running transcription'
                        }
                        detail={transcription.detail}
                        progress={transcription.downloadProgress}
                      />
                    ) : null}

                    {session.source !== 'upload' ? (
                      <AudioLevelMeter
                        active={transcription.phase === 'recording'}
                        levels={transcription.audioLevels}
                        sourceLabel={
                          session.source === 'system-audio' ? 'System audio capture' : 'Microphone capture'
                        }
                      />
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  onClick={() => void (transcription.isRunning ? transcription.stop() : transcription.start())}
                >
                  {transcription.isRunning ? (
                    <Square data-icon="inline-start" />
                  ) : session.source === 'system-audio' ? (
                    <Radio data-icon="inline-start" />
                  ) : (
                    <Mic data-icon="inline-start" />
                  )}
                  {runtimeActionLabel}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setIsExportModalOpen(true)}>
                  <Download data-icon="inline-start" />
                  Export
                </Button>
                <Button type="button" variant="secondary" onClick={handleAddManualNote}>
                  <NotebookPen data-icon="inline-start" />
                  Add note
                </Button>
                <Button type="button" variant="secondary" onClick={() => attachmentInputRef.current?.click()}>
                  <Paperclip data-icon="inline-start" />
                  Add image or PDF
                </Button>
                <input
                  ref={attachmentInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  className="hidden"
                  onChange={(event) => void handleAttachmentSelection(event.target.files)}
                />
              </div>
            </div>

            {feedback ? (
              <div className="rounded-[1.3rem] bg-[#eef4ff] px-4 py-3 text-sm text-accent">
                {feedback}
              </div>
            ) : null}

            {draggedEntryId ? (
              <div className="rounded-[1.3rem] bg-[#eef4ff] px-4 py-3 text-sm text-accent">
                Drag structure detected for {draggedEntryId}. Reordering is intentionally stubbed for
                this pass.
              </div>
            ) : null}

            <div className="grid gap-5">
              {timelineEntries.map((entry) => {
                if (entry.type === 'transcript') {
                  const transcript = transcriptItems.find((item) => item.id === entry.itemId)

                  if (!transcript) {
                    return null
                  }

                  return (
                    <SessionTimelineItem
                      key={entry.id}
                      entry={{ id: entry.id, occurredAt: entry.occurredAt, type: 'transcript', item: transcript }}
                      tags={tags}
                      onUpdateTranscript={(itemId, text) => void updateTranscriptItem(itemId, { text })}
                      onUpdateNote={() => undefined}
                      onDeleteTranscript={(itemId) => void handleDeleteTranscriptItem(itemId)}
                      onToggleTag={(itemType, itemId, tagId) => void toggleTagOnItem(itemType, itemId, tagId)}
                      onPromptTag={(itemType, itemId, tagId) => void handlePromptTag(itemType, itemId, tagId)}
                      onDragStart={setDraggedEntryId}
                      onDragEnd={() => setDraggedEntryId(null)}
                    />
                  )
                }

                if (entry.type === 'note') {
                  const note = notes.find((item) => item.id === entry.itemId)

                  if (!note) {
                    return null
                  }

                  return (
                    <SessionTimelineItem
                      key={entry.id}
                      entry={{ id: entry.id, occurredAt: entry.occurredAt, type: 'note', item: note }}
                      tags={tags}
                      onUpdateTranscript={() => undefined}
                      onUpdateNote={(noteId, content) => void updateNote(noteId, { content })}
                      onDeleteTranscript={() => undefined}
                      onToggleTag={(itemType, itemId, tagId) => void toggleTagOnItem(itemType, itemId, tagId)}
                      onPromptTag={(itemType, itemId, tagId) => void handlePromptTag(itemType, itemId, tagId)}
                      onDragStart={setDraggedEntryId}
                      onDragEnd={() => setDraggedEntryId(null)}
                    />
                  )
                }

                const attachment = attachments.find((item) => item.id === entry.itemId)

                if (!attachment) {
                  return null
                }

                return (
                  <SessionTimelineItem
                    key={entry.id}
                    entry={{ id: entry.id, occurredAt: entry.occurredAt, type: 'attachment', item: attachment }}
                    tags={tags}
                    onUpdateTranscript={() => undefined}
                    onUpdateNote={() => undefined}
                    onDeleteTranscript={() => undefined}
                    onToggleTag={() => undefined}
                    onPromptTag={() => undefined}
                    onDragStart={setDraggedEntryId}
                    onDragEnd={() => setDraggedEntryId(null)}
                  />
                )
              })}
            </div>
          </div>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Session inspector</CardTitle>
            <CardDescription>
              Transcript, notes, outputs, metadata, and attachments stay editable without leaving the
              active session.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
              <TabsList>
                <TabsTrigger value="transcript">Transcript</TabsTrigger>
                <TabsTrigger value="notes">Notes & Outputs</TabsTrigger>
                <TabsTrigger value="metadata">Metadata</TabsTrigger>
              </TabsList>

              <TabsContent value="transcript" className="space-y-4">
                <div className="rounded-[1.5rem] bg-surface-subtle p-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      Transcript stream
                    </p>
                    {transcription.phase === 'transcribing' || transcription.downloadProgress !== undefined ? (
                      <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <LoaderCircle className="size-4 animate-spin" />
                        {transcription.downloadProgress !== undefined
                          ? `Downloading model (${Math.round(transcription.downloadProgress)}%)`
                          : sessionAsrMode === 'realtime'
                            ? 'Receiving live ASR'
                            : 'Processing audio'}
                      </span>
                    ) : null}
                  </div>
                  <div
                    ref={transcriptListRef}
                    className="mt-3 grid max-h-[32rem] min-h-[26rem] content-start gap-3 overflow-y-auto rounded-[1.25rem] bg-white/70 p-3"
                  >
                    {transcriptItems.length === 0 && !transcription.draftSegment ? (
                      <div className="rounded-[1.25rem] bg-white px-4 py-5 text-sm leading-6 text-muted-foreground">
                        No transcript segments yet.
                      </div>
                    ) : null}
                    {transcriptItems.map((item) => (
                      <TranscriptBubble
                        key={item.id}
                        label={item.speakerLabel ?? 'Transcript'}
                        timestamp={formatTime(item.occurredAt)}
                        text={item.text}
                        variant="final"
                        onDelete={() => void handleDeleteTranscriptItem(item.id)}
                      />
                    ))}
                    {transcription.draftSegment ? (
                      <TranscriptBubble
                        key={transcription.draftSegment.id}
                        label="Live ASR"
                        text={transcription.draftSegment.text}
                        variant="live"
                      />
                    ) : null}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="notes" className="space-y-5">
                <section className="space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    Summary
                  </p>
                  <Textarea
                    value={session.summary}
                    onChange={(event) => void handleSessionFieldChange('summary', event.target.value)}
                    className="min-h-32"
                  />
                </section>

                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      Task list
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        void handleSessionFieldChange('taskList', [
                          ...session.taskList,
                          { id: crypto.randomUUID(), label: 'New task', completed: false }
                        ])
                      }
                    >
                      <Plus data-icon="inline-start" />
                      Task
                    </Button>
                  </div>
                  <div className="grid gap-3">
                    {session.taskList.map((task) => (
                      <label key={task.id} className="flex items-start gap-3 rounded-[1.25rem] bg-surface-subtle px-4 py-3">
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={(event) =>
                            void handleSessionFieldChange(
                              'taskList',
                              updateTaskList(session.taskList, task.id, {
                                completed: event.target.checked
                              })
                            )
                          }
                        />
                        <Input
                          value={task.label}
                          onChange={(event) =>
                            void handleSessionFieldChange(
                              'taskList',
                              updateTaskList(session.taskList, task.id, { label: event.target.value })
                            )
                          }
                          className="h-9 border-0 bg-white"
                        />
                      </label>
                    ))}
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      Notes
                    </p>
                    <Badge variant="outline">{notes.length}</Badge>
                  </div>
                  <div className="grid gap-3">
                    {notes.map((note) => (
                      <div key={note.id} className="rounded-[1.25rem] bg-surface-subtle p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-foreground">{note.title}</p>
                          <span className="text-xs text-muted-foreground">{formatTime(note.occurredAt)}</span>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                          {note.content || 'Empty note.'}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      Outputs
                    </p>
                    <Badge variant="outline">{outputs.length}</Badge>
                  </div>
                  <div className="grid gap-3">
                    {outputs.map((output) => (
                      <div key={output.id} className="rounded-[1.25rem] bg-surface-subtle p-4">
                        <div className="flex items-center gap-3">
                          <FileText className="size-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-semibold text-foreground">{output.name}</p>
                            <p className="text-sm leading-6 text-muted-foreground">
                              {output.contentPreview ?? output.content ?? 'Generated artifact'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      Attachments
                    </p>
                    <Badge variant="outline">{attachments.length}</Badge>
                  </div>
                  <div className="grid gap-3">
                    {attachments.map((attachment) => (
                      <button
                        key={attachment.id}
                        type="button"
                        className="flex items-center justify-between gap-3 rounded-[1.25rem] bg-surface-subtle px-4 py-3 text-left transition-colors hover:bg-[#eef4ff]"
                        onClick={() => void openAttachment(attachment)}
                      >
                        <div className="flex items-center gap-3">
                          {attachment.kind === 'image' ? (
                            <FileImage className="size-4 text-muted-foreground" />
                          ) : (
                            <FilePlus2 className="size-4 text-muted-foreground" />
                          )}
                          <div>
                            <p className="text-sm font-semibold text-foreground">{attachment.name}</p>
                            <p className="text-xs text-muted-foreground">{attachment.kind.toUpperCase()}</p>
                          </div>
                        </div>
                        <Sparkles className="size-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </section>
              </TabsContent>

              <TabsContent value="metadata" className="space-y-4">
                <div className="space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    Session name
                  </p>
                  <Input
                    value={session.title}
                    onChange={(event) => void handleSessionFieldChange('title', event.target.value)}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      Target type
                    </p>
                    <select
                      value={session.targetType}
                      onChange={(event) =>
                        void updateSession(session.id, {
                          targetType: event.target.value as 'local' | 'hosted',
                          targetId:
                            event.target.value === 'hosted'
                              ? appSettings.selectedProviderProfileId
                              : appSettings.selectedLocalModelId,
                          providerProfileId:
                            event.target.value === 'hosted' ? appSettings.selectedProviderProfileId : undefined,
                          modelId:
                            event.target.value === 'hosted'
                              ? appSettings.selectedHostedModel || selectedProvider?.model || ''
                              : selectedLocalModel?.repoId
                        })
                      }
                      className="h-11 w-full rounded-2xl border border-border/70 bg-white px-4 text-sm outline-none"
                    >
                      <option value="local">Local browser model</option>
                      <option value="hosted">Hosted provider</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      Workspace
                    </p>
                    <select
                      value={session.workspaceId}
                      onChange={(event) => void handleSessionFieldChange('workspaceId', event.target.value)}
                      className="h-11 w-full rounded-2xl border border-border/70 bg-white px-4 text-sm outline-none"
                    >
                      {workspaces.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      Project
                    </p>
                    <select
                      value={session.projectId ?? ''}
                      onChange={(event) => void handleSessionFieldChange('projectId', event.target.value || null)}
                      className="h-11 w-full rounded-2xl border border-border/70 bg-white px-4 text-sm outline-none"
                    >
                      <option value="">No project</option>
                      {projects.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {session.targetType === 'hosted' ? (
                    <>
                      <div className="space-y-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                          Provider profile
                        </p>
                        <select
                          value={session.providerProfileId ?? ''}
                          onChange={(event) => {
                            const provider = providerProfiles.find((entry) => entry.id === event.target.value)
                            void updateSession(session.id, {
                              providerProfileId: event.target.value || undefined,
                              targetId: event.target.value || undefined,
                              modelId: provider?.model ?? ''
                            })
                          }}
                          className="h-11 w-full rounded-2xl border border-border/70 bg-white px-4 text-sm outline-none"
                        >
                          <option value="">Choose provider</option>
                          {providerProfiles.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                          Hosted model
                        </p>
                        <Input
                          value={session.modelId ?? ''}
                          onChange={(event) => void handleSessionFieldChange('modelId', event.target.value)}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                          Local model
                        </p>
                        <select
                          value={session.targetId ?? ''}
                          onChange={(event) => {
                            const model = localModelEntries.find((entry) => entry.id === event.target.value)
                            void updateSession(session.id, {
                              targetId: event.target.value,
                              modelId: model?.repoId ?? ''
                            })
                          }}
                          className="h-11 w-full rounded-2xl border border-border/70 bg-white px-4 text-sm outline-none"
                        >
                          {localModelEntries.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                          Model runtime
                        </p>
                        <div className="rounded-[1rem] bg-surface-subtle px-4 py-3 text-sm text-muted-foreground">
                          {selectedLocalModel?.supportedRuntimeIds.map((runtime) => runtime.toUpperCase()).join(' / ') ??
                            'No model selected'}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    Participants
                  </p>
                  <Input
                    value={session.participantNames.join(', ')}
                    onChange={(event) =>
                      void handleSessionFieldChange(
                        'participantNames',
                        event.target.value.split(',').map((item) => item.trim()).filter(Boolean)
                      )
                    }
                  />
                </div>

                <div className="space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    Audio sources
                  </p>
                  <Input
                    value={session.audioSources.join(', ')}
                    onChange={(event) =>
                      void handleSessionFieldChange(
                        'audioSources',
                        event.target.value.split(',').map((item) => item.trim()).filter(Boolean)
                      )
                    }
                  />
                </div>

                <div className="rounded-[1.5rem] bg-surface-subtle p-4">
                  <p className="text-sm font-semibold text-foreground">Session metrics</p>
                  <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>Transcript items</span>
                      <span>{transcriptItems.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Manual notes</span>
                      <span>{notes.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Attachments</span>
                      <span>{attachments.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Outputs</span>
                      <span>{outputs.length}</span>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </section>

      <ExportModal
        open={isExportModalOpen}
        format={exportFormat}
        options={exportOptions}
        isExporting={isExporting}
        onClose={() => setIsExportModalOpen(false)}
        onFormatChange={setExportFormat}
        onOptionChange={(key, value) =>
          setExportOptions((current) => ({
            ...current,
            [key]: value
          }))
        }
        onExport={() => void handleExport()}
      />
    </>
  )
}
