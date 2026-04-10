import type { RuntimeId } from '@/types/transcription'

export type EntityId = string
export type ISODateString = string
export type OutputFormat = 'txt' | 'md' | 'json' | 'srt'
export type SessionSource = 'microphone' | 'system-audio' | 'upload'
export type SessionStatus = 'draft' | 'recording' | 'processing' | 'completed' | 'failed'
export type NoteKind = 'summary' | 'decision' | 'action-item' | 'highlight' | 'freeform'
export type AttachmentKind = 'audio' | 'image' | 'document'

interface BaseEntity {
  id: EntityId
  createdAt: ISODateString
  updatedAt: ISODateString
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
  modelId?: string
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
  startedAtMs?: number
  endedAtMs?: number
  confidence?: number
}

export interface Note extends BaseEntity {
  sessionId: Session['id']
  title: string
  content: string
  kind: NoteKind
  transcriptItemIds: TranscriptItem['id'][]
  tagIds: TagTemplate['id'][]
}

export interface Attachment extends BaseEntity {
  sessionId: Session['id']
  kind: AttachmentKind
  name: string
  mimeType: string
  size: number
  objectUrl?: string
}

export interface Output extends BaseEntity {
  sessionId: Session['id']
  format: OutputFormat
  name: string
  generatedAt: ISODateString
  size?: number
  downloadUrl?: string
}

export interface TagTemplate extends BaseEntity {
  workspaceId: Workspace['id']
  name: string
  color: string
  description?: string
}
