import type { RuntimeId } from '@/types/transcription'
import type { TranscriptionTargetType } from '@/types/settings'

export type EntityId = string
export type ISODateString = string
export type OutputFormat = 'txt' | 'md' | 'html' | 'json' | 'srt'
export type SessionSource = 'microphone' | 'system-audio' | 'upload'
export type SessionStatus = 'draft' | 'recording' | 'processing' | 'completed' | 'failed'
export type NoteKind = 'summary' | 'decision' | 'action-item' | 'highlight' | 'freeform'
export type AttachmentKind = 'audio' | 'image' | 'pdf' | 'document'

interface BaseEntity {
  id: EntityId
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface SessionTask {
  id: EntityId
  label: string
  completed: boolean
}

export interface Workspace extends BaseEntity {
  name: string
  description?: string
  themeColor: string
  archivedAt?: ISODateString | null
}

export interface Project extends BaseEntity {
  workspaceId: Workspace['id']
  name: string
  description?: string
  defaultTagTemplateIds: TagTemplate['id'][]
  archivedAt?: ISODateString | null
}

export interface Session extends BaseEntity {
  workspaceId: Workspace['id']
  projectId: Project['id'] | null
  title: string
  source: SessionSource
  status: SessionStatus
  runtime: RuntimeId
  targetType: TranscriptionTargetType
  targetId?: string
  providerProfileId?: string
  modelId?: string
  participantNames: string[]
  audioSources: string[]
  summary: string
  taskList: SessionTask[]
  transcriptItemIds: TranscriptItem['id'][]
  noteIds: Note['id'][]
  attachmentIds: Attachment['id'][]
  outputIds: Output['id'][]
  durationMs?: number
  startedAt?: ISODateString
  endedAt?: ISODateString
}

export interface TranscriptItem extends BaseEntity {
  sessionId: Session['id']
  sequence: number
  text: string
  speakerLabel?: string
  occurredAt: ISODateString
  tagIds: TagTemplate['id'][]
  startedAtMs?: number
  endedAtMs?: number
  confidence?: number
}

export interface Note extends BaseEntity {
  sessionId: Session['id']
  title: string
  content: string
  kind: NoteKind
  occurredAt: ISODateString
  transcriptItemIds: TranscriptItem['id'][]
  tagIds: TagTemplate['id'][]
}

export interface Attachment extends BaseEntity {
  sessionId: Session['id']
  kind: AttachmentKind
  name: string
  mimeType: string
  size: number
  occurredAt: ISODateString
  previewUrl?: string
  blob?: Blob
}

export interface Output extends BaseEntity {
  sessionId: Session['id']
  format: OutputFormat
  name: string
  generatedAt: ISODateString
  size?: number
  content?: string
  contentPreview?: string
}

export interface TagTemplate extends BaseEntity {
  workspaceId: Workspace['id']
  name: string
  emoji: string
  color: string
  description?: string
}
