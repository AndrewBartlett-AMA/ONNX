import {
  FileImage,
  FilePlus2,
  FileText,
  NotebookPen,
  Paperclip,
  Plus
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { SessionTask } from '@/types/domain'
import { SessionTimelineItem } from '@/components/session/session-timeline-item'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useAppData } from '@/hooks/use-app-data'
import { formatSessionDate, formatTime } from '@/lib/format'

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

export function SessionPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const attachmentInputRef = useRef<HTMLInputElement | null>(null)
  const {
    addAttachmentFiles,
    addManualNote,
    createSession,
    getProjectsForWorkspace,
    getSessionDetail,
    sessions,
    updateNote,
    updateSession,
    updateTranscriptItem,
    toggleTagOnItem,
    workspaces
  } = useAppData()
  const [activeTab, setActiveTab] = useState('transcript')
  const [draggedEntryId, setDraggedEntryId] = useState<string | null>(null)

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

  const { session, attachments, notes, outputs, project, tags, transcriptItems, workspace } = detail
  const projects = getProjectsForWorkspace(session.workspaceId)
  const fullTranscript = transcriptItems
    .map((item) => `${item.speakerLabel ?? 'Speaker'} · ${formatTime(item.occurredAt)}\n${item.text}`)
    .join('\n\n')

  async function handleAddManualNote() {
    await addManualNote(session.id)
  }

  async function handleAttachmentSelection(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) {
      return
    }

    await addAttachmentFiles(session.id, Array.from(fileList))
  }

  async function handleSessionFieldChange<K extends keyof typeof session>(
    field: K,
    value: (typeof session)[K]
  ) {
    await updateSession(session.id, { [field]: value } as Partial<typeof session>)
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
      <div className="rounded-[2rem] bg-[#f7f8fa] p-4 sm:p-5">
        <div className="flex flex-col gap-4 rounded-[1.6rem] bg-white px-5 py-5 shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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
            </div>

            <div className="flex flex-wrap items-center gap-3">
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
                    onToggleTag={(itemType, itemId, tagId) => void toggleTagOnItem(itemType, itemId, tagId)}
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
                    onToggleTag={(itemType, itemId, tagId) => void toggleTagOnItem(itemType, itemId, tagId)}
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
                  onToggleTag={() => undefined}
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
            Transcript, notes, outputs, and metadata all stay editable without leaving the active
            session.
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
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Full transcript
                </p>
                <Textarea
                  value={fullTranscript}
                  readOnly
                  className="mt-3 min-h-[26rem] border-0 bg-white"
                />
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
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Notes
                </p>
                <div className="grid gap-3">
                  {notes.map((note) => (
                    <div key={note.id} className="rounded-[1.25rem] bg-surface-subtle p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">{note.title}</p>
                        <span className="text-xs text-muted-foreground">{formatTime(note.occurredAt)}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{note.content || 'Empty note.'}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Outputs
                </p>
                <div className="grid gap-3">
                  {outputs.map((output) => (
                    <div key={output.id} className="rounded-[1.25rem] bg-surface-subtle p-4">
                      <div className="flex items-center gap-3">
                        <FileText className="size-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-semibold text-foreground">{output.name}</p>
                          <p className="text-sm leading-6 text-muted-foreground">{output.contentPreview}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Attachments
                </p>
                <div className="grid gap-3">
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center gap-3 rounded-[1.25rem] bg-surface-subtle px-4 py-3">
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
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </section>
  )
}
