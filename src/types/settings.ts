import type { RuntimeId } from '@/types/transcription'

export type EntityId = string
export type ISODateString = string

export type TranscriptionTargetType = 'local' | 'hosted'
export type LocalModelSourceType = 'built-in' | 'custom'
export type LocalModelEngine = 'webnn-ort' | 'hf-transformers'
export type ProviderTestStatus = 'idle' | 'success' | 'error'

interface BaseEntity {
  id: EntityId
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface AppSettings extends BaseEntity {
  activeTargetType: TranscriptionTargetType
  selectedLocalModelId: string
  selectedProviderProfileId?: string
  selectedHostedModel?: string
  microphoneEnabled: boolean
  systemAudioEnabled: boolean
  remoteModelHostOverride?: string
}

export interface LocalModelEntry extends BaseEntity {
  repoId: string
  label: string
  description: string
  sourceType: LocalModelSourceType
  engine: LocalModelEngine
  supportedRuntimeIds: RuntimeId[]
  languageLabel: string
  isDefault: boolean
  enabled: boolean
  isCurated: boolean
}

export interface ProviderProfile extends BaseEntity {
  label: string
  baseUrl: string
  model: string
  apiKey: string
  organization?: string
  extraHeaders?: Record<string, string>
  enabled: boolean
  lastTestStatus: ProviderTestStatus
  lastTestedAt?: ISODateString
  lastError?: string
}

export interface ModelCacheMeta extends BaseEntity {
  modelEntryId: string
  repoId: string
  runtime: RuntimeId
  filesCached: number
  totalFiles: number
  allCached: boolean
  cacheKey: string
  detail?: string
}
